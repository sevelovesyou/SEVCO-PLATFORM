import { useState } from "react";
import { PageHead } from "@/components/page-head";
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
  Heart,
  MessageCircle,
  Send,
  Lock,
  BookOpen,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { insertFeedPostSchema, insertPostSchema } from "@shared/schema";
import type { FeedPost, FeedPostType } from "@shared/schema";
import { Link } from "wouter";
import { WikifyDialog } from "@/components/wikify-dialog";

type FeedPostWithAuthor = FeedPost & {
  author: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};

type PostAuthor = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type PostWithMeta = {
  id: number; authorId: string; content: string; imageUrl: string | null; createdAt: string;
  author: PostAuthor; likeCount: number; replyCount: number; likedByCurrentUser: boolean;
};
type ReplyWithAuthor = {
  id: number; postId: number; authorId: string; content: string; createdAt: string;
  author: PostAuthor;
};

const TYPE_META: Record<FeedPostType, { label: string; color: string; icon: React.ElementType }> = {
  update:    { label: "Update",    color: "text-blue-500 bg-blue-500/10",     icon: Info },
  release:   { label: "Release",   color: "text-primary bg-primary/10",       icon: Zap },
  milestone: { label: "Milestone", color: "text-purple-500 bg-purple-500/10", icon: Flag },
  media:     { label: "Media",     color: "text-orange-500 bg-orange-500/10", icon: ImageIcon },
  event:     { label: "Event",     color: "text-green-500 bg-green-500/10",   icon: CalendarDays },
};

const feedFormSchema = insertFeedPostSchema.extend({
  content: z.string().min(1, "Post content is required").max(1000),
  linkUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
  linkLabel: z.string().max(60).optional().or(z.literal("")).or(z.null()),
  mediaUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
});
type FeedFormValues = z.infer<typeof feedFormSchema>;

const postFormSchema = insertPostSchema.extend({
  content: z.string().min(1, "Write something first").max(500),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.null()),
});
type PostFormValues = z.infer<typeof postFormSchema>;

const replyFormSchema = z.object({ content: z.string().min(1).max(500) });
type ReplyFormValues = z.infer<typeof replyFormSchema>;

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

function AvatarIcon({ user, size = "sm" }: { user: { username?: string; displayName?: string | null; avatarUrl?: string | null } | null; size?: "sm" | "md" }) {
  const name = user?.displayName || user?.username || "?";
  const initials = name.charAt(0).toUpperCase();
  const sz = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <Avatar className={`${sz} shrink-0`}>
      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
    </Avatar>
  );
}

function ReplyThread({ postId, onClose }: { postId: number; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm<ReplyFormValues>({ resolver: zodResolver(replyFormSchema), defaultValues: { content: "" } });

  const { data: replies, isLoading } = useQuery<ReplyWithAuthor[]>({
    queryKey: ["/api/posts", postId, "replies"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/replies`);
      return res.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: (data: ReplyFormValues) => apiRequest("POST", `/api/posts/${postId}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "replies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      form.reset();
      toast({ title: "Reply posted" });
    },
    onError: () => toast({ title: "Failed to post reply", variant: "destructive" }),
  });

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <div className="space-y-2.5">
          {(replies ?? []).map((reply) => (
            <div key={reply.id} className="flex gap-2.5" data-testid={`reply-${reply.id}`}>
              <AvatarIcon user={reply.author} />
              <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2">
                <Link href={`/profile/${reply.author.username}`}>
                  <span className="text-xs font-semibold hover:underline cursor-pointer">
                    {reply.author.displayName || reply.author.username}
                  </span>
                </Link>
                <span className="text-[10px] text-muted-foreground ml-2">{formatRelativeTime(reply.createdAt)}</span>
                <p className="text-xs leading-relaxed mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
          {replies?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No replies yet — be the first!</p>
          )}
        </div>
      )}

      {user ? (
        <form onSubmit={form.handleSubmit((d) => replyMutation.mutate(d))} className="flex gap-2">
          <AvatarIcon user={user} />
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Write a reply..."
              className="h-8 text-sm flex-1"
              data-testid={`input-reply-${postId}`}
              {...form.register("content")}
            />
            <Button type="submit" size="sm" className="h-8 w-8 p-0 shrink-0" disabled={replyMutation.isPending} data-testid={`button-reply-submit-${postId}`}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          <Link href="/auth" className="underline">Sign in</Link> to reply
        </p>
      )}
    </div>
  );
}

