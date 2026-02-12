import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

// Types for database operations (matching the existing schema)
export interface User {
  id: number;
  openId: string;
  name: string | null;
  displayName: string | null;
  email: string | null;
  role: "user" | "admin" | "moderator";
  loginMethod: string | null;
  lastSignedIn: Date | null;
  createdAt: Date;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: Date | null;
  suspendedUntil: Date | null;
  suspendedBy: number | null;
}

export interface PlatformSetting {
  id: number;
  settingKey: string;
  settingValue: string | null;
  updatedBy: number | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface Channel {
  id: number;
  name: string;
  description: string | null;
  type: "general" | "topic" | "study_group" | "direct_message";
  isPrivate: boolean;
  isClosed: boolean;
  inviteCode: string | null;
  createdBy: number | null;
  createdAt: Date;
  learnworldsCourseId: string | null;
  learnworldsBundleId: string | null;
  learnworldsSubscriptionId: string | null;
  isSuspended: boolean;
  suspensionReason: string | null;
  suspendedAt: Date | null;
  suspendedBy: number | null;
}

export interface Message {
  id: number;
  channelId: number;
  userId: number | null;
  content: string;
  messageType:
    | "text"
    | "system"
    | "announcement"
    | "event"
    | "article"
    | "newsletter"
    | "admin"
    | "user"
    | "bot";
  isPinned: boolean;
  replyToId: number | null;
  postId: number | null;
  createdAt: Date;
}

export interface Post {
  id: number;
  postType: "event" | "announcement" | "article" | "newsletter";
  title: string;
  content: string;
  authorId: number | null;
  channelId: number | null;
  isPinned: boolean;
  eventDate: Date | null;
  eventLocation: string | null;
  tags: string | null;
  featuredImage: string | null;
  distributionList: string | null;
  scheduledFor: Date | null;
  priorityLevel: "low" | "medium" | "high" | "urgent" | null;
  messageId: number | null;
  reminderHours: number | null;
  autoReminderSentAt: Date | null;
  articleAuthor: string | null;
  createdAt: Date;
}

export interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  status: "open" | "in-progress" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedToAdminId: number | null;
  resolutionType:
    | "bot-answered"
    | "human-answered"
    | "no-answer"
    | "escalated"
    | null;
  enquiryType: string | null;
  tags: string | null;
  botInteractionCount: number;
  humanInteractionCount: number;
  satisfactionRating: number | null;
  lastMessageAt: Date;
  closedAt: Date | null;
  createdAt: Date;
}

export interface SupportMessage {
  id: number;
  ticketId: number;
  senderId: number | null;
  senderType: "user" | "admin" | "bot";
  content: string;
  isRead: boolean;
  emailSent: boolean;
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface MojiKnowledgeBase {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  tags: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailLog {
  id: number;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  content: string | null;
  emailType: string;
  templateType: string;
  status: "pending" | "sent" | "failed";
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface VerificationCode {
  id: number;
  email: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface EventRsvp {
  id: number;
  postId: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: "interested" | "confirmed" | "declined" | "cancelled";
  confirmationSentAt: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
}

// Insert types
export type InsertUser = Partial<User> & { openId: string };
export type InsertChannel = Partial<Channel> & { name: string };
export type InsertChannelMember = {
  channelId: number;
  userId: number;
  role?: string;
};
export type InsertMessage = Partial<Message> & {
  channelId: number;
  content: string;
};
export type InsertPost = Partial<Post> & {
  postType: Post["postType"];
  title: string;
  content: string;
};
export type InsertSupportTicket = Partial<SupportTicket> & {
  userId: number;
  subject: string;
};
export type InsertSupportMessage = Partial<SupportMessage> & {
  ticketId: number;
  content: string;
  senderType: SupportMessage["senderType"];
};
export type InsertNotification = Partial<Notification> & {
  userId: number;
  type: string;
  title: string;
  content: string;
};
export type InsertMojiKnowledgeBase = Partial<MojiKnowledgeBase> & {
  question: string;
  answer: string;
};
export type InsertEmailLog = Partial<EmailLog> & {
  recipientEmail: string;
  subject: string;
  emailType: string;
  templateType: string;
};
export type InsertVerificationCode = {
  email: string;
  code: string;
  expiresAt: Date;
};
export type InsertEventRsvp = {
  postId: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
};

// Supabase client singleton
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[Database] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    return null;
  }

  _supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("[Database] Supabase client initialized");
  return _supabase;
}

// Helper to convert snake_case to camelCase
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== "object") return obj;

  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    converted[camelKey] = snakeToCamel(obj[key]);
  }
  return converted;
}

