import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Channels table - represents chat channels (General, topic-specific, study groups, support)
 */
export const channels = mysqlTable("channels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["general", "topic", "study_group", "support"]).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  inviteCode: varchar("inviteCode", { length: 64 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isClosed: boolean("isClosed").default(false).notNull(),
}, (table) => ({
  createdByIdx: index("createdBy_idx").on(table.createdBy),
  typeIdx: index("type_idx").on(table.type),
}));

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

/**
 * Channel members table - tracks which users are in which channels
 */
export const channelMembers = mysqlTable("channelMembers", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "moderator", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
}, (table) => ({
  channelUserIdx: index("channel_user_idx").on(table.channelId, table.userId),
}));

export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = typeof channelMembers.$inferInsert;

/**
 * Messages table - stores all chat messages
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId").notNull(),
  userId: int("userId"),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["user", "admin", "bot", "system", "event", "announcement", "article", "newsletter"]).default("user").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  replyToId: int("replyToId"),
  postId: int("postId"), // Link to post if this message represents a post
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  channelIdx: index("channel_idx").on(table.channelId),
  userIdx: index("user_idx").on(table.userId),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Posts table - stores structured content (Events, Announcements, Articles, Newsletters)
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId"),
  postType: mysqlEnum("postType", ["event", "announcement", "article", "newsletter"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  authorId: int("authorId").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  
  // Event-specific fields
  eventDate: timestamp("eventDate"),
  eventLocation: text("eventLocation"),
  
  // Article-specific fields
  tags: text("tags"),
  featuredImage: text("featuredImage"),
  
  // Newsletter-specific fields
  distributionList: text("distributionList"),
  scheduledFor: timestamp("scheduledFor"),
  
  // Announcement-specific fields
  priorityLevel: mysqlEnum("priorityLevel", ["low", "medium", "high", "urgent"]),
  
  // Link to the message in chat that represents this post
  messageId: int("messageId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  channelIdx: index("channel_idx").on(table.channelId),
  authorIdx: index("author_idx").on(table.authorId),
  typeIdx: index("type_idx").on(table.postType),
  pinnedIdx: index("pinned_idx").on(table.isPinned),
}));

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Support tickets table - tracks support chat requests and conversations
 */
export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["open", "in-progress", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  assignedToAdminId: int("assignedToAdminId"),
  
  // Analytics fields
  resolutionType: mysqlEnum("resolutionType", ["bot-answered", "human-answered", "no-answer", "escalated"]),
  enquiryType: varchar("enquiryType", { length: 100 }), // e.g., "VAT", "Transfer Pricing", "ADIT Exam"
  tags: text("tags"), // Comma-separated tags for categorization
  botInteractionCount: int("botInteractionCount").default(0).notNull(),
  humanInteractionCount: int("humanInteractionCount").default(0).notNull(),
  satisfactionRating: int("satisfactionRating"), // 1-5 rating
  
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
  assignedIdx: index("assigned_idx").on(table.assignedToAdminId),
  lastMessageIdx: index("last_message_idx").on(table.lastMessageAt),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Notifications table - tracks email notifications sent
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["reply", "mention", "ticket", "group_owner", "announcement"]).notNull(),
  content: text("content").notNull(),
  relatedId: int("relatedId"),
  isRead: boolean("isRead").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  typeIdx: index("type_idx").on(table.type),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Moji Knowledge Base table - stores Q&A pairs for the chatbot
 */
export const mojiKnowledgeBase = mysqlTable("mojiKnowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 255 }),
  tags: text("tags"), // Comma-separated tags
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("category_idx").on(table.category),
  activeIdx: index("active_idx").on(table.isActive),
}));

export type MojiKnowledgeBase = typeof mojiKnowledgeBase.$inferSelect;
export type InsertMojiKnowledgeBase = typeof mojiKnowledgeBase.$inferInsert;

/**
 * Email Logs table - tracks all emails sent by the platform
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: text("recipientName"),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  emailType: mysqlEnum("emailType", ["announcement", "reply", "mention", "ticket", "group_notification", "newsletter"]).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  recipientIdx: index("recipient_idx").on(table.recipientEmail),
  typeIdx: index("type_idx").on(table.emailType),
  statusIdx: index("status_idx").on(table.status),
  sentAtIdx: index("sentAt_idx").on(table.sentAt),
}));

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

/**
 * Support Messages table - stores individual messages within support tickets
 */
export const supportMessages = mysqlTable("supportMessages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  senderId: int("senderId").notNull(), // User or Admin ID
  senderType: mysqlEnum("senderType", ["user", "admin"]).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(), // Track if email notification was sent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index("ticket_idx").on(table.ticketId),
  senderIdx: index("sender_idx").on(table.senderId),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
