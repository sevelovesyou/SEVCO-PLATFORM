import { useState } from "react";
import { useParams, Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUploadWithFallback } from "@/components/file-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Globe,
  AlertCircle,
  UserCircle2,
  Check,
  Heart,
  MessageCircle,
  MoreVertical,
  Trash2,
  UserPlus,
  UserCheck,
  Settings,
} from "lucide-react";
import { SiDiscord, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import planetIcon from "@assets/SEVCO_planet_icon_black_1774331331137.png";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:     { label: "Admin",     color: "#ef4444" },
  executive: { label: "Executive", color: "#8b5cf6" },
  staff:     { label: "Staff",     color: "#22c55e" },
  partner:   { label: "Partner",   color: "#f97316" },
  client:    { label: "Client",    color: "#eab308" },
  user:      { label: "Member",    color: "#6b7280" },
};

type SocialLinks = {
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  discord?: string | null;
  website?: string | null;
};

type ProfileFormState = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  profileBgColor: string;
  profileAccentColor: string;
  profileBgImageUrl: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  discord: string;
  website: string;
};

type PublicUser = {
  id: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  role: string;
  avatarUrl?: string | null;
  profileBgColor?: string | null;
  profileAccentColor?: string | null;
  profileBgImageUrl?: string | null;
  socialLinks?: SocialLinks | null;
  emailVerified?: boolean;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
};

type PostAuthor = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type PostWithMeta = {
  id: number; authorId: string; content: string; imageUrl: string | null; createdAt: string;
  author: PostAuthor; likeCount: number; replyCount: number; likedByCurrentUser: boolean;
};
type FollowUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

function hexWithFallback(hex: string | null | undefined): string | undefined {
  return hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : undefined;
}

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

