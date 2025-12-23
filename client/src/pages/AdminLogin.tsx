import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Shield, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { signInAdmin, getAdminSession, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for existing admin session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getAdminSession();
        if (session) {
          setLocation("/admin");
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setIsCheckingSession(false);
      }
    }
    checkSession();
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Authentication service not configured. Please contact support.");
      }

      await signInAdmin(email, password);
      setLocation("/admin");
    } catch (err: any) {
      console.error("Login failed:", err);

      // User-friendly error messages
      if (err.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message?.includes("Admin privileges required")) {
        setError("Access denied. This account does not have admin privileges.");
      } else if (err.message?.includes("not configured")) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
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
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              MojiTax Connect
            </CardTitle>
            <CardDescription className="mt-2">Admin Access</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@mojitax.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
