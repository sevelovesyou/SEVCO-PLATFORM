import { useEffect, useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { articleUrl } from "@/lib/wiki-urls";
import { useParams, useLocation, useSearch, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useMusicPlayer } from "@/contexts/music-player-context";
import type { MusicTrack, Album } from "@shared/schema";
import { SparkButton } from "@/components/spark-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Pencil,
  Globe,
  AlertCircle,
  UserCircle2,
  Check,
  MessageCircle,
  MoreVertical,
  Trash2,
  UserPlus,
  UserCheck,
  Settings,
  Zap,
  Lock,
  Star,
  Music,
  Disc,
  Play,
  BarChart2,
  Repeat2,
} from "lucide-react";
import { SiDiscord, SiInstagram, SiX, SiTiktok } from "react-icons/si";
import { SevcoLogo } from "@/components/sevco-logo";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:     { label: "Admin",     color: "#ef4444" },
  executive: { label: "Executive", color: "#0037ff" },
  staff:     { label: "Staff",     color: "#22c55e" },
  partner:   { label: "Partner",   color: "#BE0000" },
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

type FeaturedType = "project" | "product" | "wiki" | "post" | "playlist";
type LayoutType = "default" | "compact" | "wide";
type FontType = "default" | "serif" | "mono" | "handwritten";

type ProfileFormState = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  profileBgColor: string;
  profileAccentColor: string;
  profileBgImageUrl: string;
  bannerUrl: string;
  profileBgOpacity: number;
  instagram: string;
  twitter: string;
  tiktok: string;
  discord: string;
  website: string;
  profileStatus: string;
  profileFeaturedType: FeaturedType | "";
  profileFeaturedId: string;
  profileLayout: LayoutType;
  profileFont: FontType;
  profilePronouns: string;
  profileAccentGradient: boolean;
  profileShowFollowers: boolean;
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
  bannerUrl?: string | null;
  profileBgOpacity?: number | null;
  profileStatus?: string | null;
  profileFeaturedType?: string | null;
  profileFeaturedId?: string | null;
  profileLayout?: string | null;
  profileFont?: string | null;
  profilePronouns?: string | null;
  profileAccentGradient?: boolean | null;
  profileShowFollowers?: boolean | null;
  linkedArtistId?: number | null;
};

type ProfileTrack = MusicTrack & { sparkCount?: number; sparkedByCurrentUser?: boolean };

type PostAuthor = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type OriginalPostInfo = { id: number; content: string; imageUrl: string | null; author: PostAuthor };
type PostWithMeta = {
  id: number; authorId: string; content: string; imageUrl: string | null; createdAt: string; repostOf?: number | null;
  author: PostAuthor; replyCount: number; repostedByCurrentUser?: boolean;
  sparkCount?: number; isSparkedByMe?: boolean;
  originalPost?: OriginalPostInfo | null;
};
type FollowUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

function hexWithFallback(hex: string | null | undefined): string | undefined {
  return hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : undefined;
}

