import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, real, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("user_role", ["admin", "executive", "staff", "partner", "client", "user"]);
export const ROLES = roleEnum.enumValues;
export type Role = typeof ROLES[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  email: text("email"),
  role: roleEnum("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  avatarUrl: text("avatar_url"),
  profileBgColor: text("profile_bg_color"),
  profileAccentColor: text("profile_accent_color"),
  profileBgImageUrl: text("profile_bg_image_url"),
  socialLinks: jsonb("social_links"),
});

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
});

export const articles = pgTable("articles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull().default(""),
  summary: text("summary"),
  categoryId: integer("category_id"),
  status: text("status").notNull().default("draft"),
  infoboxType: text("infobox_type"),
  infoboxData: jsonb("infobox_data"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const revisions = pgTable("revisions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").notNull(),
  content: text("content").notNull(),
  infoboxData: jsonb("infobox_data"),
  summary: text("summary"),
  editSummary: text("edit_summary"),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  authorName: text("author_name").notNull().default("Anonymous"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const citations = pgTable("citations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  articleId: integer("article_id").notNull(),
  url: text("url"),
  title: text("title").notNull(),
  format: text("format").notNull().default("APA"),
  text: text("text").notNull(),
  isValid: boolean("is_valid").default(true),
  errorMessage: text("error_message"),
  lastChecked: timestamp("last_checked").defaultNow(),
});

export const crosslinks = pgTable("crosslinks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceArticleId: integer("source_article_id").notNull(),
  targetArticleId: integer("target_article_id").notNull(),
  relevanceScore: real("relevance_score").notNull().default(0),
  sharedKeywords: text("shared_keywords").array(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  revisions: many(revisions),
  citations: many(citations),
  outgoingLinks: many(crosslinks, { relationName: "sourceLinks" }),
  incomingLinks: many(crosslinks, { relationName: "targetLinks" }),
}));

export const revisionsRelations = relations(revisions, ({ one }) => ({
  article: one(articles, {
    fields: [revisions.articleId],
    references: [articles.id],
  }),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  article: one(articles, {
    fields: [citations.articleId],
    references: [articles.id],
  }),
}));

export const crosslinksRelations = relations(crosslinks, ({ one }) => ({
  sourceArticle: one(articles, {
    fields: [crosslinks.sourceArticleId],
    references: [articles.id],
    relationName: "sourceLinks",
  }),
  targetArticle: one(articles, {
    fields: [crosslinks.targetArticleId],
    references: [articles.id],
    relationName: "targetLinks",
  }),
}));

export const artists = pgTable("artists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  genres: text("genres").array(),
  wikiArticleSlug: text("wiki_article_slug"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const albums = pgTable("albums", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  artistId: integer("artist_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  releaseYear: integer("release_year"),
  trackList: jsonb("track_list"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
}));

export const albumsRelations = relations(albums, ({ one }) => ({
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
  }),
}));

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: real("price").notNull(),
  categoryName: text("category_name").notNull(),
  stockStatus: text("stock_status").notNull().default("available"),
  imageUrl: text("image_url"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id"),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  type: text("type").notNull().default("Company"),
  category: text("category"),
  websiteUrl: text("website_url"),
  teamLead: text("team_lead"),
  relatedWikiSlugs: text("related_wiki_slugs").array(),
  featured: boolean("featured").default(false),
  heroImageUrl: text("hero_image_url"),
  logoUrl: text("logo_url"),
  longDescription: text("long_description"),
  tags: text("tags").array(),
  launchDate: text("launch_date"),
  galleryUrls: text("gallery_urls").array(),
  socialLinks: jsonb("social_links"),
  menuIcon: text("menu_icon"),
  appIcon: text("app_icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  iconName: text("icon_name"),
  status: text("status").notNull().default("active"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  department: text("department").notNull(),
  type: text("type").notNull().default("full-time"),
  location: text("location"),
  remote: boolean("remote").default(false),
  description: text("description").notNull(),
  requirements: text("requirements"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  status: text("status").notNull().default("open"),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobApplications = pgTable("job_applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer("job_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("job_applications_job_user_idx").on(t.jobId, t.userId)]);

export const playlists = pgTable("playlists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  platform: text("platform"),
  playlistUrl: text("playlist_url").notNull(),
  coverImageUrl: text("cover_image_url"),
  isOfficial: boolean("is_official").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const musicSubmissions = pgTable("music_submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  artistName: text("artist_name").notNull(),
  trackTitle: text("track_title").notNull(),
  trackUrl: text("track_url").notNull(),
  trackFileUrl: text("track_file_url"),
  genre: text("genre"),
  notes: text("notes"),
  type: text("type").notNull().default("label"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const changelogCategoryEnum = pgEnum("changelog_category", ["feature", "fix", "improvement", "other"]);
export type ChangelogCategory = typeof changelogCategoryEnum.enumValues[number];

export const changelog = pgTable("changelog", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: changelogCategoryEnum("category").notNull().default("improvement"),
  version: varchar("version", { length: 20 }),
  wikiSlug: text("wiki_slug"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, createdAt: true, status: true, userId: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true });
export const insertMusicSubmissionSchema = createInsertSchema(musicSubmissions).omit({ id: true, createdAt: true, status: true, userId: true });

export const insertChangelogSchema = createInsertSchema(changelog).omit({ id: true, createdAt: true });
export type InsertChangelog = z.infer<typeof insertChangelogSchema>;
export type Changelog = typeof changelog.$inferSelect;

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true, createdAt: true });
export const insertAlbumSchema = createInsertSchema(albums).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  email: z.string().email("Please enter a valid email"),
});

export const updateUserSchema = z.object({
  displayName: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

const optionalUrl = z.string().url().optional().or(z.literal("")).or(z.null());
const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional().or(z.literal("")).or(z.null());

export const updateProfileSchema = z.object({
  displayName: z.string().max(80).optional().nullable(),
  bio: z.union([z.string().max(500).transform((s) => s.replace(/<[^>]*>/g, "")), z.null()]).optional(),
  avatarUrl: optionalUrl,
  profileBgColor: hexColor,
  profileAccentColor: hexColor,
  profileBgImageUrl: optionalUrl,
  socialLinks: z.object({
    instagram: z.string().optional().or(z.null()),
    twitter: z.string().optional().or(z.null()),
    tiktok: z.string().optional().or(z.null()),
    discord: z.string().optional().or(z.null()),
    website: z.string().optional().or(z.null()),
  }).optional().or(z.null()),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevisionSchema = createInsertSchema(revisions).omit({
  id: true,
  createdAt: true,
});

export const insertCitationSchema = createInsertSchema(citations).omit({
  id: true,
  lastChecked: true,
});

export const insertCrosslinkSchema = createInsertSchema(crosslinks).omit({ id: true });

export const platformSocialLinks = pgTable("platform_social_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  iconName: text("icon_name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  showOnContact: boolean("show_on_contact").notNull().default(false),
  showOnListen: boolean("show_on_listen").notNull().default(false),
});

export const insertPlatformSocialLinkSchema = createInsertSchema(platformSocialLinks).omit({ id: true });
export type PlatformSocialLink = typeof platformSocialLinks.$inferSelect;
export type InsertPlatformSocialLink = z.infer<typeof insertPlatformSocialLinkSchema>;

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postLikes = pgTable("post_likes", {
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("post_likes_post_user_idx").on(t.postId, t.userId)]);

export const postReplies = pgTable("post_replies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userFollows = pgTable("user_follows", {
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("user_follows_idx").on(t.followerId, t.followingId)]);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  likes: many(postLikes),
  replies: many(postReplies),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}));

export const postRepliesRelations = relations(postReplies, ({ one }) => ({
  post: one(posts, { fields: [postReplies.postId], references: [posts.id] }),
  author: one(users, { fields: [postReplies.authorId], references: [users.id] }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, { fields: [userFollows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [userFollows.followingId], references: [users.id], relationName: "following" }),
}));

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, authorId: true });
export const insertPostReplySchema = createInsertSchema(postReplies).omit({ id: true, createdAt: true, authorId: true, postId: true });

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type PostReply = typeof postReplies.$inferSelect;
export type InsertPostReply = z.infer<typeof insertPostReplySchema>;
export type UserFollow = typeof userFollows.$inferSelect;

export const notes = pgTable("notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "cascade" }),
  pinned: boolean("pinned").notNull().default(false),
  color: text("color").notNull().default("default"),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true, authorId: true });
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export const noteCollaborators = pgTable("note_collaborators", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("note_collaborators_unique").on(t.noteId, t.userId)]);

