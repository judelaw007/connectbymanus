import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const authHandled = useRef(false);

  // Handle Supabase auth tokens arriving at the root URL.
  // This happens when the Supabase Site URL redirects here instead of
  // /auth/admin/callback (e.g. misconfigured redirect URL).
  useEffect(() => {
    if (authHandled.current) return;

    const hasAuthInQuery = window.location.search.includes("access_token");
    const hasAuthInHash = window.location.hash.includes("access_token");

    if ((hasAuthInQuery || hasAuthInHash) && supabase) {
      authHandled.current = true;
      setAuthRedirecting(true);

      // Let Supabase client process the tokens from the URL, then redirect
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          // Supabase session established — go to admin dashboard
          window.location.href = "/admin";
        } else {
          // Tokens didn't produce a valid session — go to admin callback
          // which has its own error handling
          const fragment = hasAuthInHash ? window.location.hash : "";
          const query = hasAuthInQuery ? window.location.search : "";
          window.location.href = `/auth/admin/callback${query}${fragment}`;
        }
      });
    }
  }, []);

  if (loading || authRedirecting) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {authRedirecting && (
          <p className="text-sm text-muted-foreground">Completing sign in...</p>
        )}
      </div>
    );
  }

  // Always show ChatLayout - platform is publicly viewable
  // Authentication state is passed down to control what users can do
  return <ChatLayout isPublicView={!isAuthenticated} />;
}