// Helper to convert camelCase to snake_case for inserts
function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;

  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      letter => `_${letter.toLowerCase()}`
    );
    converted[snakeKey] = camelToSnake(obj[key]);
  }
  return converted;
}

// Debug function to test database connection
export async function testDatabaseConnection() {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error:
        "Supabase client not initialized - check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  try {
    // Test with a simple count query
    const { count: channelCount, error: channelError } = await supabase
      .from("channels")
      .select("*", { count: "exact", head: true });

    if (channelError) throw channelError;

    const { count: userCount, error: userError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (userError) throw userError;

    return {
      success: true,
      channelCount: channelCount ?? 0,
      userCount: userCount ?? 0,
      message: `Connected! Found ${channelCount} channels and ${userCount} users`,
    };
  } catch (error: any) {
    console.error("[Database Debug] Error:", error);
    return {
      success: false,
      error: error.message || "Query failed",
      code: error.code,
      details: error.toString(),
    };
  }
}

// Keep getDb for backwards compatibility (returns null, use Supabase client directly)
export async function getDb() {
  return getSupabase() ? {} : null;
}

// ============= User Functions =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[Database] Cannot upsert user: Supabase not available");
    return;
  }

  try {
    const data: any = {
      open_id: user.openId,
      last_signed_in: user.lastSignedIn || new Date(),
    };

    if (user.name !== undefined) data.name = user.name;
    if (user.email !== undefined) data.email = user.email;
    if (user.loginMethod !== undefined) data.login_method = user.loginMethod;
    if (user.role !== undefined) {
      data.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      data.role = "admin";
    }

    const { error } = await supabase
      .from("users")
      .upsert(data, { onConflict: "open_id" });

    if (error) throw error;
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting user:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getUserById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting user:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getAllUsers(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  role?: "user" | "admin" | "moderator";
  sortBy?: "created_at" | "last_signed_in" | "name";
  sortOrder?: "asc" | "desc";
}) {
  const supabase = getSupabase();
  if (!supabase) return { users: [], total: 0 };

  const {
    limit = 50,
    offset = 0,
    search,
    role,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options || {};

  // Count query
  let countQuery = supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  if (role) countQuery = countQuery.eq("role", role);
  if (search) {
    countQuery = countQuery.or(
      `name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }
  const { count } = await countQuery;

  // Data query
  let query = supabase.from("users").select("*");
  if (role) query = query.eq("role", role);
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    console.error("[Database] Error getting all users:", error);
    return { users: [], total: 0 };
  }

  return {
    users: (data || []).map(snakeToCamel) as User[],
    total: count ?? 0,
  };
}

export async function getUserDetails(userId: number) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Get user
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) return null;

  // Get channels the user is a member of
  const { data: memberships } = await supabase
    .from("channel_members")
    .select(
      `
      role,
      joined_at,
      channels (
        id,
        name,
        type
      )
    `
    )
    .eq("user_id", userId);

  // Get message count
  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get support ticket count
  const { count: ticketCount } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const channels = (memberships || [])
    .filter((m: any) => m.channels)
    .map((m: any) => ({
      id: m.channels.id,
      name: m.channels.name,
      type: m.channels.type,
      role: m.role,
      joinedAt: m.joined_at,
    }));

  return {
    ...snakeToCamel(user),
    channels,
    messageCount: messageCount ?? 0,
    ticketCount: ticketCount ?? 0,
  };
}

export async function suspendUser(
  userId: number,
  adminId: number,
  reason: string,
  until?: Date
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("users")
    .update({
      is_suspended: true,
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
      suspended_until: until ? until.toISOString() : null,
      suspended_by: adminId,
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function unsuspendUser(userId: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("users")
    .update({
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
      suspended_until: null,
      suspended_by: null,
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function isUserSuspended(userId: number): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("users")
    .select("is_suspended, suspended_until")
    .eq("id", userId)
    .single();

  if (error || !data) return false;

  if (!data.is_suspended) return false;

  // Auto-unsuspend if the suspension has expired
  if (data.suspended_until && new Date(data.suspended_until) < new Date()) {
    await unsuspendUser(userId);
    return false;
  }

  return true;
}

// ============= Channel Functions =============

export async function createChannel(channel: InsertChannel) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("channels")
    .insert(camelToSnake(channel))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getChannelById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting channel:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getAllChannels() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("is_closed", false)
    .order("created_at");

  if (error) {
    console.error("[Database] Error getting channels:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function getPublicChannels() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("is_private", false)
    .eq("is_closed", false)
    .order("created_at");

  if (error) {
    console.error("[Database] Error getting public channels:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function getChannelsWithLearnworldsLinks() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("is_closed", false)
    .or(
      "learnworlds_course_id.not.is.null,learnworlds_bundle_id.not.is.null,learnworlds_subscription_id.not.is.null"
    );

  if (error) {
    console.error("[Database] Error getting LW-linked channels:", error);
    return [];
  }

  return (data || []).map(snakeToCamel) as Channel[];
}

export async function getUserChannels(userId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channel_members")
    .select(
      `
      role,
      channels (
        id,
        name,
        description,
        type,
        is_private,
        created_by,
        created_at,
        is_closed
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[Database] Error getting user channels:", error);
    return [];
  }

  // Transform the joined data
  return (data || [])
    .filter((row: any) => row.channels && !row.channels.is_closed)
    .map((row: any) => ({
      ...snakeToCamel(row.channels),
      memberRole: row.role,
    }));
}

export async function updateChannel(id: number, updates: Partial<Channel>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channels")
    .update(camelToSnake(updates))
    .eq("id", id);

  if (error) throw error;
}

// ============= Channel Member Functions =============

export async function addChannelMember(member: InsertChannelMember) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase.from("channel_members").upsert(
    {
      channel_id: member.channelId,
      user_id: member.userId,
      role: member.role || "member",
    },
    { onConflict: "channel_id,user_id" }
  );

  if (error) throw error;
}

export async function removeChannelMember(channelId: number, userId: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getChannelMembers(channelId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channel_members")
    .select(
      `
      role,
      joined_at,
      users (
        id,
        name,
        email,
        role
      )
    `
    )
    .eq("channel_id", channelId);

  if (error) {
    console.error("[Database] Error getting channel members:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row.users),
    memberRole: row.role,
    joinedAt: row.joined_at,
  }));
}

export async function isUserInChannel(channelId: number, userId: number) {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("channel_members")
    .select("id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("[Database] Error checking channel membership:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

// ============= Unread Tracking Functions =============

export async function getUnreadCountForUserChannel(
  userId: number,
  channelId: number
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { data: membership } = await supabase
    .from("channel_members")
    .select("last_read_at")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .single();

  if (!membership?.last_read_at) return 0;

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", channelId)
    .neq("user_id", userId)
    .gt("created_at", membership.last_read_at);

  return count || 0;
}

export async function updateChannelLastRead(
  userId: number,
  channelId: number,
  timestamp: Date = new Date()
) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("channel_members")
    .update({ last_read_at: timestamp.toISOString() })
    .eq("user_id", userId)
    .eq("channel_id", channelId);

  if (error) {
    console.error("[Database] Error updating last_read_at:", error);
  }
}

export async function getUnreadCountsForUser(
  userId: number
): Promise<{ channelId: number; unreadCount: number }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Only track channels the user is a member of (not random public channels)
  const { data: memberships, error: memberError } = await supabase
    .from("channel_members")
    .select("channel_id, last_read_at")
    .eq("user_id", userId);

  if (memberError || !memberships) {
    console.error("[Database] Error getting memberships:", memberError);
    return [];
  }

  const results: { channelId: number; unreadCount: number }[] = [];

  for (const membership of memberships) {
    // If user has never viewed this channel, don't show a massive backlog
    if (!membership.last_read_at) continue;

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", membership.channel_id)
      .neq("user_id", userId) // Exclude user's own messages
      .gt("created_at", membership.last_read_at);

    if (!error && count && count > 0) {
      results.push({ channelId: membership.channel_id, unreadCount: count });
    }
  }

  return results;
}

// ============= Message Functions =============

export async function createMessage(message: InsertMessage) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("messages")
    .insert(camelToSnake(message))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getChannelMessages(
  channelId: number,
  limit: number = 50,
  offset: number = 0
) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      *,
      users (
        name,
        display_name,
        role
      ),
      posts!messages_post_id_fkey (
        id,
        post_type,
        title,
        content,
        event_date,
        event_location,
        tags,
        featured_image,
        priority_level,
        is_pinned,
        article_author
      )
    `
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Database] Error getting messages:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.display_name || row.users?.name,
    userRole: row.users?.role,
    users: undefined,
    post: row.posts
      ? {
          id: row.posts.id,
          postType: row.posts.post_type,
          title: row.posts.title,
          content: row.posts.content,
          eventDate: row.posts.event_date,
          eventLocation: row.posts.event_location,
          tags: row.posts.tags,
          featuredImage: row.posts.featured_image,
          priorityLevel: row.posts.priority_level,
          isPinned: row.posts.is_pinned,
          articleAuthor: row.posts.article_author,
        }
      : null,
    posts: undefined,
  }));
}

export async function getPinnedMessages(channelId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      *,
      users (
        name,
        display_name,
        role
      ),
      posts!messages_post_id_fkey (
        id,
        post_type,
        title,
        content,
        event_date,
        event_location,
        tags,
        featured_image,
        priority_level,
        is_pinned,
        article_author
      )
    `
    )
    .eq("channel_id", channelId)
    .eq("is_pinned", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting pinned messages:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.display_name || row.users?.name,
    userRole: row.users?.role,
    users: undefined,
    post: row.posts
      ? {
          id: row.posts.id,
          postType: row.posts.post_type,
          title: row.posts.title,
          content: row.posts.content,
          eventDate: row.posts.event_date,
          eventLocation: row.posts.event_location,
          tags: row.posts.tags,
          featuredImage: row.posts.featured_image,
          priorityLevel: row.posts.priority_level,
          isPinned: row.posts.is_pinned,
          articleAuthor: row.posts.article_author,
        }
      : null,
    posts: undefined,
  }));
}