export type NoteCollaborator = typeof noteCollaborators.$inferSelect;

export const noteResourceTypeEnum = pgEnum("note_resource_type", ["project", "article"]);

export const noteAttachments = pgTable("note_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  resourceType: noteResourceTypeEnum("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("note_attachments_unique").on(t.noteId, t.resourceType, t.resourceId)]);

export type NoteAttachment = typeof noteAttachments.$inferSelect;

export const feedPostTypeEnum = pgEnum("feed_post_type", ["update", "release", "milestone", "media", "event"]);
export type FeedPostType = typeof feedPostTypeEnum.enumValues[number];

export const feedPosts = pgTable("feed_posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  type: feedPostTypeEnum("type").notNull().default("update"),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  linkUrl: text("link_url"),
  linkLabel: text("link_label"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedPostsRelations = relations(feedPosts, ({ one }) => ({
  author: one(users, {
    fields: [feedPosts.authorId],
    references: [users.id],
  }),
}));

export const insertFeedPostSchema = createInsertSchema(feedPosts).omit({ id: true, createdAt: true, updatedAt: true, authorId: true });
export type FeedPost = typeof feedPosts.$inferSelect;
export type InsertFeedPost = z.infer<typeof insertFeedPostSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Revision = typeof revisions.$inferSelect;
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type Citation = typeof citations.$inferSelect;
export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type Crosslink = typeof crosslinks.$inferSelect;
export type InsertCrosslink = z.infer<typeof insertCrosslinkSchema>;
export type Artist = typeof artists.$inferSelect;
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Album = typeof albums.$inferSelect;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type MusicSubmission = typeof musicSubmissions.$inferSelect;
export type InsertMusicSubmission = z.infer<typeof insertMusicSubmissionSchema>;

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

export const brandAssets = pgTable("brand_assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  assetType: text("asset_type").notNull().default("other"),
  downloadUrl: text("download_url").notNull(),
  previewUrl: text("preview_url"),
  fileFormat: text("file_format"),
  displayOrder: integer("display_order").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBrandAssetSchema = createInsertSchema(brandAssets).omit({ id: true, createdAt: true });
export type BrandAsset = typeof brandAssets.$inferSelect;
export type InsertBrandAsset = z.infer<typeof insertBrandAssetSchema>;

export const resources = pgTable("resources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  displayOrder: integer("display_order").notNull().default(0),
  showOnOverview: boolean("show_on_overview").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export const galleryCategoryEnum = pgEnum("gallery_category", ["profile", "banner", "wallpaper", "logo", "other"]);
export type GalleryCategory = typeof galleryCategoryEnum.enumValues[number];

export const galleryImages = pgTable("gallery_images", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  category: galleryCategoryEnum("category").notNull(),
  altText: text("alt_text"),
  displayOrder: integer("display_order").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({ id: true, createdAt: true });
export type GalleryImage = typeof galleryImages.$inferSelect;
export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;

export const spotifyArtists = pgTable("spotify_artists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  spotifyArtistId: text("spotify_artist_id").notNull(),
  displayName: text("display_name").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSpotifyArtistSchema = createInsertSchema(spotifyArtists).omit({ id: true, createdAt: true });
export type SpotifyArtist = typeof spotifyArtists.$inferSelect;
export type InsertSpotifyArtist = z.infer<typeof insertSpotifyArtistSchema>;

export const contactSubmissions = pgTable("contact_submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  staffNote: text("staff_note"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({ id: true, createdAt: true, status: true, staffNote: true, repliedAt: true });
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export const staffOrgNodes = pgTable("staff_org_nodes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  department: text("department").notNull(),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStaffOrgNodeSchema = createInsertSchema(staffOrgNodes).omit({ id: true, createdAt: true });
export type StaffOrgNode = typeof staffOrgNodes.$inferSelect;
export type InsertStaffOrgNode = z.infer<typeof insertStaffOrgNodeSchema>;

export const chatChannels = pgTable("chat_channels", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  channelId: integer("channel_id"),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id"),
  content: text("content").notNull(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({ id: true, createdAt: true, createdBy: true });
export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, fromUserId: true, editedAt: true, deletedAt: true });
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const financeProjects = pgTable("finance_projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  budget: real("budget").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financeTransactions = pgTable("finance_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financeInvoices = pgTable("finance_invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  lineItems: jsonb("line_items").notNull().default([]),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFinanceProjectSchema = createInsertSchema(financeProjects).omit({ id: true, createdAt: true });
export type FinanceProject = typeof financeProjects.$inferSelect;
export type InsertFinanceProject = z.infer<typeof insertFinanceProjectSchema>;

export const insertFinanceTransactionSchema = createInsertSchema(financeTransactions).omit({ id: true, createdAt: true });
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type InsertFinanceTransaction = z.infer<typeof insertFinanceTransactionSchema>;

export const insertFinanceInvoiceSchema = createInsertSchema(financeInvoices).omit({ id: true, createdAt: true });
export type FinanceInvoice = typeof financeInvoices.$inferSelect;
export type InsertFinanceInvoice = z.infer<typeof insertFinanceInvoiceSchema>;

export const minecraftServers = pgTable("minecraft_servers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  description: text("description"),
  gameMode: varchar("game_mode", { length: 50 }),
  colorTheme: varchar("color_theme", { length: 50 }).default("emerald").notNull(),
  voteLinks: jsonb("vote_links").default([]).notNull().$type<{ name: string; url: string }[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
});

export const insertMinecraftServerSchema = createInsertSchema(minecraftServers).omit({ id: true });
export type MinecraftServer = typeof minecraftServers.$inferSelect;
export type InsertMinecraftServer = z.infer<typeof insertMinecraftServerSchema>;

export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 60 }).notNull().default("software"),
  amount: real("amount").notNull().default(0),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  nextBillingDate: varchar("next_billing_date", { length: 20 }),
  url: text("url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const aiAgents = pgTable("ai_agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  avatarUrl: text("avatar_url"),
  systemPrompt: text("system_prompt").notNull().default("You are a helpful AI assistant for SEVCO, a creative technology platform. Be concise and professional."),
  modelSlug: text("model_slug").notNull().default("openai/gpt-4o-mini"),
  capabilities: text("capabilities").array().notNull().default(sql`ARRAY['text']::text[]`),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer("agent_id").notNull().references(() => aiAgents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true });
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({ id: true, createdAt: true });
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
