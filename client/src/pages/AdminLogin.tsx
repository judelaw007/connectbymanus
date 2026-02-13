import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { signInWithGoogle, isSupabaseConfigured } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Check if already logged in as admin via JWT cookie
  const { data: currentUser, isLoading: isCheckingSession } =
    trpc.auth.me.useQuery(undefined, {
      retry: false,
    });

  // Redirect if already an admin
  if (currentUser?.role === "admin") {
    setLocation("/admin");
  }

  const adminLoginMutation = trpc.auth.adminLogin.useMutation({
    onSuccess: () => {
      setLocation("/admin");
    },
    onError: err => {
      setError(err.message);
    },
  });

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }
    adminLoginMutation.mutate({ password });
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Google authentication not configured. Use password login."
        );
      }
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Sign in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img
              src="/mojitax-logo.svg"
              alt="MojiTax"
              className="h-24 w-auto mx-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">MojiTax Connect</CardTitle>
            <CardDescription className="mt-2">Admin Access</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Password Login Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={adminLoginMutation.isPending}
            >
              {adminLoginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          {isSupabaseConfigured() && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google OAuth (secondary) */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full"
                size="lg"
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Google login restricted to @mojitax.com accounts.
              </p>
            </>
          )}

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setLocation("/")}
              className="text-sm"
            >
              Back to Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
