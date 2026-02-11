import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ArticleView() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);

  const { data: post, isLoading } = trpc.posts.getById.useQuery(
    { id: postId },
    { enabled: postId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!post || post.postType !== "article") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Article not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-2">
              <FileText className="h-4 w-4" />
              Article
            </div>
            <CardTitle className="text-2xl">{post.title}</CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
              {post.authorName && <span>By {post.authorName}</span>}
              <span>{format(new Date(post.createdAt), "MMMM d, yyyy")}</span>
            </div>
            {post.tags && (
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Tag className="h-3.5 w-3.5 text-emerald-500" />
                {post.tags.split(",").map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t pt-4">
            MojiTax Connect &mdash; connect.mojitax.co.uk
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
