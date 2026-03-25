import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Link,
  ExternalLink,
  Pencil,
  Globe,
  AlertCircle,
  UserCircle2,
  Check,
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
};

function hexWithFallback(hex: string | null | undefined, fallback: string) {
  return hex && /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : fallback;
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

function ProfileEditPanel({ user, onSaved }: { user: PublicUser; onSaved: (u: PublicUser) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
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
    onSuccess: (updated: any) => {
      toast({ title: "Profile saved!" });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
      qc.invalidateQueries({ queryKey: ["/api/profile", user.username] });
      onSaved(updated);
    },
    onError: (e: Error) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const accentColor = hexWithFallback(form.profileAccentColor, "#000000");
  const bgColor = hexWithFallback(form.profileBgColor, "#ffffff");

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Live mini-preview */}
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
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder={user.username}
            className="mt-1"
            maxLength={80}
            data-testid="input-display-name"
          />
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Tell the world about yourself..."
            className="mt-1 resize-none"
            rows={3}
            maxLength={500}
            data-testid="input-bio"
          />
          <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
        </div>

        <div>
          <Label htmlFor="avatarUrl">Avatar Image URL</Label>
          <Input
            id="avatarUrl"
            value={form.avatarUrl}
            onChange={(e) => set("avatarUrl", e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="mt-1"
            data-testid="input-avatar-url"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Colors</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bgColor">Background Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="bgColor"
                type="color"
                value={form.profileBgColor || "#ffffff"}
                onChange={(e) => set("profileBgColor", e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border border-border p-0.5"
                data-testid="input-bg-color"
              />
              <Input
                value={form.profileBgColor}
                onChange={(e) => set("profileBgColor", e.target.value)}
                placeholder="#ffffff"
                className="font-mono text-xs"
                maxLength={9}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="accentColor"
                type="color"
                value={form.profileAccentColor || "#000000"}
                onChange={(e) => set("profileAccentColor", e.target.value)}
                className="h-9 w-9 rounded cursor-pointer border border-border p-0.5"
                data-testid="input-accent-color"
              />
              <Input
                value={form.profileAccentColor}
                onChange={(e) => set("profileAccentColor", e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs"
                maxLength={9}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="bgImageUrl">Background Image URL</Label>
          <Input
            id="bgImageUrl"
            value={form.profileBgImageUrl}
            onChange={(e) => set("profileBgImageUrl", e.target.value)}
            placeholder="https://example.com/bg.jpg (optional)"
            className="mt-1"
            data-testid="input-bg-image-url"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social Links</p>
        {[
          { key: "instagram", label: "Instagram", placeholder: "@handle or URL" },
          { key: "twitter",   label: "X / Twitter", placeholder: "@handle or URL" },
          { key: "tiktok",    label: "TikTok", placeholder: "@handle or URL" },
          { key: "discord",   label: "Discord", placeholder: "Server invite URL" },
          { key: "website",   label: "Website", placeholder: "https://yoursite.com" },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label htmlFor={`social-${key}`}>{label}</Label>
            <Input
              id={`social-${key}`}
              value={(form as any)[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="mt-1"
              data-testid={`input-social-${key}`}
            />
          </div>
        ))}
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full font-semibold gap-2"
        data-testid="button-save-profile"
      >
        {mutation.isPending ? "Saving..." : (
          <><Check className="h-4 w-4" /> Save Profile</>
        )}
      </Button>
    </div>
  );
}

function ProfileView({ profile, isOwnProfile, onEdit }: {
  profile: PublicUser;
  isOwnProfile: boolean;
  onEdit: () => void;
}) {
  const bgColor = hexWithFallback(profile.profileBgColor, undefined as any);
  const accentColor = hexWithFallback(profile.profileAccentColor, undefined as any);
  const bgImage = profile.profileBgImageUrl;

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
      {/* Background image */}
      {bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Profile card */}
        <div
          className="rounded-2xl border shadow-lg overflow-hidden"
          style={{
            background: bgColor ? `${bgColor}cc` : "var(--background)",
            borderColor: accentColor ? `${accentColor}44` : "var(--border)",
          }}
          data-testid="profile-card"
        >
          {/* Banner strip */}
          <div
            className="h-24 md:h-32 w-full"
            style={{
              background: accentColor
                ? `linear-gradient(135deg, ${accentColor}66, ${accentColor}22)`
                : "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))",
            }}
          />

          {/* Main content */}
          <div className="px-6 pb-6">
            {/* Avatar overlapping banner */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div>
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-20 w-20 md:h-24 md:w-24 rounded-2xl object-cover border-4 shadow-lg"
                    style={{ borderColor: accentColor || "var(--background)" }}
                    data-testid="img-avatar"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-4 shadow-lg flex items-center justify-center"
                    style={{
                      borderColor: accentColor || "var(--background)",
                      background: accentColor ? `${accentColor}22` : "var(--muted)",
                    }}
                    data-testid="img-avatar-fallback"
                  >
                    <img src={planetIcon} alt="SEVCO" className="h-10 w-10 object-contain opacity-60" style={accentColor ? { filter: `drop-shadow(0 0 4px ${accentColor})` } : {}} />
                  </div>
                )}
              </div>
              {isOwnProfile && (
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
              )}
            </div>

            {/* Name + role + username */}
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-xl md:text-2xl font-bold"
                  style={accentColor ? { color: accentColor } : {}}
                  data-testid="text-display-name"
                >
                  {displayName}
                </h1>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${roleBadge.color}22`, color: roleBadge.color }}
                  data-testid="badge-role"
                >
                  {roleBadge.label}
                </span>
              </div>
              <p
                className="text-sm opacity-60 mt-0.5"
                style={accentColor ? { color: accentColor } : {}}
                data-testid="text-username"
              >
                @{profile.username}
              </p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p
                className="text-sm leading-relaxed mb-4 max-w-lg"
                style={accentColor ? { color: accentColor, opacity: 0.85 } : { color: "var(--foreground)" }}
                data-testid="text-bio"
              >
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3" data-testid="social-links">
                {socials.map((s) => (
                  <SocialBadge key={s.label} href={s.href} icon={s.icon} label={s.label} accentColor={accentColor || "hsl(var(--primary))"} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Member since / stats */}
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
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen] = useState(false);

  const resolvedUsername = paramUsername || authUser?.username;

  const { data: profile, isLoading, error } = useQuery<PublicUser>({
    queryKey: ["/api/profile", resolvedUsername],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${resolvedUsername}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !!resolvedUsername,
  });

  const isOwnProfile = !!authUser && profile?.username === authUser.username;

  if (!resolvedUsername && !authUser) {
    setLocation("/auth");
    return null;
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

  return (
    <>
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" side="right">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <ProfileEditPanel
            user={profile}
            onSaved={() => setEditOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <ProfileView
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditOpen(true)}
      />
    </>
  );
}