function SocialPostCard({
  post,
  currentUserId,
  isAdmin,
  isStaffPlus,
  onDelete,
}: {
  post: PostWithMeta;
  currentUserId?: string;
  isAdmin?: boolean;
  isStaffPlus?: boolean;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [wikifyOpen, setWikifyOpen] = useState(false);
  const isOwner = currentUserId === post.authorId;
  const canDelete = isOwner || isAdmin;
  const authorName = post.author.displayName || post.author.username;

  const likeMutation = useMutation({
    mutationFn: () =>
      post.likedByCurrentUser
        ? apiRequest("DELETE", `/api/posts/${post.id}/like`)
        : apiRequest("POST", `/api/posts/${post.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
    onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
  });

  return (
    <>
    <Card className="p-4 overflow-visible transition-shadow hover:shadow-sm" data-testid={`card-post-${post.id}`}>
      <div className="flex gap-3">
        <Link href={`/profile/${post.author.username}`}>
          <AvatarIcon user={post.author} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <Link href={`/profile/${post.author.username}`}>
                <span className="text-sm font-semibold hover:underline cursor-pointer" data-testid={`text-post-author-${post.id}`}>
                  {authorName}
                </span>
              </Link>
              <span className="text-xs text-muted-foreground">@{post.author.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1" data-testid={`button-post-menu-${post.id}`} aria-label="Post actions">
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(post.id)}
                    data-testid={`button-post-delete-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2" data-testid={`text-post-content-${post.id}`}>
            {post.content}
          </p>

          {post.imageUrl && (
            <div className="mt-2 mb-3 rounded-xl overflow-hidden border">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full max-h-72 object-cover"
                data-testid={`img-post-${post.id}`}
              />
            </div>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                post.likedByCurrentUser
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-rose-500"
              } ${!currentUserId ? "opacity-50 cursor-default" : "cursor-pointer"}`}
              onClick={() => currentUserId && likeMutation.mutate()}
              disabled={!currentUserId || likeMutation.isPending}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`h-4 w-4 ${post.likedByCurrentUser ? "fill-current" : ""}`} />
              <span data-testid={`text-like-count-${post.id}`}>{post.likeCount}</span>
            </button>

            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setRepliesOpen((v) => !v)}
              data-testid={`button-reply-${post.id}`}
            >
              <MessageCircle className="h-4 w-4" />
              <span data-testid={`text-reply-count-${post.id}`}>{post.replyCount}</span>
            </button>

            {isStaffPlus && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setWikifyOpen(true)}
                      data-testid={`button-wikify-post-${post.id}`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Wikify 💫</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {repliesOpen && (
            <ReplyThread postId={post.id} onClose={() => setRepliesOpen(false)} />
          )}
        </div>
      </div>
    </Card>
    <WikifyDialog
      open={wikifyOpen}
      onClose={() => setWikifyOpen(false)}
      postTitle={`Post by ${authorName}`}
      postContent={post.content}
      postContext={`${authorName} · ${formatRelativeTime(post.createdAt)}`}
    />
    </>
  );
}

function AdminFeedCard({
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
    <Card className={`p-4 overflow-visible transition-shadow hover:shadow-sm border-l-2 border-l-primary/30 ${post.pinned ? "border-primary/30 bg-primary/[0.02]" : ""}`} data-testid={`card-feed-${post.id}`}>
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {post.author?.avatarUrl && <AvatarImage src={post.author.avatarUrl} />}
          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
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
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1" data-testid={`button-feed-menu-${post.id}`} aria-label="Post management actions">
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
              <img src={post.mediaUrl} alt="Feed media" className="w-full max-h-72 object-cover" loading="lazy" data-testid={`img-feed-media-${post.id}`} />
            </div>
          )}
          {post.linkUrl && (
            <a href={post.linkUrl} target="_blank" rel="noopener noreferrer"
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
  const { isAdmin, isExecutive, role } = usePermission();
  const { toast } = useToast();
  const canManageFeed = isAdmin || isExecutive;
  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";
  const [adminComposerOpen, setAdminComposerOpen] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [deleteFeedId, setDeleteFeedId] = useState<number | null>(null);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "official">("timeline");

  const { data: feedPosts, isLoading: feedLoading } = useQuery<FeedPostWithAuthor[]>({
    queryKey: ["/api/feed"],
  });

  const { data: socialPosts, isLoading: postsLoading } = useQuery<PostWithMeta[]>({
    queryKey: ["/api/posts"],
    enabled: !!user,
  });

  const adminForm = useForm<FeedFormValues>({
    resolver: zodResolver(feedFormSchema),
    defaultValues: { type: "update", content: "", mediaUrl: "", linkUrl: "", linkLabel: "", pinned: false },
  });

  const postForm = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { content: "", imageUrl: "" },
  });

  const createFeedMutation = useMutation({
    mutationFn: (data: FeedFormValues) => apiRequest("POST", "/api/feed", {
      ...data,
      mediaUrl: data.mediaUrl || null,
      linkUrl: data.linkUrl || null,
      linkLabel: data.linkLabel || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      adminForm.reset();
      setAdminComposerOpen(false);
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish post", variant: "destructive" }),
  });

  const deleteFeedMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/feed/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/feed"] }); toast({ title: "Post deleted" }); },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => apiRequest("PATCH", `/api/feed/${id}`, { pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] }),
    onError: () => toast({ title: "Failed to update pin", variant: "destructive" }),
  });

  const createPostMutation = useMutation({
    mutationFn: (data: PostFormValues) => apiRequest("POST", "/api/posts", {
      ...data,
      imageUrl: data.imageUrl || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      postForm.reset();
      setPostComposerOpen(false);
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/posts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/posts"] }); toast({ title: "Post deleted" }); },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const tabs = [
    { id: "timeline" as const, label: "Timeline" },
    { id: "official" as const, label: "Official" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <PageHead
        title="Feed — SEVCO Community"
        description="Stay up to date with the latest posts and updates from the SEVCO community and official channels."
        ogUrl="https://sevco.us/feed"
        noIndex={true}
      />
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rss className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-feed-title">Feed</h1>
              <p className="text-sm text-muted-foreground">Posts from people you follow</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManageFeed && activeTab === "official" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0 text-xs"
                onClick={() => setAdminComposerOpen((v) => !v)}
                data-testid="button-feed-compose"
              >
                {adminComposerOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Official Post
              </Button>
            )}
            {user && activeTab === "timeline" && (
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setPostComposerOpen((v) => !v)}
                data-testid="button-post-compose"
              >
                {postComposerOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Post
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPostComposerOpen(false); setAdminComposerOpen(false); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-feed-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline tab — social posts */}
      {activeTab === "timeline" && (
        <>
          {!user && (
            <Card className="p-6 mb-5 text-center border-dashed">
              <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium mb-1">Sign in to see your timeline</p>
              <p className="text-xs text-muted-foreground mb-3">Posts from people you follow will appear here</p>
              <Link href="/auth">
                <Button size="sm" data-testid="button-feed-signin">Sign in</Button>
              </Link>
            </Card>
          )}

          {user && postComposerOpen && (
            <Card className="p-4 mb-5 overflow-visible">
              <Form {...postForm}>
                <form onSubmit={postForm.handleSubmit((d) => createPostMutation.mutate(d))} className="flex flex-col gap-3">
                  <div className="flex gap-2.5">
                    <AvatarIcon user={user} size="md" />
                    <FormField
                      control={postForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Textarea
                              placeholder="What's on your mind?"
                              className="text-sm resize-none min-h-[80px] border-0 shadow-none focus-visible:ring-0 p-0"
                              maxLength={500}
                              data-testid="input-post-content"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-[10px] text-muted-foreground">{field.value?.length ?? 0}/500</p>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={postForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Image URL (optional)"
                            className="h-8 text-sm"
                            data-testid="input-post-image-url"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Button type="submit" size="sm" className="h-8 text-xs" disabled={createPostMutation.isPending} data-testid="button-post-submit">
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { postForm.reset(); setPostComposerOpen(false); }} data-testid="button-post-cancel">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          )}

          {postsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
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
          ) : user && (socialPosts ?? []).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">No posts yet</p>
              <p className="text-xs">{canManageFeed ? "Be the first to post in the timeline." : "Follow other members to see their posts here, or write your first post above."}</p>
            </div>
          ) : !user && (socialPosts ?? []).length === 0 ? null : (
            <div className="flex flex-col gap-3">
              {(socialPosts ?? []).map((post) => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  isAdmin={canManageFeed}
                  isStaffPlus={isStaffPlus}
                  onDelete={(id) => setDeletePostId(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Official tab — admin broadcast feed */}
      {activeTab === "official" && (
        <>
          {canManageFeed && adminComposerOpen && (
            <Card className="p-4 mb-5 overflow-visible">
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit((data) => createFeedMutation.mutate(data))} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                      <AvatarFallback className="text-xs">{(user?.displayName || user?.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField
                      control={adminForm.control}
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
                                <SelectItem key={val} value={val}>{meta.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={adminForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea placeholder="What's happening at SEVCO?" className="text-sm resize-none min-h-[80px]" data-testid="input-feed-content" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={adminForm.control}
                      name="linkUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Link URL (optional)" className="h-8 text-sm" data-testid="input-feed-link-url" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={adminForm.control}
                      name="linkLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Link label (optional)" className="h-8 text-sm" data-testid="input-feed-link-label" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={adminForm.control}
                    name="mediaUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Image URL (optional)" className="h-8 text-sm" data-testid="input-feed-media-url" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" className="h-8 text-xs" disabled={createFeedMutation.isPending} data-testid="button-feed-submit">
                      {createFeedMutation.isPending ? "Publishing..." : "Publish"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { adminForm.reset(); setAdminComposerOpen(false); }} data-testid="button-feed-cancel">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          )}

          {feedLoading ? (
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
          ) : (feedPosts ?? []).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Rss className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No official posts yet. Check back soon.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(feedPosts ?? []).map((post) => (
                <AdminFeedCard
                  key={post.id}
                  post={post}
                  canManage={canManageFeed}
                  onDelete={(id) => setDeleteFeedId(id)}
                  onTogglePin={(id, pinned) => pinMutation.mutate({ id, pinned })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirm — admin feed */}
      <AlertDialog open={deleteFeedId !== null} onOpenChange={() => setDeleteFeedId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteFeedId !== null) { deleteFeedMutation.mutate(deleteFeedId); setDeleteFeedId(null); } }}
              data-testid="button-feed-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm — social post */}
      <AlertDialog open={deletePostId !== null} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deletePostId !== null) { deletePostMutation.mutate(deletePostId); setDeletePostId(null); } }}
              data-testid="button-post-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
