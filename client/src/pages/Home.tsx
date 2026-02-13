import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const ssoAttempted = useRef(false);

  const ssoLoginMutation = trpc.memberAuth.ssoLogin.useMutation({
    onSuccess: () => {
      // Remove the token from the URL and reload to pick up the session
      window.history.replaceState({}, "", "/");
      window.location.reload();
    },
    onError: err => {
      setSsoError(err.message);
      setSsoLoading(false);
      // Clean up URL params
      window.history.replaceState({}, "", "/");
    },
  });

  useEffect(() => {
    if (ssoAttempted.current || isAuthenticated || loading) return;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");

    if (accessToken) {
      ssoAttempted.current = true;
      setSsoLoading(true);
      ssoLoginMutation.mutate({ accessToken });
    }
  }, [loading, isAuthenticated]);

  if (loading || ssoLoading) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {ssoLoading && (
          <p className="text-sm text-muted-foreground">
            Signing you in from MojiTax...
          </p>
        )}
      </div>
    );
  }

  if (ssoError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-destructive font-medium">{ssoError}</p>
          <a href="/login" className="text-primary hover:underline text-sm">
            Try logging in with your email instead
          </a>
        </div>
      </div>
    );
  }

  // Always show ChatLayout - platform is publicly viewable
  // Authentication state is passed down to control what users can do
  return <ChatLayout isPublicView={!isAuthenticated} />;
}
