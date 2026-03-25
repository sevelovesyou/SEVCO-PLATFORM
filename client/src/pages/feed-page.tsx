import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Rss,
  Zap,
  Flag,
  ImageIcon,
  CalendarDays,
  Info,
  MoreVertical,
  Pin,
  Trash2,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { insertFeedPostSchema } from "@shared/schema";
import type { FeedPost, FeedPostType } from "@shared/schema";
import { Link } from "wouter";

type FeedPostWithAuthor = FeedPost & {
  author: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};

const TYPE_META: Record<FeedPostType, { label: string; color: string; icon: React.ElementType }> = {
  update:    { label: "Update",    color: "text-blue-500 bg-blue-500/10",   icon: Info },
  release:   { label: "Release",   color: "text-primary bg-primary/10",     icon: Zap },
  milestone: { label: "Milestone", color: "text-purple-500 bg-purple-500/10", icon: Flag },
  media:     { label: "Media",     color: "text-orange-500 bg-orange-500/10", icon: ImageIcon },
  event:     { label: "Event",     color: "text-green-500 bg-green-500/10",  icon: CalendarDays },
};

const feedFormSchema = insertFeedPostSchema.extend({
  content: z.string().min(1, "Post content is required").max(1000),
  linkUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
  linkLabel: z.string().max(60).optional().or(z.literal("")).or(z.null()),
  mediaUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
});
type FeedFormValues = z.infer<typeof feedFormSchema>;

function formatRelativeTime(dateStr: string | Date) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });
}

function FeedCard({
  post,
  canManage,
  onDelete,
  onTogglePin,
}: {
  post: FeedPostWithAuthor;
  canManage: boolean;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
}) {
  const meta = TYPE_META[post.type as FeedPostType] ?? TYPE_META.update;
  const IconComp = meta.icon;
  const authorName = post.author?.displayName || post.author?.username || "SEVCO";
  const initials = authorName.charAt(0).toUpperCase();

  return (
    <Card className={`p-4 overflow-visible transition-shadow hover:shadow-sm ${post.pinned ? "border-primary/30 bg-primary/[0.02]" : ""}`} data-testid={`card-feed-${post.id}`}>
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {post.author?.avatarUrl && <AvatarImage src={post.author.avatarUrl} />}
          <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-sm font-semibold leading-none" data-testid={`text-feed-author-${post.id}`}>{authorName}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>
                <IconComp className="h-2.5 w-2.5" />
                {meta.label}
              </span>
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-primary bg-primary/10">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
            </div>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1" data-testid={`button-feed-menu-${post.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTogglePin(post.id, !post.pinned)} data-testid={`button-feed-pin-${post.id}`}>
                    <Pin className="h-4 w-4 mr-2" />
                    {post.pinned ? "Unpin" : "Pin to top"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(post.id)}
                    data-testid={`button-feed-delete-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2" data-testid={`text-feed-content-${post.id}`}>
            {post.content}
          </p>

          {post.mediaUrl && (
            <div className="mt-2 mb-2 rounded-md overflow-hidden border">
              <img
                src={post.mediaUrl}
                alt="Feed media"
                className="w-full max-h-72 object-cover"
                data-testid={`img-feed-media-${post.id}`}
              />
            </div>
          )}

          {post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
              data-testid={`link-feed-external-${post.id}`}
            >
              <ExternalLink className="h-3 w-3" />
              {post.linkLabel || post.linkUrl}
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const { isAdmin, isExecutive } = usePermission();
  const { toast } = useToast();
  const canManage = isAdmin || isExecutive;
  const [composerOpen, setComposerOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: posts, isLoading } = useQuery<FeedPostWithAuthor[]>({
    queryKey: ["/api/feed"],
  });

  const form = useForm<FeedFormValues>({
    resolver: zodResolver(feedFormSchema),
    defaultValues: {
      type: "update",
      content: "",
      mediaUrl: "",
      linkUrl: "",
      linkLabel: "",
      pinned: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FeedFormValues) => apiRequest("POST", "/api/feed", {
      ...data,
      mediaUrl: data.mediaUrl || null,
      linkUrl: data.linkUrl || null,
      linkLabel: data.linkLabel || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      form.reset();
      setComposerOpen(false);
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish post", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/feed/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      apiRequest("PATCH", `/api/feed/${id}`, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: () => toast({ title: "Failed to update pin", variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rss className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-feed-title">SEVCO Feed</h1>
              <p className="text-sm text-muted-foreground">Updates, releases, and news from the team</p>
            </div>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setComposerOpen((v) => !v)}
              data-testid="button-feed-compose"
            >
              {composerOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Post
            </Button>
          )}
        </div>
      </div>

      {canManage && composerOpen && (
        <Card className="p-4 mb-6 overflow-visible">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback className="text-xs">{(user?.displayName || user?.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm w-40" data-testid="select-feed-type">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TYPE_META).map(([val, meta]) => (
                            <SelectItem key={val} value={val}>
                              {meta.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="What's happening at SEVCO?"
                        className="text-sm resize-none min-h-[80px]"
                        data-testid="input-feed-content"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Link URL (optional)"
                          className="h-8 text-sm"
                          data-testid="input-feed-link-url"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Link label (optional)"
                          className="h-8 text-sm"
                          data-testid="input-feed-link-label"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Image URL (optional)"
                        className="h-8 text-sm"
                        data-testid="input-feed-media-url"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={createMutation.isPending}
                  data-testid="button-feed-submit"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { form.reset(); setComposerOpen(false); }}
                  data-testid="button-feed-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <div className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts && posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Rss className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts yet. Check back soon.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(posts ?? []).map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              canManage={canManage}
              onDelete={(id) => setDeleteId(id)}
              onTogglePin={(id, pinned) => pinMutation.mutate({ id, pinned })}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId !== null) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
              data-testid="button-feed-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