export async function togglePinMessage(messageId: number, isPinned: boolean) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("messages")
    .update({ is_pinned: isPinned })
    .eq("id", messageId);

  if (error) throw error;
}

// ============= Post Functions =============

export async function createPost(post: InsertPost) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("posts")
    .insert(camelToSnake(post))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getPostsByType(
  postType: "event" | "announcement" | "article" | "newsletter",
  limit: number = 20
) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      users (
        name
      )
    `
    )
    .eq("post_type", postType)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Database] Error getting posts:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    authorName: row.users?.name,
    users: undefined,
  }));
}

export async function browsePostsByType(
  postType: "event" | "announcement" | "article" | "newsletter",
  options: {
    limit?: number;
    offset?: number;
    sortBy?: "newest" | "oldest" | "pinned";
    search?: string;
  } = {}
) {
  const supabase = getSupabase();
  if (!supabase) return { results: [], total: 0 };

  const limit = options.limit || 20;
  const offset = options.offset || 0;

  let q = supabase
    .from("posts")
    .select(
      `
      *,
      users (
        name,
        display_name
      )
    `,
      { count: "exact" }
    )
    .eq("post_type", postType);

  if (options.search) {
    const pattern = `%${options.search}%`;
    q = q.or(
      `title.ilike.${pattern},content.ilike.${pattern},tags.ilike.${pattern}`
    );
  }

  switch (options.sortBy) {
    case "oldest":
      q = q.order("created_at", { ascending: true });
      break;
    case "pinned":
      q = q
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    default: // "newest"
      q = q.order("created_at", { ascending: false });
  }

  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error("[Database] Error browsing posts:", error);
    return { results: [], total: 0 };
  }

  const results = (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    authorName: row.users?.display_name || row.users?.name,
    users: undefined,
  }));

  return { results, total: count || 0 };
}

export async function getPostById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      users (
        name
      )
    `
    )
    .eq("id", id)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting post:", error);
  }

  if (!data) return undefined;

  return {
    ...snakeToCamel(data),
    authorName: data.users?.name,
    users: undefined,
  };
}

