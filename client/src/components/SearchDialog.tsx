import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Search,
  MessageSquare,
  FileText,
  Calendar,
  Megaphone,
  BookOpen,
  Newspaper,
  Hash,
  Loader2,
} from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToMessage?: (channelId: number, messageId: number) => void;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {match}
      </mark>
      {after}
    </>
  );
}

function truncateContent(content: string, maxLen = 120) {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + "…";
}

const POST_TYPE_META: Record<
  string,
  { icon: typeof Calendar; color: string; label: string }
> = {
  event: { icon: Calendar, color: "text-blue-500", label: "Event" },
  announcement: {
    icon: Megaphone,
    color: "text-amber-500",
    label: "Announcement",
  },
  article: { icon: BookOpen, color: "text-green-500", label: "Article" },
  newsletter: {
    icon: Newspaper,
    color: "text-purple-500",
    label: "Newsletter",
  },
};

export default function SearchDialog({
  open,
  onOpenChange,
  onNavigateToMessage,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const shouldSearch = debouncedQuery.length >= 2;

  const {
    data: messageResults,
    isLoading: messagesLoading,
    isFetching: messagesFetching,
  } = trpc.search.messages.useQuery(
    { query: debouncedQuery, limit: 30 },
    { enabled: shouldSearch && activeTab === "messages" }
  );

  const {
    data: postResults,
    isLoading: postsLoading,
    isFetching: postsFetching,
  } = trpc.search.posts.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: shouldSearch && activeTab === "posts" }
  );

  const isLoading =
    (activeTab === "messages" && (messagesLoading || messagesFetching)) ||
    (activeTab === "posts" && (postsLoading || postsFetching));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search messages and posts…"
            className="pl-10"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="messages" className="flex-1 gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Messages
              {messageResults && shouldSearch && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {messageResults.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 gap-1.5">
              <FileText className="h-4 w-4" />
              Posts
              {postResults && shouldSearch && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {postResults.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-2">
            {!shouldSearch ? (
              <div className="text-center text-muted-foreground py-12">
                Type at least 2 characters to search
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="messages" className="mt-0 h-full">
                  <ScrollArea className="h-[400px]">
                    {messageResults && messageResults.results.length > 0 ? (
                      <div className="space-y-1 pr-3">
                        {messageResults.results.map((msg: any) => (
                          <button
                            key={msg.id}
                            className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                            onClick={() => {
                              onNavigateToMessage?.(msg.channelId, msg.id);
                              onOpenChange(false);
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {msg.userName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <Hash className="h-3 w-3" />
                                {msg.channelName}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(msg.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {highlightMatch(
                                truncateContent(msg.content),
                                debouncedQuery
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        No messages found
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="posts" className="mt-0 h-full">
                  <ScrollArea className="h-[400px]">
                    {postResults && postResults.results.length > 0 ? (
                      <div className="space-y-1 pr-3">
                        {postResults.results.map((post: any) => {
                          const meta = POST_TYPE_META[post.postType] || {
                            icon: FileText,
                            color: "text-gray-500",
                            label: post.postType,
                          };
                          const Icon = meta.icon;
                          return (
                            <div
                              key={post.id}
                              className="p-3 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className={`h-4 w-4 ${meta.color}`} />
                                <Badge variant="outline" className="text-xs">
                                  {meta.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(
                                    post.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-medium text-sm mb-0.5">
                                {highlightMatch(post.title, debouncedQuery)}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {highlightMatch(
                                  truncateContent(post.content, 150),
                                  debouncedQuery
                                )}
                              </p>
                              {post.authorName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  by {post.authorName}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        No posts found
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
