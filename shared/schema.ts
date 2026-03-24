import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, real, pgEnum } from "drizzle-orm/pg-core";
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
  websiteUrl: text("website_url"),
  teamLead: text("team_lead"),
  relatedWikiSlugs: text("related_wiki_slugs").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const changelogCategoryEnum = pgEnum("changelog_category", ["feature", "fix", "improvement", "other"]);
export type ChangelogCategory = typeof changelogCategoryEnum.enumValues[number];

export const changelog = pgTable("changelog", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: changelogCategoryEnum("category").notNull().default("improvement"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChangelogSchema = createInsertSchema(changelog).omit({ id: true, createdAt: true });
export type InsertChangelog = z.infer<typeof insertChangelogSchema>;
export type Changelog = typeof changelog.$inferSelect;

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true, createdAt: true });
export const insertAlbumSchema = createInsertSchema(albums).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });

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
