import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Hash,
  Lock,
  Plus,
  Send,
  Pin,
  Smile,
  Paperclip,
  AtSign,
  Search,
  Bell,
  LogOut,
  LogIn,
  Menu,
  X,
  Headset,
  ChevronDown,
  ChevronRight,
  Settings
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import CreatePostModal from "@/components/CreatePostModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import SupportInbox from "@/components/SupportInbox";
import UserSupportChat from "@/components/UserSupportChat";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/contexts/SocketContext";
import { useLocation } from "wouter";

interface ChatLayoutProps {
  children?: React.ReactNode;
  isAdminMode?: boolean;
  isPublicView?: boolean; // When true, user is not logged in - show limited features
}

export default function ChatLayout({ children, isAdminMode = false, isPublicView = false }: ChatLayoutProps) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [, setLocation] = useLocation();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [showSupportInbox, setShowSupportInbox] = useState(false);
  const [showUserSupportChat, setShowUserSupportChat] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [topicChannelsExpanded, setTopicChannelsExpanded] = useState(true);
  const [myGroupsExpanded, setMyGroupsExpanded] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { data: publicChannels } = trpc.channels.getPublic.useQuery();
  const { data: myChannels } = trpc.channels.getMy.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: messages } = trpc.messages.getByChannel.useQuery(
    { channelId: selectedChannelId!, limit: 100 },
    { enabled: !!selectedChannelId }
  );
  const { data: pinnedMessages } = trpc.messages.getPinned.useQuery(
    { channelId: selectedChannelId! },
    { enabled: !!selectedChannelId && !!user }
  );
  
  // Fetch posts by type for the categories sidebar
  const { data: articles } = trpc.posts.getByType.useQuery({ postType: 'article', limit: 10 });
  const { data: events } = trpc.posts.getByType.useQuery({ postType: 'event', limit: 10 });
  const { data: announcements } = trpc.posts.getByType.useQuery({ postType: 'announcement', limit: 10 });
  const { data: newsletters } = trpc.posts.getByType.useQuery({ postType: 'newsletter', limit: 10 });

  const sendMessageMutation = trpc.messages.send.useMutation();

  // Scroll to a specific message
  const scrollToMessage = (messageId: number) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement && chatScrollRef.current) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChannelId) return;

    await sendMessageMutation.mutateAsync({
      channelId: selectedChannelId,
      content: messageInput,
    });

    setMessageInput("");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Global markets clock data
  const markets = [
    { city: "Sydney", time: new Date().toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" }) },
    { city: "Tokyo", time: new Date().toLocaleTimeString("en-JP", { timeZone: "Asia/Tokyo", hour: "numeric", minute: "2-digit" }) },
    { city: "London", time: new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "numeric", minute: "2-digit" }) },
    { city: "New York", time: new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }) },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Admin Mode Accent Bar */}
      {isAdminMode && (
        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
      )}
      
      {/* Header */}
      <header className={`bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shadow-md ${
        isAdminMode ? "border-b-2 border-pink-500/30" : ""
      }`}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-xl font-bold">MojiTax Connect</h1>
            {isAdminMode && (
              <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
                ADMIN MODE
              </Badge>
            )}
          </div>

          {/* Global Markets Clock */}
          <div className="hidden md:flex items-center gap-4 ml-8 text-sm">
            {markets.map((market) => (
              <div key={market.city} className="flex flex-col items-center">
                <span className="opacity-80">{market.city}</span>
                <span className="font-semibold">{market.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Search className="h-5 w-5" />
          </Button>
          {user && (
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Bell className="h-5 w-5" />
            </Button>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setLocation("/login")}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Channels */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative z-30 w-64 ${
            isAdminMode 
              ? "bg-gradient-to-b from-[oklch(0.235_0.15_259.815)] to-purple-900/50 border-r-2 border-pink-500/20" 
              : "bg-[oklch(0.235_0.15_259.815)]"
          } text-white flex flex-col transition-transform duration-300`}
        >
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Support Chat - Always at top with special styling */}
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-2">
                <button
                  className="channel-item w-full hover:bg-accent/20"
                  onClick={() => {
                    if (isPublicView) {
                      // For public users: redirect to sign-in
                      setLocation("/login");
                      return;
                    }
                    if (isAdminMode) {
                      // For admin: show support inbox
                      setShowSupportInbox(true);
                      setShowUserSupportChat(false);
                      setSelectedChannelId(null);
                    } else {
                      // For users: show support chat
                      setShowUserSupportChat(true);
                      setShowSupportInbox(false);
                      setSelectedChannelId(null);
                    }
                    setIsSidebarOpen(false);
                  }}
                >
                  <Headset className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">
                    {isAdminMode ? "Support Inbox" : "Chat with Team MojiTax"}
                  </span>
                  {isAdminMode && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5">3</Badge>
                  )}
                </button>
              </div>

              {/* Topic Channels - Collapsible */}
              <div>
                <button
                  onClick={() => setTopicChannelsExpanded(!topicChannelsExpanded)}
                  className="flex items-center justify-between w-full text-xs font-semibold uppercase opacity-60 mb-2 hover:opacity-100 transition-opacity"
                >
                  <span>Topic Channels</span>
                  {topicChannelsExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {topicChannelsExpanded && (
                  <div className="space-y-1">
                    {publicChannels?.map((channel) => (
                      <div key={channel.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => {
                            setSelectedChannelId(channel.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`channel-item flex-1 ${
                            selectedChannelId === channel.id ? "active" : ""
                          }`}
                        >
                          <Hash className="h-4 w-4" />
                          <span className="text-sm">{channel.name}</span>
                        </button>
                        {isAdminMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Open channel management modal
                            }}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Groups - Collapsible */}
              {user && myChannels && myChannels.length > 0 && (
                <div>
                  <button
                    onClick={() => setMyGroupsExpanded(!myGroupsExpanded)}
                    className="flex items-center justify-between w-full text-xs font-semibold uppercase opacity-60 mb-2 hover:opacity-100 transition-opacity"
                  >
                    <span>My Groups</span>
                    {myGroupsExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {myGroupsExpanded && (
                    <div className="space-y-1">
                      {myChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setSelectedChannelId(channel.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`channel-item w-full ${
                            selectedChannelId === channel.id ? "active" : ""
                          }`}
                        >
                          {channel.isPrivate ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                          <span className="text-sm">{channel.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {user && (
            <div className="p-4 border-t border-white/10 space-y-2">
              {(user.role === "admin" || isAdminMode) && (
                <Button 
                  className="w-full" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowCreatePost(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              )}
              <Button 
                className="w-full" 
                variant="secondary" 
                size="sm"
                onClick={() => setShowCreateGroup(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-background">
          {showSupportInbox ? (
            <SupportInbox onClose={() => setShowSupportInbox(false)} />
          ) : showUserSupportChat ? (
            <UserSupportChat onClose={() => setShowUserSupportChat(false)} />
          ) : selectedChannelId ? (
            <>
              <MessageList channelId={selectedChannelId} isPublicView={isPublicView} />
              <MessageInput channelId={selectedChannelId} isPublicView={isPublicView} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div className="max-w-md">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to MojiTax Connect</h2>
                <p className="mb-4">Select a channel to {isPublicView ? "view discussions by" : "start chatting with"} tax professionals</p>
                {isPublicView && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm mb-3">Join the conversation with a MojiTax account</p>
                    <Button
                      onClick={() => setLocation("/login")}
                      className="gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In to Participate
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* OLD CODE REMOVED - Using MessageList and MessageInput components now */}

        {/* Right Sidebar - Context */}
        <aside className="hidden xl:block w-80 bg-muted/30 border-l p-4">
          <ScrollArea className="h-full">
            <div className="space-y-6">
              {/* Online Users */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  Online Users
                  <Badge variant="secondary" className="text-xs">
                    {onlineUsers.length}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {onlineUsers.length > 0 ? (
                    onlineUsers.slice(0, 10).map((userId) => (
                      <div key={userId} className="flex items-center gap-2">
                        <div className="status-online"></div>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">U{userId}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">User #{userId}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No users online</p>
                  )}
                  {onlineUsers.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      +{onlineUsers.length - 10} more online
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-3">Quick Links</h3>
                <div className="space-y-2 text-sm">
                  <a href="#" className="block text-primary hover:underline">
                    Community Guidelines
                  </a>
                  <a href="#" className="block text-primary hover:underline">
                    Tax Resources Library
                  </a>
                  <a href="#" className="block text-primary hover:underline">
                    Webinar Calendar
                  </a>
                  <a href="#" className="block text-primary hover:underline">
                    Membership Info
                  </a>
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-4">
                  {/* Articles */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Articles ({articles?.length || 0})
                    </h4>
                    <div className="space-y-1 text-sm">
                      {articles?.slice(0, 3).map((article) => (
                        <button
                          key={article.id}
                          onClick={() => {
                            if (article.messageId) {
                              setSelectedChannelId(1); // General channel
                              setTimeout(() => scrollToMessage(article.messageId!), 300);
                            }
                          }}
                          className="block w-full text-left hover:text-primary truncate"
                        >
                          {article.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Events ({events?.length || 0})
                    </h4>
                    <div className="space-y-1 text-sm">
                      {events?.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => {
                            if (event.messageId) {
                              setSelectedChannelId(1);
                              setTimeout(() => scrollToMessage(event.messageId!), 300);
                            }
                          }}
                          className="block w-full text-left hover:text-primary truncate"
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Announcements */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Announcements ({announcements?.length || 0})
                    </h4>
                    <div className="space-y-1 text-sm">
                      {announcements?.slice(0, 3).map((announcement) => (
                        <button
                          key={announcement.id}
                          onClick={() => {
                            if (announcement.messageId) {
                              setSelectedChannelId(1);
                              setTimeout(() => scrollToMessage(announcement.messageId!), 300);
                            }
                          }}
                          className="block w-full text-left hover:text-primary truncate"
                        >
                          {announcement.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Newsletters */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Newsletters ({newsletters?.length || 0})
                    </h4>
                    <div className="space-y-1 text-sm">
                      {newsletters?.slice(0, 3).map((newsletter) => (
                        <button
                          key={newsletter.id}
                          onClick={() => {
                            if (newsletter.messageId) {
                              setSelectedChannelId(1);
                              setTimeout(() => scrollToMessage(newsletter.messageId!), 300);
                            }
                          }}
                          className="block w-full text-left hover:text-primary truncate"
                        >
                          {newsletter.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>

      {children}
      
      {/* Modals */}
      <CreatePostModal 
        open={showCreatePost} 
        onOpenChange={setShowCreatePost}
        channelId={selectedChannelId || undefined}
      />
      <CreateGroupModal 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup}
      />
    </div>
  );
}
