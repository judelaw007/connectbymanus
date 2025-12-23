import { createClient } from "@supabase/supabase-js";

// Supabase client for browser (admin authentication only)
// Regular users authenticate via mojitax.co.uk (Learnworlds)
//
// Security model:
// - Only admins have Supabase credentials
// - Regular users don't know about /auth/admin
// - Regular users authenticate via Learnworlds SSO

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Only create client if credentials are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// Admin authentication helpers
// Any user with Supabase credentials is an admin by definition
export async function signInAdmin(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase not configured. Check environment variables.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutAdmin() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getAdminSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function onAuthStateChange(callback: (session: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}
