import {
  type User, type InsertUser, type UpdateUser, type UpdateProfile, type Role, type CreateOAuthUser,
  type Category, type InsertCategory,
  type Article, type InsertArticle,
  type Revision, type InsertRevision,
  type Citation, type InsertCitation,
  type Crosslink, type InsertCrosslink,
  type Artist, type InsertArtist,
  type Album, type InsertAlbum,
  type MusicTrack, type InsertMusicTrack,
  type Product, type InsertProduct,
  type StoreCategory, type InsertStoreCategory,
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
  type Post, type InsertPost, type PostReply, type InsertPostReply, type UserFollow,
  type PlatformSetting,
  type BrandAsset, type InsertBrandAsset,
  type ShaderPreset, type InsertShaderPreset,
  type Resource, type InsertResource,
  type GalleryImage, type InsertGalleryImage,
  type SpotifyArtist, type InsertSpotifyArtist,
  type ContactSubmission, type InsertContactSubmission,
  type StaffOrgNode, type InsertStaffOrgNode,
  type ChatChannel, type InsertChatChannel,
  type ChatMessage, type InsertChatMessage,
  type FinanceProject, type InsertFinanceProject,
  type FinanceTransaction, type InsertFinanceTransaction,
  type FinanceInvoice, type InsertFinanceInvoice,
  type MinecraftServer, type InsertMinecraftServer,
  type Subscription, type InsertSubscription,
  type AiAgent, type InsertAiAgent,
  type AiMessage, type InsertAiMessage,
  type AiMessageFeedback, type InsertAiMessageFeedback,
  type NewsCategory, type InsertNewsCategory,
  type UserNewsBookmark, type InsertUserNewsBookmark,
  type UserNewsPreferences,
  type Email, type InsertEmail,
  type UserTask, type InsertUserTask, type UpdateUserTask,
  type StaffTask, type InsertStaffTask, type UpdateStaffTask,
  type Domain, type InsertDomain,
  type Notification, type InsertNotification,
  type SystemMailbox, type InsertSystemMailbox,
  type SystemMailboxEmail, type InsertSystemMailboxEmail,
  type MarketData, type InsertMarketData,
  type NewsItem,
  type SparkTransaction, type InsertSparkTransaction,
  type SparkPack, type InsertSparkPack,
  type WikiLinkStub,
  users, categories, articles, revisions, citations, crosslinks, wikiLinkStubs,
  artists, albums, products, projects, changelog, orders, services,
  jobs, jobApplications, playlists, musicSubmissions, platformSocialLinks, notes, feedPosts,
  posts, postReplies, userFollows,
  noteCollaborators, noteAttachments, platformSettings, brandAssets, shaderPresets, resources, galleryImages, spotifyArtists,
  postSparks, articleSparks, gallerySparks, trackSparks, productSparks, projectSparks, serviceSparks,
  contactSubmissions,
  staffOrgNodes,
  chatChannels, chatMessages,
  financeProjects, financeTransactions, financeInvoices,
  minecraftServers,
  subscriptions,
  aiAgents, aiMessages, aiMessageFeedback,
  newsCategories,
  userNewsBookmarks,
  userNewsPreferences,
  emails,
  domains,
  userTasks,
  staffTasks,
  notifications,
  musicTracks,
  systemMailboxes,
  systemMailboxEmails,
  storeCategories,
  marketData,
  newsItems,
  sparkTransactions,
  sparkPacks,
  wikiSources,
  type WikiSource,
  type InsertWikiSource,
  wikiLinkSuggestions,
  type WikiLinkSuggestion,
  type InsertWikiLinkSuggestion,
  wikiLlmUsage,
  type WikiLlmUsage,
  type InsertWikiLlmUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql, ilike, or, inArray, gte, lte, isNull, count as countFn, type SQL } from "drizzle-orm";