function SocialBadge({ href, icon: Icon, label, accentColor }: { href: string; icon: React.ElementType; label: string; accentColor: string }) {
  return (
    <a
      href={href.startsWith("http") ? href : `https://${href}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
      style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44`, color: accentColor }}
      data-testid={`link-social-${label.toLowerCase()}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function FollowListDialog({ username, type, open, onClose }: { username: string; type: "followers" | "following"; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/users/${username}/${type}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}/${type}`);
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="capitalize">{type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))
          ) : (data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            (data ?? []).map((u) => (
              <Link key={u.id} href={`/profile/${u.username}`} onClick={onClose}>
                <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/60 cursor-pointer" data-testid={`follow-user-${u.username}`}>
                  <Avatar className="h-8 w-8">
                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                    <AvatarFallback className="text-xs">{(u.displayName || u.username).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{u.displayName || u.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">@{u.username}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileEditPanel({
  user,
  onSaved,
  onFormChange,
}: {
  user: PublicUser;
  onSaved: (u: PublicUser) => void;
  onFormChange: (f: ProfileFormState) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<ProfileFormState>({
    displayName: user.displayName ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
    profileBgColor: user.profileBgColor ?? "#ffffff",
    profileAccentColor: user.profileAccentColor ?? "#000000",
    profileBgImageUrl: user.profileBgImageUrl ?? "",
    instagram: user.socialLinks?.instagram ?? "",
    twitter: user.socialLinks?.twitter ?? "",
    tiktok: user.socialLinks?.tiktok ?? "",
    discord: user.socialLinks?.discord ?? "",
    website: user.socialLinks?.website ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/profile", {
        displayName: form.displayName || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
        profileBgColor: form.profileBgColor || null,
        profileAccentColor: form.profileAccentColor || null,
        profileBgImageUrl: form.profileBgImageUrl || null,
        socialLinks: {
          instagram: form.instagram || null,
          twitter: form.twitter || null,
          tiktok: form.tiktok || null,
          discord: form.discord || null,
          website: form.website || null,
        },
      }),
    onSuccess: (updated: PublicUser) => {
      toast({ title: "Profile saved!" });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
      qc.invalidateQueries({ queryKey: ["/api/profile", user.username] });
      onSaved(updated);
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  function set(key: keyof ProfileFormState, val: string) {
    setForm((f) => {
      const updated = { ...f, [key]: val };
      onFormChange(updated);
      return updated;
    });
  }

  const accentColor = hexWithFallback(form.profileAccentColor) ?? "#000000";
  const bgColor = hexWithFallback(form.profileBgColor) ?? "#ffffff";

  return (
    <div className="flex flex-col gap-5 py-2">
      <div
        className="h-16 rounded-xl flex items-center gap-3 px-4 border transition-all"
        style={{ background: bgColor, borderColor: `${accentColor}44` }}
      >
        {form.avatarUrl ? (
          <img src={form.avatarUrl} alt="avatar" className="h-9 w-9 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
        ) : (
          <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: `${accentColor}22` }}>
            <UserCircle2 className="h-5 w-5" style={{ color: accentColor }} />
          </div>
        )}
        <div>
          <p className="text-sm font-bold leading-none" style={{ color: accentColor }}>
            {form.displayName || user.username}
          </p>
          <p className="text-xs mt-0.5 opacity-60" style={{ color: accentColor }}>@{user.username}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" value={form.displayName} onChange={(e) => set("displayName", e.target.value)}
            placeholder={user.username} className="mt-1" maxLength={80} data-testid="input-display-name" />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={form.bio} onChange={(e) => set("bio", e.target.value)}
            placeholder="Tell the world about yourself..." className="mt-1 resize-none" rows={3} maxLength={500} data-testid="input-bio" />
          <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
        </div>
        <div>
          <Label>Avatar Image</Label>
          <div className="mt-1">
            <FileUploadWithFallback
              bucket="avatars"
              path={`${user.id}/avatar.{ext}`}
              accept="image/jpeg,image/png,image/webp,image/gif"
              maxSizeMb={5}
              currentUrl={form.avatarUrl}
              onUpload={(url) => set("avatarUrl", url)}
              label="Upload Avatar"
              urlValue={form.avatarUrl}
              onUrlChange={(url) => set("avatarUrl", url)}
              urlPlaceholder="https://example.com/photo.jpg"
              urlTestId="input-avatar-url"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Colors</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bgColor">Background Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input id="bgColor" type="color" value={form.profileBgColor || "#ffffff"}
                onChange={(e) => set("profileBgColor", e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border border-border p-0.5" data-testid="input-bg-color" />
              <Input value={form.profileBgColor} onChange={(e) => set("profileBgColor", e.target.value)}
                placeholder="#ffffff" className="font-mono text-xs" maxLength={9} />
            </div>
          </div>
          <div>
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input id="accentColor" type="color" value={form.profileAccentColor || "#000000"}
                onChange={(e) => set("profileAccentColor", e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border border-border p-0.5" data-testid="input-accent-color" />
              <Input value={form.profileAccentColor} onChange={(e) => set("profileAccentColor", e.target.value)}
                placeholder="#000000" className="font-mono text-xs" maxLength={9} />
            </div>
          </div>
        </div>
        <div>
          <Label>Background Image</Label>
          <div className="mt-1">
            <FileUploadWithFallback
              bucket="banners"
              path={`${user.id}/banner.{ext}`}
              accept="image/jpeg,image/png,image/webp,image/gif"
              maxSizeMb={5}
              currentUrl={form.profileBgImageUrl}
              onUpload={(url) => set("profileBgImageUrl", url)}
              label="Upload Banner"
              urlValue={form.profileBgImageUrl}
              onUrlChange={(url) => set("profileBgImageUrl", url)}
              urlPlaceholder="https://example.com/bg.jpg (optional)"
              urlTestId="input-bg-image-url"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Links</p>
        {[
          { key: "instagram" as const, label: "Instagram", placeholder: "@handle or URL" },
          { key: "twitter"   as const, label: "X / Twitter", placeholder: "@handle or URL" },
          { key: "tiktok"    as const, label: "TikTok", placeholder: "@handle or URL" },
          { key: "discord"   as const, label: "Discord", placeholder: "Server invite URL" },
          { key: "website"   as const, label: "Website", placeholder: "https://yoursite.com" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label htmlFor={`social-${key}`}>{label}</Label>
            <Input id={`social-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder} className="mt-1" data-testid={`input-social-${key}`} />
          </div>
        ))}
      </div>

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full font-semibold gap-2" data-testid="button-save-profile">
        {mutation.isPending ? "Saving..." : (<><Check className="h-4 w-4" /> Save Profile</>)}
      </Button>
    </div>
  );
}

type ArticleSnippet = { id: number; title: string; slug: string; summary: string | null; updatedAt: string };

function PostCard({ post, currentUserId, canDelete, onDelete }: {
  post: PostWithMeta;
  currentUserId?: string;
  canDelete?: boolean;
  onDelete?: (id: number) => void;
}) {
  const { toast } = useToast();
  const [repliesOpen, setRepliesOpen] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () =>
      post.likedByCurrentUser
        ? apiRequest("DELETE", `/api/posts/${post.id}/like`)
        : apiRequest("POST", `/api/posts/${post.id}/like`),
    onSuccess: () => {
      import("@/lib/queryClient").then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: [`/api/users`] });
      });
    },
    onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
  });

  return (
    <Card className="p-4 overflow-visible" data-testid={`card-profile-post-${post.id}`}>
      <div className="flex gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1 -mt-1" aria-label="Post actions">
                    <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete?.(post.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">{post.content}</p>
          {post.imageUrl && (
            <div className="mb-2 rounded-xl overflow-hidden border">
              <img src={post.imageUrl} alt="Post" className="w-full max-h-48 object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-1.5 text-xs transition-colors ${post.likedByCurrentUser ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"} ${!currentUserId ? "opacity-50 cursor-default" : "cursor-pointer"}`}
              onClick={() => currentUserId && likeMutation.mutate()}
              disabled={!currentUserId || likeMutation.isPending}
              data-testid={`button-profile-like-${post.id}`}
            >
              <Heart className={`h-3.5 w-3.5 ${post.likedByCurrentUser ? "fill-current" : ""}`} />
              <span>{post.likeCount}</span>
            </button>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setRepliesOpen((v) => !v)}
              data-testid={`button-profile-reply-${post.id}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.replyCount}</span>
            </button>
          </div>
          {repliesOpen && (
            <div className="mt-3 pt-3 border-t">
              <Link href={`/`}>
                <span className="text-xs text-primary hover:underline cursor-pointer">View on Home →</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProfileView({ profile, isOwnProfile, onEdit, currentUserId }: {
  profile: PublicUser;
  isOwnProfile: boolean;
  onEdit: () => void;
  currentUserId?: string;
}) {
  const bgColor = hexWithFallback(profile.profileBgColor);
  const accentColor = hexWithFallback(profile.profileAccentColor);
  const bgImage = profile.profileBgImageUrl;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "articles">("posts");
  const [deletePostId, setDeletePostId] = useState<number | null>(null);

  const { data: recentArticles } = useQuery<ArticleSnippet[]>({
    queryKey: ["/api/profile", profile.username, "articles"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profile.username}/articles`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: userPosts, isLoading: postsLoading } = useQuery<PostWithMeta[]>({
    queryKey: ["/api/users", profile.username, "posts"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${profile.username}/posts`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const followMutation = useMutation({
    mutationFn: () =>
      profile.isFollowing
        ? apiRequest("DELETE", `/api/users/${profile.username}/follow`)
        : apiRequest("POST", `/api/users/${profile.username}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/profile", profile.username] });
      toast({ title: profile.isFollowing ? "Unfollowed" : "Following!" });
    },
    onError: () => toast({ title: "Failed to update follow", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users", profile.username, "posts"] });
      setDeletePostId(null);
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const roleBadge = ROLE_BADGE[profile.role] ?? ROLE_BADGE.user;
  const displayName = profile.displayName || profile.username;

  const socials: { icon: React.ElementType; href: string; label: string }[] = [];
  const sl = profile.socialLinks;
  if (sl?.instagram) socials.push({ icon: SiInstagram, href: sl.instagram.includes("http") ? sl.instagram : `https://instagram.com/${sl.instagram.replace(/^@/, "")}`, label: "Instagram" });
  if (sl?.twitter)   socials.push({ icon: SiX,          href: sl.twitter.includes("http")   ? sl.twitter   : `https://x.com/${sl.twitter.replace(/^@/, "")}`,         label: "X" });
  if (sl?.tiktok)    socials.push({ icon: SiTiktok,     href: sl.tiktok.includes("http")    ? sl.tiktok    : `https://tiktok.com/@${sl.tiktok.replace(/^@/, "")}`,    label: "TikTok" });
  if (sl?.discord)   socials.push({ icon: SiDiscord,    href: sl.discord,                                                                                              label: "Discord" });
  if (sl?.website)   socials.push({ icon: Globe,        href: sl.website.includes("http") ? sl.website : `https://${sl.website}`,                                     label: "Website" });

  return (
    <div className="min-h-screen relative" style={bgColor ? { backgroundColor: bgColor } : {}}>
      {bgImage && (
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(${bgImage})` }} />
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl border shadow-lg overflow-hidden"
          style={{
            background: bgColor ? `${bgColor}cc` : "var(--background)",
            borderColor: accentColor ? `${accentColor}44` : "var(--border)",
          }}
          data-testid="profile-card"
        >
          <div
            className="h-24 md:h-32 w-full relative overflow-hidden"
            style={bgImage ? {
              backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center",
            } : {
              background: accentColor
                ? `linear-gradient(135deg, ${accentColor}66, ${accentColor}22)`
                : "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))",
            }}
          />

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={displayName}
                    className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border-4 shadow-lg"
                    style={{ borderColor: accentColor || "var(--background)" }}
                    data-testid="img-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-4 shadow-lg flex items-center justify-center"
                    style={{ borderColor: accentColor || "var(--background)", background: accentColor ? `${accentColor}22` : "var(--muted)" }}
                    data-testid="img-avatar-fallback"
                  >
                    <img src={planetIcon} alt="SEVCO" className="h-10 w-10 object-contain opacity-60" style={accentColor ? { filter: `drop-shadow(0 0 4px ${accentColor})` } : {}} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isOwnProfile && currentUserId && (
                  <Button
                    size="sm"
                    variant={profile.isFollowing ? "outline" : "default"}
                    className="gap-1.5 text-xs"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    data-testid="button-follow"
                  >
                    {profile.isFollowing ? (
                      <><UserCheck className="h-3.5 w-3.5" /> Following</>
                    ) : (
                      <><UserPlus className="h-3.5 w-3.5" /> Follow</>
                    )}
                  </Button>
                )}
                {!isOwnProfile && !currentUserId && (
                  <Link href="/auth">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="button-follow-signin">
                      <UserPlus className="h-3.5 w-3.5" /> Follow
                    </Button>
                  </Link>
                )}
                {isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <Link href="/account">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs"
                        style={accentColor ? { color: accentColor, opacity: 0.7 } : {}}
                        data-testid="link-account-settings"
                      >
                        <Settings className="h-3 w-3" />
                        Account
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                      className="gap-1.5 text-xs"
                      style={accentColor ? { borderColor: `${accentColor}66`, color: accentColor } : {}}
                      data-testid="button-edit-profile"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold" style={accentColor ? { color: accentColor } : {}} data-testid="text-display-name">
                  {displayName}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleBadge.color}22`, color: roleBadge.color }} data-testid="badge-role">
                  {roleBadge.label}
                </span>
              </div>
              <p className="text-sm opacity-60 mt-0.5" style={accentColor ? { color: accentColor } : {}} data-testid="text-username">
                @{profile.username}
              </p>
            </div>

            {profile.bio && (
              <p className="text-sm leading-relaxed mb-4 max-w-lg"
                style={accentColor ? { color: accentColor, opacity: 0.85 } : { color: "var(--foreground)" }}
                data-testid="text-bio"
              >
                {profile.bio}
              </p>
            )}

            {/* Follower / following counts */}
            <div className="flex items-center gap-4 mt-2 mb-3">
              <button
                className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity cursor-pointer"
                style={accentColor ? { color: accentColor } : {}}
                onClick={() => setFollowersOpen(true)}
                data-testid="button-followers"
              >
                <span className="font-bold">{profile.followerCount ?? 0}</span>
                <span className="opacity-60 text-xs">Followers</span>
              </button>
              <button
                className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity cursor-pointer"
                style={accentColor ? { color: accentColor } : {}}
                onClick={() => setFollowingOpen(true)}
                data-testid="button-following"
              >
                <span className="font-bold">{profile.followingCount ?? 0}</span>
                <span className="opacity-60 text-xs">Following</span>
              </button>
            </div>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3" data-testid="social-links">
                {socials.map((s) => (
                  <SocialBadge key={s.label} href={s.href} icon={s.icon} label={s.label} accentColor={accentColor || "hsl(var(--primary))"} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border px-5 py-4 text-xs"
          style={{
            background: bgColor ? `${bgColor}88` : "var(--card)",
            borderColor: accentColor ? `${accentColor}33` : "var(--border)",
            color: accentColor ? `${accentColor}99` : "var(--muted-foreground)",
          }}
        >
          <span className="font-medium">SEVCO Platform Member</span>
          {profile.emailVerified && <span className="ml-3 opacity-60">· Verified</span>}
        </div>

        {/* Tabs */}
        <div className="mt-5 flex border-b" style={{ borderColor: accentColor ? `${accentColor}22` : "var(--border)" }}>
          {[
            { id: "posts" as const, label: "Posts" },
            { id: "articles" as const, label: "Wiki Contributions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              style={activeTab === tab.id && accentColor ? { borderColor: accentColor, color: accentColor } : {}}
              data-testid={`tab-profile-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {activeTab === "posts" && (
          <div className="mt-4 space-y-3">
            {postsLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : (userPosts ?? []).length === 0 ? (
              <div
                className="rounded-xl border px-5 py-8 text-center"
                style={{ background: bgColor ? `${bgColor}88` : "var(--card)", borderColor: accentColor ? `${accentColor}33` : "var(--border)" }}
              >
                <p className="text-sm" style={{ color: accentColor ? `${accentColor}88` : "var(--muted-foreground)" }}>
                  No posts yet.
                </p>
              </div>
            ) : (
              (userPosts ?? []).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  canDelete={isOwnProfile}
                  onDelete={(id) => deletePostMutation.mutate(id)}
                />
              ))
            )}
          </div>
        )}

        {/* Articles tab */}
        {activeTab === "articles" && (
          <div className="mt-4">
            {recentArticles && recentArticles.length > 0 ? (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: bgColor ? `${bgColor}88` : "var(--card)", borderColor: accentColor ? `${accentColor}33` : "var(--border)" }}
              >
                <div
                  className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: accentColor ? `${accentColor}22` : "var(--border)", color: accentColor ? `${accentColor}99` : "var(--muted-foreground)" }}
                >
                  Wiki Contributions
                </div>
                <div className="divide-y" style={{ borderColor: accentColor ? `${accentColor}11` : "var(--border)" }}>
                  {recentArticles.map((article) => (
                    <a key={article.id} href={`/wiki/${article.slug}`}
                      className="flex flex-col px-5 py-3 hover:opacity-80 transition-opacity"
                      data-testid={`link-contribution-${article.id}`}
                    >
                      <span className="text-sm font-medium" style={{ color: accentColor || "var(--foreground)" }}>
                        {article.title}
                      </span>
                      {article.summary && (
                        <span className="text-xs mt-0.5 line-clamp-1" style={{ color: accentColor ? `${accentColor}88` : "var(--muted-foreground)" }}>
                          {article.summary}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border px-5 py-8 text-center"
                style={{ background: bgColor ? `${bgColor}88` : "var(--card)", borderColor: accentColor ? `${accentColor}33` : "var(--border)" }}
              >
                <p className="text-sm" style={{ color: accentColor ? `${accentColor}88` : "var(--muted-foreground)" }}>
                  No wiki contributions yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <FollowListDialog username={profile.username} type="followers" open={followersOpen} onClose={() => setFollowersOpen(false)} />
      <FollowListDialog username={profile.username} type="following" open={followingOpen} onClose={() => setFollowingOpen(false)} />
    </div>
  );
}

export default function ProfilePage() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: authUser } = useAuth();
  const [editOpen, setEditOpen] = useState(!paramUsername);
  const [liveForm, setLiveForm] = useState<ProfileFormState | null>(null);

  const resolvedUsername = paramUsername || authUser?.username;

  const { data: profile, isLoading, error } = useQuery<PublicUser>({
    queryKey: ["/api/profile", resolvedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/users/${resolvedUsername}/profile`);
      if (!res.ok) {
        const fallback = await fetch(`/api/profile/${resolvedUsername}`);
        if (!fallback.ok) throw new Error("User not found");
        return fallback.json();
      }
      return res.json();
    },
    enabled: !!resolvedUsername,
  });

  const isOwnProfile = !!authUser && profile?.username === authUser.username;

  if (!resolvedUsername && !authUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <img src={planetIcon} alt="SEVCO" className="h-14 w-14 object-contain mx-auto mb-4 opacity-40 dark:invert" />
          <h2 className="text-lg font-bold mb-2">Sign in to view your profile</h2>
          <p className="text-sm text-muted-foreground mb-5">Create an account or sign in to customize your SEVCO profile.</p>
          <a href="/auth" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity" data-testid="link-sign-in">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">User not found</h2>
          <p className="text-sm text-muted-foreground">No profile exists for @{resolvedUsername}</p>
        </div>
      </div>
    );
  }

  const displayProfile: PublicUser = editOpen && liveForm
    ? {
        ...profile,
        displayName: liveForm.displayName || null,
        bio: liveForm.bio || null,
        avatarUrl: liveForm.avatarUrl || null,
        profileBgColor: liveForm.profileBgColor || null,
        profileAccentColor: liveForm.profileAccentColor || null,
        profileBgImageUrl: liveForm.profileBgImageUrl || null,
        socialLinks: {
          instagram: liveForm.instagram || null,
          twitter: liveForm.twitter || null,
          tiktok: liveForm.tiktok || null,
          discord: liveForm.discord || null,
          website: liveForm.website || null,
        },
      }
    : profile;

  const displayName = profile.displayName || profile.username;

  return (
    <>
      <PageHead
        title={`${displayName} (@${profile.username}) — SEVCO`}
        description={profile.bio || `View ${displayName}'s profile on SEVCO.`}
        ogImage={profile.avatarUrl || undefined}
        ogType="profile"
        ogUrl={`https://sevco.us/profile/${profile.username}`}
      />
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <ProfileEditPanel
            user={profile}
            onSaved={() => { setEditOpen(false); setLiveForm(null); }}
            onFormChange={setLiveForm}
          />
        </SheetContent>
      </Sheet>

      <ProfileView
        profile={displayProfile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditOpen(true)}
        currentUserId={authUser?.id}
      />
    </>
  );
}
