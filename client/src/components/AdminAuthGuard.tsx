import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { getAdminSession, onAuthStateChange } from "@/lib/supabase";

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const session = await getAdminSession();
        if (mounted) {
          if (session) {
            setIsAuthenticated(true);
          } else {
            setLocation("/auth/admin");
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (mounted) {
          setLocation("/auth/admin");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    // Listen for auth state changes
    const subscriptionPromise = onAuthStateChange((session) => {
      if (mounted) {
        if (session) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setLocation("/auth/admin");
        }
      }
    });

    return () => {
      mounted = false;
      subscriptionPromise.then((sub) => sub.unsubscribe());
    };
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
