import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './_core/env';

// Types for database operations (matching the existing schema)
export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin' | 'moderator';
  loginMethod: string | null;
  lastSignedIn: Date | null;
  createdAt: Date;
}

export interface Channel {
  id: number;
  name: string;
  description: string | null;
  type: 'general' | 'topic' | 'study_group' | 'direct_message';
  isPrivate: boolean;
  isClosed: boolean;
  inviteCode: string | null;
  createdBy: number | null;
  createdAt: Date;
}

export interface Message {
  id: number;
  channelId: number;
  userId: number | null;
  content: string;
  messageType: 'text' | 'system' | 'announcement' | 'event' | 'article' | 'newsletter' | 'admin' | 'user';
  isPinned: boolean;
  replyToId: number | null;
  postId: number | null;
  createdAt: Date;
}

export interface Post {
  id: number;
  postType: 'event' | 'announcement' | 'article' | 'newsletter';
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
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent' | null;
  messageId: number | null;
  createdAt: Date;
}

export interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedToAdminId: number | null;
  resolutionType: 'bot-answered' | 'human-answered' | 'no-answer' | 'escalated' | null;
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
  senderType: 'user' | 'admin' | 'bot';
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
  templateType: string;
  status: 'pending' | 'sent' | 'failed';
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

// Insert types
export type InsertUser = Partial<User> & { openId: string };
export type InsertChannel = Partial<Channel> & { name: string };
export type InsertChannelMember = { channelId: number; userId: number; role?: string };
export type InsertMessage = Partial<Message> & { channelId: number; content: string };
export type InsertPost = Partial<Post> & { postType: Post['postType']; title: string; content: string };
export type InsertSupportTicket = Partial<SupportTicket> & { userId: number; subject: string };
export type InsertSupportMessage = Partial<SupportMessage> & { ticketId: number; content: string; senderType: SupportMessage['senderType'] };
export type InsertNotification = Partial<Notification> & { userId: number; type: string; title: string; content: string };
export type InsertMojiKnowledgeBase = Partial<MojiKnowledgeBase> & { question: string; answer: string };
export type InsertEmailLog = Partial<EmailLog> & { recipientEmail: string; subject: string; templateType: string };
export type InsertVerificationCode = { email: string; code: string; expiresAt: Date };

// Supabase client singleton
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[Database] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = snakeToCamel(obj[key]);
  }
  return converted;
}

// Helper to convert camelCase to snake_case for inserts
function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;

  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = camelToSnake(obj[key]);
  }
  return converted;
}

// Debug function to test database connection
export async function testDatabaseConnection() {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized - check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" };
  }

  try {
    // Test with a simple count query
    const { count: channelCount, error: channelError } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });

    if (channelError) throw channelError;

    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    return {
      success: true,
      channelCount: channelCount ?? 0,
      userCount: userCount ?? 0,
      message: `Connected! Found ${channelCount} channels and ${userCount} users`
    };
  } catch (error: any) {
    console.error("[Database Debug] Error:", error);
    return {
      success: false,
      error: error.message || "Query failed",
      code: error.code,
      details: error.toString()
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
      data.role = 'admin';
    }

    const { error } = await supabase
      .from('users')
      .upsert(data, { onConflict: 'open_id' });

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
    .from('users')
    .select('*')
    .eq('open_id', openId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting user:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getUserById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting user:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

// ============= Channel Functions =============

export async function createChannel(channel: InsertChannel) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from('channels')
    .insert(camelToSnake(channel))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getChannelById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting channel:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getAllChannels() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_closed', false)
    .order('created_at');

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
    .from('channels')
    .select('*')
    .eq('is_private', false)
    .eq('is_closed', false)
    .order('created_at');

  if (error) {
    console.error("[Database] Error getting public channels:", error);
    return [];
  }

  return (data || []).map(snakeToCamel);
}

export async function getUserChannels(userId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_members')
    .select(`
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
    `)
    .eq('user_id', userId);

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
    .from('channels')
    .update(camelToSnake(updates))
    .eq('id', id);

  if (error) throw error;
}

// ============= Channel Member Functions =============

export async function addChannelMember(member: InsertChannelMember) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('channel_members')
    .upsert({
      channel_id: member.channelId,
      user_id: member.userId,
      role: member.role || 'member',
    }, { onConflict: 'channel_id,user_id' });

  if (error) throw error;
}

