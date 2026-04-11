import { storage } from "./storage";
import { db } from "./db";
import { crosslinks, articles, categories } from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

const SEE_PATTERN = /\[See:\s*([^\]]+)\]/g;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ResolverResult {
  updatedContent: string;
  resolved: Array<{ stubText: string; targetArticleId: number; targetSlug: string }>;
  unresolved: Array<{ stubText: string; count: number }>;
}

interface ArticleRef {
  id: number;
  title: string;
  slug: string;
  status: string;
  categorySlug: string | null;
}

export async function resolveLinksInContent(
  content: string,
  articleRefs: ArticleRef[]
): Promise<ResolverResult> {
  const publishedRefs = articleRefs.filter((a) => a.status === "published");

  const normalizedMap = new Map<string, ArticleRef>();
  for (const ref of publishedRefs) {
    normalizedMap.set(normalizeTitle(ref.title), ref);
  }

  const resolved: ResolverResult["resolved"] = [];
  const unresolvedCounts = new Map<string, number>();
  const seenResolved = new Set<string>();

  const updatedContent = content.replace(SEE_PATTERN, (_match, rawTopic: string) => {
    const stubText = rawTopic.trim();
    const normalized = normalizeTitle(stubText);
    const match = normalizedMap.get(normalized);

    if (match) {
      const url = match.categorySlug
        ? `/wiki/${match.categorySlug}/${match.slug}`
        : `/wiki/${match.slug}`;
      if (!seenResolved.has(stubText)) {
        resolved.push({ stubText, targetArticleId: match.id, targetSlug: match.slug });
        seenResolved.add(stubText);
      }
      return `[${stubText}](${url})`;
    }

    unresolvedCounts.set(stubText, (unresolvedCounts.get(stubText) ?? 0) + 1);
    return _match;
  });

  const unresolved = Array.from(unresolvedCounts.entries()).map(([stubText, count]) => ({
    stubText,
    count,
  }));

  return { updatedContent, resolved, unresolved };
}

export async function resolveArticleLinks(
  articleId: number,
  options?: { content?: string; writeBack?: boolean }
): Promise<ResolverResult> {
  const rows = await db
    .select({
      article: articles,
      categorySlug: categories.slug,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id));

  const sourceRow = rows.find((r) => r.article.id === articleId);
  if (!sourceRow) {
    return { updatedContent: "", resolved: [], unresolved: [] };
  }

  const contentToResolve = options?.content ?? sourceRow.article.content;
  const writeBack = options?.writeBack ?? true;

  const articleRefs: ArticleRef[] = rows
    .filter((r) => r.article.id !== articleId)
    .map((r) => ({
      id: r.article.id,
      title: r.article.title,
      slug: r.article.slug,
      status: r.article.status,
      categorySlug: r.categorySlug ?? null,
    }));

  const result = await resolveLinksInContent(contentToResolve, articleRefs);

  if (writeBack && result.updatedContent !== contentToResolve) {
    await storage.updateArticle(articleId, { content: result.updatedContent });
  }

  // Fetch current resolver-owned forward crosslinks from this source
  const existingForwardLinks = await db
    .select({ targetArticleId: crosslinks.targetArticleId })
    .from(crosslinks)
    .where(
      and(
        eq(crosslinks.sourceArticleId, articleId),
        sql`${crosslinks.sharedKeywords} @> ARRAY['__resolved_link']::text[]`
      )
    );
  const previousTargetIds = new Set(existingForwardLinks.map((r) => r.targetArticleId));
  const newTargetIds = new Set(result.resolved.map((r) => r.targetArticleId));

  // Remove forward links for targets no longer resolved
  const removedTargetIds = [...previousTargetIds].filter((id) => !newTargetIds.has(id));
  if (removedTargetIds.length > 0) {
    await db
      .delete(crosslinks)
      .where(
        and(
          eq(crosslinks.sourceArticleId, articleId),
          inArray(crosslinks.targetArticleId, removedTargetIds),
          sql`${crosslinks.sharedKeywords} @> ARRAY['__resolved_link']::text[]`
        )
      );
  }

  // Add forward + reverse links for newly resolved targets (deduplicated by targetArticleId)
  const seenNewTargets = new Set<number>();
  for (const r of result.resolved) {
    if (previousTargetIds.has(r.targetArticleId)) continue;
    if (seenNewTargets.has(r.targetArticleId)) continue;
    seenNewTargets.add(r.targetArticleId);
    {
      await storage.createCrosslink({
        sourceArticleId: articleId,
        targetArticleId: r.targetArticleId,
        relevanceScore: 1.0,
        sharedKeywords: ["__resolved_link"],
      });

      // Add reverse edge only if none exists (from any source)
      const [existing] = await db
        .select()
        .from(crosslinks)
        .where(
          and(
            eq(crosslinks.sourceArticleId, r.targetArticleId),
            eq(crosslinks.targetArticleId, articleId)
          )
        )
        .limit(1);
      if (!existing) {
        await storage.createCrosslink({
          sourceArticleId: r.targetArticleId,
          targetArticleId: articleId,
          relevanceScore: 1.0,
          sharedKeywords: ["__resolved_link"],
        });
      }
    }
  }

  // Update stubs (always reflects current content scan)
  await storage.deleteWikiLinkStubsByArticle(articleId);
  for (const u of result.unresolved) {
    await storage.upsertWikiLinkStub(articleId, u.stubText, u.count);
  }

  return result;
}
