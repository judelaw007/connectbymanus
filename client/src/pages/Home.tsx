import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Always show ChatLayout - platform is publicly viewable
  // Authentication state is passed down to control what users can do
  return <ChatLayout isPublicView={!isAuthenticated} />;
}
