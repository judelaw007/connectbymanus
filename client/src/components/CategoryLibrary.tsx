import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PostCard, type PostData } from "@/components/PostCard";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Calendar,
  Megaphone,
  FileText,
  Newspaper,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type PostType = "event" | "announcement" | "article" | "newsletter";

const TYPE_META: Record<
  PostType,
  { icon: typeof Calendar; label: string; plural: string }
> = {
  event: { icon: Calendar, label: "Event", plural: "Events" },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    plural: "Announcements",
  },
  article: { icon: FileText, label: "Article", plural: "Articles" },
  newsletter: { icon: Newspaper, label: "Newsletter", plural: "Newsletters" },
};

interface CategoryLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: PostType;
}

const PAGE_SIZE = 10;

export default function CategoryLibrary({
  open,
  onOpenChange,
  postType,
}: CategoryLibraryProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "pinned">(
    "newest"
  );
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setPage(0);
    }, 300);
  }, []);

  // Reset state when dialog opens or postType changes
  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
      setSortBy("newest");
      setPage(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, postType]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const { data, isLoading, isFetching } = trpc.posts.browse.useQuery(
    {
      postType,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sortBy,
      search: debouncedSearch || undefined,
    },
    { enabled: open }
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const meta = TYPE_META[postType];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {meta.plural}
            {data && (
              <Badge variant="secondary" className="ml-1">
                {data.total}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar: search + sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={`Search ${meta.plural.toLowerCase()}…`}
              className="pl-10"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={v => {
              setSortBy(v as typeof sortBy);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="pinned">Pinned first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.results.length > 0 ? (
            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-3">
                {data.results.map((post: any) => (
                  <PostCard
                    key={post.id}
                    post={
                      {
                        id: post.id,
                        postType: post.postType,
                        title: post.title,
                        content: post.content,
                        eventDate: post.eventDate || null,
                        eventLocation: post.eventLocation || null,
                        tags: post.tags || null,
                        featuredImage: post.featuredImage || null,
                        priorityLevel: post.priorityLevel || null,
                        isPinned: post.isPinned || false,
                        articleAuthor: post.articleAuthor || null,
                      } as PostData
                    }
                    authorName={post.authorName || null}
                    createdAt={new Date(post.createdAt)}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              {debouncedSearch
                ? `No ${meta.plural.toLowerCase()} matching "${debouncedSearch}"`
                : `No ${meta.plural.toLowerCase()} yet`}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
