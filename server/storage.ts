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
  type Job, type InsertJob,
  type JobApplication, type InsertJobApplication,
  type Playlist, type InsertPlaylist,
  type MusicSubmission, type InsertMusicSubmission,
  type PlatformSocialLink, type InsertPlatformSocialLink,
  type Note, type InsertNote, type NoteCollaborator, type NoteAttachment,
  type FeedPost, type InsertFeedPost,
  type Post, type InsertPost, type PostLike, type PostReply, type InsertPostReply, type UserFollow,
  type PlatformSetting,
  users, categories, articles, revisions, citations, crosslinks,
  artists, albums, products, projects, changelog, orders, services,
  jobs, jobApplications, playlists, musicSubmissions, platformSocialLinks, notes, feedPosts,
  posts, postLikes, postReplies, userFollows,
  noteCollaborators, noteAttachments, platformSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, or, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: UpdateUser): Promise<User>;
  updateUsername(id: string, username: string): Promise<User>;
  updateUserProfile(id: string, data: UpdateProfile): Promise<User>;
  updateUserRole(id: string, role: Role): Promise<User | undefined>;
  updateEmailVerification(id: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  getArticles(): Promise<Article[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticlesByCategory(categoryId: number): Promise<Article[]>;
  getArticlesByAuthor(authorName: string): Promise<Article[]>;
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
  getLatestChangelogEntry(): Promise<Changelog | undefined>;
  createChangelogEntry(entry: InsertChangelog): Promise<Changelog>;
  createChangelogEntryWithDate(entry: InsertChangelog, createdAt: Date): Promise<Changelog>;
  updateChangelogEntry(id: number, data: Partial<InsertChangelog>): Promise<Changelog>;
  getLatestArticleUpdatedAt(): Promise<Date | null>;

  getServices(): Promise<Service[]>;
  getServiceBySlug(slug: string): Promise<Service | undefined>;
  getServicesByCategory(category: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  getJobs(includeAll?: boolean): Promise<Job[]>;
  getJobBySlug(slug: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, data: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number): Promise<void>;
  getJobApplications(jobId?: number): Promise<JobApplication[]>;
  getUserJobApplication(userId: string, jobId: number): Promise<JobApplication | undefined>;
  createJobApplication(app: InsertJobApplication & { userId: string }): Promise<JobApplication>;
  updateJobApplicationStatus(id: number, status: string): Promise<JobApplication>;

  getPlaylists(officialOnly?: boolean): Promise<Playlist[]>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: number, data: Partial<InsertPlaylist>): Promise<Playlist>;
  deletePlaylist(id: number): Promise<void>;
  getMusicSubmissions(): Promise<MusicSubmission[]>;
  createMusicSubmission(sub: InsertMusicSubmission & { userId?: string | null }): Promise<MusicSubmission>;
  updateMusicSubmissionStatus(id: number, status: string): Promise<MusicSubmission>;

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

  getSocialLinks(): Promise<PlatformSocialLink[]>;
  createSocialLink(data: InsertPlatformSocialLink): Promise<PlatformSocialLink>;
  updateSocialLink(id: number, data: Partial<InsertPlatformSocialLink>): Promise<PlatformSocialLink>;
  deleteSocialLink(id: number): Promise<void>;
  seedSocialLinksIfEmpty(): Promise<void>;
  migrateSocialLinksShowOnListen(): Promise<void>;

  getNotes(authorId: string): Promise<Note[]>;
  getNoteById(id: number): Promise<Note | undefined>;
  createNote(data: InsertNote & { authorId: string }): Promise<Note>;
  updateNote(id: number, userId: string, data: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number, authorId: string): Promise<void>;
  getNoteCollaborators(noteId: number): Promise<(NoteCollaborator & { user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } })[]>;
  addNoteCollaborator(noteId: number, userId: string): Promise<NoteCollaborator>;
  removeNoteCollaborator(noteId: number, userId: string): Promise<void>;
  getNoteAttachments(noteId: number): Promise<NoteAttachment[]>;
  getNoteAttachmentById(attachmentId: number): Promise<NoteAttachment | undefined>;
  addNoteAttachment(noteId: number, resourceType: "project" | "article", resourceId: number): Promise<NoteAttachment>;
  removeNoteAttachment(attachmentId: number): Promise<void>;
  getPublicResourceNotes(resourceType: "project" | "article", resourceId: number): Promise<(Note & { author: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null })[]>;

  getFeedPosts(limit?: number): Promise<(FeedPost & { author: { username: string; displayName: string | null; avatarUrl: string | null } | null })[]>;
  createFeedPost(data: InsertFeedPost & { authorId: string }): Promise<FeedPost>;
  updateFeedPost(id: number, data: Partial<InsertFeedPost>): Promise<FeedPost>;
  deleteFeedPost(id: number): Promise<void>;

  getPosts(options: { userId?: string; followedByUserId?: string; limit?: number }): Promise<PostWithMeta[]>;
  getPostById(id: number): Promise<Post | undefined>;
  createPost(data: InsertPost & { authorId: string }): Promise<Post>;
  deletePost(id: number, authorId: string): Promise<void>;

  likePost(postId: number, userId: string): Promise<void>;
  unlikePost(postId: number, userId: string): Promise<void>;

  getReplies(postId: number): Promise<ReplyWithAuthor[]>;
  createReply(data: InsertPostReply & { postId: number; authorId: string }): Promise<PostReply>;

  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<FollowUser[]>;
  getFollowing(userId: string): Promise<FollowUser[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;

  getPlatformSettings(): Promise<Record<string, string>>;
  setPlatformSettings(entries: Record<string, string>): Promise<void>;
}

export type PostAuthor = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
export type PostWithMeta = Post & { author: PostAuthor; likeCount: number; replyCount: number; likedByCurrentUser: boolean };
export type ReplyWithAuthor = PostReply & { author: PostAuthor };
export type FollowUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

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

  async updateUsername(id: string, username: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ username })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserProfile(id: string, data: UpdateProfile): Promise<User> {
    const updateObj: Partial<typeof users.$inferInsert> = {};
    if (data.displayName !== undefined) updateObj.displayName = data.displayName;
    if (data.bio !== undefined) updateObj.bio = data.bio;
    if (data.avatarUrl !== undefined) updateObj.avatarUrl = data.avatarUrl;
    if (data.profileBgColor !== undefined) updateObj.profileBgColor = data.profileBgColor;
    if (data.profileAccentColor !== undefined) updateObj.profileAccentColor = data.profileAccentColor;
    if (data.profileBgImageUrl !== undefined) updateObj.profileBgImageUrl = data.profileBgImageUrl;
    if (data.socialLinks !== undefined) {
      const sl: unknown = data.socialLinks;
      updateObj.socialLinks = sl;
    }
    const [updated] = await db.update(users).set(updateObj).where(eq(users.id, id)).returning();
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

  async getArticleById(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article || undefined;
  }

  async getArticlesByCategory(categoryId: number): Promise<Article[]> {
    return db.select().from(articles).where(eq(articles.categoryId, categoryId)).orderBy(desc(articles.updatedAt));
  }

  async getArticlesByAuthor(authorName: string): Promise<Article[]> {
    return db.select().from(articles)
      .where(eq(articles.authorName, authorName))
      .orderBy(desc(articles.updatedAt))
      .limit(10);
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

  async getLatestChangelogEntry(): Promise<Changelog | undefined> {
    const [entry] = await db.select().from(changelog).orderBy(desc(changelog.createdAt)).limit(1);
    return entry || undefined;
  }

  async createChangelogEntry(entry: InsertChangelog): Promise<Changelog> {
    const [created] = await db.insert(changelog).values(entry).returning();
    return created;
  }

  async createChangelogEntryWithDate(entry: InsertChangelog, createdAt: Date): Promise<Changelog> {
    const [created] = await db.insert(changelog).values({ ...entry, createdAt }).returning();
    return created;
  }

  async updateChangelogEntry(id: number, data: Partial<InsertChangelog>): Promise<Changelog> {
    const [updated] = await db.update(changelog).set(data).where(eq(changelog.id, id)).returning();
    return updated;
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

  async getJobs(includeAll = false): Promise<Job[]> {
    const all = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    return includeAll ? all : all.filter((j) => j.status === "open");
  }

  async getJobBySlug(slug: string): Promise<Job | undefined> {
    const [row] = await db.select().from(jobs).where(eq(jobs.slug, slug));
    return row;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [row] = await db.insert(jobs).values(job).returning();
    return row;
  }

  async updateJob(id: number, data: Partial<InsertJob>): Promise<Job> {
    const [row] = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning();
    return row;
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  async getJobApplications(jobId?: number): Promise<JobApplication[]> {
    if (jobId) {
      return db.select().from(jobApplications).where(eq(jobApplications.jobId, jobId)).orderBy(desc(jobApplications.createdAt));
    }
    return db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
  }

  async getUserJobApplication(userId: string, jobId: number): Promise<JobApplication | undefined> {
    const [row] = await db.select().from(jobApplications)
      .where(and(eq(jobApplications.userId, userId), eq(jobApplications.jobId, jobId)));
    return row;
  }

  async createJobApplication(app: InsertJobApplication & { userId: string }): Promise<JobApplication> {
    const [row] = await db.insert(jobApplications).values(app).returning();
    return row;
  }

  async updateJobApplicationStatus(id: number, status: string): Promise<JobApplication> {
    const [row] = await db.update(jobApplications).set({ status }).where(eq(jobApplications.id, id)).returning();
    return row;
  }

  async getPlaylists(officialOnly = false): Promise<Playlist[]> {
    if (officialOnly) {
      return db.select().from(playlists).where(eq(playlists.isOfficial, true)).orderBy(desc(playlists.createdAt));
    }
    return db.select().from(playlists).orderBy(desc(playlists.createdAt));
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const [row] = await db.insert(playlists).values(playlist).returning();
    return row;
  }

  async updatePlaylist(id: number, data: Partial<InsertPlaylist>): Promise<Playlist> {
    const [row] = await db.update(playlists).set(data).where(eq(playlists.id, id)).returning();
    return row;
  }

  async deletePlaylist(id: number): Promise<void> {
    await db.delete(playlists).where(eq(playlists.id, id));
  }

  async getMusicSubmissions(): Promise<MusicSubmission[]> {
    return db.select().from(musicSubmissions).orderBy(desc(musicSubmissions.createdAt));
  }

  async createMusicSubmission(sub: InsertMusicSubmission & { userId?: string | null }): Promise<MusicSubmission> {
    const [row] = await db.insert(musicSubmissions).values(sub).returning();
    return row;
  }

  async updateMusicSubmissionStatus(id: number, status: string): Promise<MusicSubmission> {
    const [row] = await db.update(musicSubmissions).set({ status }).where(eq(musicSubmissions.id, id)).returning();
    return row;
  }

  async getSocialLinks(): Promise<PlatformSocialLink[]> {
    return db.select().from(platformSocialLinks).orderBy(platformSocialLinks.displayOrder);
  }

  async createSocialLink(data: InsertPlatformSocialLink): Promise<PlatformSocialLink> {
    const [row] = await db.insert(platformSocialLinks).values(data).returning();
    return row;
  }

  async updateSocialLink(id: number, data: Partial<InsertPlatformSocialLink>): Promise<PlatformSocialLink> {
    const [row] = await db.update(platformSocialLinks).set(data).where(eq(platformSocialLinks.id, id)).returning();
    return row;
  }

  async deleteSocialLink(id: number): Promise<void> {
    await db.delete(platformSocialLinks).where(eq(platformSocialLinks.id, id));
  }

  async migrateSocialLinksShowOnListen(): Promise<void> {
    const existing = await db.select().from(platformSocialLinks);
    if (existing.length === 0) return;
    const anyListenEnabled = existing.some((l) => l.showOnListen);
    if (anyListenEnabled) return;
    const listenPlatforms = new Set(["Instagram", "YouTube", "TikTok", "X", "Spotify", "Apple Music", "SoundCloud", "YouTube Music"]);
    const existingNames = new Set(existing.map((l) => l.platform));
    for (const link of existing) {
      if (listenPlatforms.has(link.platform)) {
        await db.update(platformSocialLinks).set({ showOnListen: true }).where(eq(platformSocialLinks.id, link.id));
      }
    }
    const streamingDefaults: Array<{ platform: string; url: string; iconName: string; displayOrder: number }> = [
      { platform: "Spotify",       url: "#", iconName: "SiSpotify",     displayOrder: 13 },
      { platform: "Apple Music",   url: "#", iconName: "SiApplemusic",  displayOrder: 14 },
      { platform: "SoundCloud",    url: "#", iconName: "SiSoundcloud",  displayOrder: 15 },
      { platform: "YouTube Music", url: "#", iconName: "SiYoutubemusic",displayOrder: 16 },
    ];
    for (const entry of streamingDefaults) {
      if (!existingNames.has(entry.platform)) {
        await db.insert(platformSocialLinks).values({
          ...entry,
          showInFooter: false,
          showOnContact: false,
          showOnListen: true,
        });
      }
    }
  }

  async seedSocialLinksIfEmpty(): Promise<void> {
    const existing = await db.select().from(platformSocialLinks).limit(1);
    if (existing.length > 0) return;
    const seeds: InsertPlatformSocialLink[] = [
      { platform: "Facebook",     url: "https://www.facebook.com/sevelovesyou/",            iconName: "SiFacebook",    displayOrder: 0,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Instagram",    url: "https://instagram.com/sevelovesyou",                iconName: "SiInstagram",   displayOrder: 1,  showInFooter: true,  showOnContact: true,  showOnListen: true  },
      { platform: "YouTube",      url: "https://www.youtube.com/@sevelovesyou",             iconName: "SiYoutube",     displayOrder: 2,  showInFooter: true,  showOnContact: false, showOnListen: true  },
      { platform: "TikTok",       url: "https://www.tiktok.com/@sevelovesu",                iconName: "SiTiktok",      displayOrder: 3,  showInFooter: true,  showOnContact: true,  showOnListen: true  },
      { platform: "X",            url: "https://x.com/sevelovesu",                          iconName: "SiX",           displayOrder: 4,  showInFooter: true,  showOnContact: true,  showOnListen: true  },
      { platform: "Threads",      url: "https://www.threads.com/@sevelovesyou",             iconName: "SiThreads",     displayOrder: 5,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "LinkedIn",     url: "https://www.linkedin.com/company/sev-co/",          iconName: "SiLinkedin",    displayOrder: 6,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Bluesky",      url: "https://bsky.app/profile/sevelovesyou.bsky.social", iconName: "SiBluesky",     displayOrder: 7,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Snapchat",     url: "https://www.snapchat.com/@sevelovesu",              iconName: "SiSnapchat",    displayOrder: 8,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Pinterest",    url: "https://pin.it/2iQOE7UYW",                          iconName: "SiPinterest",   displayOrder: 9,  showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Vimeo",        url: "https://vimeo.com/sevelovesyou",                    iconName: "SiVimeo",       displayOrder: 10, showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "GitHub",       url: "https://github.com/sevelovesyou",                   iconName: "SiGithub",      displayOrder: 11, showInFooter: true,  showOnContact: false, showOnListen: false },
      { platform: "Discord",      url: "https://discord.gg/sevco",                          iconName: "SiDiscord",     displayOrder: 12, showInFooter: false, showOnContact: true,  showOnListen: false },
      { platform: "Spotify",      url: "#",                                                 iconName: "SiSpotify",     displayOrder: 13, showInFooter: false, showOnContact: false, showOnListen: true  },
      { platform: "Apple Music",  url: "#",                                                 iconName: "SiApplemusic",  displayOrder: 14, showInFooter: false, showOnContact: false, showOnListen: true  },
      { platform: "SoundCloud",   url: "#",                                                 iconName: "SiSoundcloud",  displayOrder: 15, showInFooter: false, showOnContact: false, showOnListen: true  },
      { platform: "YouTube Music",url: "#",                                                 iconName: "SiYoutubemusic",displayOrder: 16, showInFooter: false, showOnContact: false, showOnListen: true  },
    ];
    await db.insert(platformSocialLinks).values(seeds);
  }

  async getNotes(authorId: string): Promise<Note[]> {
    const sharedNoteIds = db
      .select({ id: noteCollaborators.noteId })
      .from(noteCollaborators)
      .where(eq(noteCollaborators.userId, authorId));
    return db.select().from(notes)
      .where(or(eq(notes.authorId, authorId), sql`${notes.id} IN (${sharedNoteIds})`))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt));
  }

  async getNoteById(id: number): Promise<Note | undefined> {
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    return row;
  }

  async createNote(data: InsertNote & { authorId: string }): Promise<Note> {
    const [row] = await db.insert(notes).values(data).returning();
    return row;
  }

  async updateNote(id: number, userId: string, data: Partial<InsertNote>): Promise<Note> {
    const collaboratorIds = db
      .select({ id: noteCollaborators.userId })
      .from(noteCollaborators)
      .where(eq(noteCollaborators.noteId, id));
    const [row] = await db.update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), sql`(${notes.authorId} = ${userId} OR ${userId} IN (${collaboratorIds}))`))
      .returning();
    return row;
  }

  async deleteNote(id: number, authorId: string): Promise<void> {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.authorId, authorId)));
  }

  async getNoteCollaborators(noteId: number): Promise<(NoteCollaborator & { user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } })[]> {
    const rows = await db
      .select({
        collab: noteCollaborators,
        user: { id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(noteCollaborators)
      .innerJoin(users, eq(noteCollaborators.userId, users.id))
      .where(eq(noteCollaborators.noteId, noteId))
      .orderBy(noteCollaborators.addedAt);
    return rows.map((r) => ({ ...r.collab, user: r.user }));
  }

  async addNoteCollaborator(noteId: number, userId: string): Promise<NoteCollaborator> {
    const [row] = await db.insert(noteCollaborators).values({ noteId, userId }).onConflictDoNothing().returning();
    if (!row) {
      const [existing] = await db.select().from(noteCollaborators).where(and(eq(noteCollaborators.noteId, noteId), eq(noteCollaborators.userId, userId)));
      return existing;
    }
    await db.update(notes).set({ isShared: true }).where(eq(notes.id, noteId));
    return row;
  }

  async removeNoteCollaborator(noteId: number, userId: string): Promise<void> {
    await db.delete(noteCollaborators).where(and(eq(noteCollaborators.noteId, noteId), eq(noteCollaborators.userId, userId)));
    const [remaining] = await db.select({ count: sql<number>`count(*)::int` }).from(noteCollaborators).where(eq(noteCollaborators.noteId, noteId));
    if ((remaining?.count || 0) === 0) {
      await db.update(notes).set({ isShared: false }).where(eq(notes.id, noteId));
    }
  }

  async getNoteAttachments(noteId: number): Promise<NoteAttachment[]> {
    return db.select().from(noteAttachments).where(eq(noteAttachments.noteId, noteId)).orderBy(noteAttachments.addedAt);
  }

  async addNoteAttachment(noteId: number, resourceType: "project" | "article", resourceId: number): Promise<NoteAttachment> {
    const [row] = await db.insert(noteAttachments).values({ noteId, resourceType, resourceId }).onConflictDoNothing().returning();
    if (!row) {
      const [existing] = await db.select().from(noteAttachments).where(
        and(
          eq(noteAttachments.noteId, noteId),
          eq(noteAttachments.resourceType, resourceType),
          eq(noteAttachments.resourceId, resourceId),
        )
      );
      return existing;
    }
    return row;
  }

  async getNoteAttachmentById(attachmentId: number): Promise<NoteAttachment | undefined> {
    const [row] = await db.select().from(noteAttachments).where(eq(noteAttachments.id, attachmentId));
    return row || undefined;
  }

  async removeNoteAttachment(attachmentId: number): Promise<void> {
    await db.delete(noteAttachments).where(eq(noteAttachments.id, attachmentId));
  }

  async getPublicResourceNotes(resourceType: "project" | "article", resourceId: number): Promise<(Note & { author: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null })[]> {
    const rows = await db
      .select({
        note: notes,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(noteAttachments)
      .innerJoin(notes, eq(noteAttachments.noteId, notes.id))
      .innerJoin(users, eq(notes.authorId, users.id))
      .where(
        and(
          eq(noteAttachments.resourceType, resourceType),
          eq(noteAttachments.resourceId, resourceId),
          inArray(users.role, ["admin", "executive", "staff"]),
        )
      )
      .orderBy(noteAttachments.addedAt);
    return rows.map((r) => ({
      ...r.note,
      author: { id: r.author.id, username: r.author.username, displayName: r.author.displayName, avatarUrl: r.author.avatarUrl },
    }));
  }

  async getFeedPosts(limit = 50): Promise<(FeedPost & { author: { username: string; displayName: string | null; avatarUrl: string | null } | null })[]> {
    const rows = await db
      .select({
        post: feedPosts,
        author: {
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(feedPosts)
      .leftJoin(users, eq(feedPosts.authorId, users.id))
      .orderBy(desc(feedPosts.pinned), desc(feedPosts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.post,
      author: r.author?.username ? r.author : null,
    }));
  }

  async createFeedPost(data: InsertFeedPost & { authorId: string }): Promise<FeedPost> {
    const [row] = await db.insert(feedPosts).values(data).returning();
    return row;
  }

  async updateFeedPost(id: number, data: Partial<InsertFeedPost>): Promise<FeedPost> {
    const [row] = await db.update(feedPosts).set({ ...data, updatedAt: new Date() }).where(eq(feedPosts.id, id)).returning();
    return row;
  }

  async deleteFeedPost(id: number): Promise<void> {
    await db.delete(feedPosts).where(eq(feedPosts.id, id));
  }

  private async getPostsBase(
    whereClause: ReturnType<typeof and> | ReturnType<typeof eq> | undefined,
    currentUserId: string | undefined,
    limit = 50
  ): Promise<PostWithMeta[]> {
    const rows = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        likeCount: sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = ${posts.id})::int`,
        replyCount: sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = ${posts.id})::int`,
        likedByCurrentUser: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM post_likes WHERE post_id = ${posts.id} AND user_id = ${currentUserId})`
          : sql<boolean>`false`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.post,
      author: r.author,
      likeCount: r.likeCount,
      replyCount: r.replyCount,
      likedByCurrentUser: r.likedByCurrentUser,
    }));
  }

  async getPosts({ userId, followedByUserId, limit = 50 }: { userId?: string; followedByUserId?: string; limit?: number }): Promise<PostWithMeta[]> {
    if (userId) {
      return this.getPostsBase(eq(posts.authorId, userId), followedByUserId, limit);
    }
    if (followedByUserId) {
      const followingIds = db
        .select({ id: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, followedByUserId));
      return this.getPostsBase(
        sql`(${posts.authorId} IN (${followingIds}) OR ${posts.authorId} = ${followedByUserId})`,
        followedByUserId,
        limit
      );
    }
    return this.getPostsBase(undefined, undefined, limit);
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const [row] = await db.select().from(posts).where(eq(posts.id, id));
    return row || undefined;
  }

  async createPost(data: InsertPost & { authorId: string }): Promise<Post> {
    const [row] = await db.insert(posts).values(data).returning();
    return row;
  }

  async deletePost(id: number, authorId: string): Promise<void> {
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, authorId)));
  }

  async likePost(postId: number, userId: string): Promise<void> {
    await db.insert(postLikes).values({ postId, userId }).onConflictDoNothing();
  }

  async unlikePost(postId: number, userId: string): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
  }

  async getReplies(postId: number): Promise<ReplyWithAuthor[]> {
    const rows = await db
      .select({
        reply: postReplies,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(postReplies)
      .innerJoin(users, eq(postReplies.authorId, users.id))
      .where(eq(postReplies.postId, postId))
      .orderBy(postReplies.createdAt);

    return rows.map((r) => ({ ...r.reply, author: r.author }));
  }

  async createReply(data: InsertPostReply & { postId: number; authorId: string }): Promise<PostReply> {
    const [row] = await db.insert(postReplies).values(data).returning();
    return row;
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await db.insert(userFollows).values({ followerId, followingId }).onConflictDoNothing();
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(userFollows).where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [row] = await db.select().from(userFollows).where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return !!row;
  }

  async getFollowers(userId: string): Promise<FollowUser[]> {
    const rows = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .orderBy(users.username);
    return rows;
  }

  async getFollowing(userId: string): Promise<FollowUser[]> {
    const rows = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .orderBy(users.username);
    return rows;
  }

  async getFollowerCount(userId: string): Promise<number> {
    const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(userFollows).where(eq(userFollows.followingId, userId));
    return r?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [r] = await db.select({ count: sql<number>`count(*)::int` }).from(userFollows).where(eq(userFollows.followerId, userId));
    return r?.count || 0;
  }

  async getPlatformSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(platformSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async setPlatformSettings(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await db
        .insert(platformSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value } });
    }
  }
}

export const storage = new DatabaseStorage();