function hexToHsl(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function buildAccentGradient(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return `linear-gradient(135deg, ${hex}, ${hex}88)`;
  const [h, s, l] = hsl;
  const h2 = (h + 60) % 360;
  return `linear-gradient(135deg, hsl(${h}deg ${s.toFixed(1)}% ${l.toFixed(1)}%), hsl(${h2}deg ${s.toFixed(1)}% ${Math.min(l + 10, 90).toFixed(1)}%))`;
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
                    {u.avatarUrl && <AvatarImage src={resolveImageUrl(u.avatarUrl)} />}
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

type ItemOption = { id: string; label: string; thumbnail?: string | null };

function FeaturedItemSelector({ type, value, onChange, username }: {
  type: FeaturedType;
  value: string;
  onChange: (id: string) => void;
  username: string;
}) {
  const [search, setSearch] = useState("");

  const apiEndpoints: Record<FeaturedType, string> = {
    project: "/api/projects",
    product: "/api/store/products",
    wiki: "/api/articles/recent",
    post: `/api/users/${username}/posts`,
    playlist: "/api/music/playlists",
  };

  const { data: rawItems = [], isLoading } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/api/featured-selector", type, username],
    queryFn: async () => {
      const res = await fetch(apiEndpoints[type]);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30_000,
  });

  const items: ItemOption[] = rawItems.map((item) => ({
    id: String(
      (item.slug as string) ??
      (item.id as string | number) ??
      ""
    ),
    label:
      (item.title as string) ||
      (item.name as string) ||
      (item.displayName as string) ||
      (item.content as string)?.slice(0, 60) ||
      String(item.id ?? ""),
    thumbnail:
      (item.coverImageUrl as string) ??
      (item.imageUrl as string) ??
      (item.thumbnailUrl as string) ??
      null,
  })).filter((it) => it.id);

  const filtered = search
    ? items.filter((it) => it.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const selectedItem = items.find((it) => it.id === value);

  return (
    <div className="space-y-2">
      <Label>Featured Item</Label>
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-1"
        data-testid="input-featured-search"
      />
      {isLoading && <p className="text-xs text-muted-foreground py-1">Loading items…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">No items found.</p>
      )}
      <div className="max-h-44 overflow-y-auto rounded-lg border divide-y" data-testid="list-featured-items">
        {filtered.slice(0, 20).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${value === item.id ? "bg-primary/10 font-semibold" : ""}`}
            data-testid={`option-featured-item-${item.id}`}
          >
            {item.thumbnail ? (
              <img src={resolveImageUrl(item.thumbnail)} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
            ) : (
              <Star className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{item.label}</span>
            {value === item.id && <span className="ml-auto text-primary text-xs">Selected</span>}
          </button>
        ))}
      </div>
      {selectedItem && (
        <p className="text-xs text-muted-foreground" data-testid="text-featured-selected">
          Selected: <span className="font-medium">{selectedItem.label}</span>
        </p>
      )}
    </div>
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
    bannerUrl: user.bannerUrl ?? "",
    profileBgOpacity: user.profileBgOpacity ?? 20,
    instagram: user.socialLinks?.instagram ?? "",
    twitter: user.socialLinks?.twitter ?? "",
    tiktok: user.socialLinks?.tiktok ?? "",
    discord: user.socialLinks?.discord ?? "",
    website: user.socialLinks?.website ?? "",
    profileStatus: user.profileStatus ?? "",
    profileFeaturedType: (user.profileFeaturedType as FeaturedType | "") ?? "",
    profileFeaturedId: user.profileFeaturedId ?? "",
    profileLayout: (user.profileLayout as LayoutType) ?? "default",
    profileFont: (user.profileFont as FontType) ?? "default",
    profilePronouns: user.profilePronouns ?? "",
    profileAccentGradient: user.profileAccentGradient ?? false,
    profileShowFollowers: user.profileShowFollowers ?? true,
  });

  const mutation = useMutation<PublicUser, Error>({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/profile", {
        displayName: form.displayName || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
        profileBgColor: form.profileBgColor || null,
        profileAccentColor: form.profileAccentColor || null,
        profileBgImageUrl: form.profileBgImageUrl || null,
        bannerUrl: form.bannerUrl || null,
        profileBgOpacity: form.profileBgOpacity,
        socialLinks: {
          instagram: form.instagram || null,
          twitter: form.twitter || null,
          tiktok: form.tiktok || null,
          discord: form.discord || null,
          website: form.website || null,
        },
        profileStatus: form.profileStatus || null,
        profileFeaturedType: form.profileFeaturedType || null,
        profileFeaturedId: form.profileFeaturedId || null,
        profileLayout: form.profileLayout || "default",
        profileFont: form.profileFont || "default",
        profilePronouns: form.profilePronouns || null,
        profileAccentGradient: form.profileAccentGradient,
        profileShowFollowers: form.profileShowFollowers,
      });
      return res.json() as Promise<PublicUser>;
    },
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

  function set<K extends keyof ProfileFormState>(key: K, val: ProfileFormState[K]) {
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
          <img src={resolveImageUrl(form.avatarUrl)} alt="avatar" className="h-9 w-9 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
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
          <Label>Profile Banner</Label>
          <p className="text-xs text-muted-foreground mb-1">1200×400px recommended</p>
          <FileUploadWithFallback
            bucket="banners"
            path={`${user.id}/banner.{ext}`}
            accept="image/jpeg,image/png,image/webp,image/gif"
            maxSizeMb={5}
            currentUrl={form.bannerUrl}
            onUpload={(url) => set("bannerUrl", url)}
            label="Upload Banner"
            urlValue={form.bannerUrl}
            onUrlChange={(url) => set("bannerUrl", url)}
            urlPlaceholder="https://example.com/banner.jpg (optional)"
            urlTestId="input-banner-url"
          />
        </div>
        <div>
          <Label>Background Image</Label>
          <p className="text-xs text-muted-foreground mb-1">Shows faintly behind your entire profile page</p>
          <FileUploadWithFallback
            bucket="banners"
            path={`${user.id}/bg.{ext}`}
            accept="image/jpeg,image/png,image/webp,image/gif"
            maxSizeMb={5}
            currentUrl={form.profileBgImageUrl}
            onUpload={(url) => set("profileBgImageUrl", url)}
            label="Upload Background"
            urlValue={form.profileBgImageUrl}
            onUrlChange={(url) => set("profileBgImageUrl", url)}
            urlPlaceholder="https://example.com/bg.jpg (optional)"
            urlTestId="input-bg-image-url"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Background Opacity</Label>
            <span className="text-xs text-muted-foreground font-mono">{form.profileBgOpacity}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[form.profileBgOpacity]}
            onValueChange={([v]) => {
              setForm((f) => {
                const updated = { ...f, profileBgOpacity: v };
                onFormChange(updated);
                return updated;
              });
            }}
            data-testid="slider-bg-opacity"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Accent Gradient</Label>
            <p className="text-xs text-muted-foreground">Gradient on banner & avatar border</p>
          </div>
          <Switch
            checked={form.profileAccentGradient}
            onCheckedChange={(v) => {
              setForm((f) => {
                const updated = { ...f, profileAccentGradient: v };
                onFormChange(updated);
                return updated;
              });
            }}
            data-testid="switch-accent-gradient"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</p>
        <div>
          <Label htmlFor="profileLayout">Layout</Label>
          <Select value={form.profileLayout} onValueChange={(v) => set("profileLayout", v as LayoutType)}>
            <SelectTrigger className="mt-1" id="profileLayout" data-testid="select-profile-layout">
              <SelectValue placeholder="Choose layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="profileFont">Display Font</Label>
          <Select value={form.profileFont} onValueChange={(v) => set("profileFont", v as FontType)}>
            <SelectTrigger className="mt-1" id="profileFont" data-testid="select-profile-font">
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (System)</SelectItem>
              <SelectItem value="serif">Serif (Georgia)</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
              <SelectItem value="handwritten">Handwritten (Caveat)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Info</p>
        <div>
          <Label htmlFor="profilePronouns">Pronouns</Label>
          <Input id="profilePronouns" value={form.profilePronouns} onChange={(e) => set("profilePronouns", e.target.value)}
            placeholder="e.g. they/them" className="mt-1" maxLength={20} data-testid="input-pronouns" />
        </div>
        <div>
          <Label htmlFor="profileStatus">Status</Label>
          <Input id="profileStatus" value={form.profileStatus} onChange={(e) => set("profileStatus", e.target.value)}
            placeholder="🎵 Working on something new..." className="mt-1" maxLength={60} data-testid="input-profile-status" />
          <p className="text-xs text-muted-foreground mt-1">{form.profileStatus.length}/60</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Show Follower Counts</Label>
            <p className="text-xs text-muted-foreground">Display follower/following numbers publicly</p>
          </div>
          <Switch
            checked={form.profileShowFollowers}
            onCheckedChange={(v) => {
              setForm((f) => {
                const updated = { ...f, profileShowFollowers: v };
                onFormChange(updated);
                return updated;
              });
            }}
            data-testid="switch-show-followers"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured Item</p>
        <div>
          <Label htmlFor="featuredType">Featured Type</Label>
          <Select
            value={form.profileFeaturedType || "none"}
            onValueChange={(v) => {
              set("profileFeaturedType", v === "none" ? "" : v as FeaturedType);
              set("profileFeaturedId", "");
            }}
          >
            <SelectTrigger className="mt-1" id="featuredType" data-testid="select-featured-type">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="wiki">Wiki Article</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="playlist">Playlist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.profileFeaturedType && (
          <FeaturedItemSelector
            type={form.profileFeaturedType}
            value={form.profileFeaturedId}
            onChange={(id) => set("profileFeaturedId", id)}
            username={user.username}
          />
        )}
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

type ArticleSnippet = { id: number; title: string; slug: string; summary: string | null; updatedAt: string; category?: { id: number; name: string; slug: string } | null };

function PostCard({ post, currentUserId, canDelete, onDelete, onImageClick }: {
  post: PostWithMeta;
  currentUserId?: string;
  canDelete?: boolean;
  onDelete?: (id: number) => void;
  onImageClick?: (url: string) => void;
}) {
  const { toast } = useToast();
  const [repliesOpen, setRepliesOpen] = useState(false);

  const isRepost = !!post.repostOf;
  const originalPostId = post.repostOf ?? post.id;
  const authorName = post.author.displayName || post.author.username;

  const repostMutation = useMutation({
    mutationFn: () =>
      post.repostedByCurrentUser
        ? apiRequest("DELETE", `/api/posts/${originalPostId}/repost`)
        : apiRequest("POST", `/api/posts/${originalPostId}/repost`),
    onSuccess: () => {
      import("@/lib/queryClient").then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      });
      toast({ title: post.repostedByCurrentUser ? "Repost removed" : "Reposted!" });
    },
    onError: () => toast({ title: "Failed to repost", variant: "destructive" }),
  });

  return (
    <Card className="p-4 overflow-visible" data-testid={`card-profile-post-${post.id}`}>
      {isRepost && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{authorName} reposted</span>
        </div>
      )}
      <div className="flex gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            {isRepost && post.originalPost && (
              <span className="text-xs font-medium text-muted-foreground">@{post.originalPost.author.username}</span>
            )}
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
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">
            {isRepost && post.originalPost ? post.originalPost.content : post.content}
          </p>
          {(isRepost ? post.originalPost?.imageUrl : post.imageUrl) && (
            <div
              className="mb-2 rounded-xl overflow-hidden border cursor-pointer"
              onClick={() => onImageClick?.(resolveImageUrl((isRepost ? post.originalPost?.imageUrl : post.imageUrl) as string))}
            >
              <img src={resolveImageUrl((isRepost ? post.originalPost?.imageUrl : post.imageUrl) as string)} alt="Post" className="w-full max-h-48 object-cover hover:opacity-90 transition-opacity" loading="lazy" data-testid={`img-profile-post-${post.id}`} />
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setRepliesOpen((v) => !v)}
              data-testid={`button-profile-reply-${post.id}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.replyCount}</span>
            </button>
            {currentUserId && (currentUserId !== post.authorId || isRepost) && (
              <button
                className={`flex items-center gap-1.5 text-xs transition-colors ${post.repostedByCurrentUser ? "text-green-500" : "text-muted-foreground hover:text-green-500"} cursor-pointer`}
                onClick={() => repostMutation.mutate()}
                disabled={repostMutation.isPending}
                data-testid={`button-profile-repost-${post.id}`}
              >
                <Repeat2 className="h-3.5 w-3.5" />
              </button>
            )}
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

type FeaturedItemMeta = {
  title: string;
  thumbnail?: string | null;
  href: string;
};

function useFeaturedItemMeta(type: string, itemId: string): { data?: FeaturedItemMeta; isLoading: boolean } {
  const apiPathMap: Record<string, string> = {
    project: `/api/projects/${itemId}`,
    product: `/api/store/products/${itemId}`,
    wiki: `/api/articles/${itemId}`,
    post: `/api/posts/${itemId}`,
    playlist: `/api/music/playlists`,
  };

  const hrefMap: Record<string, string> = {
    project: `/projects/${itemId}`,
    product: `/store/${itemId}`,
    wiki: `/wiki/${itemId}`,
    post: `/`,
    playlist: `/music/playlists`,
  };

  const { data: raw, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: [`/api/featured-item`, type, itemId],
    queryFn: async () => {
      const path = apiPathMap[type];
      if (!path) return {};
      const res = await fetch(path);
      if (!res.ok) return {};
      if (type === "playlist") {
        const list = await res.json() as Array<Record<string, unknown>>;
        const match = list.find((p) => String(p.id) === itemId || String(p.slug) === itemId);
        return match ?? {};
      }
      return res.json();
    },
    enabled: Boolean(type && itemId),
    staleTime: 60_000,
  });

  if (!raw || isLoading) return { isLoading };

  const title =
    (raw.title as string) ||
    (raw.name as string) ||
    (raw.displayName as string) ||
    (raw.content as string)?.slice(0, 60) ||
    itemId;
  const thumbnail =
    (raw.coverImageUrl as string) ??
    (raw.imageUrl as string) ??
    (raw.thumbnailUrl as string) ??
    (raw.coverImage as string) ??
    null;

  return {
    data: { title, thumbnail, href: hrefMap[type] || "/" },
    isLoading: false,
  };
}

function FeaturedItemCard({ type, itemId, accentColor, bgColor }: {
  type: string;
  itemId: string;
  accentColor?: string;
  bgColor?: string;
}) {
  const { data: meta, isLoading } = useFeaturedItemMeta(type, itemId);

  const labelMap: Record<string, string> = {
    project: "Project",
    product: "Product",
    wiki: "Wiki Article",
    post: "Post",
    playlist: "Playlist",
  };

  return (
    <a
      href={meta?.href || "/"}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-3 transition-opacity hover:opacity-80 overflow-hidden"
      style={{
        background: bgColor ? `${bgColor}33` : "var(--muted)",
        borderColor: accentColor ? `${accentColor}33` : "var(--border)",
      }}
      data-testid="link-featured-item"
    >
      {isLoading ? (
        <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
      ) : meta?.thumbnail ? (
        <img
          src={resolveImageUrl(meta.thumbnail)}
          alt=""
          className="h-9 w-9 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="h-9 w-9 rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ background: accentColor ? `${accentColor}22` : "var(--border)" }}
        >
          <Star className="h-4 w-4" style={{ color: accentColor || "var(--muted-foreground)" }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: accentColor ? `${accentColor}88` : "var(--muted-foreground)" }}>
          <span
            className="inline-block rounded px-1 py-0.5 mr-1 text-[10px] font-bold"
            style={{ background: accentColor ? `${accentColor}22` : "var(--muted)", color: accentColor || "var(--muted-foreground)" }}
          >
            {labelMap[type] || type}
          </span>
          Featured
        </p>
        {isLoading ? (
          <Skeleton className="h-4 w-28 mt-1" />
        ) : (
          <p className="text-sm font-medium truncate" style={{ color: accentColor || "var(--foreground)" }}>
            {meta?.title || itemId}
          </p>
        )}
      </div>
    </a>
  );
}

function formatStreamCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type UploadTrackType = "track" | "instrumental";
function isUploadTrackType(v: string): v is UploadTrackType {
  return v === "track" || v === "instrumental";
}

function UploadTrackDialog({ open, onClose, username, editing }: { open: boolean; onClose: () => void; username: string; editing?: MusicTrack | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<UploadTrackType>("track");
  const [genre, setGenre] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [duration, setDuration] = useState<string>("");

  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(isUploadTrackType(editing.type) ? editing.type : "track");
      setGenre(editing.genre ?? "");
      setAlbumName(editing.albumName ?? "");
      setFileUrl(editing.fileUrl ?? "");
      setCoverImageUrl(editing.coverImageUrl ?? "");
      setDuration(editing.duration != null ? String(editing.duration) : "");
    } else {
      setTitle(""); setType("track"); setGenre(""); setAlbumName("");
      setFileUrl(""); setCoverImageUrl(""); setDuration("");
    }
  }, [open, editing]);

  const buildPayload = () => ({
    title,
    type,
    genre: genre || null,
    albumName: albumName || null,
    fileUrl,
    coverImageUrl: coverImageUrl || null,
    duration: duration ? Number(duration) : null,
    status: "published" as const,
    displayOrder: 0,
    artistName: "",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/profile", username, "music"] });
    qc.invalidateQueries({ queryKey: ["/api/music/tracks"] });
    qc.invalidateQueries({ queryKey: ["/api/music/artists"] });
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/music/tracks", buildPayload()),
    onSuccess: () => {
      invalidate();
      toast({ title: "Track uploaded" });
      onClose();
    },
    onError: (err: unknown) => toast({
      title: "Upload failed",
      description: err instanceof Error ? err.message : "Please try again.",
      variant: "destructive",
    }),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/music/tracks/${editing!.id}`, buildPayload()),
    onSuccess: () => {
      invalidate();
      toast({ title: "Track updated" });
      onClose();
    },
    onError: (err: unknown) => toast({
      title: "Update failed",
      description: err instanceof Error ? err.message : "Please try again.",
      variant: "destructive",
    }),
  });

  const submitting = createMutation.isPending || updateMutation.isPending;
  const submit = () => (isEdit ? updateMutation.mutate() : createMutation.mutate());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Track" : "Upload Track"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" data-testid="input-upload-track-title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => isUploadTrackType(v) && setType(v)}>
                <SelectTrigger data-testid="select-upload-track-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="track">Song</SelectItem>
                  <SelectItem value="instrumental">Beat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Genre (optional)</Label>
              <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Hip-Hop, R&B…" data-testid="input-upload-track-genre" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Album (optional)</Label>
            <Input value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Album name" data-testid="input-upload-track-album" />
          </div>
          <div className="space-y-1.5">
            <Label>Audio File</Label>
            <FileUploadWithFallback
              bucket="tracks"
              path={`users/${Date.now()}.{ext}`}
              accept="audio/mpeg,audio/wav,audio/*"
              maxSizeMb={200}
              isPrivate={false}
              urlValue={fileUrl}
              onUrlChange={(u) => setFileUrl(u)}
              urlPlaceholder="https://... (mp3/wav URL)"
              urlTestId="input-upload-track-url"
              label="Upload Audio"
              currentUrl={fileUrl || null}
              onUpload={(u) => setFileUrl(u)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cover Image (optional)</Label>
            <FileUploadWithFallback
              bucket="gallery"
              path={`tracks/covers/${Date.now()}.{ext}`}
              accept="image/jpeg,image/png,image/webp,image/*"
              maxSizeMb={10}
              currentUrl={coverImageUrl || null}
              onUpload={(u) => setCoverImageUrl(u)}
              urlValue={coverImageUrl}
              onUrlChange={(u) => setCoverImageUrl(u)}
              urlPlaceholder="https://..."
              urlTestId="input-upload-track-cover"
              label="Upload Cover"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration in seconds (optional)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="213" data-testid="input-upload-track-duration" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} data-testid="button-upload-track-cancel">Cancel</Button>
            <Button
              onClick={submit}
              disabled={!title || !fileUrl || submitting}
              data-testid="button-upload-track-submit"
            >
              {submitting ? (isEdit ? "Saving…" : "Uploading…") : (isEdit ? "Save" : "Upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileMusicTab({ username, isOwnProfile, accentColor, bgColor, tracks, albums, isLoading }: {
  username: string;
  isOwnProfile: boolean;
  accentColor?: string;
  bgColor?: string;
  tracks: ProfileTrack[];
  albums: Album[];
  isLoading: boolean;
}) {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pause, resume } = useMusicPlayer();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);

  const borderColor = accentColor ? `${accentColor}33` : "var(--border)";
  const cardBg = bgColor ? `${bgColor}88` : "var(--card)";
  const mutedColor = accentColor ? `${accentColor}99` : "var(--muted-foreground)";

  const songs = tracks.filter((t) => t.type !== "instrumental");
  const beats = tracks.filter((t) => t.type === "instrumental");

  const renderRow = (track: ProfileTrack, list: ProfileTrack[], i: number) => {
    const isCurrent = currentTrack?.id === track.id;
    const onRowPlay = () => {
      if (isCurrent) {
        if (isPlaying) pause(); else resume();
      } else {
        playTrack(track, list.slice(i + 1));
      }
    };
    return (
      <li
        key={track.id}
        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors group ${isCurrent ? "" : "hover:bg-muted/40"}`}
        style={isCurrent ? { background: accentColor ? `${accentColor}1f` : "hsl(var(--muted))" } : {}}
        data-testid={`track-profile-${track.id}`}
      >
        <div className="w-5 shrink-0 flex items-center justify-center">
          {isCurrent ? (
            <span
              className="inline-flex items-end gap-[2px] h-3"
              aria-label="Now playing"
              data-testid={`equalizer-track-${track.id}`}
            >
              <span className="w-[2px] bg-current animate-pulse" style={{ color: accentColor || "hsl(var(--primary))", height: "60%", animationDelay: "0ms" }} />
              <span className="w-[2px] bg-current animate-pulse" style={{ color: accentColor || "hsl(var(--primary))", height: "100%", animationDelay: "120ms" }} />
              <span className="w-[2px] bg-current animate-pulse" style={{ color: accentColor || "hsl(var(--primary))", height: "75%", animationDelay: "240ms" }} />
            </span>
          ) : (
            <>
              <span className="text-xs tabular-nums group-hover:hidden" style={{ color: mutedColor }}>{i + 1}</span>
              {track.fileUrl && (
                <button
                  type="button"
                  className="hidden group-hover:inline-flex items-center justify-center"
                  aria-label={`Play ${track.title}`}
                  data-testid={`button-play-track-profile-${track.id}`}
                  onClick={onRowPlay}
                  style={{ color: accentColor || "hsl(var(--foreground))" }}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
              )}
            </>
          )}
        </div>
        {track.coverImageUrl ? (
          <img
            src={resolveImageUrl(track.coverImageUrl)}
            alt={track.title}
            className="h-10 w-10 rounded object-cover shrink-0"
          />
        ) : (
          <div
            className="h-10 w-10 rounded flex items-center justify-center shrink-0"
            style={{ background: accentColor ? `${accentColor}22` : "var(--muted)" }}
          >
            <Music className="h-4 w-4" style={{ color: accentColor || "var(--muted-foreground)" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: isCurrent ? (accentColor || "hsl(var(--primary))") : (accentColor || "var(--foreground)") }} data-testid={`text-track-title-${track.id}`}>
            {track.title}
          </p>
          <p className="text-xs truncate" style={{ color: mutedColor }}>
            {track.albumName || (track.type === "instrumental" ? "Beat" : "Song")}
          </p>
        </div>
        {track.genre && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 shrink-0 hidden md:inline-flex"
            data-testid={`badge-track-genre-${track.id}`}
          >
            {track.genre}
          </Badge>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs shrink-0 tabular-nums hidden sm:flex items-center gap-1 cursor-help" style={{ color: mutedColor }} data-testid={`text-track-streams-${track.id}`}>
                <BarChart2 className="h-3 w-3" />
                {formatStreamCount(track.streamCount ?? 0)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              Streams — total times this track has been played
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SparkButton
          entityType="track"
          entityId={track.id}
          sparkCount={track.sparkCount ?? 0}
          sparkedByCurrentUser={track.sparkedByCurrentUser ?? false}
          isOwner={!!user && user.username === username}
          size="sm"
          className="shrink-0"
        />
        <span className="text-xs shrink-0 tabular-nums" style={{ color: mutedColor }} data-testid={`text-track-duration-${track.id}`}>
          {formatDuration(track.duration)}
        </span>
        <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <SparkButton
            entityType="track"
            entityId={track.id}
            sparkCount={(track as any).sparkCount ?? 0}
            sparkedByCurrentUser={(track as any).sparkedByCurrentUser ?? false}
            isOwner={isOwnProfile}
            size="sm"
          />
        </span>
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Edit ${track.title}`}
            data-testid={`button-edit-track-profile-${track.id}`}
            onClick={() => { setEditingTrack(track); setUploadOpen(true); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </li>
    );
  };

  const renderSection = (label: string, icon: React.ReactNode, list: ProfileTrack[], emptyText: string, testId: string) => (
    <div className="flex-1 min-w-0" data-testid={testId}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: mutedColor }}>
        {icon}
        {label}
        <span className="opacity-60">· {list.length}</span>
      </h3>
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-6 text-center"
          style={{ background: cardBg, borderColor }}
          data-testid={`${testId}-empty`}
        >
          <p className="text-sm" style={{ color: mutedColor }}>{emptyText}</p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: cardBg, borderColor }}
        >
          <ol className="divide-y" style={{ borderColor }}>
            {list.map((track, i) => renderRow(track, list, i))}
          </ol>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="tab-content-music">
      {(isOwnProfile || tracks.length > 0) && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: mutedColor }}>
            <Music className="h-3.5 w-3.5" />
            Music
          </h2>
          {isOwnProfile && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => { setEditingTrack(null); setUploadOpen(true); }}
              data-testid="button-upload-track"
              style={accentColor ? { borderColor: `${accentColor}66`, color: accentColor } : {}}
            >
              <Music className="h-3.5 w-3.5" /> Upload Track
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {renderSection(
          "Songs",
          <Music className="h-3.5 w-3.5" />,
          songs,
          isOwnProfile ? "No songs yet — upload your first." : "No songs yet.",
          "section-profile-songs",
        )}
        {renderSection(
          "Beats",
          <Disc className="h-3.5 w-3.5" />,
          beats,
          isOwnProfile ? "No beats yet — upload your first." : "No beats yet.",
          "section-profile-beats",
        )}
      </div>

      {(isLoading || albums.length > 0) && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: mutedColor }}>
            <Disc className="h-3.5 w-3.5" />
            Discography
          </h3>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-28 rounded-xl flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {albums.map((album) => (
                <Link key={album.id} href={`/music/albums/${album.slug}`}>
                  <div
                    className="flex-shrink-0 w-28 rounded-xl border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: cardBg, borderColor }}
                    data-testid={`card-profile-album-${album.id}`}
                  >
                    {(album as any).coverImageUrl ? (
                      <img
                        src={resolveImageUrl((album as any).coverImageUrl)}
                        alt={album.title}
                        className="w-full h-28 object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-28 flex items-center justify-center"
                        style={{ background: accentColor ? `${accentColor}22` : "var(--muted)" }}
                      >
                        <Disc className="h-8 w-8" style={{ color: accentColor || "var(--muted-foreground)", opacity: 0.5 }} />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate" style={{ color: accentColor || "var(--foreground)" }}>
                        {album.title}
                      </p>
                      {album.releaseYear && (
                        <p className="text-[10px]" style={{ color: mutedColor }}>{album.releaseYear}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <UploadTrackDialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setEditingTrack(null); }}
        username={username}
        editing={editingTrack}
      />
    </div>
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
  const bannerImage = profile.bannerUrl || bgImage;
  const bgOpacity = (profile.profileBgOpacity ?? 20) / 100;
  const layout = profile.profileLayout ?? "default";
  const profileFont = profile.profileFont ?? "default";
  const showFollowers = profile.profileShowFollowers !== false;
  const useGradient = profile.profileAccentGradient === true;

  const fontStyle: React.CSSProperties = (() => {
    if (profileFont === "serif") return { fontFamily: "Georgia, serif" };
    if (profileFont === "mono") return { fontFamily: "monospace" };
    if (profileFont === "handwritten") return { fontFamily: "'Caveat', cursive" };
    return {};
  })();

  const gradientStyle = useGradient && accentColor
    ? buildAccentGradient(accentColor)
    : accentColor
      ? `linear-gradient(135deg, ${accentColor}66, ${accentColor}22)`
      : "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentPath, navigate] = useLocation();
  const search = useSearch();
  const tabFromUrl = (() => {
    const sp = new URLSearchParams(search);
    const t = sp.get("tab");
    return t === "music" ? "music" : "overview";
  })();
  const setActiveProfileTab = (tab: "overview" | "music") => {
    const sp = new URLSearchParams(search);
    if (tab === "overview") sp.delete("tab"); else sp.set("tab", tab);
    const qs = sp.toString();
    navigate(`${currentPath}${qs ? `?${qs}` : ""}`, { replace: true });
  };
  // gating happens after showMusicTab is computed below
  let activeProfileTab: "overview" | "music" = tabFromUrl;
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "articles">("posts");
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { currentTrack, isPlaying, playTrack, pause, resume } = useMusicPlayer();

  const { data: musicData, isLoading: musicLoading } = useQuery<{ tracks: ProfileTrack[]; albums: Album[] }>({
    queryKey: ["/api/profile", profile.username, "music"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profile.username}/music`);
      if (!res.ok) return { tracks: [], albums: [] };
      return res.json();
    },
  });
  const profileTracks = musicData?.tracks ?? [];
  const profileAlbums = musicData?.albums ?? [];
  const hasTracks = profileTracks.length > 0;
  const showMusicTab = hasTracks || isOwnProfile;
  if (activeProfileTab === "music" && !showMusicTab && !musicLoading) {
    activeProfileTab = "overview";
  }
  useEffect(() => {
    if (tabFromUrl === "music" && !showMusicTab && !musicLoading) {
      const sp = new URLSearchParams(search);
      sp.delete("tab");
      const qs = sp.toString();
      navigate(`${currentPath}${qs ? `?${qs}` : ""}`, { replace: true });
    }
  }, [tabFromUrl, showMusicTab, musicLoading, search, currentPath, navigate]);
  const heroTrack = profileTracks[0];
  const isHeroPlaying = !!currentTrack && !!heroTrack && currentTrack.id === heroTrack.id && isPlaying;
  const onHeroPlay = () => {
    if (!heroTrack) return;
    if (currentTrack?.id === heroTrack.id) {
      if (isPlaying) pause(); else resume();
    } else {
      playTrack(heroTrack, profileTracks.slice(1));
    }
  };

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

  const { data: topSparkedPosts } = useQuery<PostWithMeta[]>({
    queryKey: ["/api/users", profile.username, "top-sparked-posts"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${profile.username}/top-sparked-posts`);
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

  const isCompact = layout === "compact";
  const isWide = layout === "wide";

  return (
    <div className="min-h-screen relative" style={bgColor ? { backgroundColor: bgColor } : {}}>
      {bgImage && (
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: `url(${resolveImageUrl(bgImage)})`, opacity: bgOpacity, transform: "translateZ(0)", zIndex: 0 }} />
      )}
      {profileFont === "handwritten" && (
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" />
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        <div
          className={`rounded-2xl border shadow-lg overflow-hidden ${isWide ? "max-w-5xl" : ""}`}
          style={{
            background: bgColor ? `${bgColor}cc` : "var(--background)",
            borderColor: accentColor ? `${accentColor}44` : "var(--border)",
          }}
          data-testid="profile-card"
        >
          {/* Banner — only shown in default and wide layouts */}
          {!isCompact && (
            <div
              className={`${isWide ? "h-48" : "h-24 md:h-32"} w-full relative overflow-hidden`}
              style={bannerImage ? {
                backgroundImage: `url(${resolveImageUrl(bannerImage)})`, backgroundSize: "cover", backgroundPosition: "center",
              } : { background: gradientStyle }}
            />
          )}

          <div className={`px-6 pb-6 ${isCompact ? "pt-4" : ""}`}>
            {/* Header row — avatar + action buttons */}
            {isCompact ? (
              /* Compact header: small inline avatar + name + buttons in one row */
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  {profile.avatarUrl ? (
                    <img src={resolveImageUrl(profile.avatarUrl)} alt={displayName}
                      className="h-14 w-14 rounded-full object-cover border-2 shadow"
                      style={{ borderColor: useGradient && accentColor ? "transparent" : (accentColor || "var(--background)") }}
                      data-testid="img-avatar"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full border-2 shadow flex items-center justify-center"
                      style={{ borderColor: accentColor || "var(--background)", background: accentColor ? `${accentColor}22` : "var(--muted)" }}
                      data-testid="img-avatar-fallback"
                    >
                      <SevcoLogo size={32} className="opacity-60" invert="none" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold" style={{ ...fontStyle, ...(accentColor ? { color: accentColor } : {}) }} data-testid="text-display-name">
                      {displayName}
                    </h1>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleBadge.color}22`, color: roleBadge.color }} data-testid="badge-role">
                      {roleBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs opacity-60" style={accentColor ? { color: accentColor } : {}} data-testid="text-username">
                      @{profile.username}
                    </p>
                    {profile.profilePronouns && (
                      <span className="text-xs opacity-50" style={accentColor ? { color: accentColor } : {}} data-testid="text-pronouns">
                        · {profile.profilePronouns}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isOwnProfile && currentUserId && (
                    <Button size="sm" variant={profile.isFollowing ? "outline" : "default"} className="gap-1.5 text-xs"
                      onClick={() => followMutation.mutate()} disabled={followMutation.isPending} data-testid="button-follow">
                      {profile.isFollowing ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
                    </Button>
                  )}
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 text-xs"
                      style={accentColor ? { borderColor: `${accentColor}66`, color: accentColor } : {}} data-testid="button-edit-profile">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Default/wide header: large avatar overlapping banner */
              <div className="flex items-end justify-between -mt-10 mb-4 relative z-10">
                <div>
                  {profile.avatarUrl ? (
                    <img src={resolveImageUrl(profile.avatarUrl)} alt={displayName}
                      className={`${isWide ? "h-28 w-28" : "h-20 w-20 md:h-24 md:w-24"} rounded-2xl object-cover border-4 shadow-lg`}
                      style={{ borderColor: useGradient && accentColor ? "transparent" : (accentColor || "var(--background)"), outline: useGradient && accentColor ? `3px solid ${accentColor}` : undefined }}
                      data-testid="img-avatar"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div
                      className={`${isWide ? "h-28 w-28" : "h-20 w-20 md:h-24 md:w-24"} rounded-2xl border-4 shadow-lg flex items-center justify-center`}
                      style={{ borderColor: accentColor || "var(--background)", background: accentColor ? `${accentColor}22` : "var(--muted)" }}
                      data-testid="img-avatar-fallback"
                    >
                      <SevcoLogo
                        size={40}
                        className="opacity-60"
                        invert="none"
                        imgStyle={accentColor ? { filter: `drop-shadow(0 0 4px ${accentColor})` } : undefined}
                      />
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
            )}

            {/* Name + username row — only shown in default/wide layouts (compact shows it in header row above) */}
            {!isCompact && (
              <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`${isWide ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} font-bold`} style={{ ...fontStyle, ...(accentColor ? { color: accentColor } : {}) }} data-testid="text-display-name">
                    {displayName}
                  </h1>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${roleBadge.color}22`, color: roleBadge.color }} data-testid="badge-role">
                    {roleBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm opacity-60 mt-0.5" style={accentColor ? { color: accentColor } : {}} data-testid="text-username">
                    @{profile.username}
                  </p>
                  {profile.profilePronouns && (
                    <span className="text-xs opacity-50 mt-0.5" style={accentColor ? { color: accentColor } : {}} data-testid="text-pronouns">
                      · {profile.profilePronouns}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Status, bio, followers, featured item, socials — shared across all layouts */}
            {profile.profileStatus && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-3"
                style={{ background: accentColor ? `${accentColor}18` : "var(--muted)", color: accentColor || "var(--muted-foreground)", border: `1px solid ${accentColor ? `${accentColor}33` : "var(--border)"}` }}
                data-testid="text-profile-status"
              >
                {profile.profileStatus}
              </div>
            )}

            {profile.bio && (
              <p className="text-sm leading-relaxed mb-4 max-w-lg"
                style={{ ...fontStyle, ...(accentColor ? { color: accentColor, opacity: 0.85 } : { color: "var(--foreground)" }) }}
                data-testid="text-bio"
              >
                {profile.bio}
              </p>
            )}

            {/* Follower / following counts */}
            <div className="flex items-center gap-4 mt-2 mb-3">
              {showFollowers ? (
                <>
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
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-xs opacity-50" style={accentColor ? { color: accentColor } : {}} data-testid="text-followers-hidden">
                  <Lock className="h-3 w-3" /> Follower counts hidden
                </span>
              )}
            </div>

            {profile.profileFeaturedType && profile.profileFeaturedId && (
              <FeaturedItemCard
                type={profile.profileFeaturedType}
                itemId={profile.profileFeaturedId}
                accentColor={accentColor}
                bgColor={bgColor}
              />
            )}

            {(socials.length > 0 || hasTracks) && (
              <div className="flex flex-wrap items-center gap-3 mt-3" data-testid="social-links">
                {hasTracks && (
                  <button
                    type="button"
                    onClick={onHeroPlay}
                    aria-label={isHeroPlaying ? "Pause music" : "Play music"}
                    className="inline-flex items-center justify-center h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: accentColor || "hsl(var(--primary))",
                      color: "#fff",
                    }}
                    data-testid="button-hero-play"
                  >
                    {isHeroPlaying ? (
                      <span className="flex items-end gap-[3px] h-4">
                        <span className="w-[3px] h-full bg-white rounded-sm" />
                        <span className="w-[3px] h-full bg-white rounded-sm" />
                      </span>
                    ) : (
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>
                )}
                {socials.map((s) => (
                  <SocialBadge key={s.label} href={s.href} icon={s.icon} label={s.label} accentColor={accentColor || "hsl(var(--primary))"} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unified profile tab bar (Overview / Posts / Articles / Music) */}
        {(() => {
          const unifiedTabs: Array<{ id: "overview" | "posts" | "articles" | "music"; label: string }> = [
            { id: "overview", label: "Overview" },
            { id: "posts", label: "Posts" },
            { id: "articles", label: "Articles" },
            ...(showMusicTab ? [{ id: "music" as const, label: "Music" }] : []),
          ];
          const isTabActive = (id: "overview" | "posts" | "articles" | "music") => {
            if (id === "music") return activeProfileTab === "music";
            if (id === "overview") return activeProfileTab === "overview";
            return activeProfileTab === "overview" && activeTab === id;
          };
          return (
            <div
              className="mt-5 rounded-xl border overflow-hidden"
              style={{
                background: bgColor ? `${bgColor}88` : "var(--card)",
                borderColor: accentColor ? `${accentColor}33` : "var(--border)",
              }}
              data-testid="profile-tab-bar"
            >
              <div className="flex gap-1 overflow-x-auto px-2">
                {unifiedTabs.map((tab) => {
                  const isActive = isTabActive(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === "music") {
                          setActiveProfileTab("music");
                        } else if (tab.id === "overview") {
                          setActiveProfileTab("overview");
                        } else {
                          setActiveProfileTab("overview");
                          setActiveTab(tab.id);
                        }
                      }}
                      className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      style={isActive && accentColor ? { borderColor: accentColor, color: accentColor } : {}}
                      data-testid={`tab-profile-${tab.id}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {activeProfileTab === "music" && (
          <div className="mt-5 min-h-[40vh]">
            <ProfileMusicTab
              username={profile.username}
              isOwnProfile={isOwnProfile}
              accentColor={accentColor}
              bgColor={bgColor}
              tracks={profileTracks}
              albums={profileAlbums}
              isLoading={musicLoading}
            />
          </div>
        )}

        {activeProfileTab === "overview" && (
        <>
        {/* Posts tab */}
        {activeTab === "posts" && (
          <div className="mt-4 space-y-3 min-h-[40vh]">
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
                  onImageClick={setLightboxUrl}
                />
              ))
            )}
          </div>
        )}

        {/* Articles tab */}
        {activeTab === "articles" && (
          <div className="mt-4 min-h-[40vh]">
            {recentArticles && recentArticles.length > 0 ? (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: bgColor ? `${bgColor}88` : "var(--card)", borderColor: accentColor ? `${accentColor}33` : "var(--border)" }}
              >
                <div
                  className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
                  style={{ borderColor: accentColor ? `${accentColor}22` : "var(--border)", color: accentColor ? `${accentColor}99` : "var(--muted-foreground)" }}
                >
                  Articles
                </div>
                <div className="divide-y" style={{ borderColor: accentColor ? `${accentColor}11` : "var(--border)" }}>
                  {recentArticles.map((article) => (
                    <a key={article.id} href={articleUrl(article)}
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
                  No articles yet.
                </p>
              </div>
            )}
          </div>
        )}

      {/* Top Sparked Posts (Overview only) */}
      {topSparkedPosts && topSparkedPosts.length > 0 && (
        <div className="mt-6">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: bgColor ? `${bgColor}88` : "var(--card)", borderColor: accentColor ? `${accentColor}33` : "var(--border)" }}
            data-testid="section-top-sparked-posts"
          >
            <div
              className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor: accentColor ? `${accentColor}22` : "var(--border)" }}
            >
              <SparkIcon size="md" decorative />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor ? `${accentColor}99` : "var(--muted-foreground)" }}>
                Top Posts
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: accentColor ? `${accentColor}11` : "var(--border)" }}>
              {topSparkedPosts.map((post) => (
                <div key={post.id} className="px-5 py-3 flex items-start gap-3" data-testid={`top-sparked-post-${post.id}`}>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0 mt-0.5">
                    <SparkIcon size="md" decorative />
                    <span className="text-xs font-semibold">{post.sparkCount ?? 0}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2" style={{ color: accentColor || "var(--foreground)" }}>
                      {post.repostOf && post.originalPost ? post.originalPost.content : post.content}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5" data-testid={`top-sparked-post-time-${post.id}`}>
                      {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        </>
        )}
      </div>

      <FollowListDialog username={profile.username} type="followers" open={followersOpen} onClose={() => setFollowersOpen(false)} />
      <FollowListDialog username={profile.username} type="following" open={followingOpen} onClose={() => setFollowingOpen(false)} />

      <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
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
          <div className="flex justify-center mb-4">
            <SevcoLogo size={56} className="opacity-40" />
          </div>
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
        bannerUrl: liveForm.bannerUrl || null,
        profileBgOpacity: liveForm.profileBgOpacity,
        profileStatus: liveForm.profileStatus || null,
        profileFeaturedType: liveForm.profileFeaturedType || null,
        profileFeaturedId: liveForm.profileFeaturedId || null,
        profileLayout: liveForm.profileLayout || "default",
        profileFont: liveForm.profileFont || "default",
        profilePronouns: liveForm.profilePronouns || null,
        profileAccentGradient: liveForm.profileAccentGradient,
        profileShowFollowers: liveForm.profileShowFollowers,
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
        slug="profile"
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
