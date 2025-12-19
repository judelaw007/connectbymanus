import { eq, and, or, desc, sql, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  channels, InsertChannel, Channel,
  channelMembers, InsertChannelMember,
  messages, InsertMessage,
  posts, InsertPost,
  supportTickets, InsertSupportTicket,
  supportMessages, InsertSupportMessage,
  notifications, InsertNotification,
  mojiKnowledgeBase, InsertMojiKnowledgeBase,
  emailLogs, InsertEmailLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= User Functions =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= Channel Functions =============

export async function createChannel(channel: InsertChannel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(channels).values(channel);
  return Number(result[0].insertId);
}

export async function getChannelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllChannels() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(channels).where(eq(channels.isClosed, false)).orderBy(channels.createdAt);
}

export async function getPublicChannels() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(channels)
    .where(and(eq(channels.isPrivate, false), eq(channels.isClosed, false)))
    .orderBy(channels.createdAt);
}

export async function getUserChannels(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: channels.id,
    name: channels.name,
    description: channels.description,
    type: channels.type,
    isPrivate: channels.isPrivate,
    createdBy: channels.createdBy,
    createdAt: channels.createdAt,
    memberRole: channelMembers.role,
  })
  .from(channels)
  .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
  .where(and(
    eq(channelMembers.userId, userId),
    eq(channels.isClosed, false)
  ))
  .orderBy(channels.createdAt);
}

export async function updateChannel(id: number, updates: Partial<Channel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(channels).set(updates).where(eq(channels.id, id));
}

// ============= Channel Member Functions =============

export async function addChannelMember(member: InsertChannelMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(channelMembers).values(member);
}

export async function removeChannelMember(channelId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(channelMembers)
    .where(and(
      eq(channelMembers.channelId, channelId),
      eq(channelMembers.userId, userId)
    ));
}

export async function getChannelMembers(channelId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    memberRole: channelMembers.role,
    joinedAt: channelMembers.joinedAt,
  })
  .from(channelMembers)
  .innerJoin(users, eq(channelMembers.userId, users.id))
  .where(eq(channelMembers.channelId, channelId));
}

export async function isUserInChannel(channelId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select()
    .from(channelMembers)
    .where(and(
      eq(channelMembers.channelId, channelId),
      eq(channelMembers.userId, userId)
    ))
    .limit(1);
    
  return result.length > 0;
}

// ============= Message Functions =============

export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(messages).values(message);
  return Number(result[0].insertId);
}

export async function getChannelMessages(channelId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: messages.id,
    channelId: messages.channelId,
    userId: messages.userId,
    content: messages.content,
    messageType: messages.messageType,
    isPinned: messages.isPinned,
    replyToId: messages.replyToId,
    createdAt: messages.createdAt,
    userName: users.name,
    userRole: users.role,
  })
  .from(messages)
  .leftJoin(users, eq(messages.userId, users.id))
  .where(eq(messages.channelId, channelId))
  .orderBy(desc(messages.createdAt))
  .limit(limit)
  .offset(offset);
}

export async function getPinnedMessages(channelId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: messages.id,
    channelId: messages.channelId,
    userId: messages.userId,
    content: messages.content,
    messageType: messages.messageType,
    isPinned: messages.isPinned,
    replyToId: messages.replyToId,
    createdAt: messages.createdAt,
    userName: users.name,
    userRole: users.role,
  })
  .from(messages)
  .leftJoin(users, eq(messages.userId, users.id))
  .where(and(
    eq(messages.channelId, channelId),
    eq(messages.isPinned, true)
  ))
  .orderBy(desc(messages.createdAt));
}

export async function togglePinMessage(messageId: number, isPinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(messages).set({ isPinned }).where(eq(messages.id, messageId));
}

// ============= Post Functions =============

export async function createPost(post: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(posts).values(post);
  return Number(result[0].insertId);
}

export async function getPostsByType(postType: "event" | "announcement" | "article" | "newsletter", limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: posts.id,
    postType: posts.postType,
    title: posts.title,
    content: posts.content,
    authorId: posts.authorId,
    isPinned: posts.isPinned,
    eventDate: posts.eventDate,
    eventLocation: posts.eventLocation,
    tags: posts.tags,
    featuredImage: posts.featuredImage,
    priorityLevel: posts.priorityLevel,
    createdAt: posts.createdAt,
    messageId: posts.messageId,
    authorName: users.name,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.postType, postType))
  .orderBy(desc(posts.isPinned), desc(posts.createdAt))
  .limit(limit);
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select({
    id: posts.id,
    postType: posts.postType,
    title: posts.title,
    content: posts.content,
    authorId: posts.authorId,
    isPinned: posts.isPinned,
    eventDate: posts.eventDate,
    eventLocation: posts.eventLocation,
    tags: posts.tags,
    featuredImage: posts.featuredImage,
    priorityLevel: posts.priorityLevel,
    createdAt: posts.createdAt,
    authorName: users.name,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.id, id))
  .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function togglePinPost(postId: number, isPinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(posts).set({ isPinned }).where(eq(posts.id, postId));
}

