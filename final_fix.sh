# Find the line with the AI error throw
LINE=$(grep -n "throw new Error(\`AI error: \${errText.slice(0, 200)}\`);" server/wikify-tool.ts | head -n 1 | cut -d: -f1)
# That should be around 324.
# We want to keep everything up to the next closing function bracket.
head -n $((LINE+4)) server/wikify-tool.ts > final.ts
echo "export function registerWikifyToolRoutes(app: Express) {" >> final.ts
cat >> final.ts <<'INNER'
  app.post(
    "/api/tools/wikify/analyze",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const userId = req.user?.id ?? "unknown";

      if (!checkRateLimit(userId)) {
        return res.status(429).json({ message: "Rate limit: max 3 requests per minute" });
      }

      const parsed = analyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { text, count, detailLevel, categoryIds } = parsed.data;

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured. Please set XAI_API_KEY or OPENROUTER_API_KEY." });
      }

      let categoryNames: string[] = [];
      try {
        const categories = await storage.getCategories();
        if (categoryIds && categoryIds.length > 0) {
          categoryNames = categories
            .filter((c) => categoryIds.includes(c.id))
            .map((c) => c.name);
        } else {
          categoryNames = categories.map((c) => c.name);
        }
      } catch {}

      const prompt = buildAnalyzePrompt(text, count, detailLevel, categoryNames);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      try {
        const aiRes = await fetch(config.apiUrl, {
          method: "POST",
          headers: config.headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: config.modelName === "grok-3-mini" ? "grok-3-mini" : config.modelName,
            messages: [
              { role: "system", content: "You are a technical wiki writer. Respond ONLY with valid JSON arrays. No markdown fences, no explanation, no extra text." },
              { role: "user", content: prompt },
            ],
            max_tokens: 12000,
            temperature: 0.4,
          }),
        });

        clearTimeout(timeout);

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error("[wikify] AI error:", errText.slice(0, 500));
          return res.status(502).json({ message: "AI generation failed", detail: errText.slice(0, 200) });
        }

        const data = await aiRes.json() as AiChatResponse;
        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";

        if (data.usage) {
          console.log(`[wikify/analyze] tokens: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
        }

        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        let rawArticles: unknown[];
        try {
          const parsed2 = JSON.parse(cleaned) as unknown;
          if (!Array.isArray(parsed2)) throw new Error("Not an array");
          rawArticles = parsed2;
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const normalizedCategories = await storage.getCategories();
        const articles = rawArticles.slice(0, count).map((item: unknown) => {
          const a = (typeof item === "object" && item !== null ? item : {}) as AiArticleSuggestion;
          const category = normalizeString(a.category);
          const catMatch = normalizedCategories.find(
            (c) => c.name.toLowerCase() === category.toLowerCase() ||
                   c.slug.toLowerCase() === category.toLowerCase()
          );
          const title = normalizeString(a.title) || "Untitled";
          return {
            title,
            slug: normalizeString(a.slug) || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "article",
            category: catMatch?.name ?? (category || "General"),
            categoryId: catMatch?.id ?? null,
            content: normalizeString(a.content),
            seoDescription: normalizeString(a.seoDescription),
            aeoKeywords: normalizeStringArray(a.aeoKeywords),
            confidence: normalizeConfidence(a.confidence),
          };
        });

        return res.json({ articles });
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === "AbortError") {
          return res.status(504).json({ message: "AI generation timed out after 5 minutes" });
        }
        console.error("[wikify] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tools/wikify/generate-source",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsedBody = generateSourceSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { prompt } = parsedBody.data;

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      try {
        const aiRes = await fetch(config.apiUrl, {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: config.modelName,
            messages: [
              {
                role: "system",
                content: "You are a professional technical writer. Generate clear, factual, informative source material that can be used as the basis for wiki articles. Write in a neutral, encyclopedic style. No markdown headers — just flowing paragraphs of informational text.",
              },
              {
                role: "user",
                content: `Write 800-1200 words of informational source text about the following topic. Write in clear paragraphs. Cover the topic comprehensively including what it is, how it works, why it matters, and key related concepts.\n\nTopic: ${prompt}`,
              },
            ],
            max_tokens: 2000,
            temperature: 0.5,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          return res.status(502).json({ message: "AI generation failed", detail: errText.slice(0, 200) });
        }

        const data = await aiRes.json() as AiChatResponse;
        const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

        return res.json({ text });
      } catch (err: unknown) {
        console.error("[wikify-source] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  const ingestUrlSchema = z.object({
    url: z.string().url(),
  });

  app.post(
    "/api/tools/wiki/ingest-url",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsed = ingestUrlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid URL" });
      }

      const { url } = parsed.data;

      try {
        const safeCheck = await validateSafeUrl(url);
        if (!safeCheck.safe) {
          return res.status(400).json({ message: safeCheck.message ?? "URL is not allowed" });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const htmlRes = await fetch(url, {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SEVE-Wiki-Bot/1.0)",
            "Accept": "text/html,application/xhtml+xml",
          },
        });
        clearTimeout(timeout);

        if (htmlRes.status >= 300 && htmlRes.status < 400) {
          const location = htmlRes.headers.get("location");
          if (!location) {
            return res.status(502).json({ message: "Received redirect with no Location header" });
          }
          const redirectCheck = await validateSafeUrl(new URL(location, url).href);
          if (!redirectCheck.safe) {
            return res.status(400).json({ message: `Redirect blocked: ${redirectCheck.message}` });
          }
          return res.status(400).json({ message: "Redirected URLs are not followed for security. Please provide the final destination URL." });
        }

        if (!htmlRes.ok) {
          return res.status(502).json({ message: `Failed to fetch URL: HTTP ${htmlRes.status}` });
        }

        const contentType = htmlRes.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
          return res.status(400).json({ message: "URL does not point to an HTML page" });
        }

        const html = await htmlRes.text();
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent?.trim()) {
          return res.status(422).json({ message: "Could not extract readable content from this URL" });
        }

        const text = article.textContent.trim().slice(0, 15000);
        const title = article.title ?? url;

        const source = await storage.createWikiSource({
          type: "url",
          identifier: url,
          title,
          articleCount: 0,
        });

        return res.json({
          text,
          title,
          sourceId: source.id,
          citation: url,
          citationFormat: "URL",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return res.status(504).json({ message: "Request timed out fetching URL" });
        }
        console.error("[ingest-url] Error:", err);
        return res.status(500).json({ message: "Failed to fetch or parse URL" });
      }
    }
  );

  const ingestAcademicSchema = z.object({
    type: z.enum(["doi", "pubmed", "arxiv"]),
    id: z.string().min(1).max(200),
  });

  app.post(
    "/api/tools/wiki/ingest-academic",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const parsed = ingestAcademicSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { type, id } = parsed.data;
      let text = "";
      let title = "";
      let citation = "";

      try {
        if (type === "doi") {
          const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(id)}`;
          const crossrefRes = await fetch(crossrefUrl, {
            headers: { "User-Agent": "SEVE-Wiki-Bot/1.0 (mailto:wiki@sevco.io)" },
          });
          if (!crossrefRes.ok) {
            return res.status(404).json({ message: `DOI not found: ${id}` });
          }
          const crossrefData = await crossrefRes.json() as CrossRefResponse;
          const work = crossrefData?.message;
          if (!work) return res.status(404).json({ message: "DOI metadata not found" });

          const authors = (work.author ?? []).map((a) =>
            [a.family, a.given].filter(Boolean).join(", ")
          ).join("; ");
          const year = work.published?.["date-parts"]?.[0]?.[0] ?? "";
          const journal = work["container-title"]?.[0] ?? "";
          title = work.title?.[0] ?? id;
          const abstractText = (work.abstract ?? "").replace(/<[^>]+>/g, "").trim();

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\nJournal: ${journal}\nDOI: ${id}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. ${journal}. https://doi.org/${id}`;
        } else if (type === "pubmed") {
          const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=json`;
          const summaryRes = await fetch(summaryUrl, {
            headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" },
          });
          if (!summaryRes.ok) {
            return res.status(404).json({ message: `PubMed ID not found: ${id}` });
          }
          const summaryData = await summaryRes.json() as PubMedSummaryResponse;
          const record = summaryData?.result?.[id];
          if (!record) return res.status(404).json({ message: "PubMed record not found" });

          title = record.title ?? id;
          const authors = (record.authors ?? []).map((a) => a.name ?? "").filter(Boolean).join(", ");
          const year = record.pubdate?.split(" ")?.[0] ?? "";
          const journal = record.source ?? "";

          const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=text&rettype=abstract`;
          const abstractRes = await fetch(abstractUrl, { headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" } });
          const abstractText = abstractRes.ok ? (await abstractRes.text()).trim() : "";

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\nJournal: ${journal}\nPubMed ID: ${id}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. ${journal}. PubMed ID: ${id}. https://pubmed.ncbi.nlm.nih.gov/${id}/`;
        } else if (type === "arxiv") {
          const cleanId = id.replace(/^arxiv:/i, "");
          const arxivUrl = `https://export.arxiv.org/abs/${encodeURIComponent(cleanId)}`;
          const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(cleanId)}`;
          const apiRes = await fetch(apiUrl, { headers: { "User-Agent": "SEVE-Wiki-Bot/1.0" } });
          if (!apiRes.ok) {
            return res.status(404).json({ message: `arXiv ID not found: ${cleanId}` });
          }
          const xmlText = await apiRes.text();

          const xmlParser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "author" });
          const parsed = xmlParser.parse(xmlText) as {
            feed?: {
              entry?: {
                title?: string;
                summary?: string;
                published?: string;
                author?: Array<{ name?: string }> | { name?: string };
              };
            };
          };
          const entry = parsed?.feed?.entry;

          title = (typeof entry?.title === "string" ? entry.title : cleanId).trim().replace(/\s+/g, " ");
          const abstractText = (typeof entry?.summary === "string" ? entry.summary : "").trim().replace(/\s+/g, " ");
          const authorList = Array.isArray(entry?.author)
            ? entry.author.map((a) => a.name ?? "").filter(Boolean)
            : entry?.author?.name
              ? [entry.author.name]
              : [];
          const authors = authorList.join(", ");
          const publishedStr = typeof entry?.published === "string" ? entry.published : "";
          const year = publishedStr.slice(0, 4) || "";

          text = `Title: ${title}\nAuthors: ${authors}\nYear: ${year}\narXiv ID: ${cleanId}\narXiv URL: ${arxivUrl}\n\nAbstract:\n${abstractText}`;
          citation = `${authors} (${year}). ${title}. arXiv:${cleanId}. ${arxivUrl}`;
        }

        if (!text.trim()) {
          return res.status(422).json({ message: "Could not extract content for this academic ID" });
        }

        const identifier = type === "arxiv" ? id.replace(/^arxiv:/i, "") : id;
        const source = await storage.createWikiSource({
          type,
          identifier,
          title,
          articleCount: 0,
        });

        return res.json({
          text: text.slice(0, 15000),
          title,
          sourceId: source.id,
          citation,
          citationFormat: "APA",
        });
      } catch (err: unknown) {
        console.error("[ingest-academic] Error:", err);
        return res.status(500).json({ message: "Failed to fetch academic metadata" });
      }
    }
  );

  app.post(
    "/api/tools/wiki/gap-analysis",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured. Please set XAI_API_KEY or OPENROUTER_API_KEY." });
      }

      try {
        const [allArticles, categories] = await Promise.all([
          storage.getArticles(),
          storage.getCategories(),
        ]);

        const existingTitles = allArticles.map((a) => a.title);
        const categoryNames = categories.map((c) => c.name);

        const prompt = buildGapAnalysisPrompt(existingTitles, categoryNames);

        const data = await callAi(config, [
          { role: "system", content: "You are a knowledge architect. Respond ONLY with valid JSON arrays. No markdown fences, no explanation." },
          { role: "user", content: prompt },
        ], 6000);

        if (data.usage) {
          console.log(`[wiki/gap-analysis] tokens: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
        }

        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let rawTopics: unknown[];
        try {
          const parsed = JSON.parse(cleaned) as unknown;
          if (!Array.isArray(parsed)) throw new Error("Not an array");
          rawTopics = parsed;
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const topics = rawTopics.map((item: unknown) => {
          const t = (typeof item === "object" && item !== null ? item : {}) as GapAnalysisTopic;
          return {
            topic: normalizeString(t.topic) || "Unknown Topic",
            category: normalizeString(t.category) || "General",
            reason: normalizeString(t.reason) || "",
            priority: normalizePriority(t.priority),
          };
        });

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        topics.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return res.json({ topics, existingCount: existingTitles.length });
      } catch (err: unknown) {
        console.error("[wiki/gap-analysis] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tools/wiki/ingest-pdf",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({ message: "Only PDF files are accepted" });
      }

      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: req.file.buffer });
        const result: PdfParseTextResult = await parser.getText();
        const rawText = result.text?.trim() ?? "";

        if (!rawText) {
          return res.status(422).json({ message: "Could not extract text from this PDF" });
        }

        const LIMIT = 15000;
        const text = rawText.length > LIMIT
          ? rawText.slice(0, LIMIT) + "\n\n[Content truncated — PDF exceeded 15,000 character limit]"
          : rawText;

        const title = req.file.originalname.replace(/\.pdf$/i, "");

        const source = await storage.createWikiSource({
          type: "pdf",
          identifier: req.file.originalname,
          title,
          articleCount: 0,
        });

        return res.json({
          text,
          title,
          sourceId: source.id,
          citation: `${title} [PDF document]`,
          citationFormat: "URL",
        });
      } catch (err: unknown) {
        console.error("[ingest-pdf] Error:", err);
        return res.status(500).json({ message: "Failed to parse PDF" });
      }
    }
  );

  app.get(
    "/api/tools/wiki/sources",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (_req: Request, res: Response) => {
      try {
        const sources = await storage.getWikiSources();
        return res.json(sources);
      } catch (err) {
        console.error("[wiki-sources] Error:", err);
        return res.status(500).json({ message: "Failed to fetch sources" });
      }
    }
  );

  app.patch(
    "/api/tools/wiki/sources/:id/increment",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const { count } = req.body as { count?: number };
      if (isNaN(id) || typeof count !== "number" || count < 1) {
        return res.status(400).json({ message: "Invalid request" });
      }
      try {
        await storage.incrementWikiSourceArticleCount(id, count);
        return res.json({ ok: true });
      } catch (err) {
        console.error("[wiki-sources-increment] Error:", err);
        return res.status(500).json({ message: "Failed to increment source article count" });
      }
    }
  );

  app.delete(
    "/api/tools/wiki/sources/:id",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      try {
        await storage.deleteWikiSource(id);
        return res.json({ ok: true });
      } catch (err) {
        console.error("[wiki-sources-delete] Error:", err);
        return res.status(500).json({ message: "Failed to delete source" });
      }
    }
  );

  app.post(
    "/api/tools/wiki/rewikify/:articleId",
    requireAuth,
    requireRole(...CAN_CREATE_ARTICLE),
    async (req: Request, res: Response) => {
      const articleId = parseInt(req.params.articleId, 10);
      if (isNaN(articleId)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }

      const config = getApiConfig();
      if (!config) {
        return res.status(503).json({ message: "AI service not configured." });
      }

      try {
        const article = await storage.getArticleById(articleId);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        const prompt = buildRewikifyPrompt(article.title, article.content);

        const data = await callAi(config, [
          { role: "system", content: "You are a technical wiki editor. Respond ONLY with valid JSON. No markdown fences." },
          { role: "user", content: prompt },
        ], 6000);

        if (data.usage) {
          console.log(`[wiki/rewikify/${articleId}] tokens: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
        }

        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let result: { content?: unknown; confidence?: unknown };
        try {
          result = JSON.parse(cleaned) as { content?: unknown; confidence?: unknown };
        } catch {
          return res.status(502).json({ message: "AI returned malformed JSON", raw: raw.slice(0, 500) });
        }

        const newContent = normalizeString(result.content);
        const confidence = normalizeConfidence(result.confidence);

        if (!newContent) {
          return res.status(502).json({ message: "AI returned empty content" });
        }

        const settings = await storage.getPlatformSettings();
        const autoPublishStrong = settings["wiki.autoPublishStrongConfidence"] === "true";
        const authorName = req.user?.username ?? "AI Re-wikify";

        const now = new Date();

        if (confidence === "strong" && autoPublishStrong) {
          await storage.updateArticle(articleId, {
            content: newContent,
            status: "published",
            lastAiReviewedAt: now,
          });
          return res.json({ confidence, action: "published", message: "Article auto-published (strong confidence)" });
        } else {
          const revision = await storage.createRevision({
            articleId,
            content: newContent,
            authorName,
            editSummary: `Re-wikified by AI (${confidence} confidence)`,
            status: "pending",
          });
          await storage.updateArticle(articleId, {
            lastAiReviewedAt: now,
          });
          return res.json({ confidence, action: "revision", revisionId: revision.id, message: `Revision created (${confidence} confidence) — pending review` });
        }
      } catch (err: unknown) {
        console.error("[wiki/rewikify] Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}
