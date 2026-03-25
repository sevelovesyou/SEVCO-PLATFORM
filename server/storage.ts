import {
  type User, type InsertUser, type UpdateUser, type UpdateProfile, type Role,
  type Category, type InsertCategory,
  type Article, type InsertArticle,
  type Revision, type InsertRevision,
  type Citation, type InsertCitation,
  type Crosslink, type InsertCrosslink,
  type Artist, type InsertArtist,
  type Album, type InsertAlbum,
  type Product, type InsertProduct,
  type Project, type InsertProject,
  type Changelog, type InsertChangelog,
  type Order, type InsertOrder,
  type Service, type InsertService,
  users, categories, articles, revisions, citations, crosslinks,
  artists, albums, products, projects, changelog, orders, services,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: UpdateUser): Promise<User>;
  updateUserProfile(id: string, data: UpdateProfile): Promise<User>;
  updateUserRole(id: string, role: Role): Promise<User | undefined>;
  updateEmailVerification(id: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User>;

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
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  getRevisionsByAuthor(authorName: string): Promise<(Revision & { article: Article })[]>;

  getArtists(): Promise<Artist[]>;
  getArtistBySlug(slug: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;

  getAlbums(): Promise<(Album & { artist: Artist })[]>;
  getAlbumsByArtist(artistId: number): Promise<Album[]>;
  getAlbumBySlug(slug: string): Promise<(Album & { artist: Artist }) | undefined>;
  createAlbum(album: InsertAlbum): Promise<Album>;

  getProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryName: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductStockStatus(id: number, stockStatus: string): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  updateProduct(id: number, data: Partial<InsertProduct & { stripeProductId: string; stripePriceId: string }>): Promise<Product>;

  getOrders(): Promise<Order[]>;
  getOrderBySessionId(sessionId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, paymentIntentId?: string): Promise<Order>;

  getProjects(): Promise<Project[]>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project>;

  getChangelog(): Promise<Changelog[]>;
  createChangelogEntry(entry: InsertChangelog): Promise<Changelog>;
  getLatestArticleUpdatedAt(): Promise<Date | null>;

  getServices(): Promise<Service[]>;
  getServiceBySlug(slug: string): Promise<Service | undefined>;
  getServicesByCategory(category: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  getStoreStats(): Promise<{
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    catalogValue: number;
    avgPrice: number;
    byCategory: Array<{ name: string; count: number; value: number }>;
    byStockStatus: Array<{ status: string; count: number }>;
    byPriceRange: Array<{ range: string; count: number }>;
  }>;
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

  async updateUserProfile(id: string, data: UpdateProfile): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data as any)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async updateUserRole(id: string, role: Role): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateEmailVerification(id: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User> {
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.role, users.username);
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    return result?.count || 0;
  }

  async getRevisionsByAuthor(authorName: string): Promise<(Revision & { article: Article })[]> {
    const rows = await db
      .select()
      .from(revisions)
      .innerJoin(articles, eq(revisions.articleId, articles.id))
      .where(eq(revisions.authorName, authorName))
      .orderBy(desc(revisions.createdAt))
      .limit(10);
    return rows.map((r) => ({ ...r.revisions, article: r.articles }));
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

  async getArtists(): Promise<Artist[]> {
    return db.select().from(artists).orderBy(artists.name);
  }

  async getArtistBySlug(slug: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.slug, slug));
    return artist || undefined;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [created] = await db.insert(artists).values(artist).returning();
    return created;
  }

  async getAlbums(): Promise<(Album & { artist: Artist })[]> {
    const rows = await db
      .select()
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(desc(albums.releaseYear), albums.title);
    return rows.map((r) => ({ ...r.albums, artist: r.artists }));
  }

  async getAlbumsByArtist(artistId: number): Promise<Album[]> {
    return db
      .select()
      .from(albums)
      .where(eq(albums.artistId, artistId))
      .orderBy(desc(albums.releaseYear));
  }

  async getAlbumBySlug(slug: string): Promise<(Album & { artist: Artist }) | undefined> {
    const rows = await db
      .select()
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.slug, slug));
    if (!rows[0]) return undefined;
    return { ...rows[0].albums, artist: rows[0].artists };
  }

  async createAlbum(album: InsertAlbum): Promise<Album> {
    const [created] = await db.insert(albums).values(album).returning();
    return created;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(products.categoryName, products.name);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product || undefined;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByCategory(categoryName: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.categoryName, categoryName)).orderBy(products.name);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProductStockStatus(id: number, stockStatus: string): Promise<Product> {
    const [updated] = await db.update(products).set({ stockStatus }).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProduct(id: number, data: Partial<any>): Promise<Product> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderBySessionId(sessionId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrderStatus(id: number, status: string, paymentIntentId?: string): Promise<Order> {
    const updateData: any = { status };
    if (paymentIntentId) updateData.stripePaymentIntentId = paymentIntentId;
    const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(projects.name);
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async getChangelog(): Promise<Changelog[]> {
    return db.select().from(changelog).orderBy(desc(changelog.createdAt));
  }

  async createChangelogEntry(entry: InsertChangelog): Promise<Changelog> {
    const [created] = await db.insert(changelog).values(entry).returning();
    return created;
  }

  async getLatestArticleUpdatedAt(): Promise<Date | null> {
    const [result] = await db
      .select({ maxUpdatedAt: sql<string>`MAX(updated_at)` })
      .from(articles);
    return result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null;
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.category, services.name);
  }

  async getServiceBySlug(slug: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.slug, slug));
    return service || undefined;
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.category, category)).orderBy(services.name);
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: number, data: Partial<InsertService>): Promise<Service> {
    const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getStoreStats(): Promise<{
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    catalogValue: number;
    avgPrice: number;
    byCategory: Array<{ name: string; count: number; value: number }>;
    byStockStatus: Array<{ status: string; count: number }>;
    byPriceRange: Array<{ range: string; count: number }>;
  }> {
    const all = await db.select().from(products);

    const totalProducts = all.length;
    const inStock = all.filter((p) => p.stockStatus === "available").length;
    const outOfStock = all.filter((p) => p.stockStatus !== "available").length;
    const catalogValue = all.reduce((sum, p) => sum + (p.price ?? 0), 0);
    const avgPrice = totalProducts > 0 ? catalogValue / totalProducts : 0;

    const categoryMap: Record<string, { count: number; value: number }> = {};
    for (const p of all) {
      const cat = p.categoryName || "Uncategorized";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
      categoryMap[cat].count++;
      categoryMap[cat].value += p.price ?? 0;
    }
    const byCategory = Object.entries(categoryMap)
      .map(([name, v]) => ({ name, count: v.count, value: Math.round(v.value * 100) / 100 }))
      .sort((a, b) => b.count - a.count);

    const statusMap: Record<string, number> = {};
    for (const p of all) {
      const s = p.stockStatus || "available";
      statusMap[s] = (statusMap[s] || 0) + 1;
    }
    const byStockStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const rangeLabels = ["<$25", "$25–$50", "$50–$100", "$100+"];
    const rangeCounts = [0, 0, 0, 0];
    for (const p of all) {
      const price = p.price ?? 0;
      if (price < 25) rangeCounts[0]++;
      else if (price < 50) rangeCounts[1]++;
      else if (price < 100) rangeCounts[2]++;
      else rangeCounts[3]++;
    }
    const byPriceRange = rangeLabels.map((range, i) => ({ range, count: rangeCounts[i] }));

    return { totalProducts, inStock, outOfStock, catalogValue: Math.round(catalogValue * 100) / 100, avgPrice: Math.round(avgPrice * 100) / 100, byCategory, byStockStatus, byPriceRange };
  }
}

export const storage = new DatabaseStorage();
