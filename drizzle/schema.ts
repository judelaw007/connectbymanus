import { pgTable, pgEnum, serial, text, timestamp, varchar, boolean, integer, index, unique } from "drizzle-orm/pg-core";

// ============================================
// ENUM TYPES
// ============================================

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const channelTypeEnum = pgEnum("channel_type", ["general", "topic", "study_group", "support"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "moderator", "member"]);
export const messageTypeEnum = pgEnum("message_type", ["user", "admin", "bot", "system", "event", "announcement", "article", "newsletter"]);
export const postTypeEnum = pgEnum("post_type", ["event", "announcement", "article", "newsletter"]);
export const priorityLevelEnum = pgEnum("priority_level", ["low", "medium", "high", "urgent"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in-progress", "closed"]);
export const resolutionTypeEnum = pgEnum("resolution_type", ["bot-answered", "human-answered", "no-answer", "escalated"]);
export const notificationTypeEnum = pgEnum("notification_type", ["reply", "mention", "ticket", "group_owner", "announcement"]);
export const emailTypeEnum = pgEnum("email_type", ["announcement", "reply", "mention", "ticket", "group_notification", "newsletter"]);
export const emailStatusEnum = pgEnum("email_status", ["sent", "failed", "pending"]);
export const senderTypeEnum = pgEnum("sender_type", ["user", "admin"]);

// ============================================
// TABLES
// ============================================

/**
 * Core user table - synced from Learnworlds (members) or Supabase Auth (admin)
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Channels table - topic channels, study groups, support
 */
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: channelTypeEnum("type").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  inviteCode: varchar("invite_code", { length: 64 }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
}, (table) => ({
  createdByIdx: index("channels_created_by_idx").on(table.createdBy),
  typeIdx: index("channels_type_idx").on(table.type),
  inviteCodeIdx: index("channels_invite_code_idx").on(table.inviteCode),
}));

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

/**
 * Channel members - tracks which users are in which channels
 */
export const channelMembers = pgTable("channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
}, (table) => ({
  channelUserIdx: index("channel_members_channel_user_idx").on(table.channelId, table.userId),
  userIdx: index("channel_members_user_idx").on(table.userId),
  uniqueChannelUser: unique("channel_members_unique").on(table.channelId, table.userId),
}));

export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = typeof channelMembers.$inferInsert;

/**
 * Posts table - events, announcements, articles, newsletters
 */
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id, { onDelete: "set null" }),
  postType: postTypeEnum("post_type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  isPinned: boolean("is_pinned").default(false).notNull(),

  // Event-specific fields
  eventDate: timestamp("event_date", { withTimezone: true }),
  eventLocation: text("event_location"),

  // Article-specific fields
  tags: text("tags"),
  featuredImage: text("featured_image"),

  // Newsletter-specific fields
  distributionList: text("distribution_list"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),

  // Announcement-specific fields
  priorityLevel: priorityLevelEnum("priority_level"),

  // Link to the message in chat
  messageId: integer("message_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  channelIdx: index("posts_channel_idx").on(table.channelId),
  authorIdx: index("posts_author_idx").on(table.authorId),
  typeIdx: index("posts_type_idx").on(table.postType),
  pinnedIdx: index("posts_pinned_idx").on(table.isPinned),
}));

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Messages table - chat messages
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").default("user").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  replyToId: integer("reply_to_id"),
  postId: integer("post_id").references(() => posts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  channelIdx: index("messages_channel_idx").on(table.channelId),
  userIdx: index("messages_user_idx").on(table.userId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  postIdx: index("messages_post_idx").on(table.postId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Support tickets table
 */
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: priorityLevelEnum("priority").default("medium").notNull(),
  assignedToAdminId: integer("assigned_to_admin_id").references(() => users.id),

  // Analytics fields
  resolutionType: resolutionTypeEnum("resolution_type"),
  enquiryType: varchar("enquiry_type", { length: 100 }),
  tags: text("tags"),
  botInteractionCount: integer("bot_interaction_count").default(0).notNull(),
  humanInteractionCount: integer("human_interaction_count").default(0).notNull(),
  satisfactionRating: integer("satisfaction_rating"),

  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("support_tickets_user_idx").on(table.userId),
  statusIdx: index("support_tickets_status_idx").on(table.status),
  assignedIdx: index("support_tickets_assigned_idx").on(table.assignedToAdminId),
  lastMessageIdx: index("support_tickets_last_message_idx").on(table.lastMessageAt),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Support messages table
 */
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  senderType: senderTypeEnum("sender_type").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index("support_messages_ticket_idx").on(table.ticketId),
  senderIdx: index("support_messages_sender_idx").on(table.senderId),
  createdAtIdx: index("support_messages_created_at_idx").on(table.createdAt),
}));

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;

/**
 * Notifications table
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  content: text("content").notNull(),
  relatedId: integer("related_id"),
  isRead: boolean("is_read").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  typeIdx: index("notifications_type_idx").on(table.type),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Moji Knowledge Base - Q&A pairs for chatbot
 */
export const mojiKnowledgeBase = pgTable("moji_knowledge_base", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 255 }),
  tags: text("tags"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("moji_kb_category_idx").on(table.category),
  activeIdx: index("moji_kb_active_idx").on(table.isActive),
}));

export type MojiKnowledgeBase = typeof mojiKnowledgeBase.$inferSelect;
export type InsertMojiKnowledgeBase = typeof mojiKnowledgeBase.$inferInsert;

/**
 * Email logs table
 */
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  emailType: emailTypeEnum("email_type").notNull(),
  status: emailStatusEnum("status").default("pending").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  recipientIdx: index("email_logs_recipient_idx").on(table.recipientEmail),
  typeIdx: index("email_logs_type_idx").on(table.emailType),
  statusIdx: index("email_logs_status_idx").on(table.status),
  sentAtIdx: index("email_logs_sent_at_idx").on(table.sentAt),
}));

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
