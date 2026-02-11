import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Megaphone,
  Newspaper,
  FileText,
  Tag,
  AlertTriangle,
  AlertCircle,
  Pin,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface PostData {
  id: number;
  postType: "event" | "announcement" | "article" | "newsletter";
  title: string;
  content: string;
  eventDate: string | null;
  eventLocation: string | null;
  tags: string | null;
  featuredImage: string | null;
  priorityLevel: "low" | "medium" | "high" | "urgent" | null;
  isPinned: boolean;
}

interface PostCardProps {
  post: PostData;
  authorName: string | null;
  createdAt: Date;
}

const postTypeConfig = {
  event: {
    icon: Calendar,
    label: "Event",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  article: {
    icon: FileText,
    label: "Article",
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  newsletter: {
    icon: Newspaper,
    label: "Newsletter",
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-50/50 dark:bg-purple-950/20",
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
};

const priorityConfig = {
  low: { icon: Pin, label: "Low", className: "bg-slate-100 text-slate-700" },
  medium: {
    icon: Megaphone,
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800",
  },
  high: {
    icon: AlertTriangle,
    label: "High",
    className: "bg-orange-100 text-orange-800",
  },
  urgent: {
    icon: AlertCircle,
    label: "Urgent",
    className: "bg-red-100 text-red-800",
  },
};

export function PostCard({ post, authorName, createdAt }: PostCardProps) {
  const config = postTypeConfig[post.postType];
  const Icon = config.icon;

  return (
    <Card
      className={`border-l-4 ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={`${config.badgeClass} border-0 gap-1`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          {post.isPinned && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Pin className="h-3 w-3" />
              Pinned
            </Badge>
          )}
          {post.postType === "announcement" && post.priorityLevel && (
            <PriorityBadge level={post.priorityLevel} />
          )}
        </div>
        <CardTitle className="text-base">{post.title}</CardTitle>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
          {post.content}
        </p>

        {post.postType === "event" && (
          <div className="mt-3 space-y-1.5">
            {post.eventDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>
                  {format(
                    new Date(post.eventDate),
                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                  )}
                </span>
              </div>
            )}
            {post.eventLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>{post.eventLocation}</span>
              </div>
            )}
          </div>
        )}

        {post.postType === "article" && post.tags && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-emerald-500" />
            {post.tags.split(",").map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground">
        {authorName && <span>Posted by {authorName}</span>}
        {authorName && <span className="mx-1.5">&middot;</span>}
        <span>{format(new Date(createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
      </CardFooter>
    </Card>
  );
}

function PriorityBadge({
  level,
}: {
  level: "low" | "medium" | "high" | "urgent";
}) {
  const config = priorityConfig[level];
  const Icon = config.icon;
  return (
    <Badge className={`${config.className} border-0 gap-1 text-xs`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
