import os

with open('server/wikify-tool.ts', 'r') as f:
    content = f.read()

# Replace the first conflict
part1_old = """        if (!text.trim()) {
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
=======
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
          console.log();
        }

        const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
        const cleaned = raw.replace(/\n?/g, "").trim();

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
>>>>>>> 017c76f (Task #316: Wiki Lifecycle Management (Gap Analysis + Freshness + Re-wikify))"""

# Normalize markers for replacement - using a safer approach with string find/replace if possible
# but since the task requires exact resolution, I'll be careful.

# Let's try a simpler approach by just finding the conflict markers and removing them + merging.

def resolve_conflicts(text):
    import re
    # Match the first conflict block
    pattern1 = re.compile(r'<<<<<<< HEAD.*?=======.*?>>>>>>> 017c76f \(Task #316: Wiki Lifecycle Management \(Gap Analysis \+ Freshness \+ Re-wikify\)\)', re.DOTALL)
    
    # Actually, the conflict blocks are nested or separated.
    # Let's do it manually with markers.
    
    while '<<<<<<< HEAD' in text:
        start = text.find('<<<<<<< HEAD')
        sep = text.find('=======', start)
        end = text.find('>>>>>>>', sep)
        if sep == -1 or end == -1:
            break
        
        # Determine the whole line of the end marker
        end_marker_end = text.find('\n', end)
        if end_marker_end == -1: end_marker_end = len(text)
        
        head_part = text[start + len('<<<<<<< HEAD\n'):sep]
        theirs_part = text[sep + len('=======/n'):end]
        # Wait, the separator and markers might have different whitespace.
        
        # Strategy:
        # Conflict 1: lines 498-777
        # Conflict 2: lines 785-963
        
        # I will just write the whole content if I have to.
        break
    return text

# Actually, I'll just use sed to remove the markers and keep everything for Conflict 1
# and Conflict 2.

