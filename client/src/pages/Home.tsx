import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-md w-full mx-4 text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">MojiTax Connect</h1>
            <p className="text-xl text-muted-foreground">
              Where Tax Professionals Connect, Learn & Collaborate
            </p>
          </div>
          
          <div className="bg-card p-8 rounded-lg shadow-lg space-y-4">
            <p className="text-muted-foreground">
              Join thousands of international tax professionals in real-time discussions,
              study groups, and expert-led conversations.
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">✓ Live community chat</p>
              <p className="text-sm font-medium">✓ Private study groups</p>
              <p className="text-sm font-medium">✓ Expert articles & resources</p>
              <p className="text-sm font-medium">✓ AI-powered support with @moji</p>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Sign in with MojiTax Account
            </Button>

            <p className="text-xs text-muted-foreground">
              You need a mojitax.co.uk account to access the platform
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <ChatLayout />;
}