export async function togglePinPost(postId: number, isPinned: boolean) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("posts")
    .update({ is_pinned: isPinned })
    .eq("id", postId);

  if (error) throw error;
}

export async function updatePost(postId: number, updates: Partial<InsertPost>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("posts")
    .update(camelToSnake(updates))
    .eq("id", postId);

  if (error) throw error;
}

export async function getEventsDueForReminder(): Promise<Post[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Find events where:
  // - reminder_hours is set
  // - auto_reminder_sent_at is null (not sent yet)
  // - event_date minus reminder_hours <= now
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("post_type", "event")
    .not("reminder_hours", "is", null)
    .not("event_date", "is", null)
    .is("auto_reminder_sent_at", null)
    .lte(
      "event_date",
      new Date(Date.now() + 999 * 24 * 60 * 60 * 1000).toISOString()
    ); // Get all future events — we'll filter in JS

  if (error) {
    console.error("[Database] Error getting events due for reminder:", error);
    return [];
  }

  // Filter in JS: event_date - reminder_hours <= now
  const now = Date.now();
  return (data || [])
    .map((row: any) => snakeToCamel(row) as Post)
    .filter(post => {
      if (!post.eventDate || !post.reminderHours) return false;
      const eventTime = new Date(post.eventDate).getTime();
      const reminderTime = eventTime - post.reminderHours * 60 * 60 * 1000;
      return reminderTime <= now && eventTime > now; // Only for future events
    });
}

