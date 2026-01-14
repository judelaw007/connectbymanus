import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const ALLOWED_ADMIN_DOMAIN = "mojitax.com";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

function isAllowedAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === ALLOWED_ADMIN_DOMAIN;
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error("Supabase not configured. Check environment variables.");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        hd: ALLOWED_ADMIN_DOMAIN,
      },
      redirectTo: `${window.location.origin}/auth/admin/callback`,
    },
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
  const session = data.session;
  
  if (!session) return null;
  
  if (!isAllowedAdminEmail(session.user?.email)) {
    await supabase.auth.signOut();
    return null;
  }
  
  return session;
}

export async function onAuthStateChange(callback: (session: any) => void) {
  if (!supabase) return { unsubscribe: () => {} };

  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session && !isAllowedAdminEmail(session.user?.email)) {
      await supabase.auth.signOut();
      callback(null);
      return;
    }
    callback(session);
  });

  return data.subscription;
}
