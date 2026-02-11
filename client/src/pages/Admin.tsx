import { useState } from "react";
import { Button } from "@/components/ui/button";
import MojiSettings from "@/components/MojiSettings";
import EmailLogs from "@/components/EmailLogs";
import PlatformSettings from "@/components/PlatformSettings";
import UserManagement from "@/components/UserManagement";
import EventInvitees from "@/components/EventInvitees";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Users,
  Hash,
  Shield,
  LogOut,
  Bot,
  Mail,
  BarChart3,
  UserX,
  Settings,
  LayoutDashboard,
  MessagesSquare,
  Save,
  CalendarCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import ChatLayout from "@/components/ChatLayout";
import ChatAnalytics from "@/components/ChatAnalytics";
import { trpc } from "@/lib/trpc";
import { signOutAdmin } from "@/lib/supabase";

type DashboardSection =
  | "overview"
  | "email-logs"
  | "moji-settings"
  | "users"
  | "user-moderation"
  | "platform-settings"
  | "chat-analytics"
  | "event-invitees";

export default function Admin() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"dashboard" | "chat">(
    "dashboard" as "dashboard" | "chat"
  );
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");

  // Auth is now handled by AdminAuthGuard wrapper in App.tsx
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    // Clear JWT session cookie (password login)
    await logoutMutation.mutateAsync();
    // Clear Supabase session (Google OAuth login)
    await signOutAdmin();
    setLocation("/auth/admin");
  };

  const { data: channels } = trpc.channels.getPublic.useQuery();
  const { data: stats } = trpc.settings.dashboardStats.useQuery();
  const { data: unreadCounts } = trpc.channels.getUnreadCounts.useQuery();
  const totalUnread =
    unreadCounts?.reduce((sum, u) => sum + u.unreadCount, 0) ?? 0;

  // If in chat mode, show the regular chat interface with admin privileges
  if (viewMode === "chat") {
    return (
      <div className="h-screen flex flex-col">
        {/* Admin Header with Toggle */}
        <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between shadow-md border-b-4 border-accent">
          <div className="flex items-center gap-4">
            <Shield className="h-5 w-5" />
            <h1 className="text-lg font-bold">Admin Chat Mode</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
              <LayoutDashboard className="h-4 w-4" />
              <Switch
                checked={viewMode === ("chat" as typeof viewMode)}
                onCheckedChange={(checked: boolean) =>
                  setViewMode(checked ? "chat" : "dashboard")
                }
                className="data-[state=checked]:bg-accent"
              />
              <MessagesSquare className="h-4 w-4" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Chat Interface with Admin Privileges */}
        <div className="flex-1 overflow-hidden">
          <ChatLayout isAdminMode={true} />
        </div>
      </div>
    );
  }

  // Dashboard Mode - Render different content based on active section
  const renderDashboardContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalUsers ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MojiTax customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Channels
                  </CardTitle>
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {channels?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Public channels
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Messages Today
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.messagesToday ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all channels
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Emails Sent
                  </CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.emailsSentThisWeek ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Switch to Chat Mode to post and manage channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    variant="outline"
                    className={`justify-start relative ${totalUnread > 0 ? "border-red-500 text-red-600 hover:text-red-700 hover:border-red-600" : ""}`}
                    onClick={() => setViewMode("chat")}
                  >
                    <MessagesSquare className="h-4 w-4 mr-2" />
                    Go to Chat Mode
                    {totalUnread > 0 && (
                      <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                        {totalUnread}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setActiveSection("moji-settings")}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Configure Moji
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setActiveSection("email-logs")}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    View Email Logs
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setActiveSection("user-moderation")}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Moderate Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "users":
        return <UserManagement />;

      case "email-logs":
        return <EmailLogs />;

      case "moji-settings":
        return <MojiSettings />;

      case "chat-analytics":
        return <ChatAnalytics />;

      case "user-moderation":
        return <UserManagement moderationMode={true} />;

      case "platform-settings":
        return <PlatformSettings />;

      case "event-invitees":
        return <EventInvitees />;

      default:
        return null;
    }
  };

  // Dashboard Mode
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Admin Header with Toggle */}
      <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between shadow-md border-b-4 border-accent">
        <div className="flex items-center gap-4">
          <Shield className="h-5 w-5" />
          <h1 className="text-lg font-bold">Admin Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
            <LayoutDashboard className="h-4 w-4" />
            <Switch
              checked={viewMode === ("chat" as typeof viewMode)}
              onCheckedChange={(checked: boolean) =>
                setViewMode(checked ? "chat" : "dashboard")
              }
              className="data-[state=checked]:bg-accent"
            />
            <MessagesSquare className="h-4 w-4" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-muted border-r flex flex-col">
          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant={activeSection === "overview" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("overview")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeSection === "users" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("users")}
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button
              variant={activeSection === "email-logs" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("email-logs")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Logs
            </Button>
            <Button
              variant={
                activeSection === "moji-settings" ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              onClick={() => setActiveSection("moji-settings")}
            >
              <Bot className="h-4 w-4 mr-2" />
              Moji Settings
            </Button>
            <Button
              variant={
                activeSection === "chat-analytics" ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              onClick={() => setActiveSection("chat-analytics")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Chat Analytics
            </Button>
            <Button
              variant={
                activeSection === "user-moderation" ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              onClick={() => setActiveSection("user-moderation")}
            >
              <UserX className="h-4 w-4 mr-2" />
              User Moderation
            </Button>
            <Button
              variant={
                activeSection === "platform-settings" ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              onClick={() => setActiveSection("platform-settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Platform Settings
            </Button>
            <Button
              variant={
                activeSection === "event-invitees" ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              onClick={() => setActiveSection("event-invitees")}
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              Event Invitees
            </Button>
          </nav>

          <div className="p-4 border-t bg-muted-foreground/5">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Switch to Chat Mode to:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Post announcements & events</li>
              <li>• Manage channels</li>
              <li>• Respond to support tickets</li>
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{renderDashboardContent()}</div>
        </main>
      </div>
    </div>
  );
}