// ============= Support Ticket Functions =============

export async function createSupportTicket(ticket: InsertSupportTicket) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("support_tickets")
    .insert(camelToSnake(ticket))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getAllSupportTickets() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      `
      *,
      users!support_tickets_user_id_fkey (
        name,
        email
      )
    `
    )
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting support tickets:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.name,
    userEmail: row.users?.email,
    users: undefined,
  }));
}

export async function getUserSupportTickets(userId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, status, priority, last_message_at, closed_at, created_at"
    )
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting user support tickets:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function getOpenSupportTickets() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      `
      *,
      users!support_tickets_user_id_fkey (
        name,
        email
      )
    `
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting open support tickets:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.name,
    userEmail: row.users?.email,
    users: undefined,
  }));
}

export async function getSupportTicketById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      `
      *,
      users!support_tickets_user_id_fkey (
        name,
        email
      )
    `
    )
    .eq("id", id)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting support ticket:", error);
  }

  if (!data) return null;

  return {
    ...snakeToCamel(data),
    userName: data.users?.name,
    userEmail: data.users?.email,
    users: undefined,
  };
}

export async function updateSupportTicket(
  id: number,
  updates: Partial<InsertSupportTicket>
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("support_tickets")
    .update(camelToSnake(updates))
    .eq("id", id);

  if (error) throw error;
}

// ============= Support Message Functions =============

export async function createSupportMessage(message: InsertSupportMessage) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("support_messages")
    .insert(camelToSnake(message))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getSupportMessagesByTicket(ticketId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_messages")
    .select(
      `
      *,
      users!support_messages_sender_id_fkey (
        name
      )
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at");

  if (error) {
    console.error("[Database] Error getting support messages:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    senderName: row.users?.name,
    users: undefined,
  }));
}

// ============= Notification Functions =============

export async function createNotification(notification: InsertNotification) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("notifications")
    .insert(camelToSnake(notification));

  if (error) throw error;
}

export async function getUserNotifications(userId: number, limit: number = 50) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Database] Error getting notifications:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function markNotificationAsRead(id: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

// ============= Knowledge Base Functions =============

export async function getAllKnowledgeBase() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("moji_knowledge_base")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("[Database] Error getting knowledge base:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function searchKnowledgeBase(searchTerm: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("moji_knowledge_base")
    .select("*")
    .eq("is_active", true)
    .or(
      `question.ilike.%${searchTerm}%,answer.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`
    );

  if (error) {
    console.error("[Database] Error searching knowledge base:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function createKnowledgeBaseEntry(entry: InsertMojiKnowledgeBase) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("moji_knowledge_base")
    .insert(camelToSnake(entry))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateKnowledgeBaseEntry(
  id: number,
  entry: Partial<InsertMojiKnowledgeBase>
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("moji_knowledge_base")
    .update(camelToSnake(entry))
    .eq("id", id);

  if (error) throw error;
}

export async function deleteKnowledgeBaseEntry(id: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("moji_knowledge_base")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

// ============= Email Log Functions =============

export async function getAllEmailLogs(limit: number = 100) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Database] Error getting email logs:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function createEmailLog(log: InsertEmailLog) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("email_logs")
    .insert(camelToSnake(log))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateEmailLogStatus(
  id: number,
  status: "sent" | "failed",
  errorMessage?: string
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const updates: any = { status };
  if (status === "sent") updates.sent_at = new Date();
  if (errorMessage) updates.error_message = errorMessage;

  const { error } = await supabase
    .from("email_logs")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

// ============= Study Group Functions =============

export async function createStudyGroup(group: {
  name: string;
  description?: string;
  createdBy: number;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  // Create the channel with type study_group
  const { data, error } = await supabase
    .from("channels")
    .insert({
      name: group.name,
      description: group.description || null,
      type: "study_group",
      is_private: true,
      is_closed: false,
      created_by: group.createdBy,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Add creator as owner
  await addChannelMember({
    channelId: data.id,
    userId: group.createdBy,
    role: "owner",
  });

  return data.id;
}

export async function getStudyGroups() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channels")
    .select(
      `
      *,
      users:created_by (
        name
      )
    `
    )
    .eq("type", "study_group")
    .eq("is_closed", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting study groups:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    creatorName: row.users?.name,
    users: undefined,
  }));
}

export async function getUserStudyGroups(userId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("channel_members")
    .select(
      `
      role,
      joined_at,
      channels (
        id,
        name,
        description,
        type,
        is_private,
        created_by,
        created_at,
        is_closed
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[Database] Error getting user study groups:", error);
    return [];
  }

  // Filter to only study groups
  return (data || [])
    .filter(
      (row: any) =>
        row.channels?.type === "study_group" && !row.channels.is_closed
    )
    .map((row: any) => ({
      ...snakeToCamel(row.channels),
      memberRole: row.role,
      joinedAt: row.joined_at,
    }));
}

export async function getStudyGroupById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("channels")
    .select(
      `
      *,
      users:created_by (
        name,
        email
      )
    `
    )
    .eq("id", id)
    .eq("type", "study_group")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting study group:", error);
  }

  if (!data) return undefined;

  return {
    ...snakeToCamel(data),
    creatorName: data.users?.name,
    creatorEmail: data.users?.email,
    users: undefined,
  };
}

