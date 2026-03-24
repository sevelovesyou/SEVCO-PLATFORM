import {
  type User, type InsertUser, type UpdateUser,
  type Category, type InsertCategory,
  type Article, type InsertArticle,
  type Revision, type InsertRevision,
  type Citation, type InsertCitation,
  type Crosslink, type InsertCrosslink,
  users, categories, articles, revisions, citations, crosslinks,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: UpdateUser): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  getArticles(): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticlesByCategory(categoryId: number): Promise<Article[]>;
  searchArticles(query: string): Promise<Article[]>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: number, data: Partial<InsertArticle>): Promise<Article>;
  deleteArticle(id: number): Promise<void>;

  getRevisions(articleId: number): Promise<Revision[]>;
  getPendingRevisions(): Promise<(Revision & { article: Article })[]>;
  getAllRevisions(): Promise<(Revision & { article: Article })[]>;
  getPendingRevisionCount(): Promise<number>;
  createRevision(revision: InsertRevision): Promise<Revision>;
  updateRevisionStatus(id: number, status: string, reviewNote?: string): Promise<Revision>;

  getCitations(articleId: number): Promise<Citation[]>;
  createCitation(citation: InsertCitation): Promise<Citation>;
  updateCitation(id: number, data: Partial<InsertCitation>): Promise<Citation>;
  deleteCitationsByArticle(articleId: number): Promise<void>;

  getCrosslinks(articleId: number): Promise<(Crosslink & { targetArticle: Article })[]>;
  createCrosslink(crosslink: InsertCrosslink): Promise<Crosslink>;
  deleteCrosslinksBySource(sourceArticleId: number): Promise<void>;

  getStats(): Promise<{ totalArticles: number; totalRevisions: number; pendingReviews: number; totalCitations: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: UpdateUser): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.name);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug));
    return cat || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(category).returning();
    return cat;
  }

  async getArticles(): Promise<Article[]> {
    return db.select().from(articles).orderBy(desc(articles.updatedAt));
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article || undefined;
  }

  async getArticlesByCategory(categoryId: number): Promise<Article[]> {
    return db.select().from(articles).where(eq(articles.categoryId, categoryId)).orderBy(desc(articles.updatedAt));
  }

  async searchArticles(query: string): Promise<Article[]> {
    const pattern = `%${query}%`;
    return db.select().from(articles).where(
      or(
        ilike(articles.title, pattern),
        ilike(articles.summary, pattern),
        ilike(articles.content, pattern),
      )
    ).orderBy(desc(articles.updatedAt));
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const [created] = await db.insert(articles).values(article).returning();
    return created;
  }

  async updateArticle(id: number, data: Partial<InsertArticle>): Promise<Article> {
    const [updated] = await db
      .update(articles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(articles.id, id))
      .returning();
    return updated;
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(revisions).where(eq(revisions.articleId, id));
    await db.delete(citations).where(eq(citations.articleId, id));
    await db.delete(crosslinks).where(eq(crosslinks.sourceArticleId, id));
    await db.delete(crosslinks).where(eq(crosslinks.targetArticleId, id));
    await db.delete(articles).where(eq(articles.id, id));
  }

  async getRevisions(articleId: number): Promise<Revision[]> {
    return db.select().from(revisions).where(eq(revisions.articleId, articleId)).orderBy(desc(revisions.createdAt));
  }

  async getPendingRevisions(): Promise<(Revision & { article: Article })[]> {
    const rows = await db
      .select()
      .from(revisions)
      .innerJoin(articles, eq(revisions.articleId, articles.id))
      .where(eq(revisions.status, "pending"))
      .orderBy(desc(revisions.createdAt));

    return rows.map((r) => ({ ...r.revisions, article: r.articles }));
  }

  async getAllRevisions(): Promise<(Revision & { article: Article })[]> {
    const rows = await db
      .select()
      .from(revisions)
      .innerJoin(articles, eq(revisions.articleId, articles.id))
      .orderBy(desc(revisions.createdAt))
      .limit(50);

    return rows.map((r) => ({ ...r.revisions, article: r.articles }));
  }

  async getPendingRevisionCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(revisions)
      .where(eq(revisions.status, "pending"));
    return result?.count || 0;
  }

  async createRevision(revision: InsertRevision): Promise<Revision> {
    const [created] = await db.insert(revisions).values(revision).returning();
    return created;
  }

  async updateRevisionStatus(id: number, status: string, reviewNote?: string): Promise<Revision> {
    const updateData: any = { status };
    if (reviewNote) updateData.reviewNote = reviewNote;
    const [updated] = await db
      .update(revisions)
      .set(updateData)
      .where(eq(revisions.id, id))
      .returning();
    return updated;
  }

  async getCitations(articleId: number): Promise<Citation[]> {
    return db.select().from(citations).where(eq(citations.articleId, articleId));
  }

  async createCitation(citation: InsertCitation): Promise<Citation> {
    const [created] = await db.insert(citations).values(citation).returning();
    return created;
  }

  async updateCitation(id: number, data: Partial<InsertCitation>): Promise<Citation> {
    const [updated] = await db
      .update(citations)
      .set({ ...data, lastChecked: new Date() })
      .where(eq(citations.id, id))
      .returning();
    return updated;
  }

  async deleteCitationsByArticle(articleId: number): Promise<void> {
    await db.delete(citations).where(eq(citations.articleId, articleId));
  }

  async getCrosslinks(articleId: number): Promise<(Crosslink & { targetArticle: Article })[]> {
    const rows = await db
      .select()
      .from(crosslinks)
      .innerJoin(articles, eq(crosslinks.targetArticleId, articles.id))
      .where(eq(crosslinks.sourceArticleId, articleId))
      .orderBy(desc(crosslinks.relevanceScore));

    return rows.map((r) => ({ ...r.crosslinks, targetArticle: r.articles }));
  }

  async createCrosslink(crosslink: InsertCrosslink): Promise<Crosslink> {
    const [created] = await db.insert(crosslinks).values(crosslink).returning();
    return created;
  }

  async deleteCrosslinksBySource(sourceArticleId: number): Promise<void> {
    await db.delete(crosslinks).where(eq(crosslinks.sourceArticleId, sourceArticleId));
  }

  async getStats(): Promise<{ totalArticles: number; totalRevisions: number; pendingReviews: number; totalCitations: number }> {
    const [artCount] = await db.select({ count: sql<number>`count(*)::int` }).from(articles);
    const [revCount] = await db.select({ count: sql<number>`count(*)::int` }).from(revisions);
    const [pendCount] = await db.select({ count: sql<number>`count(*)::int` }).from(revisions).where(eq(revisions.status, "pending"));
    const [citCount] = await db.select({ count: sql<number>`count(*)::int` }).from(citations);

    return {
      totalArticles: artCount?.count || 0,
      totalRevisions: revCount?.count || 0,
      pendingReviews: pendCount?.count || 0,
      totalCitations: citCount?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