export async function removeChannelMember(channelId: number, userId: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getChannelMembers(channelId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_members')
    .select(`
      role,
      joined_at,
      users (
        id,
        name,
        email,
        role
      )
    `)
    .eq('channel_id', channelId);

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
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error("[Database] Error checking channel membership:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

// ============= Message Functions =============

export async function createMessage(message: InsertMessage) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from('messages')
    .insert(camelToSnake(message))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getChannelMessages(channelId: number, limit: number = 50, offset: number = 0) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users (
        name,
        role
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Database] Error getting messages:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.name,
    userRole: row.users?.role,
    users: undefined,
  }));
}

export async function getPinnedMessages(channelId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users (
        name,
        role
      )
    `)
    .eq('channel_id', channelId)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[Database] Error getting pinned messages:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...snakeToCamel(row),
    userName: row.users?.name,
    userRole: row.users?.role,
    users: undefined,
  }));
}

export async function togglePinMessage(messageId: number, isPinned: boolean) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: isPinned })
    .eq('id', messageId);

  if (error) throw error;
}

// ============= Post Functions =============

export async function createPost(post: InsertPost) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from('posts')
    .insert(camelToSnake(post))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getPostsByType(postType: "event" | "announcement" | "article" | "newsletter", limit: number = 20) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        name
      )
    `)
    .eq('post_type', postType)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
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