export async function updateStudyGroup(
  id: number,
  updates: { name?: string; description?: string }
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channels")
    .update(camelToSnake(updates))
    .eq("id", id)
    .eq("type", "study_group");

  if (error) throw error;
}

export async function archiveStudyGroup(id: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channels")
    .update({ is_closed: true })
    .eq("id", id)
    .eq("type", "study_group");

  if (error) throw error;
}

export async function getStudyGroupMemberCount(groupId: number) {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("channel_members")
    .select("*", { count: "exact", head: true })
    .eq("channel_id", groupId);

  if (error) {
    console.error("[Database] Error getting member count:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getUserByEmail(email: string) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting user by email:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getChannelMemberRole(channelId: number, userId: number) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("channel_members")
    .select("role")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting member role:", error);
  }

  return data?.role || null;
}

// ============= Analytics Functions =============

interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  resolutionType?:
    | "bot-answered"
    | "human-answered"
    | "no-answer"
    | "escalated";
  enquiryType?: string;
  status?: "open" | "in-progress" | "closed";
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export async function getSupportAnalytics(filters: AnalyticsFilters) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from("support_tickets").select(`
      *,
      users!support_tickets_user_id_fkey (
        name,
        email
      )
    `);

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }
  if (filters.resolutionType) {
    query = query.eq("resolution_type", filters.resolutionType);
  }
  if (filters.enquiryType) {
    query = query.eq("enquiry_type", filters.enquiryType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.searchQuery) {
    query = query.or(
      `subject.ilike.%${filters.searchQuery}%,tags.ilike.%${filters.searchQuery}%`
    );
  }

  query = query
    .order("created_at", { ascending: false })
    .range(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 100) - 1
    );

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Error getting analytics:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.name,
    userEmail: row.users?.email,
    users: undefined,
  }));
}

export async function getAnalyticsSummary(filters: {
  startDate?: string;
  endDate?: string;
}) {
  const supabase = getSupabase();
  if (!supabase)
    return {
      totalConversations: 0,
      botAnswered: 0,
      humanAnswered: 0,
      noAnswer: 0,
      escalated: 0,
      avgBotInteractions: 0,
      avgHumanInteractions: 0,
      avgSatisfaction: 0,
    };

  let query = supabase.from("support_tickets").select("*");

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data: allTickets, error } = await query;

  if (error || !allTickets) {
    console.error("[Database] Error getting analytics summary:", error);
    return {
      totalConversations: 0,
      botAnswered: 0,
      humanAnswered: 0,
      noAnswer: 0,
      escalated: 0,
      avgBotInteractions: 0,
      avgHumanInteractions: 0,
      avgSatisfaction: 0,
    };
  }

  const totalConversations = allTickets.length;
  const botAnswered = allTickets.filter(
    t => t.resolution_type === "bot-answered"
  ).length;
  const humanAnswered = allTickets.filter(
    t => t.resolution_type === "human-answered"
  ).length;
  const noAnswer = allTickets.filter(
    t => t.resolution_type === "no-answer"
  ).length;
  const escalated = allTickets.filter(
    t => t.resolution_type === "escalated"
  ).length;

  const avgBotInteractions =
    totalConversations > 0
      ? allTickets.reduce((sum, t) => sum + (t.bot_interaction_count || 0), 0) /
        totalConversations
      : 0;

  const avgHumanInteractions =
    totalConversations > 0
      ? allTickets.reduce(
          (sum, t) => sum + (t.human_interaction_count || 0),
          0
        ) / totalConversations
      : 0;

  const ratingsCount = allTickets.filter(
    t => t.satisfaction_rating !== null
  ).length;
  const avgSatisfaction =
    ratingsCount > 0
      ? allTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) /
        ratingsCount
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

