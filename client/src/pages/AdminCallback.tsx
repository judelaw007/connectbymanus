import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { getAdminSession } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const session = await getAdminSession();
        
        if (session) {
          setLocation("/admin");
        } else {
          setError("Access denied. Only @mojitax.com accounts are allowed.");
        }
      } catch (err: any) {
        console.error("Callback error:", err);
        setError(err.message || "Authentication failed. Please try again.");
      }
    }

    handleCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => setLocation("/auth/admin")}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
        <p className="text-white">Completing sign in...</p>
      </div>
    </div>
  );
}