// ============= Support Ticket Functions =============

export async function createSupportTicket(ticket: InsertSupportTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(supportTickets).values(ticket);
  return Number(result[0].insertId);
}

export async function getAllSupportTickets() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: supportTickets.id,
    userId: supportTickets.userId,
    subject: supportTickets.subject,
    status: supportTickets.status,
    priority: supportTickets.priority,
    assignedToAdminId: supportTickets.assignedToAdminId,
    lastMessageAt: supportTickets.lastMessageAt,
    closedAt: supportTickets.closedAt,
    createdAt: supportTickets.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(supportTickets)
  .leftJoin(users, eq(supportTickets.userId, users.id))
  .orderBy(desc(supportTickets.lastMessageAt));
}

export async function getOpenSupportTickets() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: supportTickets.id,
    userId: supportTickets.userId,
    subject: supportTickets.subject,
    status: supportTickets.status,
    priority: supportTickets.priority,
    assignedToAdminId: supportTickets.assignedToAdminId,
    lastMessageAt: supportTickets.lastMessageAt,
    createdAt: supportTickets.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(supportTickets)
  .leftJoin(users, eq(supportTickets.userId, users.id))
  .where(eq(supportTickets.status, "open"))
  .orderBy(desc(supportTickets.createdAt));
}

export async function getSupportTicketById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    id: supportTickets.id,
    userId: supportTickets.userId,
    subject: supportTickets.subject,
    status: supportTickets.status,
    priority: supportTickets.priority,
    assignedToAdminId: supportTickets.assignedToAdminId,
    resolutionType: supportTickets.resolutionType,
    enquiryType: supportTickets.enquiryType,
    tags: supportTickets.tags,
    botInteractionCount: supportTickets.botInteractionCount,
    humanInteractionCount: supportTickets.humanInteractionCount,
    satisfactionRating: supportTickets.satisfactionRating,
    lastMessageAt: supportTickets.lastMessageAt,
    closedAt: supportTickets.closedAt,
    createdAt: supportTickets.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(supportTickets)
  .leftJoin(users, eq(supportTickets.userId, users.id))
  .where(eq(supportTickets.id, id))
  .limit(1);
  
  return result[0] || null;
}

export async function updateSupportTicket(id: number, updates: Partial<InsertSupportTicket>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(supportTickets).set(updates).where(eq(supportTickets.id, id));
}

// ============= Notification Functions =============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(notifications).values(notification);
}

export async function getUserNotifications(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function updatePost(postId: number, updates: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(posts)
    .set(updates)
    .where(eq(posts.id, postId));
}


// ============================================
// Moji Knowledge Base Functions
// ============================================

export async function getAllKnowledgeBase() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mojiKnowledgeBase).where(eq(mojiKnowledgeBase.isActive, true));
}

export async function searchKnowledgeBase(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mojiKnowledgeBase)
    .where(
      and(
        eq(mojiKnowledgeBase.isActive, true),
        or(
          like(mojiKnowledgeBase.question, `%${searchTerm}%`),
          like(mojiKnowledgeBase.answer, `%${searchTerm}%`),
          like(mojiKnowledgeBase.tags, `%${searchTerm}%`)
        )
      )
    );
}

export async function createKnowledgeBaseEntry(entry: InsertMojiKnowledgeBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mojiKnowledgeBase).values(entry);
  return Number(result[0].insertId);
}

export async function updateKnowledgeBaseEntry(id: number, entry: Partial<InsertMojiKnowledgeBase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mojiKnowledgeBase).set(entry).where(eq(mojiKnowledgeBase.id, id));
}

export async function deleteKnowledgeBaseEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete by setting isActive to false
  await db.update(mojiKnowledgeBase).set({ isActive: false }).where(eq(mojiKnowledgeBase.id, id));
}

// ============================================
// Email Logs Functions
// ============================================

export async function getAllEmailLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(limit);
}

export async function createEmailLog(log: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailLogs).values(log);
  return Number(result[0].insertId);
}

export async function updateEmailLogStatus(id: number, status: "sent" | "failed", errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailLogs).set({
    status,
    sentAt: status === "sent" ? new Date() : undefined,
    errorMessage: errorMessage || null,
  }).where(eq(emailLogs.id, id));
}

// ============= Support Message Functions =============

export async function createSupportMessage(message: InsertSupportMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(supportMessages).values(message);
  return Number(result[0].insertId);
}