// ============= Verification Code Functions =============

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new verification code for an email
 */
export async function createVerificationCode(email: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing codes for this email
  await supabase
    .from("verification_codes")
    .delete()
    .eq("email", email.toLowerCase());

  // Insert new code
  const { error } = await supabase.from("verification_codes").insert({
    email: email.toLowerCase(),
    code,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  console.log(`[Auth] Verification code created for ${email}`);
  return code;
}

/**
 * Verify a code for an email
 * Returns true if valid, false otherwise
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) {
    console.log(
      `[Auth] Verification failed for ${email}: invalid or expired code`
    );
    return false;
  }

  // Mark as used
  await supabase
    .from("verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  console.log(`[Auth] Verification successful for ${email}`);
  return true;
}

/**
 * Clean up expired verification codes (can be called periodically)
 */
export async function cleanupExpiredCodes(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("verification_codes")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[Auth] Failed to cleanup expired codes:", error);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[Auth] Cleaned up ${count} expired verification codes`);
  }
  return count;
}

/**
 * Create or update a member user (for Learnworlds members)
 */
export async function upsertMemberUser(member: {
  email: string;
  name: string | null;
  learnworldsId?: string;
}): Promise<User> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const openId = `member:${member.email.toLowerCase()}`;

  // Try to find existing user
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .limit(1)
    .single();

  if (existing) {
    // Update last signed in
    await supabase
      .from("users")
      .update({
        last_signed_in: new Date().toISOString(),
        name: member.name || existing.name,
      })
      .eq("id", existing.id);

    return snakeToCamel(existing);
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      open_id: openId,
      email: member.email.toLowerCase(),
      name: member.name,
      role: "user",
      login_method: "learnworlds",
      last_signed_in: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  // Auto-join public channels for new members
  const publicChannels = await getPublicChannels();
  for (const channel of publicChannels) {
    try {
      await addChannelMember({
        channelId: channel.id,
        userId: newUser.id,
        role: "member",
      });
    } catch (err) {
      // Ignore if already a member
    }
  }

  console.log(`[Auth] Created new member user: ${member.email}`);
  return snakeToCamel(newUser);
}

// ============= Platform Settings Functions =============

export async function getPlatformSettings(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("platform_settings")
    .select("setting_key, setting_value");

  if (error) {
    console.error("[Database] Error getting platform settings:", error);
    return {};
  }

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.setting_key] = row.setting_value || "";
  }
  return settings;
}

export async function updatePlatformSetting(
  key: string,
  value: string,
  updatedBy?: number
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase.from("platform_settings").upsert(
    {
      setting_key: key,
      setting_value: value,
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" }
  );

  if (error) {
    console.error("[Database] Error updating platform setting:", error);
    throw error;
  }
}

export async function updatePlatformSettings(
  settings: Record<string, string>,
  updatedBy?: number
): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await updatePlatformSetting(key, value, updatedBy);
  }
}

// Update admin display name
export async function updateUserDisplayName(
  userId: number,
  displayName: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("users")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) {
    console.error("[Database] Error updating display name:", error);
    throw error;
  }
}