export async function getPostById(id: number) {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        name
      )
    `)
    .eq('id', id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
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
    .from('posts')
    .update({ is_pinned: isPinned })
    .eq('id', postId);

  if (error) throw error;
}

export async function updatePost(postId: number, updates: Partial<InsertPost>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('posts')
    .update(camelToSnake(updates))
    .eq('id', postId);

  if (error) throw error;
}

// ============= Support Ticket Functions =============

export async function createSupportTicket(ticket: InsertSupportTicket) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from('support_tickets')
    .insert(camelToSnake(ticket))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getAllSupportTickets() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      users (
        name,
        email
      )
    `)
    .order('last_message_at', { ascending: false });

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
    .from('support_tickets')
    .select('id, subject, status, priority, last_message_at, closed_at, created_at')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

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
    .from('support_tickets')
    .select(`
      *,
      users (
        name,
        email
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

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
    .from('support_tickets')
    .select(`
      *,
      users (
        name,
        email
      )
    `)
    .eq('id', id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
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

export async function updateSupportTicket(id: number, updates: Partial<InsertSupportTicket>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('support_tickets')
    .update(camelToSnake(updates))
    .eq('id', id);

  if (error) throw error;
}

// ============= Support Message Functions =============

export async function createSupportMessage(message: InsertSupportMessage) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { data, error } = await supabase
    .from('support_messages')
    .insert(camelToSnake(message))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getSupportMessagesByTicket(ticketId: number) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('support_messages')
    .select(`
      *,
      users (
        name
      )
    `)
    .eq('ticket_id', ticketId)
    .order('created_at');

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
    .from('notifications')
    .insert(camelToSnake(notification));

  if (error) throw error;
}

export async function getUserNotifications(userId: number, limit: number = 50) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
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
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

// ============= Knowledge Base Functions =============

export async function getAllKnowledgeBase() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('moji_knowledge_base')
    .select('*')
    .eq('is_active', true);

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
    .from('moji_knowledge_base')
    .select('*')
    .eq('is_active', true)
    .or(`question.ilike.%${searchTerm}%,answer.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`);

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
    .from('moji_knowledge_base')
    .insert(camelToSnake(entry))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateKnowledgeBaseEntry(id: number, entry: Partial<InsertMojiKnowledgeBase>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('moji_knowledge_base')
    .update(camelToSnake(entry))
    .eq('id', id);

  if (error) throw error;
}

export async function deleteKnowledgeBaseEntry(id: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('moji_knowledge_base')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============= Email Log Functions =============

export async function getAllEmailLogs(limit: number = 100) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
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
    .from('email_logs')
    .insert(camelToSnake(log))
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateEmailLogStatus(id: number, status: "sent" | "failed", errorMessage?: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const updates: any = { status };
  if (status === "sent") updates.sent_at = new Date();
  if (errorMessage) updates.error_message = errorMessage;

  const { error } = await supabase
    .from('email_logs')
    .update(updates)
    .eq('id', id);

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
    .from('channels')
    .insert({
      name: group.name,
      description: group.description || null,
      type: 'study_group',
      is_private: true,
      is_closed: false,
      created_by: group.createdBy,
    })
    .select('id')
    .single();

  if (error) throw error;

  // Add creator as owner
  await addChannelMember({
    channelId: data.id,
    userId: group.createdBy,
    role: 'owner',
  });

  return data.id;
}

export async function getStudyGroups() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channels')
    .select(`
      *,
      users:created_by (
        name
      )
    `)
    .eq('type', 'study_group')
    .eq('is_closed', false)
    .order('created_at', { ascending: false });

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
    .from('channel_members')
    .select(`
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
    `)
    .eq('user_id', userId);

  if (error) {
    console.error("[Database] Error getting user study groups:", error);
    return [];
  }

  // Filter to only study groups
  return (data || [])
    .filter((row: any) => row.channels?.type === 'study_group' && !row.channels.is_closed)
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
    .from('channels')
    .select(`
      *,
      users:created_by (
        name,
        email
      )
    `)
    .eq('id', id)
    .eq('type', 'study_group')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
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

export async function updateStudyGroup(id: number, updates: { name?: string; description?: string }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('channels')
    .update(camelToSnake(updates))
    .eq('id', id)
    .eq('type', 'study_group');

  if (error) throw error;
}

export async function archiveStudyGroup(id: number) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not available");

  const { error } = await supabase
    .from('channels')
    .update({ is_closed: true })
    .eq('id', id)
    .eq('type', 'study_group');

  if (error) throw error;
}

export async function getStudyGroupMemberCount(groupId: number) {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('channel_members')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', groupId);

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
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting user by email:", error);
  }

  return data ? snakeToCamel(data) : undefined;
}

export async function getChannelMemberRole(channelId: number, userId: number) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('channel_members')
    .select('role')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting member role:", error);
  }

  return data?.role || null;
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
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      users (
        name,
        email
      )
    `);

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.resolutionType) {
    query = query.eq('resolution_type', filters.resolutionType);
  }
  if (filters.enquiryType) {
    query = query.eq('enquiry_type', filters.enquiryType);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.searchQuery) {
    query = query.or(`subject.ilike.%${filters.searchQuery}%,tags.ilike.%${filters.searchQuery}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100) - 1);

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

export async function getAnalyticsSummary(filters: { startDate?: string; endDate?: string }) {
  const supabase = getSupabase();
  if (!supabase) return {
    totalConversations: 0,
    botAnswered: 0,
    humanAnswered: 0,
    noAnswer: 0,
    escalated: 0,
    avgBotInteractions: 0,
    avgHumanInteractions: 0,
    avgSatisfaction: 0,
  };

  let query = supabase.from('support_tickets').select('*');

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
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
  const botAnswered = allTickets.filter(t => t.resolution_type === "bot-answered").length;
  const humanAnswered = allTickets.filter(t => t.resolution_type === "human-answered").length;
  const noAnswer = allTickets.filter(t => t.resolution_type === "no-answer").length;
  const escalated = allTickets.filter(t => t.resolution_type === "escalated").length;

  const avgBotInteractions = totalConversations > 0
    ? allTickets.reduce((sum, t) => sum + (t.bot_interaction_count || 0), 0) / totalConversations
    : 0;

  const avgHumanInteractions = totalConversations > 0
    ? allTickets.reduce((sum, t) => sum + (t.human_interaction_count || 0), 0) / totalConversations
    : 0;

  const ratingsCount = allTickets.filter(t => t.satisfaction_rating !== null).length;
  const avgSatisfaction = ratingsCount > 0
    ? allTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) / ratingsCount
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
    .from('verification_codes')
    .delete()
    .eq('email', email.toLowerCase());

  // Insert new code
  const { error } = await supabase
    .from('verification_codes')
    .insert({
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
export async function verifyCode(email: string, code: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('code', code)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) {
    console.log(`[Auth] Verification failed for ${email}: invalid or expired code`);
    return false;
  }

  // Mark as used
  await supabase
    .from('verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);

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
    .from('verification_codes')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

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
    .from('users')
    .select('*')
    .eq('open_id', openId)
    .limit(1)
    .single();

  if (existing) {
    // Update last signed in
    await supabase
      .from('users')
      .update({
        last_signed_in: new Date().toISOString(),
        name: member.name || existing.name,
      })
      .eq('id', existing.id);

    return snakeToCamel(existing);
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      open_id: openId,
      email: member.email.toLowerCase(),
      name: member.name,
      role: 'user',
      login_method: 'learnworlds',
      last_signed_in: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  // Auto-join public channels for new members
  const publicChannels = await getPublicChannels();
  for (const channel of publicChannels) {
    try {
      await addChannelMember({
        channelId: channel.id,
        userId: newUser.id,
        role: 'member',
      });
    } catch (err) {
      // Ignore if already a member
    }
  }

  console.log(`[Auth] Created new member user: ${member.email}`);
  return snakeToCamel(newUser);
}
