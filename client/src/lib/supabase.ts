import { createClient } from "@supabase/supabase-js";

// Supabase client for browser (admin authentication only)
// Regular users authenticate via mojitax.co.uk (Learnworlds)

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

  // Verify admin status
  if (data.session?.user?.user_metadata?.is_admin !== true) {
    return null;
  }

  return data.session;
}

export async function onAuthStateChange(callback: (session: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    // Only pass admin sessions
    if (session?.user?.user_metadata?.is_admin === true) {
      callback(session);
    } else {
      callback(null);
    }
  });

  return data.subscription;
}