export async function getAdminUsers(): Promise<User[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "admin");

  if (error) {
    console.error("[Database] Error getting admin users:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

// ============= Dashboard Stats Functions =============

export async function getTotalUserCount(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[Database] Error counting users:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getMessagesTodayCount(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  if (error) {
    console.error("[Database] Error counting messages today:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getEmailsSentThisWeekCount(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count, error } = await supabase
    .from("email_logs")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", weekAgo.toISOString());

  if (error) {
    console.error("[Database] Error counting emails:", error);
    return 0;
  }
  return count ?? 0;
}

// ============= Event RSVP Functions =============

export async function createEventRsvp(rsvp: InsertEventRsvp) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from("event_rsvps")
    .insert(camelToSnake(rsvp))
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getEventRsvps(postId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Error getting event RSVPs:", error);
    return [];
  }

  return (data || []).map(snakeToCamel) as EventRsvp[];
}

export async function getEventRsvpByEmail(postId: number, email: string) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("post_id", postId)
    .eq("email", email.toLowerCase())
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Error getting event RSVP:", error);
  }

  return data ? (snakeToCamel(data) as EventRsvp) : undefined;
}

export async function updateEventRsvp(
  rsvpId: number,
  updates: Partial<EventRsvp>
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("event_rsvps")
    .update(camelToSnake(updates))
    .eq("id", rsvpId);

  if (error) throw error;
}

export async function updateEventRsvpsByPost(
  postId: number,
  updates: Partial<EventRsvp>
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("event_rsvps")
    .update(camelToSnake(updates))
    .eq("post_id", postId);

  if (error) throw error;
}

// ─── Search ──────────────────────────────────────────────────────────

export async function searchMessages(
  query: string,
  options: { userId?: number; limit?: number; offset?: number } = {}
) {
  const supabase = getSupabase();
  if (!supabase) return { results: [], total: 0 };

  const limit = options.limit || 30;
  const offset = options.offset || 0;
  const pattern = `%${query}%`;

  // Build query — join users and channels for context
  let q = supabase
    .from("messages")
    .select(
      `
      id,
      channel_id,
      content,
      message_type,
      created_at,
      users (
        name,
        display_name,
        role
      ),
      channels!messages_channel_id_fkey (
        id,
        name,
        type,
        is_private
      )
    `,
      { count: "exact" }
    )
    .ilike("content", pattern)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // If non-admin user, exclude private channels they don't belong to
  // (handled at tRPC layer by filtering results)

  const { data, error, count } = await q;

  if (error) {
    console.error("[Database] Error searching messages:", error);
    return { results: [], total: 0 };
  }

  const results = (data || []).map((row: any) => ({
    id: row.id,
    channelId: row.channel_id,
    content: row.content,
    messageType: row.message_type,
    createdAt: row.created_at,
    userName: row.users?.display_name || row.users?.name || "Unknown",
    channelName: row.channels?.name || "Unknown",
    channelType: row.channels?.type,
    isPrivate: row.channels?.is_private,
  }));

  return { results, total: count || 0 };
}

export async function searchPosts(
  query: string,
  options: { postType?: string; limit?: number; offset?: number } = {}
) {
  const supabase = getSupabase();
  if (!supabase) return { results: [], total: 0 };

  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const pattern = `%${query}%`;

  let q = supabase
    .from("posts")
    .select(
      `
      id,
      post_type,
      title,
      content,
      event_date,
      event_location,
      tags,
      article_author,
      created_at,
      users!posts_author_id_fkey (
        name,
        display_name
      )
    `,
      { count: "exact" }
    )
    .or(`title.ilike.${pattern},content.ilike.${pattern},tags.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.postType) {
    q = q.eq("post_type", options.postType);
  }

  const { data, error, count } = await q;

  if (error) {
    console.error("[Database] Error searching posts:", error);
    return { results: [], total: 0 };
  }

  const results = (data || []).map((row: any) => ({
    id: row.id,
    postType: row.post_type,
    title: row.title,
    content: row.content,
    eventDate: row.event_date,
    eventLocation: row.event_location,
    tags: row.tags,
    articleAuthor: row.article_author,
    createdAt: row.created_at,
    authorName: row.users?.display_name || row.users?.name || "Unknown",
  }));

  return { results, total: count || 0 };
}

// ============= Group Suspension Functions =============

export async function suspendGroup(
  channelId: number,
  reason: string,
  suspendedBy: number
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channels")
    .update({
      is_suspended: true,
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
      suspended_by: suspendedBy,
    })
    .eq("id", channelId);

  if (error) throw error;
}

export async function unsuspendGroup(channelId: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from("channels")
    .update({
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
      suspended_by: null,
    })
    .eq("id", channelId);

  if (error) throw error;
}

export async function isGroupSuspended(channelId: number): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data } = await supabase
    .from("channels")
    .select("is_suspended")
    .eq("id", channelId)
    .single();

  return data?.is_suspended === true;
}