export async function getSupportMessagesByTicket(ticketId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: supportMessages.id,
    ticketId: supportMessages.ticketId,
    senderId: supportMessages.senderId,
    senderType: supportMessages.senderType,
    content: supportMessages.content,
    isRead: supportMessages.isRead,
    emailSent: supportMessages.emailSent,
    createdAt: supportMessages.createdAt,
    senderName: users.name,
  })
  .from(supportMessages)
  .leftJoin(users, eq(supportMessages.senderId, users.id))
  .where(eq(supportMessages.ticketId, ticketId))
  .orderBy(supportMessages.createdAt);
}

// ============= Analytics Functions =============

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  resolutionType?: "bot-answered" | "human-answered" | "no-answer" | "escalated";
  enquiryType?: string;
  status?: "open" | "in-progress" | "closed";
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export async function getSupportAnalytics(filters: AnalyticsFilters) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select({
    id: supportTickets.id,
    userId: supportTickets.userId,
    subject: supportTickets.subject,
    status: supportTickets.status,
    priority: supportTickets.priority,
    resolutionType: supportTickets.resolutionType,
    enquiryType: supportTickets.enquiryType,
    tags: supportTickets.tags,
    botInteractionCount: supportTickets.botInteractionCount,
    humanInteractionCount: supportTickets.humanInteractionCount,
    satisfactionRating: supportTickets.satisfactionRating,
    assignedToAdminId: supportTickets.assignedToAdminId,
    lastMessageAt: supportTickets.lastMessageAt,
    closedAt: supportTickets.closedAt,
    createdAt: supportTickets.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
  .from(supportTickets)
  .leftJoin(users, eq(supportTickets.userId, users.id));

  const conditions = [];

  if (filters.startDate) {
    conditions.push(sql`${supportTickets.createdAt} >= ${filters.startDate}`);
  }
  if (filters.endDate) {
    conditions.push(sql`${supportTickets.createdAt} <= ${filters.endDate}`);
  }
  if (filters.resolutionType) {
    conditions.push(eq(supportTickets.resolutionType, filters.resolutionType));
  }
  if (filters.enquiryType) {
    conditions.push(eq(supportTickets.enquiryType, filters.enquiryType));
  }
  if (filters.status) {
    conditions.push(eq(supportTickets.status, filters.status));
  }
  if (filters.searchQuery) {
    conditions.push(
      or(
        like(supportTickets.subject, `%${filters.searchQuery}%`),
        like(supportTickets.tags, `%${filters.searchQuery}%`),
        like(users.name, `%${filters.searchQuery}%`)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  const results = await query
    .orderBy(desc(supportTickets.createdAt))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);

  return results;
}

export async function getAnalyticsSummary(filters: { startDate?: string; endDate?: string }) {
  const db = await getDb();
  if (!db) return {
    totalConversations: 0,
    botAnswered: 0,
    humanAnswered: 0,
    noAnswer: 0,
    escalated: 0,
    avgBotInteractions: 0,
    avgHumanInteractions: 0,
    avgSatisfaction: 0,
  };

  const conditions = [];
  if (filters.startDate) {
    conditions.push(sql`${supportTickets.createdAt} >= ${filters.startDate}`);
  }
  if (filters.endDate) {
    conditions.push(sql`${supportTickets.createdAt} <= ${filters.endDate}`);
  }

  let baseQuery = db.select().from(supportTickets);
  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)!) as any;
  }

  const allTickets = await baseQuery;

  const totalConversations = allTickets.length;
  const botAnswered = allTickets.filter(t => t.resolutionType === "bot-answered").length;
  const humanAnswered = allTickets.filter(t => t.resolutionType === "human-answered").length;
  const noAnswer = allTickets.filter(t => t.resolutionType === "no-answer").length;
  const escalated = allTickets.filter(t => t.resolutionType === "escalated").length;

  const avgBotInteractions = totalConversations > 0
    ? allTickets.reduce((sum, t) => sum + (t.botInteractionCount || 0), 0) / totalConversations
    : 0;

  const avgHumanInteractions = totalConversations > 0
    ? allTickets.reduce((sum, t) => sum + (t.humanInteractionCount || 0), 0) / totalConversations
    : 0;

  const ratingsCount = allTickets.filter(t => t.satisfactionRating !== null).length;
  const avgSatisfaction = ratingsCount > 0
    ? allTickets.reduce((sum, t) => sum + (t.satisfactionRating || 0), 0) / ratingsCount
    : 0;

  return {
    totalConversations,
    botAnswered,
    humanAnswered,
    noAnswer,
    escalated,
    avgBotInteractions: Math.round(avgBotInteractions * 10) / 10,
    avgHumanInteractions: Math.round(avgHumanInteractions * 10) / 10,
    avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
  };
}
