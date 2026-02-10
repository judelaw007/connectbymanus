import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [, setLocation] = useLocation();

  // Use the server-side auth check which handles both JWT cookie and Supabase sessions
  const {
    data: user,
    isLoading,
    isError,
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !user || user.role !== "admin") {
    setLocation("/auth/admin");
    return null;
  }

  return <>{children}</>;
}