export class InsufficientSparksError extends Error {
  readonly currentBalance: number;
  readonly requested: number;
  constructor(currentBalance: number, requested: number) {
    super(`Insufficient Sparks: balance ${currentBalance} < requested ${requested}`);
    this.name = "InsufficientSparksError";
    this.currentBalance = currentBalance;
    this.requested = requested;
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByXId(xId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOAuthUser(data: CreateOAuthUser): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUser(id: string, data: UpdateUser): Promise<User>;
  updateUsername(id: string, username: string): Promise<User>;
  updateUserProfile(id: string, data: UpdateProfile): Promise<User>;
  updateUserRole(id: string, role: Role): Promise<User | undefined>;
  updateEmailVerification(id: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User>;
  linkUserXAccount(userId: string, xId: string): Promise<User>;
  unlinkUserXAccount(userId: string): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  updateCategoryParent(categoryId: number, parentId: number | null): Promise<void>;

  getArticles(): Promise<(Article & { category?: { id: number; name: string; slug: string } | null })[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticlesByCategory(categoryId: number): Promise<(Article & { author?: { username: string; displayName: string | null } | null })[]>;
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
  deleteResolverCrosslinksBySource(sourceArticleId: number): Promise<void>;

  getWikiLinkStubs(): Promise<WikiLinkStub[]>;
  getWikiLinkStubSummary(): Promise<Array<{ stubText: string; totalOccurrences: number; articleCount: number }>>;
  getResolvedLinksCount(): Promise<number>;
  upsertWikiLinkStub(articleId: number, stubText: string, occurrences: number): Promise<void>;
  deleteWikiLinkStubsByArticle(articleId: number): Promise<void>;

  getStats(): Promise<{ totalArticles: number; totalRevisions: number; pendingReviews: number; totalCitations: number }>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  getRevisionsByAuthor(authorName: string): Promise<(Revision & { article: Article })[]>;

  getArtists(): Promise<Artist[]>;
  getArtistBySlug(slug: string): Promise<Artist | undefined>;
  getUsersWithLinkedArtist(): Promise<User[]>;
  getUserByLinkedArtistId(artistId: number): Promise<User | undefined>;
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

  getStoreCategories(): Promise<StoreCategory[]>;
  createStoreCategory(data: InsertStoreCategory): Promise<StoreCategory>;
  updateStoreCategory(id: number, data: Partial<InsertStoreCategory>): Promise<StoreCategory | undefined>;
  deleteStoreCategory(id: number): Promise<void>;

  getOrders(): Promise<Order[]>;
  getOrderBySessionId(sessionId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, paymentIntentId?: string): Promise<Order>;

  getProjects(): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

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
  getMusicSubmissionById(id: number): Promise<MusicSubmission | undefined>;
  createMusicSubmission(sub: InsertMusicSubmission & { userId?: string | null }): Promise<MusicSubmission>;
  updateMusicSubmissionStatus(id: number, status: string): Promise<MusicSubmission>;
  updateMusicSubmissionTrackFile(id: number, trackFileUrl: string): Promise<MusicSubmission>;

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

  getPosts(options: { userId?: string; followedByUserId?: string; currentUserId?: string; limit?: number }): Promise<PostWithMeta[]>;
  getPostById(id: number): Promise<Post | undefined>;
  createPost(data: InsertPost & { authorId: string }): Promise<Post>;
  deletePost(id: number, authorId: string): Promise<void>;
  repostPost(originalPostId: number, userId: string): Promise<Post>;
  unrepostPost(originalPostId: number, userId: string): Promise<void>;
  hasReposted(originalPostId: number, userId: string): Promise<boolean>;

  getReplies(postId: number): Promise<ReplyWithAuthor[]>;
  createReply(data: InsertPostReply & { postId: number; authorId: string }): Promise<PostReply>;

  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<FollowUser[]>;
  getFollowing(userId: string): Promise<FollowUser[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getTopFollowedUsers(limit: number, currentUserId?: string): Promise<DiscoverUser[]>;
  searchUsers(query: string, currentUserId?: string): Promise<DiscoverUser[]>;

  getPlatformSettings(): Promise<Record<string, string>>;
  setPlatformSettings(entries: Record<string, string>): Promise<void>;
  setPlatformSetting(key: string, value: string): Promise<void>;
  searchAll(query: string, isStaff: boolean, limit: number): Promise<SearchAllResult>;

  getBrandAssets(isPublic?: boolean): Promise<BrandAsset[]>;
  createBrandAsset(data: InsertBrandAsset): Promise<BrandAsset>;
  updateBrandAsset(id: number, data: Partial<InsertBrandAsset>): Promise<BrandAsset>;
  deleteBrandAsset(id: number): Promise<void>;

  getShaderPresets(): Promise<ShaderPreset[]>;
  getShaderPreset(id: number): Promise<ShaderPreset | undefined>;
  createShaderPreset(data: InsertShaderPreset): Promise<ShaderPreset>;
  updateShaderPreset(id: number, data: Partial<InsertShaderPreset>): Promise<ShaderPreset>;
  deleteShaderPreset(id: number): Promise<void>;

  getResources(): Promise<Resource[]>;
  createResource(data: InsertResource): Promise<Resource>;
  updateResource(id: number, data: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  getGalleryImages(category?: string, isPublic?: boolean): Promise<GalleryImage[]>;
  createGalleryImage(data: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: number, data: Partial<InsertGalleryImage>): Promise<GalleryImage>;
  deleteGalleryImage(id: number): Promise<void>;

  getSpotifyArtists(): Promise<SpotifyArtist[]>;
  addSpotifyArtist(data: InsertSpotifyArtist): Promise<SpotifyArtist>;
  removeSpotifyArtist(id: number): Promise<void>;

  getContactSubmissions(filters?: { subject?: string; status?: string }): Promise<ContactSubmission[]>;
  getContactSubmissionById(id: number): Promise<ContactSubmission | undefined>;
  createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission>;
  updateContactSubmission(id: number, data: { status?: string; staffNote?: string; repliedAt?: Date | null }): Promise<ContactSubmission>;
  getStaffUsers(): Promise<StaffUserWithNode[]>;
  getStaffOrgNodes(): Promise<StaffOrgNode[]>;
  createStaffOrgNode(data: InsertStaffOrgNode): Promise<StaffOrgNode>;
  updateStaffOrgNode(id: number, data: Partial<InsertStaffOrgNode>): Promise<StaffOrgNode>;
  deleteStaffOrgNode(id: number): Promise<void>;

  getChatChannels(): Promise<ChatChannel[]>;
  getChatChannelById(id: number): Promise<ChatChannel | undefined>;
  createChatChannel(data: InsertChatChannel & { createdBy: string }): Promise<ChatChannel>;
  updateChatChannel(id: number, data: Partial<InsertChatChannel>): Promise<ChatChannel>;
  deleteChatChannel(id: number): Promise<void>;
  getChannelMessages(channelId: number, before?: number, limit?: number): Promise<ChatMessageWithUsers[]>;
  sendChannelMessage(data: InsertChatMessage & { fromUserId: string }): Promise<ChatMessage>;
  getDmMessages(userId1: string, userId2: string, before?: number, limit?: number): Promise<ChatMessageWithUsers[]>;
  sendDmMessage(fromUserId: string, toUserId: string, content: string): Promise<ChatMessage>;
  getAllChatMessages(filters?: { channelId?: number; userId?: string; dateFrom?: Date; dateTo?: Date }): Promise<ChatMessageWithUsers[]>;
  softDeleteChatMessage(id: number): Promise<ChatMessage>;
  getDmThreads(userId: string): Promise<DmThread[]>;

  getProjectFinancialSummary(projectId: number): Promise<{ totalIncome: number; totalExpenses: number; balance: number }>;

  getFinanceProjects(): Promise<FinanceProject[]>;
  getFinanceProjectById(id: number): Promise<FinanceProject | undefined>;
  createFinanceProject(data: InsertFinanceProject): Promise<FinanceProject>;
  updateFinanceProject(id: number, data: Partial<InsertFinanceProject>): Promise<FinanceProject>;
  deleteFinanceProject(id: number): Promise<void>;

  getFinanceTransactions(filters?: { type?: string; projectId?: number }): Promise<FinanceTransaction[]>;
  getFinanceTransactionById(id: number): Promise<FinanceTransaction | undefined>;
  createFinanceTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction>;
  updateFinanceTransaction(id: number, data: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction>;
  deleteFinanceTransaction(id: number): Promise<void>;

  getFinanceInvoices(): Promise<FinanceInvoice[]>;
  getFinanceInvoiceById(id: number): Promise<FinanceInvoice | undefined>;
  createFinanceInvoice(data: InsertFinanceInvoice): Promise<FinanceInvoice>;
  updateFinanceInvoice(id: number, data: Partial<InsertFinanceInvoice>): Promise<FinanceInvoice>;
  deleteFinanceInvoice(id: number): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;
  getFinanceSummary(): Promise<{ totalIncomeMonth: number; totalExpensesMonth: number; netBalance: number; outstandingInvoices: number; monthlyData: Array<{ month: string; income: number; expenses: number }> }>;

  getMinecraftServers(): Promise<MinecraftServer[]>;
  getAllMinecraftServers(): Promise<MinecraftServer[]>;
  createMinecraftServer(data: InsertMinecraftServer): Promise<MinecraftServer>;
  updateMinecraftServer(id: number, data: Partial<InsertMinecraftServer>): Promise<MinecraftServer>;
  deleteMinecraftServer(id: number): Promise<void>;

  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription>;
  deleteSubscription(id: number): Promise<void>;

  getAiAgents(enabledOnly?: boolean): Promise<AiAgent[]>;
  getAiAgentById(id: number): Promise<AiAgent | undefined>;
  createAiAgent(data: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: number, data: Partial<InsertAiAgent>): Promise<AiAgent>;
  deleteAiAgent(id: number): Promise<void>;

  getAiMessages(agentId: number, userId: string): Promise<AiMessage[]>;
  getAiMessageById(id: number): Promise<AiMessage | undefined>;
  createAiMessage(data: InsertAiMessage): Promise<AiMessage>;
  deleteAiMessage(id: number, agentId: number, userId: string): Promise<void>;
  clearAiConversation(agentId: number, userId: string): Promise<void>;
  upsertMessageFeedback(data: InsertAiMessageFeedback): Promise<AiMessageFeedback>;

  getNewsCategories(enabledOnly?: boolean): Promise<NewsCategory[]>;
  getNewsCategoryById(id: number): Promise<NewsCategory | undefined>;
  createNewsCategory(data: InsertNewsCategory): Promise<NewsCategory>;
  updateNewsCategory(id: number, data: Partial<InsertNewsCategory>): Promise<NewsCategory>;
  deleteNewsCategory(id: number): Promise<void>;
  seedNewsCategoriesIfEmpty(): Promise<void>;
  getNewsFeedItems(categoryQuery: string, limit: number): Promise<NewsItem[]>;
  searchNewsItems(searchText: string, limit: number): Promise<NewsItem[]>;
  getNewsCacheStats(): Promise<{ rss: number; tavily: number; x: number; total: number }>;

  createEmail(data: InsertEmail): Promise<Email>;
  getEmails(userId: string, folder: string, limit: number, offset: number, search?: string, filters?: { sender?: string; dateFrom?: string; dateTo?: string; hasAttachment?: boolean }): Promise<{ emails: Email[]; total: number }>;
  getEmail(id: number, userId: string): Promise<Email | undefined>;
  updateEmail(id: number, userId: string, updates: Partial<Email>): Promise<Email>;
  deleteEmail(id: number, userId: string): Promise<void>;
  hardDeleteEmail(id: number): Promise<void>;
  getEmailFolderCounts(userId: string): Promise<Record<string, number>>;
  getEmailByResendIdForUser(userId: string, resendEmailId: string): Promise<Email | undefined>;

  getUserTasks(userId: string): Promise<UserTask[]>;
  createUserTask(data: InsertUserTask & { userId: string }): Promise<UserTask>;
  updateUserTask(id: number, userId: string, data: UpdateUserTask): Promise<UserTask | undefined>;
  deleteUserTask(id: number, userId: string): Promise<boolean>;

  getStaffTasks(): Promise<StaffTask[]>;
  createStaffTask(data: InsertStaffTask & { createdById: string }): Promise<StaffTask>;
  updateStaffTask(id: number, data: UpdateStaffTask): Promise<StaffTask | undefined>;
  deleteStaffTask(id: number): Promise<boolean>;

  getNewsBookmarks(userId: string): Promise<UserNewsBookmark[]>;
  createNewsBookmark(data: InsertUserNewsBookmark): Promise<UserNewsBookmark>;
  deleteNewsBookmark(id: number, userId: string): Promise<boolean>;

  getNewsPreferences(userId: string): Promise<UserNewsPreferences | undefined>;
  upsertNewsPreferences(userId: string, followedCategoryIds: number[]): Promise<UserNewsPreferences>;

  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  createDomain(data: InsertDomain): Promise<Domain>;
  updateDomain(id: number, data: Partial<InsertDomain>): Promise<Domain>;
  deleteDomain(id: number): Promise<void>;

  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUsersByRole(roles: Role[]): Promise<User[]>;

  getMusicTracks(filter?: { type?: string; publishedOnly?: boolean; artistId?: number; albumName?: string; userId?: string }): Promise<(MusicTrack & { artist: { id: number; name: string } | null; user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null })[]>;
  getMusicTrackById(id: number): Promise<MusicTrack | undefined>;
  getMusicTrack(id: number): Promise<(MusicTrack & { artist: { id: number; name: string } | null; user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null }) | undefined>;
  getUsersWithOwnedTracks(): Promise<User[]>;
  createMusicTrack(data: InsertMusicTrack): Promise<MusicTrack>;
  updateMusicTrack(id: number, data: Partial<InsertMusicTrack>): Promise<MusicTrack>;
  deleteMusicTrack(id: number): Promise<void>;
  incrementMusicTrackStream(id: number): Promise<MusicTrack>;

  getSystemMailboxes(): Promise<SystemMailbox[]>;
  getSystemMailboxByAddress(address: string): Promise<SystemMailbox | undefined>;
  createSystemMailbox(data: InsertSystemMailbox): Promise<SystemMailbox>;
  deleteSystemMailbox(id: number): Promise<void>;
  getSystemMailboxUnreadCounts(): Promise<Record<number, number>>;
  getSystemMailboxEmails(mailboxId: number): Promise<SystemMailboxEmail[]>;
  getSystemMailboxEmail(mailboxId: number, emailId: number): Promise<SystemMailboxEmail | undefined>;
  getSystemMailboxEmailByResendId(resendEmailId: string): Promise<SystemMailboxEmail | undefined>;
  createSystemMailboxEmail(data: InsertSystemMailboxEmail): Promise<SystemMailboxEmail>;
  markSystemMailboxEmailRead(mailboxId: number, emailId: number): Promise<void>;

  getLatestMarketData(): Promise<MarketData[]>;
  upsertMarketData(items: InsertMarketData[]): Promise<void>;
  deleteExpiredMarketData(olderThanMinutes?: number): Promise<void>;

  getUserSparksBalance(userId: string): Promise<number>;
  creditSparks(userId: string, amount: number, type: string, description: string, opts?: { stripeSessionId?: string; metadata?: object }): Promise<void>;
  hasUserSparkedAnyPost(userId: string): Promise<boolean>;
  hasUserSparkedAnyArticle(userId: string): Promise<boolean>;
  hasUserSparkedAnyTrack(userId: string): Promise<boolean>;
  creditOnboardingBonus(userId: string, taskKey: string, label: string, amount: number): Promise<boolean>;
  debitSparks(userId: string, amount: number, type: string, description: string, opts?: { metadata?: object; allowOverdraft?: boolean }): Promise<void>;
  getUserSparkTransactions(userId: string, limit?: number, offset?: number): Promise<SparkTransaction[]>;
  getAllSparkTransactions(filters?: { userId?: string; type?: string; dateFrom?: Date; dateTo?: Date }, limit?: number, offset?: number): Promise<{ transactions: Array<SparkTransaction & { username: string; displayName: string | null }>; total: number }>;
  getSparkStats(): Promise<{ totalIssued: number; activeUsersWithSparks: number }>;
  listSparkPacks(activeOnly?: boolean): Promise<SparkPack[]>;
  getSparkPack(id: number): Promise<SparkPack | undefined>;
  upsertSparkPack(data: InsertSparkPack): Promise<SparkPack>;
  updateSparkPack(id: number, data: Partial<InsertSparkPack>): Promise<SparkPack>;
  deleteSparkPack(id: number): Promise<void>;
  grantFreeMonthlyAllocation(userId: string): Promise<boolean>;
  isSparkSessionProcessed(stripeSessionId: string): Promise<boolean>;

  getUserDailySparksGiven(userId: string): Promise<number>;
  sparkPost(postId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  sparkArticle(articleId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  sparkGalleryImage(imageId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  sparkTrack(trackId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  unsparkTrack(trackId: number, userId: string): Promise<void>;
  sparkProduct(productId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  sparkProject(projectId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  sparkService(serviceId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }>;
  getArticleSparkInfo(articleId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getGallerySparkInfo(imageId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getTrackSparkInfo(trackId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getProductSparkInfo(productId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getProjectSparkInfo(projectId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getServiceSparkInfo(serviceId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }>;
  getTrackSparkCounts(trackIds: number[]): Promise<Map<number, number>>;
  getTrackSparkedByUser(trackIds: number[], userId: string): Promise<Set<number>>;
  getProductSparkCounts(productIds: number[]): Promise<Map<number, number>>;
  getProductSparkedByUser(productIds: number[], userId: string): Promise<Set<number>>;
  getArticleSparkCounts(articleIds: number[]): Promise<Map<number, number>>;
  getArticleSparkedByUser(articleIds: number[], userId: string): Promise<Set<number>>;
  getProjectSparkCounts(projectIds: number[]): Promise<Map<number, number>>;
  getProjectSparkedByUser(projectIds: number[], userId: string): Promise<Set<number>>;
  getServiceSparkCounts(serviceIds: number[]): Promise<Map<number, number>>;
  getServiceSparkedByUser(serviceIds: number[], userId: string): Promise<Set<number>>;
  getTopSparkedPostsByUser(userId: string, limit?: number): Promise<Array<{ id: number; content: string; imageUrl: string | null; createdAt: Date; sparkCount: number }>>;
  getSocialSparkStats(): Promise<{
    totalIssued: number;
    uniqueAuthorsRewarded: number;
    totalPostSparksGiven: number;
    totalArticleSparksGiven: number;
    totalGallerySparksGiven: number;
    totalTrackSparksGiven: number;
    totalProductSparksGiven: number;
    totalProjectSparksGiven: number;
    totalServiceSparksGiven: number;
    topRewardedCreatorThisMonth: { username: string; displayName: string | null; sparksReceived: number } | null;
    topItems: Array<{ type: string; title: string; sparkCount: number; id: number | string; slug?: string; authorUsername?: string; uploaderUsername?: string }>;
  }>;

  getSparksLeaderboard(period: "month" | "all"): Promise<{
    topCreators: { userId: string; username: string; displayName: string | null; avatarUrl: string | null; sparksReceived: number }[];
    topPosts: { id: number; content: string; authorUsername: string; authorDisplayName: string | null; sparksReceived: number }[];
    topContent: { id: number; title: string; contentType: "article" | "gallery" | "track" | "product" | "project" | "service"; slug?: string | null; sparksReceived: number }[];
  }>;

  getWikiSources(): Promise<WikiSource[]>;
  createWikiSource(data: InsertWikiSource): Promise<WikiSource>;
  incrementWikiSourceArticleCount(id: number, count: number): Promise<void>;
  deleteWikiSource(id: number): Promise<void>;

  getWikiLinkSuggestions(sourceArticleId: number, status?: string): Promise<import("@shared/schema").WikiLinkSuggestion[]>;
  upsertWikiLinkSuggestions(sourceArticleId: number, suggestions: import("@shared/schema").InsertWikiLinkSuggestion[]): Promise<void>;
  updateWikiLinkSuggestionStatus(id: number, status: string): Promise<import("@shared/schema").WikiLinkSuggestion>;

  logWikiLlmUsage(entry: InsertWikiLlmUsage): Promise<WikiLlmUsage>;
  getWikiLlmUsageSummary(year: number, month: number): Promise<Array<{ operation: string; callCount: number; totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number }>>;
}

export type SearchResultItem = {
  id: number;
  title: string;
  description?: string | null;
  href: string;
  meta?: string | null;
  slug?: string;
  authorId?: string | null;
  sparkCount?: number;
  sparkedByCurrentUser?: boolean;
};

export type SearchAllResult = {
  wiki: SearchResultItem[];
  projects: SearchResultItem[];
  store: SearchResultItem[];
  music: SearchResultItem[];
  jobs: SearchResultItem[];
  services: SearchResultItem[];
  total: number;
};

export type PostAuthor = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
export type PostWithMeta = Post & { author: PostAuthor; replyCount: number; repostedByCurrentUser?: boolean; sparkCount: number; isSparkedByMe: boolean; originalPost?: { id: number; content: string; imageUrl: string | null; author: PostAuthor } | null };
export type ReplyWithAuthor = PostReply & { author: PostAuthor };
export type FollowUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
export type DiscoverUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null; followerCount: number; isFollowing: boolean };

export type StaffUserWithNode = {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt?: Date | null;
  orgNode: StaffOrgNode | null;
};

export type ChatUserInfo = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
export type ChatMessageWithUsers = ChatMessage & {
  fromUser: ChatUserInfo;
  toUser: ChatUserInfo | null;
  channel: { id: number; name: string } | null;
};
export type DmThread = {
  otherUser: ChatUserInfo;
  lastMessage: ChatMessage;
  unreadCount: number;
};

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

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
    if (data.bannerUrl !== undefined) updateObj.bannerUrl = data.bannerUrl;
    if (data.profileBgOpacity !== undefined) updateObj.profileBgOpacity = data.profileBgOpacity;
    if (data.profileStatus !== undefined) updateObj.profileStatus = data.profileStatus;
    if (data.profileFeaturedType !== undefined) updateObj.profileFeaturedType = data.profileFeaturedType;
    if (data.profileFeaturedId !== undefined) updateObj.profileFeaturedId = data.profileFeaturedId;
    if (data.profileLayout !== undefined) updateObj.profileLayout = data.profileLayout;
    if (data.profileFont !== undefined) updateObj.profileFont = data.profileFont;
    if (data.profilePronouns !== undefined) updateObj.profilePronouns = data.profilePronouns;
    if (data.profileAccentGradient !== undefined) updateObj.profileAccentGradient = data.profileAccentGradient;
    if (data.profileShowFollowers !== undefined) updateObj.profileShowFollowers = data.profileShowFollowers;
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

  async getUserByXId(xId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.xId, xId));
    return user || undefined;
  }

  async createOAuthUser(data: CreateOAuthUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        password: null,
        xId: data.xId,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        email: data.email ?? null,
        emailVerified: data.emailVerified ?? true,
        role: data.role ?? "user",
      })
      .returning();
    return user;
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

  async linkUserXAccount(userId: string, xId: string): Promise<User> {
    const existing = await this.getUserByXId(xId);
    if (existing && existing.id !== userId) {
      throw new Error("already_linked");
    }
    try {
      const [updated] = await db
        .update(users)
        .set({ xId })
        .where(eq(users.id, userId))
        .returning();
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message.includes("unique")) {
        throw new Error("already_linked");
      }
      throw err;
    }
  }

  async unlinkUserXAccount(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ xId: null })
      .where(eq(users.id, userId))
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

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category> {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return cat;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async updateCategoryParent(categoryId: number, parentId: number | null): Promise<void> {
    await db.update(categories).set({ parentId }).where(eq(categories.id, categoryId));
  }

  async getArticles(): Promise<(Article & { category?: { id: number; name: string; slug: string } | null })[]> {
    const rows = await db
      .select({
        article: articles,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .orderBy(desc(articles.updatedAt));
    return rows.map(({ article, category }) => ({
      ...article,
      category: category?.id ? category : null,
    }));
  }

  async getArticleById(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article || undefined;
  }

  async getArticlesByCategory(categoryId: number): Promise<(Article & { author?: { username: string; displayName: string | null } | null })[]> {
    const rows = await db
      .select({
        article: articles,
        author: {
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(eq(articles.categoryId, categoryId))
      .orderBy(desc(articles.updatedAt));
    return rows.map(({ article, author }) => ({
      ...article,
      author: author?.username ? { username: author.username, displayName: author.displayName } : null,
    }));
  }

  async getArticlesByAuthor(authorName: string): Promise<Article[]> {
    const authoredArticleIds = db
      .selectDistinct({ id: revisions.articleId })
      .from(revisions)
      .where(eq(revisions.authorName, authorName));
    return db.select().from(articles)
      .where(sql`${articles.id} IN (${authoredArticleIds})`)
      .orderBy(desc(articles.updatedAt))
      .limit(20);
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

  async deleteResolverCrosslinksBySource(sourceArticleId: number): Promise<void> {
    await db
      .delete(crosslinks)
      .where(
        and(
          eq(crosslinks.sourceArticleId, sourceArticleId),
          sql`${crosslinks.sharedKeywords} @> ARRAY['__resolved_link']::text[]`
        )
      );
  }

  async getWikiLinkStubs(): Promise<WikiLinkStub[]> {
    return db.select().from(wikiLinkStubs).orderBy(desc(wikiLinkStubs.occurrences));
  }

  async getResolvedLinksCount(): Promise<number> {
    const [row] = await db
      .select({ count: countFn() })
      .from(crosslinks)
      .where(sql`${crosslinks.sharedKeywords} @> ARRAY['__resolved_link']::text[]`);
    return Number(row?.count ?? 0);
  }

  async getWikiLinkStubSummary(): Promise<Array<{ stubText: string; totalOccurrences: number; articleCount: number }>> {
    const rows = await db
      .select({
        stubText: wikiLinkStubs.stubText,
        totalOccurrences: sql<number>`sum(${wikiLinkStubs.occurrences})::int`,
        articleCount: sql<number>`count(*)::int`,
      })
      .from(wikiLinkStubs)
      .groupBy(wikiLinkStubs.stubText)
      .orderBy(desc(sql`sum(${wikiLinkStubs.occurrences})`));
    return rows;
  }

  async upsertWikiLinkStub(articleId: number, stubText: string, occurrences: number): Promise<void> {
    await db
      .insert(wikiLinkStubs)
      .values({ articleId, stubText, occurrences })
      .onConflictDoUpdate({
        target: [wikiLinkStubs.articleId, wikiLinkStubs.stubText],
        set: { occurrences },
      });
  }

  async deleteWikiLinkStubsByArticle(articleId: number): Promise<void> {
    await db.delete(wikiLinkStubs).where(eq(wikiLinkStubs.articleId, articleId));
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

  async getUsersWithLinkedArtist(): Promise<User[]> {
    return db.select().from(users).where(sql`${users.linkedArtistId} IS NOT NULL`);
  }

  async getUserByLinkedArtistId(artistId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.linkedArtistId, artistId));
    return user || undefined;
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

  async getStoreCategories(): Promise<StoreCategory[]> {
    return db.select().from(storeCategories).orderBy(asc(storeCategories.displayOrder), asc(storeCategories.name));
  }

  async createStoreCategory(data: InsertStoreCategory): Promise<StoreCategory> {
    const [created] = await db.insert(storeCategories).values(data).returning();
    return created;
  }

  async updateStoreCategory(id: number, data: Partial<InsertStoreCategory>): Promise<StoreCategory | undefined> {
    const [updated] = await db.update(storeCategories).set(data).where(eq(storeCategories.id, id)).returning();
    return updated || undefined;
  }

  async deleteStoreCategory(id: number): Promise<void> {
    await db.delete(storeCategories).where(eq(storeCategories.id, id));
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
    return db.select().from(projects).orderBy(projects.displayOrder, projects.name);
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
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

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
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

  async getMusicSubmissionById(id: number): Promise<MusicSubmission | undefined> {
    const [row] = await db.select().from(musicSubmissions).where(eq(musicSubmissions.id, id));
    return row;
  }

  async createMusicSubmission(sub: InsertMusicSubmission & { userId?: string | null }): Promise<MusicSubmission> {
    const [row] = await db.insert(musicSubmissions).values(sub).returning();
    return row;
  }

  async updateMusicSubmissionStatus(id: number, status: string): Promise<MusicSubmission> {
    const [row] = await db.update(musicSubmissions).set({ status }).where(eq(musicSubmissions.id, id)).returning();
    return row;
  }

  async updateMusicSubmissionTrackFile(id: number, trackFileUrl: string): Promise<MusicSubmission> {
    const [row] = await db.update(musicSubmissions).set({ trackFileUrl }).where(eq(musicSubmissions.id, id)).returning();
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
        replyCount: sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = ${posts.id})::int`,
        repostedByCurrentUser: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM posts p2 WHERE p2.repost_of = COALESCE(${posts.repostOf}, ${posts.id}) AND p2.author_id = ${currentUserId})`
          : sql<boolean>`false`,
        sparkCount: sql<number>`(SELECT COUNT(*) FROM post_sparks WHERE post_id = ${posts.id})::int`,
        isSparkedByMe: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM post_sparks WHERE post_id = ${posts.id} AND user_id = ${currentUserId})`
          : sql<boolean>`false`,
        originalContent: sql<string | null>`(SELECT op.content FROM posts op WHERE op.id = ${posts.repostOf})`,
        originalImageUrl: sql<string | null>`(SELECT op.image_url FROM posts op WHERE op.id = ${posts.repostOf})`,
        originalAuthorId: sql<string | null>`(SELECT op.author_id FROM posts op WHERE op.id = ${posts.repostOf})`,
        originalAuthorUsername: sql<string | null>`(SELECT u.username FROM posts op JOIN users u ON u.id = op.author_id WHERE op.id = ${posts.repostOf})`,
        originalAuthorDisplayName: sql<string | null>`(SELECT u.display_name FROM posts op JOIN users u ON u.id = op.author_id WHERE op.id = ${posts.repostOf})`,
        originalAuthorAvatarUrl: sql<string | null>`(SELECT u.avatar_url FROM posts op JOIN users u ON u.id = op.author_id WHERE op.id = ${posts.repostOf})`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r.post,
      author: r.author,
      replyCount: r.replyCount,
      repostedByCurrentUser: r.repostedByCurrentUser,
      sparkCount: r.sparkCount,
      isSparkedByMe: r.isSparkedByMe,
      originalPost: r.post.repostOf ? {
        id: r.post.repostOf,
        content: r.originalContent ?? "",
        imageUrl: r.originalImageUrl,
        author: {
          id: r.originalAuthorId ?? "",
          username: r.originalAuthorUsername ?? "",
          displayName: r.originalAuthorDisplayName,
          avatarUrl: r.originalAuthorAvatarUrl,
        },
      } : null,
    }));
  }

  async getPosts({ userId, followedByUserId, currentUserId, limit = 50 }: { userId?: string; followedByUserId?: string; currentUserId?: string; limit?: number }): Promise<PostWithMeta[]> {
    const viewerUserId = currentUserId ?? followedByUserId;
    if (userId) {
      return this.getPostsBase(eq(posts.authorId, userId), viewerUserId, limit);
    }
    if (followedByUserId) {
      const followingIds = db
        .select({ id: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, followedByUserId));
      return this.getPostsBase(
        sql`(${posts.authorId} IN (${followingIds}) OR ${posts.authorId} = ${followedByUserId})`,
        viewerUserId,
        limit
      );
    }
    return this.getPostsBase(undefined, viewerUserId, limit);
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

  async repostPost(originalPostId: number, userId: string): Promise<Post> {
    const original = await this.getPostById(originalPostId);
    if (!original) throw new Error("Post not found");
    const existing = await this.hasReposted(originalPostId, userId);
    if (existing) throw new Error("Already reposted");
    const [row] = await db.insert(posts).values({
      authorId: userId,
      content: "",
      imageUrl: null,
      repostOf: originalPostId,
    }).returning();
    return row;
  }

  async unrepostPost(originalPostId: number, userId: string): Promise<void> {
    await db.delete(posts).where(
      and(eq(posts.authorId, userId), eq(posts.repostOf, originalPostId))
    );
  }

  async hasReposted(originalPostId: number, userId: string): Promise<boolean> {
    const [row] = await db.select({ id: posts.id }).from(posts).where(
      and(eq(posts.authorId, userId), eq(posts.repostOf, originalPostId))
    );
    return !!row;
  }

  async getTopFollowedUsers(limit: number, currentUserId?: string): Promise<DiscoverUser[]> {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        followerCount: sql<number>`(SELECT COUNT(*) FROM user_follows WHERE following_id = ${users.id})::int`,
      })
      .from(users)
      .orderBy(sql`(SELECT COUNT(*) FROM user_follows WHERE following_id = ${users.id}) DESC`)
      .limit(limit);

    const result: DiscoverUser[] = [];
    for (const row of rows) {
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, row.id) : false;
      result.push({ ...row, isFollowing });
    }
    return result;
  }

  async searchUsers(query: string, currentUserId?: string): Promise<DiscoverUser[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        followerCount: sql<number>`(SELECT COUNT(*) FROM user_follows WHERE following_id = ${users.id})::int`,
      })
      .from(users)
      .where(or(ilike(users.username, pattern), ilike(users.displayName, pattern)))
      .limit(20);

    const result: DiscoverUser[] = [];
    for (const row of rows) {
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, row.id) : false;
      result.push({ ...row, isFollowing });
    }
    return result;
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
      if (value === "") {
        await db.delete(platformSettings).where(eq(platformSettings.key, key));
        continue;
      }
      await db
        .insert(platformSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value } });
    }
  }

  async setPlatformSetting(key: string, value: string): Promise<void> {
    await db
      .insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value } });
  }

  async getSpotifyArtists(): Promise<SpotifyArtist[]> {
    return db.select().from(spotifyArtists).orderBy(spotifyArtists.displayOrder, spotifyArtists.displayName);
  }

  async addSpotifyArtist(data: InsertSpotifyArtist): Promise<SpotifyArtist> {
    const [artist] = await db.insert(spotifyArtists).values(data).returning();
    return artist;
  }

  async removeSpotifyArtist(id: number): Promise<void> {
    await db.delete(spotifyArtists).where(eq(spotifyArtists.id, id));
  }

  async searchAll(query: string, isStaff: boolean, limit: number): Promise<SearchAllResult> {
    const pattern = `%${query}%`;

    const wikiRows = await db
      .select({ id: articles.id, title: articles.title, summary: articles.summary, slug: articles.slug, status: articles.status, authorId: articles.authorId, categorySlug: categories.slug })
      .from(articles)
      .leftJoin(categories, eq(categories.id, articles.categoryId))
      .where(
        and(
          isStaff ? undefined : eq(articles.status, "published"),
          or(ilike(articles.title, pattern), ilike(articles.summary, pattern))
        )
      ).orderBy(desc(articles.updatedAt)).limit(limit);

    const projectRows = await db
      .select({ id: projects.id, name: projects.name, description: projects.description, slug: projects.slug, status: projects.status })
      .from(projects).where(
        or(ilike(projects.name, pattern), ilike(projects.description, pattern))
      ).orderBy(projects.name).limit(limit);

    const productRows = await db
      .select({ id: products.id, name: products.name, description: products.description, slug: products.slug, categoryName: products.categoryName })
      .from(products).where(
        or(ilike(products.name, pattern), ilike(products.description, pattern))
      ).orderBy(products.name).limit(limit);

    const artistRows = await db
      .select({ id: artists.id, name: artists.name, bio: artists.bio, slug: artists.slug })
      .from(artists).where(
        or(ilike(artists.name, pattern), ilike(artists.bio, pattern))
      ).orderBy(artists.name).limit(limit);

    const albumRows = await db
      .select({ id: albums.id, title: albums.title, slug: albums.slug })
      .from(albums).where(
        ilike(albums.title, pattern)
      ).orderBy(albums.title).limit(limit);

    const trackRows = await db
      .select({
        id: musicTracks.id,
        title: musicTracks.title,
        artistName: musicTracks.artistName,
        type: musicTracks.type,
        status: musicTracks.status,
        artistSlug: artists.slug,
        ownerUsername: users.username,
      })
      .from(musicTracks)
      .leftJoin(artists, eq(musicTracks.artistId, artists.id))
      .leftJoin(users, eq(musicTracks.userId, users.id))
      .where(
        and(
          isStaff ? undefined : eq(musicTracks.status, "published"),
          or(ilike(musicTracks.title, pattern), ilike(musicTracks.artistName, pattern), ilike(musicTracks.albumName, pattern))
        )
      ).orderBy(desc(musicTracks.createdAt)).limit(limit);

    const jobRows = await db
      .select({ id: jobs.id, title: jobs.title, slug: jobs.slug, department: jobs.department, type: jobs.type, status: jobs.status })
      .from(jobs).where(
        and(
          isStaff ? undefined : eq(jobs.status, "open"),
          or(ilike(jobs.title, pattern), ilike(jobs.description, pattern), ilike(jobs.department, pattern))
        )
      ).orderBy(jobs.title).limit(limit);

    const serviceRows = await db
      .select({ id: services.id, name: services.name, tagline: services.tagline, slug: services.slug, category: services.category })
      .from(services).where(
        or(ilike(services.name, pattern), ilike(services.tagline, pattern), ilike(services.description, pattern))
      ).orderBy(services.name).limit(limit);

    const wikiItems: SearchResultItem[] = wikiRows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.summary,
      href: a.categorySlug ? `/wiki/${a.categorySlug}/${a.slug}` : `/wiki/${a.slug}`,
      meta: a.status !== "published" ? a.status : undefined,
      slug: a.slug,
      authorId: a.authorId ?? null,
    }));

    const projectItems: SearchResultItem[] = projectRows.map((p) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      href: `/projects/${p.slug}`,
      meta: p.status,
    }));

    const storeItems: SearchResultItem[] = productRows.map((p) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      href: `/store/products/${p.slug}`,
      meta: p.categoryName,
    }));

    const musicItems: SearchResultItem[] = [
      ...artistRows.map((a) => ({
        id: a.id,
        title: a.name,
        description: a.bio,
        href: `/music/artists/${a.slug}`,
        meta: "Artist",
      })),
      ...albumRows.map((a) => ({
        id: a.id + 100000,
        title: a.title,
        description: null,
        href: `/music/albums/${a.slug}`,
        meta: "Album",
      })),
      ...trackRows.map((t) => ({
        id: t.id + 200000,
        title: t.title,
        description: t.artistName,
        href: t.artistSlug
          ? `/music/artists/${t.artistSlug}`
          : t.ownerUsername
            ? `/profile/${t.ownerUsername}`
            : "/music",
        meta: t.type === "instrumental" ? "Instrumental" : "Track",
      })),
    ].slice(0, limit);

    const jobItems: SearchResultItem[] = jobRows.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.department ? `${j.department} · ${j.type}` : j.type,
      href: `/jobs/${j.slug}`,
      meta: j.status,
    }));

    const serviceItems: SearchResultItem[] = serviceRows.map((s) => ({
      id: s.id,
      title: s.name,
      description: s.tagline,
      href: `/services/${s.slug}`,
      meta: s.category,
    }));

    const total = wikiItems.length + projectItems.length + storeItems.length + musicItems.length + jobItems.length + serviceItems.length;

    return {
      wiki: wikiItems,
      projects: projectItems,
      store: storeItems,
      music: musicItems,
      jobs: jobItems,
      services: serviceItems,
      total,
    };
  }

  async getBrandAssets(isPublic?: boolean): Promise<BrandAsset[]> {
    if (isPublic === true) {
      return db.select().from(brandAssets)
        .where(eq(brandAssets.isPublic, true))
        .orderBy(brandAssets.displayOrder, brandAssets.name);
    }
    return db.select().from(brandAssets).orderBy(brandAssets.displayOrder, brandAssets.name);
  }

  async createBrandAsset(data: InsertBrandAsset): Promise<BrandAsset> {
    const [created] = await db.insert(brandAssets).values(data).returning();
    return created;
  }

  async updateBrandAsset(id: number, data: Partial<InsertBrandAsset>): Promise<BrandAsset> {
    const [updated] = await db.update(brandAssets).set(data).where(eq(brandAssets.id, id)).returning();
    return updated;
  }

  async deleteBrandAsset(id: number): Promise<void> {
    await db.delete(brandAssets).where(eq(brandAssets.id, id));
  }

  async getShaderPresets(): Promise<ShaderPreset[]> {
    return db.select().from(shaderPresets).orderBy(shaderPresets.id);
  }

  async getShaderPreset(id: number): Promise<ShaderPreset | undefined> {
    const [row] = await db.select().from(shaderPresets).where(eq(shaderPresets.id, id));
    return row;
  }

  async createShaderPreset(data: InsertShaderPreset): Promise<ShaderPreset> {
    const [created] = await db.insert(shaderPresets).values(data).returning();
    return created;
  }

  async updateShaderPreset(id: number, data: Partial<InsertShaderPreset>): Promise<ShaderPreset> {
    const [updated] = await db.update(shaderPresets).set(data).where(eq(shaderPresets.id, id)).returning();
    return updated;
  }

  async deleteShaderPreset(id: number): Promise<void> {
    await db.delete(shaderPresets).where(eq(shaderPresets.id, id));
  }

  async getResources(): Promise<Resource[]> {
    return db.select().from(resources).orderBy(resources.displayOrder, resources.title);
  }

  async createResource(data: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(data).returning();
    return created;
  }

  async updateResource(id: number, data: Partial<InsertResource>): Promise<Resource> {
    const [updated] = await db.update(resources).set(data).where(eq(resources.id, id)).returning();
    return updated;
  }

  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  async getGalleryImages(category?: string, isPublic?: boolean): Promise<GalleryImage[]> {
    const conditions = [];
    if (category) conditions.push(eq(galleryImages.category, category as any));
    if (isPublic !== undefined) conditions.push(eq(galleryImages.isPublic, isPublic));
    const query = db.select().from(galleryImages);
    const result = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(galleryImages.displayOrder, galleryImages.id)
      : await query.orderBy(galleryImages.displayOrder, galleryImages.id);
    return result;
  }

  async createGalleryImage(data: InsertGalleryImage): Promise<GalleryImage> {
    const [created] = await db.insert(galleryImages).values(data).returning();
    return created;
  }

  async updateGalleryImage(id: number, data: Partial<InsertGalleryImage>): Promise<GalleryImage> {
    const [updated] = await db.update(galleryImages).set(data).where(eq(galleryImages.id, id)).returning();
    return updated;
  }

  async deleteGalleryImage(id: number): Promise<void> {
    await db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  async getContactSubmissions(filters?: { subject?: string; status?: string }): Promise<ContactSubmission[]> {
    const conditions = [];
    if (filters?.subject) conditions.push(eq(contactSubmissions.subject, filters.subject));
    if (filters?.status) conditions.push(eq(contactSubmissions.status, filters.status));
    const query = db.select().from(contactSubmissions);
    const result = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(contactSubmissions.createdAt))
      : await query.orderBy(desc(contactSubmissions.createdAt));
    return result;
  }

  async getContactSubmissionById(id: number): Promise<ContactSubmission | undefined> {
    const [row] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id));
    return row || undefined;
  }

  async createContactSubmission(data: InsertContactSubmission): Promise<ContactSubmission> {
    const [created] = await db.insert(contactSubmissions).values(data).returning();
    return created;
  }

  async updateContactSubmission(id: number, data: { status?: string; staffNote?: string; repliedAt?: Date | null }): Promise<ContactSubmission> {
    const [updated] = await db.update(contactSubmissions).set(data).where(eq(contactSubmissions.id, id)).returning();
    return updated;
  }

  async getStaffUsers(): Promise<StaffUserWithNode[]> {
    const staffRoles: Role[] = ["staff", "partner", "executive", "admin"];
    const allUsers = await db.select().from(users).where(inArray(users.role, staffRoles)).orderBy(users.role, users.username);
    const nodes = await db.select().from(staffOrgNodes);
    return allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      orgNode: nodes.find((n) => n.userId === u.id) ?? null,
    }));
  }

  async getStaffOrgNodes(): Promise<StaffOrgNode[]> {
    return db.select().from(staffOrgNodes).orderBy(staffOrgNodes.sortOrder, staffOrgNodes.id);
  }

  async createStaffOrgNode(data: InsertStaffOrgNode): Promise<StaffOrgNode> {
    const [created] = await db.insert(staffOrgNodes).values(data).returning();
    return created;
  }

  async updateStaffOrgNode(id: number, data: Partial<InsertStaffOrgNode>): Promise<StaffOrgNode> {
    const [updated] = await db.update(staffOrgNodes).set(data).where(eq(staffOrgNodes.id, id)).returning();
    return updated;
  }

  async deleteStaffOrgNode(id: number): Promise<void> {
    await db.delete(staffOrgNodes).where(eq(staffOrgNodes.id, id));
  }

  async getChatChannels(): Promise<ChatChannel[]> {
    return db.select().from(chatChannels).orderBy(chatChannels.createdAt);
  }

  async getChatChannelById(id: number): Promise<ChatChannel | undefined> {
    const [ch] = await db.select().from(chatChannels).where(eq(chatChannels.id, id));
    return ch || undefined;
  }

  async createChatChannel(data: InsertChatChannel & { createdBy: string }): Promise<ChatChannel> {
    const [created] = await db.insert(chatChannels).values(data).returning();
    return created;
  }

  async updateChatChannel(id: number, data: Partial<InsertChatChannel>): Promise<ChatChannel> {
    const [updated] = await db.update(chatChannels).set(data).where(eq(chatChannels.id, id)).returning();
    return updated;
  }

  async deleteChatChannel(id: number): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.channelId, id));
    await db.delete(chatChannels).where(eq(chatChannels.id, id));
  }

  private async enrichMessages(rows: ChatMessage[]): Promise<ChatMessageWithUsers[]> {
    if (rows.length === 0) return [];
    const userIds = [...new Set([...rows.map((r) => r.fromUserId), ...rows.map((r) => r.toUserId).filter(Boolean) as string[]])];
    const userRows = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    }).from(users).where(inArray(users.id, userIds));
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const channelIds = [...new Set(rows.map((r) => r.channelId).filter(Boolean) as number[])];
    let channelMap = new Map<number, { id: number; name: string }>();
    if (channelIds.length > 0) {
      const chRows = await db.select({ id: chatChannels.id, name: chatChannels.name }).from(chatChannels).where(inArray(chatChannels.id, channelIds));
      channelMap = new Map(chRows.map((c) => [c.id, c]));
    }

    return rows.map((m) => ({
      ...m,
      fromUser: userMap.get(m.fromUserId) ?? { id: m.fromUserId, username: "unknown", displayName: null, avatarUrl: null },
      toUser: m.toUserId ? (userMap.get(m.toUserId) ?? { id: m.toUserId, username: "unknown", displayName: null, avatarUrl: null }) : null,
      channel: m.channelId ? (channelMap.get(m.channelId) ?? null) : null,
    }));
  }

  async getChannelMessages(channelId: number, before?: number, limit = 50): Promise<ChatMessageWithUsers[]> {
    let query = db.select().from(chatMessages)
      .where(and(eq(chatMessages.channelId, channelId), ...(before ? [sql`${chatMessages.id} < ${before}`] : [])))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    const rows = await query;
    const enriched = await this.enrichMessages(rows);
    return enriched.reverse();
  }

  async sendChannelMessage(data: InsertChatMessage & { fromUserId: string }): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(data).returning();
    return created;
  }

  async getDmMessages(userId1: string, userId2: string, before?: number, limit = 50): Promise<ChatMessageWithUsers[]> {
    const conditions = [
      sql`${chatMessages.channelId} IS NULL`,
      or(
        and(eq(chatMessages.fromUserId, userId1), eq(chatMessages.toUserId, userId2)),
        and(eq(chatMessages.fromUserId, userId2), eq(chatMessages.toUserId, userId1)),
      )!,
      ...(before ? [sql`${chatMessages.id} < ${before}`] : []),
    ];
    const rows = await db.select().from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    const enriched = await this.enrichMessages(rows);
    return enriched.reverse();
  }

  async sendDmMessage(fromUserId: string, toUserId: string, content: string): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values({ fromUserId, toUserId, content }).returning();
    return created;
  }

  async getAllChatMessages(filters?: { channelId?: number; userId?: string; dateFrom?: Date; dateTo?: Date }): Promise<ChatMessageWithUsers[]> {
    const conditions = [];
    if (filters?.channelId) conditions.push(eq(chatMessages.channelId, filters.channelId));
    if (filters?.userId) {
      conditions.push(or(
        eq(chatMessages.fromUserId, filters.userId),
        eq(chatMessages.toUserId, filters.userId),
      )!);
    }
    if (filters?.dateFrom) conditions.push(sql`${chatMessages.createdAt} >= ${filters.dateFrom}`);
    if (filters?.dateTo) conditions.push(sql`${chatMessages.createdAt} <= ${filters.dateTo}`);
    const rows = await db.select().from(chatMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(chatMessages.createdAt))
      .limit(200);
    return this.enrichMessages(rows);
  }

  async softDeleteChatMessage(id: number): Promise<ChatMessage> {
    const [updated] = await db.update(chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(chatMessages.id, id))
      .returning();
    return updated;
  }

  async getDmThreads(userId: string): Promise<DmThread[]> {
    const rows = await db.select().from(chatMessages)
      .where(and(
        sql`${chatMessages.channelId} IS NULL`,
        or(eq(chatMessages.fromUserId, userId), eq(chatMessages.toUserId, userId))!,
      ))
      .orderBy(desc(chatMessages.createdAt));

    const seen = new Set<string>();
    const threads: DmThread[] = [];
    const enriched = await this.enrichMessages(rows);
    for (const msg of enriched) {
      const otherId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
      if (!otherId || seen.has(otherId)) continue;
      seen.add(otherId);
      const otherUser = msg.fromUserId === userId ? msg.toUser : msg.fromUser;
      if (!otherUser) continue;
      threads.push({
        otherUser,
        lastMessage: msg,
        unreadCount: 0,
      });
    }
    return threads;
  }

  async getProjectFinancialSummary(projectId: number): Promise<{ totalIncome: number; totalExpenses: number; balance: number }> {
    const txs = await db.select().from(financeTransactions).where(eq(financeTransactions.projectId, projectId));
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const tx of txs) {
      if (tx.type === "income") totalIncome += tx.amount;
      else totalExpenses += tx.amount;
    }
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }

  async getFinanceProjects(): Promise<FinanceProject[]> {
    return db.select().from(financeProjects).orderBy(desc(financeProjects.createdAt));
  }

  async getFinanceProjectById(id: number): Promise<FinanceProject | undefined> {
    const [project] = await db.select().from(financeProjects).where(eq(financeProjects.id, id));
    return project || undefined;
  }

  async createFinanceProject(data: InsertFinanceProject): Promise<FinanceProject> {
    const [created] = await db.insert(financeProjects).values(data).returning();
    return created;
  }

  async updateFinanceProject(id: number, data: Partial<InsertFinanceProject>): Promise<FinanceProject> {
    const [updated] = await db.update(financeProjects).set(data).where(eq(financeProjects.id, id)).returning();
    return updated;
  }

  async deleteFinanceProject(id: number): Promise<void> {
    await db.delete(financeTransactions).where(eq(financeTransactions.projectId, id));
    await db.delete(financeProjects).where(eq(financeProjects.id, id));
  }

  async getFinanceTransactions(filters?: { type?: string; projectId?: number }): Promise<FinanceTransaction[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(financeTransactions.type, filters.type));
    if (filters?.projectId !== undefined) conditions.push(eq(financeTransactions.projectId, filters.projectId));
    const query = db.select().from(financeTransactions);
    const result = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
      : await query.orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt));
    return result;
  }

  async getFinanceTransactionById(id: number): Promise<FinanceTransaction | undefined> {
    const [tx] = await db.select().from(financeTransactions).where(eq(financeTransactions.id, id));
    return tx || undefined;
  }

  async createFinanceTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction> {
    const [created] = await db.insert(financeTransactions).values(data).returning();
    return created;
  }

  async updateFinanceTransaction(id: number, data: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction> {
    const [updated] = await db.update(financeTransactions).set(data).where(eq(financeTransactions.id, id)).returning();
    return updated;
  }

  async deleteFinanceTransaction(id: number): Promise<void> {
    await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
  }

  async getFinanceInvoices(): Promise<FinanceInvoice[]> {
    return db.select().from(financeInvoices).orderBy(desc(financeInvoices.createdAt));
  }

  async getFinanceInvoiceById(id: number): Promise<FinanceInvoice | undefined> {
    const [inv] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, id));
    return inv || undefined;
  }

  async createFinanceInvoice(data: InsertFinanceInvoice): Promise<FinanceInvoice> {
    const [created] = await db.insert(financeInvoices).values(data).returning();
    return created;
  }

  async updateFinanceInvoice(id: number, data: Partial<InsertFinanceInvoice>): Promise<FinanceInvoice> {
    const [updated] = await db.update(financeInvoices).set(data).where(eq(financeInvoices.id, id)).returning();
    return updated;
  }

  async deleteFinanceInvoice(id: number): Promise<void> {
    await db.delete(financeInvoices).where(eq(financeInvoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(financeInvoices)
      .where(sql`extract(year from created_at) = ${year}`);
    const count = (result?.count || 0) + 1;
    return `INV-${year}-${String(count).padStart(4, "0")}`;
  }

  async getFinanceSummary(): Promise<{ totalIncomeMonth: number; totalExpensesMonth: number; netBalance: number; outstandingInvoices: number; monthlyData: Array<{ month: string; income: number; expenses: number }> }> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const allTx = await db.select().from(financeTransactions).orderBy(financeTransactions.date);

    let totalIncomeMonth = 0;
    let totalExpensesMonth = 0;
    const monthlyMap: Record<string, { income: number; expenses: number }> = {};

    for (const tx of allTx) {
      const txMonth = tx.date.substring(0, 7);
      if (!monthlyMap[txMonth]) monthlyMap[txMonth] = { income: 0, expenses: 0 };
      if (tx.type === "income") {
        monthlyMap[txMonth].income += tx.amount;
        if (txMonth === yearMonth) totalIncomeMonth += tx.amount;
      } else {
        monthlyMap[txMonth].expenses += tx.amount;
        if (txMonth === yearMonth) totalExpensesMonth += tx.amount;
      }
    }

    const totalIncome = allTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = allTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    const [outstandingResult] = await db
      .select({ total: sql<number>`coalesce(sum(total_amount), 0)::float` })
      .from(financeInvoices)
      .where(or(eq(financeInvoices.status, "sent"), eq(financeInvoices.status, "overdue")));
    const outstandingInvoices = outstandingResult?.total || 0;

    const months = Object.keys(monthlyMap).sort().slice(-6);
    const monthlyData = months.map(m => ({
      month: m,
      income: monthlyMap[m].income,
      expenses: monthlyMap[m].expenses,
    }));

    return { totalIncomeMonth, totalExpensesMonth, netBalance, outstandingInvoices, monthlyData };
  }

  async getMinecraftServers(): Promise<MinecraftServer[]> {
    return db.select().from(minecraftServers).where(eq(minecraftServers.isActive, true)).orderBy(minecraftServers.displayOrder);
  }

  async getAllMinecraftServers(): Promise<MinecraftServer[]> {
    return db.select().from(minecraftServers).orderBy(minecraftServers.displayOrder);
  }

  async createMinecraftServer(data: InsertMinecraftServer): Promise<MinecraftServer> {
    const [created] = await db.insert(minecraftServers).values(data).returning();
    return created;
  }

  async updateMinecraftServer(id: number, data: Partial<InsertMinecraftServer>): Promise<MinecraftServer> {
    const [updated] = await db.update(minecraftServers).set(data).where(eq(minecraftServers.id, id)).returning();
    return updated;
  }

  async deleteMinecraftServer(id: number): Promise<void> {
    await db.delete(minecraftServers).where(eq(minecraftServers.id, id));
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(sql`${subscriptions.nextBillingDate} ASC NULLS LAST`, desc(subscriptions.createdAt));
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(data).returning();
    return created;
  }

  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async deleteSubscription(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async getAiAgents(enabledOnly = false): Promise<AiAgent[]> {
    if (enabledOnly) {
      return db.select().from(aiAgents).where(eq(aiAgents.enabled, true)).orderBy(aiAgents.name);
    }
    return db.select().from(aiAgents).orderBy(aiAgents.name);
  }

  async getAiAgentById(id: number): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
    return agent || undefined;
  }

  async createAiAgent(data: InsertAiAgent): Promise<AiAgent> {
    const [created] = await db.insert(aiAgents).values(data).returning();
    return created;
  }

  async updateAiAgent(id: number, data: Partial<InsertAiAgent>): Promise<AiAgent> {
    const [updated] = await db.update(aiAgents).set(data).where(eq(aiAgents.id, id)).returning();
    return updated;
  }

  async deleteAiAgent(id: number): Promise<void> {
    await db.delete(aiAgents).where(eq(aiAgents.id, id));
  }

  async getAiMessages(agentId: number, userId: string): Promise<AiMessage[]> {
    return db.select().from(aiMessages)
      .where(and(eq(aiMessages.agentId, agentId), eq(aiMessages.userId, userId)))
      .orderBy(aiMessages.createdAt);
  }

  async createAiMessage(data: InsertAiMessage): Promise<AiMessage> {
    const [created] = await db.insert(aiMessages).values(data).returning();
    return created;
  }

  async getAiMessageById(id: number): Promise<AiMessage | undefined> {
    const [msg] = await db.select().from(aiMessages).where(eq(aiMessages.id, id));
    return msg;
  }

  async deleteAiMessage(id: number, agentId: number, userId: string): Promise<void> {
    await db.delete(aiMessages).where(
      and(eq(aiMessages.id, id), eq(aiMessages.agentId, agentId), eq(aiMessages.userId, userId))
    );
  }

  async clearAiConversation(agentId: number, userId: string): Promise<void> {
    await db.delete(aiMessages).where(and(eq(aiMessages.agentId, agentId), eq(aiMessages.userId, userId)));
  }

  async upsertMessageFeedback(data: InsertAiMessageFeedback): Promise<AiMessageFeedback> {
    const [result] = await db
      .insert(aiMessageFeedback)
      .values(data)
      .onConflictDoUpdate({
        target: [aiMessageFeedback.messageId, aiMessageFeedback.userId],
        set: { vote: data.vote },
      })
      .returning();
    return result;
  }

  async getNewsCategories(enabledOnly = false): Promise<NewsCategory[]> {
    if (enabledOnly) {
      return db.select().from(newsCategories).where(eq(newsCategories.enabled, true)).orderBy(newsCategories.displayOrder, newsCategories.name);
    }
    return db.select().from(newsCategories).orderBy(newsCategories.displayOrder, newsCategories.name);
  }

  async getNewsCategoryById(id: number): Promise<NewsCategory | undefined> {
    const [cat] = await db.select().from(newsCategories).where(eq(newsCategories.id, id));
    return cat || undefined;
  }

  async createNewsCategory(data: InsertNewsCategory): Promise<NewsCategory> {
    const [created] = await db.insert(newsCategories).values(data).returning();
    return created;
  }

  async updateNewsCategory(id: number, data: Partial<InsertNewsCategory>): Promise<NewsCategory> {
    const [updated] = await db.update(newsCategories).set(data).where(eq(newsCategories.id, id)).returning();
    return updated;
  }

  async deleteNewsCategory(id: number): Promise<void> {
    await db.delete(newsCategories).where(eq(newsCategories.id, id));
  }

  async seedNewsCategoriesIfEmpty(): Promise<void> {
    const existing = await db.select().from(newsCategories);
    if (existing.length > 0) return;
    await db.insert(newsCategories).values([
      { name: "Music & Entertainment", query: "SEVCO music OR music industry", accentColor: "#0037ff", displayOrder: 0, enabled: true },
      { name: "Technology", query: "technology startup AI", accentColor: "#3b82f6", displayOrder: 1, enabled: true },
      { name: "Business", query: "business entrepreneurship startup", accentColor: "#10b981", displayOrder: 2, enabled: true },
    ]);
  }

  async getNewsFeedItems(categoryQuery: string, limit: number): Promise<NewsItem[]> {
    return db.select().from(newsItems)
      .where(eq(newsItems.categoryQuery, categoryQuery))
      .orderBy(desc(newsItems.pubDate))
      .limit(limit);
  }

  async searchNewsItems(searchText: string, limit: number): Promise<NewsItem[]> {
    return db.select().from(newsItems)
      .where(or(ilike(newsItems.title, `%${searchText}%`), ilike(newsItems.description, `%${searchText}%`)))
      .orderBy(desc(newsItems.pubDate))
      .limit(limit);
  }

  async getNewsCacheStats(): Promise<{ rss: number; tavily: number; x: number; total: number }> {
    const rows = await db
      .select({ sourceType: newsItems.sourceType, count: countFn() })
      .from(newsItems)
      .groupBy(newsItems.sourceType);
    const rss = Number(rows.find(r => r.sourceType === "rss")?.count ?? 0);
    const tavily = Number(rows.find(r => r.sourceType === "tavily")?.count ?? 0);
    const x = Number(rows.find(r => r.sourceType === "x")?.count ?? 0);
    return { rss, tavily, x, total: rss + tavily + x };
  }

  async createEmail(data: InsertEmail): Promise<Email> {
    const [created] = await db.insert(emails).values(data).returning();
    return created;
  }

  async getEmails(userId: string, folder: string, limit: number, offset: number, search?: string, filters?: { sender?: string; dateFrom?: string; dateTo?: string; hasAttachment?: boolean }): Promise<{ emails: Email[]; total: number }> {
    const conditions = [eq(emails.userId, userId)];

    if (folder === "all") {
    } else if (folder === "starred") {
      conditions.push(eq(emails.isStarred, true));
    } else {
      conditions.push(eq(emails.folder, folder));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(emails.subject, pattern),
          ilike(emails.fromAddress, pattern),
          ilike(emails.bodyText, pattern),
        )!
      );
    }

    if (filters?.sender) {
      conditions.push(ilike(emails.fromAddress, `%${filters.sender}%`));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(emails.createdAt, new Date(filters.dateFrom)));
    }
    if (filters?.dateTo) {
      conditions.push(lte(emails.createdAt, new Date(filters.dateTo + "T23:59:59Z")));
    }
    if (filters?.hasAttachment) {
      conditions.push(sql`jsonb_array_length(${emails.attachments}) > 0`);
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db.select({ total: countFn() }).from(emails).where(whereClause);

    const rows = await db.select().from(emails)
      .where(whereClause)
      .orderBy(desc(emails.createdAt))
      .limit(limit)
      .offset(offset);

    return { emails: rows, total: Number(total) };
  }

  async getEmail(id: number, userId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(and(eq(emails.id, id), eq(emails.userId, userId)));
    return email || undefined;
  }

  async updateEmail(id: number, userId: string, updates: Partial<Email>): Promise<Email> {
    const [updated] = await db.update(emails).set(updates).where(and(eq(emails.id, id), eq(emails.userId, userId))).returning();
    return updated;
  }

  async deleteEmail(id: number, userId: string): Promise<void> {
    await db.update(emails).set({ folder: "trash" }).where(and(eq(emails.id, id), eq(emails.userId, userId)));
  }

  async hardDeleteEmail(id: number): Promise<void> {
    await db.delete(emails).where(eq(emails.id, id));
  }

  async getEmailFolderCounts(userId: string): Promise<Record<string, number>> {
    const rows = await db.select({
      folder: emails.folder,
      count: sql<number>`count(*)::int`,
    }).from(emails).where(eq(emails.userId, userId)).groupBy(emails.folder);

    const counts: Record<string, number> = { inbox: 0, sent: 0, drafts: 0, trash: 0, starred: 0 };
    for (const row of rows) {
      counts[row.folder] = row.count;
    }

    const starredCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.isStarred, true)));
    counts.starred = starredCount[0]?.count ?? 0;

    const unreadInbox = await db.select({ count: sql<number>`count(*)::int` })
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.folder, "inbox"), eq(emails.isRead, false)));
    counts.unreadInbox = unreadInbox[0]?.count ?? 0;

    return counts;
  }

  async getEmailByResendIdForUser(userId: string, resendEmailId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(
      and(eq(emails.userId, userId), eq(emails.resendEmailId, resendEmailId))
    );
    return email || undefined;
  }

  async getUserTasks(userId: string): Promise<UserTask[]> {
    return db.select().from(userTasks).where(eq(userTasks.userId, userId)).orderBy(desc(userTasks.createdAt));
  }

  async createUserTask(data: InsertUserTask & { userId: string }): Promise<UserTask> {
    const [task] = await db.insert(userTasks).values(data).returning();
    return task;
  }

  async updateUserTask(id: number, userId: string, data: UpdateUserTask): Promise<UserTask | undefined> {
    const [task] = await db.update(userTasks).set(data).where(and(eq(userTasks.id, id), eq(userTasks.userId, userId))).returning();
    return task;
  }

  async deleteUserTask(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(userTasks).where(and(eq(userTasks.id, id), eq(userTasks.userId, userId))).returning({ id: userTasks.id });
    return result.length > 0;
  }

  async getStaffTasks(): Promise<StaffTask[]> {
    return db.select().from(staffTasks).orderBy(desc(staffTasks.createdAt));
  }

  async createStaffTask(data: InsertStaffTask & { createdById: string }): Promise<StaffTask> {
    const [task] = await db.insert(staffTasks).values(data).returning();
    return task;
  }

  async updateStaffTask(id: number, data: UpdateStaffTask): Promise<StaffTask | undefined> {
    const [task] = await db.update(staffTasks).set(data).where(eq(staffTasks.id, id)).returning();
    return task;
  }

  async deleteStaffTask(id: number): Promise<boolean> {
    const result = await db.delete(staffTasks).where(eq(staffTasks.id, id)).returning({ id: staffTasks.id });
    return result.length > 0;
  }

  async getNewsBookmarks(userId: string): Promise<UserNewsBookmark[]> {
    return db.select().from(userNewsBookmarks).where(eq(userNewsBookmarks.userId, userId)).orderBy(desc(userNewsBookmarks.createdAt));
  }

  async createNewsBookmark(data: InsertUserNewsBookmark): Promise<UserNewsBookmark> {
    const [bookmark] = await db.insert(userNewsBookmarks).values(data).returning();
    return bookmark;
  }

  async deleteNewsBookmark(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(userNewsBookmarks).where(and(eq(userNewsBookmarks.id, id), eq(userNewsBookmarks.userId, userId))).returning({ id: userNewsBookmarks.id });
    return result.length > 0;
  }

  async getNewsPreferences(userId: string): Promise<UserNewsPreferences | undefined> {
    const [prefs] = await db.select().from(userNewsPreferences).where(eq(userNewsPreferences.userId, userId));
    return prefs || undefined;
  }

  async upsertNewsPreferences(userId: string, followedCategoryIds: number[]): Promise<UserNewsPreferences> {
    const existing = await this.getNewsPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userNewsPreferences).set({ followedCategoryIds }).where(eq(userNewsPreferences.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(userNewsPreferences).values({ userId, followedCategoryIds }).returning();
    return created;
  }

  async getDomains(): Promise<Domain[]> {
    return db.select().from(domains).orderBy(asc(domains.displayOrder), asc(domains.name));
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain || undefined;
  }

  async createDomain(data: InsertDomain): Promise<Domain> {
    const [domain] = await db.insert(domains).values(data).returning();
    return domain;
  }

  async updateDomain(id: number, data: Partial<InsertDomain>): Promise<Domain> {
    const [domain] = await db.update(domains).set(data).where(eq(domains.id, id)).returning();
    return domain;
  }

  async deleteDomain(id: number): Promise<void> {
    await db.delete(domains).where(eq(domains.id, id));
  }

  async getNotifications(userId: string, limit = 30): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(asc(notifications.isRead), desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ count: countFn() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(row?.count ?? 0);
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getUsersByRole(roles: Role[]): Promise<User[]> {
    return db.select().from(users).where(inArray(users.role, roles));
  }

  async getMusicTracks(filter?: { type?: string; publishedOnly?: boolean; artistId?: number; albumName?: string; userId?: string }): Promise<(MusicTrack & { artist: { id: number; name: string } | null; user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null })[]> {
    const rows = await db
      .select({
        id: musicTracks.id,
        title: musicTracks.title,
        artistId: musicTracks.artistId,
        artistName: musicTracks.artistName,
        userId: musicTracks.userId,
        albumName: musicTracks.albumName,
        genre: musicTracks.genre,
        type: musicTracks.type,
        fileUrl: musicTracks.fileUrl,
        coverImageUrl: musicTracks.coverImageUrl,
        duration: musicTracks.duration,
        streamCount: musicTracks.streamCount,
        status: musicTracks.status,
        displayOrder: musicTracks.displayOrder,
        createdAt: musicTracks.createdAt,
        linkedArtistName: artists.name,
        ownerUsername: users.username,
        ownerDisplayName: users.displayName,
        ownerAvatarUrl: users.avatarUrl,
      })
      .from(musicTracks)
      .leftJoin(artists, eq(musicTracks.artistId, artists.id))
      .leftJoin(users, eq(musicTracks.userId, users.id))
      .where(
        and(
          filter?.type ? eq(musicTracks.type, filter.type) : undefined,
          filter?.publishedOnly ? eq(musicTracks.status, "published") : undefined,
          filter?.artistId !== undefined ? eq(musicTracks.artistId, filter.artistId) : undefined,
          filter?.albumName !== undefined ? eq(musicTracks.albumName, filter.albumName) : undefined,
          filter?.userId !== undefined ? eq(musicTracks.userId, filter.userId) : undefined,
        )
      )
      .orderBy(asc(musicTracks.displayOrder), asc(musicTracks.createdAt));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      artistId: r.artistId,
      artistName: r.artistName,
      userId: r.userId,
      albumName: r.albumName,
      genre: r.genre,
      type: r.type,
      fileUrl: r.fileUrl,
      coverImageUrl: r.coverImageUrl,
      duration: r.duration,
      streamCount: r.streamCount,
      status: r.status,
      displayOrder: r.displayOrder,
      createdAt: r.createdAt,
      artist: r.artistId != null ? { id: r.artistId, name: r.linkedArtistName ?? r.artistName } : null,
      user: r.userId != null && r.ownerUsername != null
        ? { id: r.userId, username: r.ownerUsername, displayName: r.ownerDisplayName, avatarUrl: r.ownerAvatarUrl }
        : null,
    }));
  }

  async getMusicTrackById(id: number): Promise<MusicTrack | undefined> {
    const [track] = await db.select().from(musicTracks).where(eq(musicTracks.id, id));
    return track;
  }

  async getUsersWithOwnedTracks(): Promise<User[]> {
    const rows = await db
      .selectDistinct({ user: users })
      .from(users)
      .innerJoin(musicTracks, eq(musicTracks.userId, users.id))
      .where(eq(musicTracks.status, "published"));
    return rows.map((r) => r.user);
  }

  async getMusicTrack(id: number): Promise<(MusicTrack & { artist: { id: number; name: string } | null; user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null }) | undefined> {
    const [row] = await db
      .select({
        id: musicTracks.id,
        title: musicTracks.title,
        artistId: musicTracks.artistId,
        artistName: musicTracks.artistName,
        userId: musicTracks.userId,
        albumName: musicTracks.albumName,
        genre: musicTracks.genre,
        type: musicTracks.type,
        fileUrl: musicTracks.fileUrl,
        coverImageUrl: musicTracks.coverImageUrl,
        duration: musicTracks.duration,
        streamCount: musicTracks.streamCount,
        status: musicTracks.status,
        displayOrder: musicTracks.displayOrder,
        createdAt: musicTracks.createdAt,
        linkedArtistName: artists.name,
        ownerUsername: users.username,
        ownerDisplayName: users.displayName,
        ownerAvatarUrl: users.avatarUrl,
      })
      .from(musicTracks)
      .leftJoin(artists, eq(musicTracks.artistId, artists.id))
      .leftJoin(users, eq(musicTracks.userId, users.id))
      .where(eq(musicTracks.id, id));

    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      artistId: row.artistId,
      artistName: row.artistName,
      userId: row.userId,
      albumName: row.albumName,
      genre: row.genre,
      type: row.type,
      fileUrl: row.fileUrl,
      coverImageUrl: row.coverImageUrl,
      duration: row.duration,
      streamCount: row.streamCount,
      status: row.status,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      artist: row.artistId != null ? { id: row.artistId, name: row.linkedArtistName ?? row.artistName } : null,
      user: row.userId != null && row.ownerUsername != null
        ? { id: row.userId, username: row.ownerUsername, displayName: row.ownerDisplayName, avatarUrl: row.ownerAvatarUrl }
        : null,
    };
  }

  async createMusicTrack(data: InsertMusicTrack): Promise<MusicTrack> {
    const [track] = await db.insert(musicTracks).values(data).returning();
    return track;
  }

  async updateMusicTrack(id: number, data: Partial<InsertMusicTrack>): Promise<MusicTrack> {
    const [track] = await db.update(musicTracks).set(data).where(eq(musicTracks.id, id)).returning();
    return track;
  }

  async deleteMusicTrack(id: number): Promise<void> {
    await db.delete(musicTracks).where(eq(musicTracks.id, id));
  }

  async incrementMusicTrackStream(id: number): Promise<MusicTrack> {
    const [track] = await db
      .update(musicTracks)
      .set({ streamCount: sql`${musicTracks.streamCount} + 1` })
      .where(eq(musicTracks.id, id))
      .returning();
    return track;
  }

  async getSystemMailboxes(): Promise<SystemMailbox[]> {
    return db.select().from(systemMailboxes).orderBy(asc(systemMailboxes.name));
  }

  async getSystemMailboxByAddress(address: string): Promise<SystemMailbox | undefined> {
    const [mb] = await db.select().from(systemMailboxes).where(eq(systemMailboxes.address, address.toLowerCase()));
    return mb;
  }

  async createSystemMailbox(data: InsertSystemMailbox): Promise<SystemMailbox> {
    const [mb] = await db.insert(systemMailboxes).values({ ...data, address: data.address.toLowerCase() }).returning();
    return mb;
  }

  async deleteSystemMailbox(id: number): Promise<void> {
    await db.delete(systemMailboxes).where(eq(systemMailboxes.id, id));
  }

  async getSystemMailboxUnreadCounts(): Promise<Record<number, number>> {
    const rows = await db
      .select({ mailboxId: systemMailboxEmails.mailboxId, cnt: countFn() })
      .from(systemMailboxEmails)
      .where(and(eq(systemMailboxEmails.isRead, false), eq(systemMailboxEmails.direction, "inbound")))
      .groupBy(systemMailboxEmails.mailboxId);
    const result: Record<number, number> = {};
    for (const row of rows) result[row.mailboxId] = Number(row.cnt);
    return result;
  }

  async getSystemMailboxEmails(mailboxId: number): Promise<SystemMailboxEmail[]> {
    return db.select().from(systemMailboxEmails)
      .where(eq(systemMailboxEmails.mailboxId, mailboxId))
      .orderBy(desc(systemMailboxEmails.createdAt));
  }

  async getSystemMailboxEmail(mailboxId: number, emailId: number): Promise<SystemMailboxEmail | undefined> {
    const [email] = await db.select().from(systemMailboxEmails)
      .where(and(eq(systemMailboxEmails.id, emailId), eq(systemMailboxEmails.mailboxId, mailboxId)));
    return email;
  }

  async getSystemMailboxEmailByResendId(resendEmailId: string): Promise<SystemMailboxEmail | undefined> {
    const [email] = await db.select().from(systemMailboxEmails)
      .where(eq(systemMailboxEmails.resendEmailId, resendEmailId));
    return email;
  }

  async createSystemMailboxEmail(data: InsertSystemMailboxEmail): Promise<SystemMailboxEmail> {
    const [email] = await db.insert(systemMailboxEmails).values(data).returning();
    return email;
  }

  async markSystemMailboxEmailRead(mailboxId: number, emailId: number): Promise<void> {
    await db.update(systemMailboxEmails)
      .set({ isRead: true })
      .where(and(eq(systemMailboxEmails.id, emailId), eq(systemMailboxEmails.mailboxId, mailboxId)));
  }

  async getLatestMarketData(): Promise<MarketData[]> {
    return db.select().from(marketData).orderBy(asc(marketData.instrumentType), asc(marketData.symbol));
  }

  async upsertMarketData(items: InsertMarketData[]): Promise<void> {
    if (!items.length) return;
    for (const item of items) {
      await db.insert(marketData)
        .values({ ...item, fetchedAt: new Date() })
        .onConflictDoUpdate({
          target: marketData.symbol,
          set: {
            price: item.price,
            changePercent: item.changePercent,
            name: item.name,
            instrumentType: item.instrumentType,
            currency: item.currency,
            fetchedAt: new Date(),
          },
        });
    }
  }

  async deleteExpiredMarketData(olderThanMinutes = 30): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    await db.delete(marketData).where(lte(marketData.fetchedAt, cutoff));
  }

  async getUserSparksBalance(userId: string): Promise<number> {
    const [user] = await db.select({ sparksBalance: users.sparksBalance }).from(users).where(eq(users.id, userId));
    return user?.sparksBalance ?? 0;
  }

  private async applyCreditInTx(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    userId: string,
    amount: number,
    type: string,
    description: string,
    opts?: { stripeSessionId?: string; metadata?: object },
  ): Promise<void> {
    await tx
      .update(users)
      .set({ sparksBalance: sql`${users.sparksBalance} + ${amount}` })
      .where(eq(users.id, userId));
    await tx.insert(sparkTransactions).values({
      userId,
      amount,
      type,
      description,
      stripeSessionId: opts?.stripeSessionId ?? null,
      metadata: opts?.metadata ?? null,
    });
  }

  async creditSparks(userId: string, amount: number, type: string, description: string, opts?: { stripeSessionId?: string; metadata?: object }): Promise<void> {
    await db.transaction(async (tx) => {
      await this.applyCreditInTx(tx, userId, amount, type, description, opts);
    });
  }

  async hasUserSparkedAnyPost(userId: string): Promise<boolean> {
    const [row] = await db.select({ id: postSparks.postId }).from(postSparks).where(eq(postSparks.userId, userId)).limit(1);
    return !!row;
  }

  async hasUserSparkedAnyArticle(userId: string): Promise<boolean> {
    const [row] = await db.select({ id: articleSparks.articleId }).from(articleSparks).where(eq(articleSparks.userId, userId)).limit(1);
    return !!row;
  }

  async hasUserSparkedAnyTrack(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: trackSparks.trackId })
      .from(trackSparks)
      .where(and(eq(trackSparks.userId, userId), isNull(trackSparks.revokedAt)))
      .limit(1);
    return !!row;
  }

  async creditOnboardingBonus(userId: string, taskKey: string, label: string, amount: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        await this.applyCreditInTx(
          tx,
          userId,
          amount,
          "onboarding_bonus",
          `Onboarding bonus: ${label}`,
          { metadata: { taskKey } },
        );
      });
      return true;
    } catch (err: any) {
      const isUniqueViolation =
        err?.code === "23505" || err?.message?.includes("spark_txn_onboarding_task_idx");
      if (isUniqueViolation) return false;
      throw err;
    }
  }

  async debitSparks(userId: string, amount: number, type: string, description: string, opts?: { metadata?: object; allowOverdraft?: boolean }): Promise<void> {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ sparksBalance: users.sparksBalance })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      const current = user?.sparksBalance ?? 0;
      if (!opts?.allowOverdraft && current < amount) {
        throw new InsufficientSparksError(current, amount);
      }
      await tx
        .update(users)
        .set({ sparksBalance: sql`${users.sparksBalance} - ${amount}` })
        .where(eq(users.id, userId));
      await tx.insert(sparkTransactions).values({
        userId,
        amount: -amount,
        type,
        description,
        stripeSessionId: null,
        metadata: opts?.metadata ?? null,
      });
    });
  }

  async getUserSparkTransactions(userId: string, limit = 20, offset = 0): Promise<SparkTransaction[]> {
    return db
      .select()
      .from(sparkTransactions)
      .where(eq(sparkTransactions.userId, userId))
      .orderBy(desc(sparkTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getAllSparkTransactions(filters?: { userId?: string; type?: string; dateFrom?: Date; dateTo?: Date }, limit = 50, offset = 0): Promise<{ transactions: Array<SparkTransaction & { username: string; displayName: string | null }>; total: number }> {
    const conditions: SQL[] = [];
    if (filters?.userId) conditions.push(eq(sparkTransactions.userId, filters.userId));
    if (filters?.type) conditions.push(eq(sparkTransactions.type, filters.type));
    if (filters?.dateFrom) conditions.push(gte(sparkTransactions.createdAt, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(sparkTransactions.createdAt, filters.dateTo));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: sparkTransactions.id,
          userId: sparkTransactions.userId,
          amount: sparkTransactions.amount,
          type: sparkTransactions.type,
          description: sparkTransactions.description,
          stripeSessionId: sparkTransactions.stripeSessionId,
          metadata: sparkTransactions.metadata,
          createdAt: sparkTransactions.createdAt,
          username: users.username,
          displayName: users.displayName,
        })
        .from(sparkTransactions)
        .leftJoin(users, eq(sparkTransactions.userId, users.id))
        .where(where)
        .orderBy(desc(sparkTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sparkTransactions)
        .where(where),
    ]);

    return {
      transactions: rows.map((r) => ({
        ...r,
        username: r.username ?? r.userId ?? "unknown",
        displayName: r.displayName ?? null,
      })),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async getSparkStats(): Promise<{ totalIssued: number; activeUsersWithSparks: number }> {
    const [issuedRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sparkTransactions.amount}), 0)` })
      .from(sparkTransactions)
      .where(sql`${sparkTransactions.amount} > 0`);

    const [balanceSumRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${users.sparksBalance}), 0)` })
      .from(users)
      .where(sql`${users.sparksBalance} > 0`);

    const [activeRow] = await db
      .select({ count: countFn() })
      .from(users)
      .where(sql`${users.sparksBalance} > 0`);

    const transactionTotal = Number(issuedRow?.total ?? 0);
    const balanceTotal = Number(balanceSumRow?.total ?? 0);

    return {
      totalIssued: Math.max(transactionTotal, balanceTotal),
      activeUsersWithSparks: Number(activeRow?.count ?? 0),
    };
  }

  async listSparkPacks(activeOnly = false): Promise<SparkPack[]> {
    const query = db.select().from(sparkPacks).orderBy(sparkPacks.sortOrder);
    if (activeOnly) {
      return query.where(eq(sparkPacks.active, true));
    }
    return query;
  }

  async getSparkPack(id: number): Promise<SparkPack | undefined> {
    const [pack] = await db.select().from(sparkPacks).where(eq(sparkPacks.id, id));
    return pack || undefined;
  }

  async upsertSparkPack(data: InsertSparkPack): Promise<SparkPack> {
    const [pack] = await db.insert(sparkPacks).values(data).returning();
    return pack;
  }

  async updateSparkPack(id: number, data: Partial<InsertSparkPack>): Promise<SparkPack> {
    const [pack] = await db.update(sparkPacks).set(data).where(eq(sparkPacks.id, id)).returning();
    return pack;
  }

  async deleteSparkPack(id: number): Promise<void> {
    await db.update(sparkPacks).set({ active: false }).where(eq(sparkPacks.id, id));
  }

  async grantFreeMonthlyAllocation(userId: string): Promise<boolean> {
    const settings = await this.getPlatformSettings();
    const rawAmount = parseInt(settings["sparks.freeMonthlyAllocation"] ?? "50", 10);
    const allocationAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 50;

    let granted = false;
    try {
      await db.transaction(async (tx) => {
        await this.applyCreditInTx(tx, userId, allocationAmount, "free_allocation", "Monthly free Sparks");
        granted = true;
      });
    } catch (err: any) {
      const isUniqueViolation = err?.code === '23505' ||
        err?.message?.includes('spark_txn_free_allocation_month_idx');
      if (isUniqueViolation) {
        return false;
      }
      throw err;
    }
    return granted;
  }

  async isSparkSessionProcessed(stripeSessionId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(sparkTransactions)
      .where(eq(sparkTransactions.stripeSessionId, stripeSessionId))
      .limit(1);
    return !!existing;
  }

  async getUserDailySparksGiven(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postCount = await db
      .select({ count: countFn() })
      .from(postSparks)
      .where(and(eq(postSparks.userId, userId), gte(postSparks.createdAt, today)));
    const articleCount = await db
      .select({ count: countFn() })
      .from(articleSparks)
      .where(and(eq(articleSparks.userId, userId), gte(articleSparks.createdAt, today)));
    const galleryCount = await db
      .select({ count: countFn() })
      .from(gallerySparks)
      .where(and(eq(gallerySparks.userId, userId), gte(gallerySparks.createdAt, today)));
    const trackCount = await db
      .select({ count: countFn() })
      .from(trackSparks)
      .where(and(eq(trackSparks.userId, userId), gte(trackSparks.createdAt, today)));
    const productCount = await db
      .select({ count: countFn() })
      .from(productSparks)
      .where(and(eq(productSparks.userId, userId), gte(productSparks.createdAt, today)));
    const projectCount = await db
      .select({ count: countFn() })
      .from(projectSparks)
      .where(and(eq(projectSparks.userId, userId), gte(projectSparks.createdAt, today)));
    const serviceCount = await db
      .select({ count: countFn() })
      .from(serviceSparks)
      .where(and(eq(serviceSparks.userId, userId), gte(serviceSparks.createdAt, today)));
    return (postCount[0]?.count ?? 0) + (articleCount[0]?.count ?? 0) + (galleryCount[0]?.count ?? 0)
      + (trackCount[0]?.count ?? 0) + (productCount[0]?.count ?? 0)
      + (projectCount[0]?.count ?? 0) + (serviceCount[0]?.count ?? 0);
  }

  async sparkPost(postId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
    if (post?.authorId === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(postSparks).where(and(eq(postSparks.postId, postId), eq(postSparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(postSparks).values({ postId, userId });
    if (post?.authorId) {
      await this.creditSparks(post.authorId, 1, "social_reward", `Spark received on post #${postId}`, { metadata: { postId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async sparkArticle(articleId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [article] = await db.select({ authorId: articles.authorId }).from(articles).where(eq(articles.id, articleId)).limit(1);
    if (article?.authorId === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(articleSparks).where(and(eq(articleSparks.articleId, articleId), eq(articleSparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(articleSparks).values({ articleId, userId });
    if (article?.authorId) {
      await this.creditSparks(article.authorId, 1, "social_reward", `Spark received on article #${articleId}`, { metadata: { articleId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async getArticleSparkInfo(articleId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(articleSparks).where(eq(articleSparks.articleId, articleId));
    const sparkCount = scRow?.count ?? 0;
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(articleSparks).where(and(eq(articleSparks.articleId, articleId), eq(articleSparks.userId, userId))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount, isSparkedByMe };
  }

  async getGallerySparkInfo(imageId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(gallerySparks).where(eq(gallerySparks.imageId, imageId));
    const sparkCount = scRow?.count ?? 0;
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(gallerySparks).where(and(eq(gallerySparks.imageId, imageId), eq(gallerySparks.userId, userId))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount, isSparkedByMe };
  }

  async sparkGalleryImage(imageId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [image] = await db.select({ uploadedBy: galleryImages.uploadedBy }).from(galleryImages).where(eq(galleryImages.id, imageId)).limit(1);
    if (image?.uploadedBy === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(gallerySparks).where(and(eq(gallerySparks.imageId, imageId), eq(gallerySparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(gallerySparks).values({ imageId, userId });
    if (image?.uploadedBy) {
      await this.creditSparks(image.uploadedBy, 1, "social_reward", `Spark received on gallery image #${imageId}`, { metadata: { imageId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async sparkTrack(trackId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [track] = await db.select({ artistId: musicTracks.artistId }).from(musicTracks).where(eq(musicTracks.id, trackId)).limit(1);
    let recipientId: string | null = null;
    if (track?.artistId != null) {
      const [linked] = await db.select({ id: users.id }).from(users).where(eq(users.linkedArtistId, track.artistId)).limit(1);
      if (linked) recipientId = linked.id;
    }
    if (recipientId === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(trackSparks).where(and(eq(trackSparks.trackId, trackId), eq(trackSparks.userId, userId))).limit(1);
    if (existing && !existing.revokedAt) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    if (existing && existing.revokedAt) {
      // Re-spark a previously revoked spark: bypass the daily cap because the original
      // insert's createdAt still occupies a daily-limit slot, do not re-credit recipient,
      // and do not count again toward the daily limit.
      await db.update(trackSparks)
        .set({ revokedAt: null })
        .where(and(eq(trackSparks.trackId, trackId), eq(trackSparks.userId, userId)));
      await db.update(musicTracks)
        .set({ sparkCount: sql`${musicTracks.sparkCount} + 1` })
        .where(eq(musicTracks.id, trackId));
      return { alreadySparked: false, rateLimited: false, selfSpark: false };
    }
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(trackSparks).values({ trackId, userId });
    await db.update(musicTracks)
      .set({ sparkCount: sql`${musicTracks.sparkCount} + 1` })
      .where(eq(musicTracks.id, trackId));
    if (recipientId) {
      await this.creditSparks(recipientId, 1, "social_reward", `Spark received on music track #${trackId}`, { metadata: { trackId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async unsparkTrack(trackId: number, userId: string): Promise<void> {
    const [existing] = await db.select().from(trackSparks)
      .where(and(eq(trackSparks.trackId, trackId), eq(trackSparks.userId, userId)))
      .limit(1);
    if (!existing || existing.revokedAt) return;
    await db.update(trackSparks)
      .set({ revokedAt: new Date() })
      .where(and(eq(trackSparks.trackId, trackId), eq(trackSparks.userId, userId)));
    await db.update(musicTracks)
      .set({ sparkCount: sql`GREATEST(${musicTracks.sparkCount} - 1, 0)` })
      .where(eq(musicTracks.id, trackId));
  }

  async sparkProduct(productId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [existing] = await db.select().from(productSparks).where(and(eq(productSparks.productId, productId), eq(productSparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(productSparks).values({ productId, userId });
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async sparkProject(projectId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [project] = await db.select({ leadUserId: projects.leadUserId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (project?.leadUserId === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(projectSparks).where(and(eq(projectSparks.projectId, projectId), eq(projectSparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(projectSparks).values({ projectId, userId });
    if (project?.leadUserId) {
      await this.creditSparks(project.leadUserId, 1, "social_reward", `Spark received on project #${projectId}`, { metadata: { projectId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async sparkService(serviceId: number, userId: string): Promise<{ alreadySparked: boolean; rateLimited: boolean; selfSpark: boolean }> {
    const [service] = await db.select({ leadUserId: services.leadUserId }).from(services).where(eq(services.id, serviceId)).limit(1);
    if (service?.leadUserId === userId) return { alreadySparked: false, rateLimited: false, selfSpark: true };
    const [existing] = await db.select().from(serviceSparks).where(and(eq(serviceSparks.serviceId, serviceId), eq(serviceSparks.userId, userId))).limit(1);
    if (existing) return { alreadySparked: true, rateLimited: false, selfSpark: false };
    const dailyCount = await this.getUserDailySparksGiven(userId);
    if (dailyCount >= 10) return { alreadySparked: false, rateLimited: true, selfSpark: false };
    await db.insert(serviceSparks).values({ serviceId, userId });
    if (service?.leadUserId) {
      await this.creditSparks(service.leadUserId, 1, "social_reward", `Spark received on service #${serviceId}`, { metadata: { serviceId, fromUserId: userId } });
    }
    return { alreadySparked: false, rateLimited: false, selfSpark: false };
  }

  async getTrackSparkInfo(trackId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(trackSparks).where(and(eq(trackSparks.trackId, trackId), isNull(trackSparks.revokedAt)));
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(trackSparks).where(and(eq(trackSparks.trackId, trackId), eq(trackSparks.userId, userId), isNull(trackSparks.revokedAt))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount: scRow?.count ?? 0, isSparkedByMe };
  }

  async getProductSparkInfo(productId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(productSparks).where(eq(productSparks.productId, productId));
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(productSparks).where(and(eq(productSparks.productId, productId), eq(productSparks.userId, userId))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount: scRow?.count ?? 0, isSparkedByMe };
  }

  async getProjectSparkInfo(projectId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(projectSparks).where(eq(projectSparks.projectId, projectId));
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(projectSparks).where(and(eq(projectSparks.projectId, projectId), eq(projectSparks.userId, userId))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount: scRow?.count ?? 0, isSparkedByMe };
  }

  async getServiceSparkInfo(serviceId: number, userId?: string): Promise<{ sparkCount: number; isSparkedByMe: boolean }> {
    const [scRow] = await db.select({ count: countFn() }).from(serviceSparks).where(eq(serviceSparks.serviceId, serviceId));
    let isSparkedByMe = false;
    if (userId) {
      const [sm] = await db.select().from(serviceSparks).where(and(eq(serviceSparks.serviceId, serviceId), eq(serviceSparks.userId, userId))).limit(1);
      isSparkedByMe = !!sm;
    }
    return { sparkCount: scRow?.count ?? 0, isSparkedByMe };
  }

  async getTrackSparkCounts(trackIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (trackIds.length === 0) return map;
    const rows = await db.select({ trackId: trackSparks.trackId, count: sql<number>`COUNT(*)::int` }).from(trackSparks).where(and(inArray(trackSparks.trackId, trackIds), isNull(trackSparks.revokedAt))).groupBy(trackSparks.trackId);
    for (const r of rows) map.set(r.trackId, r.count);
    return map;
  }

  async getTrackSparkedByUser(trackIds: number[], userId: string): Promise<Set<number>> {
    const set = new Set<number>();
    if (trackIds.length === 0) return set;
    const rows = await db.select({ trackId: trackSparks.trackId }).from(trackSparks).where(and(inArray(trackSparks.trackId, trackIds), eq(trackSparks.userId, userId), isNull(trackSparks.revokedAt)));
    for (const r of rows) set.add(r.trackId);
    return set;
  }

  async getProductSparkCounts(productIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (productIds.length === 0) return map;
    const rows = await db.select({ productId: productSparks.productId, count: sql<number>`COUNT(*)::int` }).from(productSparks).where(inArray(productSparks.productId, productIds)).groupBy(productSparks.productId);
    for (const r of rows) map.set(r.productId, r.count);
    return map;
  }

  async getProductSparkedByUser(productIds: number[], userId: string): Promise<Set<number>> {
    const set = new Set<number>();
    if (productIds.length === 0) return set;
    const rows = await db.select({ productId: productSparks.productId }).from(productSparks).where(and(inArray(productSparks.productId, productIds), eq(productSparks.userId, userId)));
    for (const r of rows) set.add(r.productId);
    return set;
  }

  async getArticleSparkCounts(articleIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (articleIds.length === 0) return map;
    const rows = await db.select({ articleId: articleSparks.articleId, count: sql<number>`COUNT(*)::int` }).from(articleSparks).where(inArray(articleSparks.articleId, articleIds)).groupBy(articleSparks.articleId);
    for (const r of rows) map.set(r.articleId, r.count);
    return map;
  }

  async getArticleSparkedByUser(articleIds: number[], userId: string): Promise<Set<number>> {
    const set = new Set<number>();
    if (articleIds.length === 0) return set;
    const rows = await db.select({ articleId: articleSparks.articleId }).from(articleSparks).where(and(inArray(articleSparks.articleId, articleIds), eq(articleSparks.userId, userId)));
    for (const r of rows) set.add(r.articleId);
    return set;
  }

  async getProjectSparkCounts(projectIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (projectIds.length === 0) return map;
    const rows = await db.select({ projectId: projectSparks.projectId, count: sql<number>`COUNT(*)::int` }).from(projectSparks).where(inArray(projectSparks.projectId, projectIds)).groupBy(projectSparks.projectId);
    for (const r of rows) map.set(r.projectId, r.count);
    return map;
  }

  async getProjectSparkedByUser(projectIds: number[], userId: string): Promise<Set<number>> {
    const set = new Set<number>();
    if (projectIds.length === 0) return set;
    const rows = await db.select({ projectId: projectSparks.projectId }).from(projectSparks).where(and(inArray(projectSparks.projectId, projectIds), eq(projectSparks.userId, userId)));
    for (const r of rows) set.add(r.projectId);
    return set;
  }

  async getServiceSparkCounts(serviceIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (serviceIds.length === 0) return map;
    const rows = await db.select({ serviceId: serviceSparks.serviceId, count: sql<number>`COUNT(*)::int` }).from(serviceSparks).where(inArray(serviceSparks.serviceId, serviceIds)).groupBy(serviceSparks.serviceId);
    for (const r of rows) map.set(r.serviceId, r.count);
    return map;
  }

  async getServiceSparkedByUser(serviceIds: number[], userId: string): Promise<Set<number>> {
    const set = new Set<number>();
    if (serviceIds.length === 0) return set;
    const rows = await db.select({ serviceId: serviceSparks.serviceId }).from(serviceSparks).where(and(inArray(serviceSparks.serviceId, serviceIds), eq(serviceSparks.userId, userId)));
    for (const r of rows) set.add(r.serviceId);
    return set;
  }

  async getTopSparkedPostsByUser(userId: string, limit = 3): Promise<Array<{ id: number; content: string; imageUrl: string | null; createdAt: Date; sparkCount: number }>> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const rows = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        sparkCount: sql<number>`COUNT(${postSparks.postId})::int`,
      })
      .from(posts)
      .innerJoin(postSparks, and(eq(postSparks.postId, posts.id), gte(postSparks.createdAt, startOfMonth)))
      .where(eq(posts.authorId, userId))
      .groupBy(posts.id)
      .orderBy(sql`COUNT(${postSparks.postId}) DESC`)
      .limit(limit);
    return rows;
  }

  async getSocialSparkStats(): Promise<{
    totalIssued: number;
    uniqueAuthorsRewarded: number;
    totalPostSparksGiven: number;
    totalArticleSparksGiven: number;
    totalGallerySparksGiven: number;
    topRewardedCreatorThisMonth: { username: string; displayName: string | null; sparksReceived: number } | null;
    topItems: Array<{ type: string; title: string; sparkCount: number; id: number | string; slug?: string; authorUsername?: string; uploaderUsername?: string }>;
  }> {
    const [totalRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${sparkTransactions.amount}), 0)::int` })
      .from(sparkTransactions)
      .where(eq(sparkTransactions.type, "social_reward"));
    const [uniqueRow] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${sparkTransactions.userId})::int` })
      .from(sparkTransactions)
      .where(eq(sparkTransactions.type, "social_reward"));
    const [postTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(postSparks);
    const [articleTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(articleSparks);
    const [galleryTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(gallerySparks);
    const [trackTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(trackSparks).where(isNull(trackSparks.revokedAt));
    const [productTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(productSparks);
    const [projectTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(projectSparks);
    const [serviceTotalRow] = await db.select({ total: sql<number>`COUNT(*)::int` }).from(serviceSparks);
    const topPosts = await db
      .select({
        id: posts.id,
        title: sql<string>`LEFT(${posts.content}, 80)`,
        sparkCount: sql<number>`COUNT(*)::int`,
        authorUsername: users.username,
      })
      .from(postSparks)
      .innerJoin(posts, eq(posts.id, postSparks.postId))
      .innerJoin(users, eq(users.id, posts.authorId))
      .groupBy(posts.id, users.username)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topArticles = await db
      .select({ id: articles.id, title: articles.title, slug: articles.slug, sparkCount: sql<number>`COUNT(*)::int` })
      .from(articleSparks)
      .innerJoin(articles, eq(articles.id, articleSparks.articleId))
      .groupBy(articles.id, articles.title, articles.slug)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topGallery = await db
      .select({
        id: galleryImages.id,
        title: galleryImages.title,
        sparkCount: sql<number>`COUNT(*)::int`,
        uploaderUsername: sql<string | null>`(SELECT u.username FROM users u WHERE u.id = ${galleryImages.uploadedBy})`,
      })
      .from(gallerySparks)
      .innerJoin(galleryImages, eq(galleryImages.id, gallerySparks.imageId))
      .groupBy(galleryImages.id, galleryImages.title)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topTracks = await db
      .select({ id: musicTracks.id, title: musicTracks.title, sparkCount: sql<number>`COUNT(*)::int` })
      .from(trackSparks)
      .innerJoin(musicTracks, eq(musicTracks.id, trackSparks.trackId))
      .where(isNull(trackSparks.revokedAt))
      .groupBy(musicTracks.id, musicTracks.title)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topProducts = await db
      .select({ id: products.id, title: products.name, slug: products.slug, sparkCount: sql<number>`COUNT(*)::int` })
      .from(productSparks)
      .innerJoin(products, eq(products.id, productSparks.productId))
      .groupBy(products.id, products.name, products.slug)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topProjectsRows = await db
      .select({ id: projects.id, title: projects.name, slug: projects.slug, sparkCount: sql<number>`COUNT(*)::int` })
      .from(projectSparks)
      .innerJoin(projects, eq(projects.id, projectSparks.projectId))
      .groupBy(projects.id, projects.name, projects.slug)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const topServices = await db
      .select({ id: services.id, title: services.name, slug: services.slug, sparkCount: sql<number>`COUNT(*)::int` })
      .from(serviceSparks)
      .innerJoin(services, eq(services.id, serviceSparks.serviceId))
      .groupBy(services.id, services.name, services.slug)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
    const combined = [
      ...topPosts.map((p) => ({ type: "post", title: p.title, sparkCount: p.sparkCount, id: p.id, authorUsername: p.authorUsername })),
      ...topArticles.map((a) => ({ type: "article", title: a.title, sparkCount: a.sparkCount, id: a.id, slug: a.slug })),
      ...topGallery.map((g) => ({ type: "gallery", title: g.title, sparkCount: g.sparkCount, id: g.id, uploaderUsername: g.uploaderUsername ?? undefined })),
      ...topTracks.map((t) => ({ type: "track", title: t.title, sparkCount: t.sparkCount, id: t.id })),
      ...topProducts.map((p) => ({ type: "product", title: p.title, sparkCount: p.sparkCount, id: p.id, slug: p.slug })),
      ...topProjectsRows.map((p) => ({ type: "project", title: p.title, sparkCount: p.sparkCount, id: p.id, slug: p.slug })),
      ...topServices.map((s) => ({ type: "service", title: s.title, sparkCount: s.sparkCount, id: s.id, slug: s.slug })),
    ].sort((a, b) => b.sparkCount - a.sparkCount).slice(0, 10);
    // Top rewarded creator this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const topCreatorRows = await db
      .select({
        userId: sparkTransactions.userId,
        sparksReceived: sql<number>`SUM(${sparkTransactions.amount})::int`,
        username: users.username,
        displayName: users.displayName,
      })
      .from(sparkTransactions)
      .innerJoin(users, eq(users.id, sparkTransactions.userId))
      .where(and(eq(sparkTransactions.type, "social_reward"), gte(sparkTransactions.createdAt, startOfMonth)))
      .groupBy(sparkTransactions.userId, users.username, users.displayName)
      .orderBy(sql`SUM(${sparkTransactions.amount}) DESC`)
      .limit(1);
    const topCreator = topCreatorRows[0]
      ? { username: topCreatorRows[0].username, displayName: topCreatorRows[0].displayName ?? null, sparksReceived: topCreatorRows[0].sparksReceived }
      : null;
    return {
      totalIssued: totalRow?.total ?? 0,
      uniqueAuthorsRewarded: uniqueRow?.count ?? 0,
      totalPostSparksGiven: postTotalRow?.total ?? 0,
      totalArticleSparksGiven: articleTotalRow?.total ?? 0,
      totalGallerySparksGiven: galleryTotalRow?.total ?? 0,
      totalTrackSparksGiven: trackTotalRow?.total ?? 0,
      totalProductSparksGiven: productTotalRow?.total ?? 0,
      totalProjectSparksGiven: projectTotalRow?.total ?? 0,
      totalServiceSparksGiven: serviceTotalRow?.total ?? 0,
      topRewardedCreatorThisMonth: topCreator,
      topItems: combined,
    };
  }

  async getSparksLeaderboard(period: "month" | "all"): Promise<{
    topCreators: { userId: string; username: string; displayName: string | null; avatarUrl: string | null; sparksReceived: number }[];
    topPosts: { id: number; content: string; authorUsername: string; authorDisplayName: string | null; sparksReceived: number }[];
    topContent: { id: number; title: string; contentType: "article" | "gallery"; sparksReceived: number }[];
  }> {
    const cutoff = period === "month"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : undefined;

    // === Top Posts (from post_sparks) ===
    const topPostsRows = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        authorUsername: users.username,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
        sparksReceived: sql<number>`cast(count(*) as integer)`,
      })
      .from(postSparks)
      .innerJoin(posts, eq(posts.id, postSparks.postId))
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(cutoff ? gte(postSparks.createdAt, cutoff) : undefined)
      .groupBy(posts.id, posts.content, posts.authorId, users.username, users.displayName, users.avatarUrl)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const topPosts = topPostsRows.map((p) => ({
      id: p.id,
      content: p.content,
      authorUsername: p.authorUsername,
      authorDisplayName: p.authorDisplayName,
      sparksReceived: p.sparksReceived,
    }));

    // === Top Articles (from article_sparks) ===
    const topArticleRows = await db
      .select({
        id: articles.id,
        title: articles.title,
        authorId: articles.authorId,
        sparksReceived: sql<number>`cast(count(*) as integer)`,
      })
      .from(articleSparks)
      .innerJoin(articles, eq(articles.id, articleSparks.articleId))
      .where(cutoff ? gte(articleSparks.createdAt, cutoff) : undefined)
      .groupBy(articles.id, articles.title, articles.authorId)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // === Top Gallery Images (from gallery_sparks) ===
    const topGalleryRows = await db
      .select({
        id: galleryImages.id,
        title: galleryImages.title,
        sparksReceived: sql<number>`cast(count(*) as integer)`,
      })
      .from(gallerySparks)
      .innerJoin(galleryImages, eq(galleryImages.id, gallerySparks.imageId))
      .where(cutoff ? gte(gallerySparks.createdAt, cutoff) : undefined)
      .groupBy(galleryImages.id, galleryImages.title)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const topTrackRowsLb = await db
      .select({ id: musicTracks.id, title: musicTracks.title, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(trackSparks)
      .innerJoin(musicTracks, eq(musicTracks.id, trackSparks.trackId))
      .where(and(isNull(trackSparks.revokedAt), cutoff ? gte(trackSparks.createdAt, cutoff) : undefined))
      .groupBy(musicTracks.id, musicTracks.title)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    const topProductRowsLb = await db
      .select({ id: products.id, title: products.name, slug: products.slug, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(productSparks)
      .innerJoin(products, eq(products.id, productSparks.productId))
      .where(cutoff ? gte(productSparks.createdAt, cutoff) : undefined)
      .groupBy(products.id, products.name, products.slug)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    const topProjectRowsLb = await db
      .select({ id: projects.id, title: projects.name, slug: projects.slug, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(projectSparks)
      .innerJoin(projects, eq(projects.id, projectSparks.projectId))
      .where(cutoff ? gte(projectSparks.createdAt, cutoff) : undefined)
      .groupBy(projects.id, projects.name, projects.slug)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    const topServiceRowsLb = await db
      .select({ id: services.id, title: services.name, slug: services.slug, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(serviceSparks)
      .innerJoin(services, eq(services.id, serviceSparks.serviceId))
      .where(cutoff ? gte(serviceSparks.createdAt, cutoff) : undefined)
      .groupBy(services.id, services.name, services.slug)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const topContent: { id: number; title: string; contentType: "article" | "gallery" | "track" | "product" | "project" | "service"; slug?: string | null; sparksReceived: number }[] = [
      ...topArticleRows.map((a) => ({ id: a.id, title: a.title, contentType: "article" as const, sparksReceived: a.sparksReceived })),
      ...topGalleryRows.map((g) => ({ id: g.id, title: g.title, contentType: "gallery" as const, sparksReceived: g.sparksReceived })),
      ...topTrackRowsLb.map((t) => ({ id: t.id, title: t.title, contentType: "track" as const, sparksReceived: t.sparksReceived })),
      ...topProductRowsLb.map((p) => ({ id: p.id, title: p.title, slug: p.slug, contentType: "product" as const, sparksReceived: p.sparksReceived })),
      ...topProjectRowsLb.map((p) => ({ id: p.id, title: p.title, slug: p.slug, contentType: "project" as const, sparksReceived: p.sparksReceived })),
      ...topServiceRowsLb.map((s) => ({ id: s.id, title: s.title, slug: s.slug, contentType: "service" as const, sparksReceived: s.sparksReceived })),
    ]
      .sort((a, b) => b.sparksReceived - a.sparksReceived)
      .slice(0, 10);

    // === Top Creators: aggregate sparks received per author across post_sparks + article_sparks ===
    // Posts: credit posts.authorId. Gallery sparks have no author and are skipped.
    // Articles: credit via the latest approved revision's authorName -> users.username
    // (matching the admin overview pattern), falling back to articles.authorId when set.
    const creatorTotals = new Map<string, number>();

    const postCreatorRows = await db
      .select({
        userId: posts.authorId,
        sparksReceived: sql<number>`cast(count(*) as integer)`,
      })
      .from(postSparks)
      .innerJoin(posts, eq(posts.id, postSparks.postId))
      .where(cutoff ? gte(postSparks.createdAt, cutoff) : undefined)
      .groupBy(posts.authorId);
    for (const row of postCreatorRows) {
      if (!row.userId) continue;
      creatorTotals.set(row.userId, (creatorTotals.get(row.userId) ?? 0) + row.sparksReceived);
    }

    // Article author resolution: prefer articles.authorId, else latest approved revision authorName -> users.username
    const articleAggRows = await db
      .select({
        articleId: articleSparks.articleId,
        sparksReceived: sql<number>`cast(count(*) as integer)`,
      })
      .from(articleSparks)
      .where(cutoff ? gte(articleSparks.createdAt, cutoff) : undefined)
      .groupBy(articleSparks.articleId);

    if (articleAggRows.length > 0) {
      const articleIds = articleAggRows.map((r) => r.articleId);
      const authorIdByArticle = new Map<number, string>();

      // Primary: map each article to its latest approved revision's authorName -> users.username
      // (matches the admin overview's revisions-based attribution pattern).
      const revRows = await db
        .selectDistinctOn([revisions.articleId], {
          articleId: revisions.articleId,
          userId: users.id,
        })
        .from(revisions)
        .leftJoin(users, eq(users.username, revisions.authorName))
        .where(and(
          inArray(revisions.articleId, articleIds),
          eq(revisions.status, "approved"),
        ))
        .orderBy(revisions.articleId, desc(revisions.createdAt));
      for (const row of revRows) {
        if (row.userId) authorIdByArticle.set(row.articleId, row.userId);
      }

      // Fallback: articles.authorId for articles with no approved-revision author match
      const needsFallback = articleIds.filter((id) => !authorIdByArticle.has(id));
      if (needsFallback.length > 0) {
        const articleMeta = await db
          .select({ id: articles.id, authorId: articles.authorId })
          .from(articles)
          .where(inArray(articles.id, needsFallback));
        for (const a of articleMeta) {
          if (a.authorId) authorIdByArticle.set(a.id, a.authorId);
        }
      }

      for (const r of articleAggRows) {
        const userId = authorIdByArticle.get(r.articleId);
        if (!userId) continue;
        creatorTotals.set(userId, (creatorTotals.get(userId) ?? 0) + r.sparksReceived);
      }
    }

    // Track sparks → user via musicTracks.artistId → users.linkedArtistId
    const trackCreatorRows = await db
      .select({ userId: users.id, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(trackSparks)
      .innerJoin(musicTracks, eq(musicTracks.id, trackSparks.trackId))
      .innerJoin(users, eq(users.linkedArtistId, musicTracks.artistId))
      .where(and(isNull(trackSparks.revokedAt), cutoff ? gte(trackSparks.createdAt, cutoff) : undefined))
      .groupBy(users.id);
    for (const row of trackCreatorRows) {
      if (!row.userId) continue;
      creatorTotals.set(row.userId, (creatorTotals.get(row.userId) ?? 0) + row.sparksReceived);
    }

    // Project sparks → projects.leadUserId
    const projectCreatorRows = await db
      .select({ userId: projects.leadUserId, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(projectSparks)
      .innerJoin(projects, eq(projects.id, projectSparks.projectId))
      .where(cutoff ? gte(projectSparks.createdAt, cutoff) : undefined)
      .groupBy(projects.leadUserId);
    for (const row of projectCreatorRows) {
      if (!row.userId) continue;
      creatorTotals.set(row.userId, (creatorTotals.get(row.userId) ?? 0) + row.sparksReceived);
    }

    // Service sparks → services.leadUserId
    const serviceCreatorRows = await db
      .select({ userId: services.leadUserId, sparksReceived: sql<number>`cast(count(*) as integer)` })
      .from(serviceSparks)
      .innerJoin(services, eq(services.id, serviceSparks.serviceId))
      .where(cutoff ? gte(serviceSparks.createdAt, cutoff) : undefined)
      .groupBy(services.leadUserId);
    for (const row of serviceCreatorRows) {
      if (!row.userId) continue;
      creatorTotals.set(row.userId, (creatorTotals.get(row.userId) ?? 0) + row.sparksReceived);
    }

    let topCreators: { userId: string; username: string; displayName: string | null; avatarUrl: string | null; sparksReceived: number }[] = [];
    if (creatorTotals.size > 0) {
      const creatorIds = Array.from(creatorTotals.keys());
      const userRows = await db
        .select({ id: users.id, username: users.username, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.id, creatorIds));
      topCreators = userRows
        .map((u) => ({
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          sparksReceived: creatorTotals.get(u.id) ?? 0,
        }))
        .sort((a, b) => b.sparksReceived - a.sparksReceived)
        .slice(0, 10);
    }

    return {
      topCreators,
      topPosts,
      topContent,
    };
  }

  async getWikiSources(): Promise<WikiSource[]> {
    return db.select().from(wikiSources).orderBy(desc(wikiSources.ingestedAt));
  }

  async createWikiSource(data: InsertWikiSource): Promise<WikiSource> {
    const [created] = await db.insert(wikiSources).values(data).returning();
    return created;
  }

  async incrementWikiSourceArticleCount(id: number, count: number): Promise<void> {
    await db.update(wikiSources).set({ articleCount: sql`${wikiSources.articleCount} + ${count}` }).where(eq(wikiSources.id, id));
  }

  async deleteWikiSource(id: number): Promise<void> {
    await db.delete(wikiSources).where(eq(wikiSources.id, id));
  }

  async getWikiLinkSuggestions(sourceArticleId: number, status?: string): Promise<WikiLinkSuggestion[]> {
    if (status) {
      return db.select().from(wikiLinkSuggestions)
        .where(and(eq(wikiLinkSuggestions.sourceArticleId, sourceArticleId), eq(wikiLinkSuggestions.status, status)))
        .orderBy(desc(wikiLinkSuggestions.createdAt));
    }
    return db.select().from(wikiLinkSuggestions)
      .where(eq(wikiLinkSuggestions.sourceArticleId, sourceArticleId))
      .orderBy(desc(wikiLinkSuggestions.createdAt));
  }

  async upsertWikiLinkSuggestions(sourceArticleId: number, suggestions: InsertWikiLinkSuggestion[]): Promise<void> {
    await db.delete(wikiLinkSuggestions)
      .where(and(eq(wikiLinkSuggestions.sourceArticleId, sourceArticleId), eq(wikiLinkSuggestions.status, "pending")));
    if (suggestions.length > 0) {
      await db.insert(wikiLinkSuggestions).values(suggestions);
    }
  }

  async updateWikiLinkSuggestionStatus(id: number, status: string): Promise<WikiLinkSuggestion> {
    const [updated] = await db.update(wikiLinkSuggestions)
      .set({ status })
      .where(eq(wikiLinkSuggestions.id, id))
      .returning();
    return updated;
  }

  async logWikiLlmUsage(entry: InsertWikiLlmUsage): Promise<WikiLlmUsage> {
    const [created] = await db.insert(wikiLlmUsage).values(entry).returning();
    return created;
  }

  async getWikiLlmUsageSummary(year: number, month: number): Promise<Array<{ operation: string; callCount: number; totalInputTokens: number; totalOutputTokens: number; totalCostUsd: number }>> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const rows = await db.select({
      operation: wikiLlmUsage.operation,
      callCount: sql<number>`cast(count(*) as int)`,
      totalInputTokens: sql<number>`cast(coalesce(sum(${wikiLlmUsage.inputTokens}), 0) as int)`,
      totalOutputTokens: sql<number>`cast(coalesce(sum(${wikiLlmUsage.outputTokens}), 0) as int)`,
      totalCostUsd: sql<number>`coalesce(sum(${wikiLlmUsage.estimatedCostUsd}), 0)`,
    })
      .from(wikiLlmUsage)
      .where(and(gte(wikiLlmUsage.createdAt, startDate), lte(wikiLlmUsage.createdAt, endDate)))
      .groupBy(wikiLlmUsage.operation)
      .orderBy(sql`sum(${wikiLlmUsage.estimatedCostUsd}) desc`);
    return rows;
  }
}

export const storage = new DatabaseStorage();
