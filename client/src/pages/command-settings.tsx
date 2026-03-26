import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, Image, Type, Eye, EyeOff, Globe, Link2, Package, Pencil, Trash2, Plus,
  Palette, RotateCcw, AlignLeft, Layers, Share2, Server, GripVertical, ExternalLink,
  ChevronUp, ChevronDown, Settings2, Layout, Star,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { FileUploadWithFallback } from "@/components/file-upload";
import type { BrandAsset, InsertBrandAsset, PlatformSocialLink } from "@shared/schema";
import { hexToHsl, hslToHex } from "@/lib/colorUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─────────────────────────────────────────────────────────
// Section Keys
// ─────────────────────────────────────────────────────────
const SECTION_KEYS = [
  { key: "section.platformGrid.visible", label: "Platform Grid", description: "The six platform section cards (Wiki, Store, Music, etc.)" },
  { key: "section.recordsSpotlight.visible", label: "RECORDS Spotlight", description: "The SEVCO RECORDS promotional section with purple gradient background" },
  { key: "section.storePreview.visible", label: "Store Preview", description: "\"Shop the latest\" — featured products grid" },
  { key: "section.wikiLatest.visible", label: "Wiki Latest", description: "\"Latest knowledge\" — recent wiki articles" },
  { key: "section.communityCta.visible", label: "Community CTA", description: "Discord join section at the bottom" },
];

const ASSET_TYPES = [
  { value: "logo", label: "Logo" },
  { value: "color_palette", label: "Color Palette" },
  { value: "font", label: "Font / Typography" },
  { value: "banner", label: "Banner" },
  { value: "icon", label: "Icon" },
  { value: "other", label: "Other" },
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  logo: "Logo",
  color_palette: "Color Palette",
  font: "Font",
  banner: "Banner",
  icon: "Icon",
  other: "Other",
};

function toBool(val: string | undefined): boolean {
  return val !== "false";
}

const EMPTY_ASSET: Omit<InsertBrandAsset, "id"> = {
  name: "",
  description: "",
  assetType: "logo",
  downloadUrl: "",
  previewUrl: "",
  fileFormat: "",
  displayOrder: 0,
  isPublic: true,
};

// ─────────────────────────────────────────────────────────
// Social Link parts (copied from command-social-links)
// ─────────────────────────────────────────────────────────
const ICON_SUGGESTIONS = [
  "SiFacebook", "SiInstagram", "SiYoutube", "SiTiktok", "SiX", "SiThreads",
  "SiLinkedin", "SiBluesky", "SiSnapchat", "SiPinterest", "SiVimeo",
  "SiGithub", "SiDiscord", "SiSoundcloud", "SiSpotify", "SiApplemusic",
  "SiPatreon", "SiTwitch",
];

const addLinkSchema = z.object({
  platform: z.string().min(1, "Platform name is required"),
  url: z.string().url("Must be a valid URL"),
  iconName: z.string().min(1, "Icon name is required"),
  displayOrder: z.number().int().default(0),
  showInFooter: z.boolean().default(true),
  showOnContact: z.boolean().default(false),
  showOnListen: z.boolean().default(false),
});

type AddLinkData = z.infer<typeof addLinkSchema>;

function SocialLinkDialog({
  open,
  onClose,
  existing,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  existing?: PlatformSocialLink;
  nextOrder: number;
}) {
  const { toast } = useToast();
  const isEdit = !!existing;

  const form = useForm<AddLinkData>({
    resolver: zodResolver(addLinkSchema),
    defaultValues: existing
      ? {
          platform: existing.platform,
          url: existing.url,
          iconName: existing.iconName,
          displayOrder: existing.displayOrder,
          showInFooter: existing.showInFooter,
          showOnContact: existing.showOnContact,
          showOnListen: existing.showOnListen,
        }
      : {
          platform: "",
          url: "",
          iconName: "",
          displayOrder: nextOrder,
          showInFooter: true,
          showOnContact: false,
          showOnListen: false,
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddLinkData) => {
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/social-links/${existing!.id}`, data);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/social-links", data);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-links"] });
      toast({ title: isEdit ? "Social link updated" : "Social link added" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save link", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Social Link" : "Add Social Link"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3">
            <FormField control={form.control} name="platform" render={({ field }) => (
              <FormItem>
                <FormLabel>Platform Name</FormLabel>
                <FormControl><Input {...field} placeholder="Instagram" data-testid="input-social-platform" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="url" render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl><Input {...field} placeholder="https://..." data-testid="input-social-url" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="iconName" render={({ field }) => (
              <FormItem>
                <FormLabel>Icon Name</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-1">
                    <Input {...field} placeholder="SiInstagram" data-testid="input-social-icon" list="icon-list" />
                    <datalist id="icon-list">
                      {ICON_SUGGESTIONS.map((i) => <option key={i} value={i} />)}
                    </datalist>
                    <p className="text-[10px] text-muted-foreground">Use react-icons/si name, e.g. SiInstagram</p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex flex-wrap gap-4">
              <FormField control={form.control} name="showInFooter" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-footer" />
                  </FormControl>
                  <Label className="text-xs">Show in Footer</Label>
                </FormItem>
              )} />
              <FormField control={form.control} name="showOnContact" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-contact" />
                  </FormControl>
                  <Label className="text-xs">Show on Contact</Label>
                </FormItem>
              )} />
              <FormField control={form.control} name="showOnListen" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-listen" />
                  </FormControl>
                  <Label className="text-xs">Show on Listen</Label>
                </FormItem>
              )} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-social">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SocialLinkRow({ link, onEdit }: { link: PlatformSocialLink; onEdit: (l: PlatformSocialLink) => void }) {
  const { toast } = useToast();

  const toggleFooter = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/social-links/${link.id}`, { showInFooter: !link.showInFooter }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/social-links"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const toggleContact = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/social-links/${link.id}`, { showOnContact: !link.showOnContact }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/social-links"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const toggleListen = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/social-links/${link.id}`, { showOnListen: !link.showOnListen }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/social-links"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/social-links/${link.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-links"] });
      toast({ title: "Link removed" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-social-${link.id}`}>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
          <div>
            <p className="text-sm font-medium">{link.platform}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{link.iconName}</p>
          </div>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 max-w-[200px] truncate"
          data-testid={`link-social-url-${link.id}`}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {link.url}
        </a>
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={link.showInFooter}
          onCheckedChange={() => toggleFooter.mutate()}
          disabled={toggleFooter.isPending}
          data-testid={`switch-footer-${link.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={link.showOnContact}
          onCheckedChange={() => toggleContact.mutate()}
          disabled={toggleContact.isPending}
          data-testid={`switch-contact-${link.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={link.showOnListen}
          onCheckedChange={() => toggleListen.mutate()}
          disabled={toggleListen.isPending}
          data-testid={`switch-listen-${link.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(link)}
                data-testid={`button-edit-social-${link.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Remove "${link.platform}"?`)) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-social-${link.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────
// Home Icons Editor types
// ─────────────────────────────────────────────────────────
const LUCIDE_ICON_OPTIONS = [
  "Music", "ShoppingBag", "Folder", "Users", "Zap", "Globe", "Layers",
  "BookOpen", "Briefcase", "Star", "Heart", "Play", "Mic", "Radio",
  "Headphones", "Camera", "Video", "Palette", "Package", "Shield",
  "Rocket", "Trophy", "Sparkles", "Cpu", "Server", "Code", "Database",
  "Map", "Compass", "Coffee", "Flame", "Diamond", "Crown", "Gift",
];

const DEFAULT_ICON_PILLS = [
  { icon: "Music", label: "Music", href: "/music", color: "#f97316" },
  { icon: "ShoppingBag", label: "Store", href: "/store", color: "#f97316" },
  { icon: "Folder", label: "Projects", href: "/projects", color: "#f97316" },
  { icon: "Users", label: "Community", href: "/contact", color: "#f97316" },
  { icon: "Zap", label: "Fast", href: "/", color: "#f97316" },
  { icon: "Globe", label: "Global", href: "/", color: "#f97316" },
  { icon: "Layers", label: "All-in-One", href: "/", color: "#f97316" },
];

type IconPill = { icon: string; label: string; href: string; color: string };

// ─────────────────────────────────────────────────────────
// Platform Section Cards types
// ─────────────────────────────────────────────────────────
type PlatformSection = { label: string; description: string; path: string; iconName: string };

const DEFAULT_PLATFORM_SECTIONS: PlatformSection[] = [
  { label: "Wiki", description: "The internal knowledge base — docs, guides, and company knowledge all in one place.", path: "/wiki", iconName: "BookOpen" },
  { label: "Store", description: "Merchandise, exclusive drops, and products from the SEVCO universe.", path: "/store", iconName: "ShoppingBag" },
  { label: "Music", description: "SEVCO RECORDS — releases, artists, and a catalog built for independent creators.", path: "/music", iconName: "Music" },
  { label: "Projects", description: "SEVCO Ventures — active companies, initiatives, and what's next.", path: "/projects", iconName: "Folder" },
  { label: "Services", description: "Engineering, design, marketing, and more — what we build for partners.", path: "/services", iconName: "Briefcase" },
  { label: "Community", description: "Join the Discord, follow along, and be part of everything SEVCO.", path: "/contact", iconName: "Users" },
];

// ─────────────────────────────────────────────────────────
// Footer Sitemap types
// ─────────────────────────────────────────────────────────
type SitemapLink = { label: string; path: string; external?: boolean };
type SitemapColumn = { heading: string; links: SitemapLink[] };

const DEFAULT_SITEMAP: SitemapColumn[] = [
  {
    heading: "Platform",
    links: [
      { label: "Home", path: "/" },
      { label: "Wiki", path: "/wiki" },
      { label: "Feed", path: "/feed" },
      { label: "Changelog", path: "/changelog" },
      { label: "About", path: "/about" },
    ],
  },
  {
    heading: "Music",
    links: [
      { label: "RECORDS", path: "/music" },
      { label: "Listen", path: "/listen" },
      { label: "Artists", path: "/music/artists" },
      { label: "Submit Music", path: "/music/submit" },
    ],
  },
  {
    heading: "Commerce",
    links: [
      { label: "Store", path: "/store" },
      { label: "Services", path: "/services" },
      { label: "Hosting", path: "/domains" },
      { label: "Jobs", path: "/jobs" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Discord", path: "https://discord.gg/sevco", external: true },
      { label: "Contact", path: "/contact" },
    ],
  },
  {
    heading: "Legal & Info",
    links: [
      { label: "Privacy Policy", path: "/wiki/privacy-policy" },
      { label: "Terms of Service", path: "/wiki/terms-of-service" },
      { label: "Refund Policy", path: "/wiki/refund-policy" },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// Main Settings Page
// ─────────────────────────────────────────────────────────
export default function CommandSettings() {
  const { toast } = useToast();
  const { isAdmin } = usePermission();

  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const mutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      return apiRequest("PUT", "/api/platform-settings", entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Display state ──
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [heroText, setHeroText] = useState("");
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(70);
  const [footerTagline, setFooterTagline] = useState("");
  const [btn1Label, setBtn1Label] = useState("");
  const [btn1Url, setBtn1Url] = useState("");
  const [btn1Icon, setBtn1Icon] = useState("");
  const [btn2Label, setBtn2Label] = useState("");
  const [btn2Url, setBtn2Url] = useState("");
  const [btn2Icon, setBtn2Icon] = useState("");
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({});
  const [faviconUrl, setFaviconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [platformLogoUrl, setPlatformLogoUrl] = useState("");

  // ── Color state ──
  const DEFAULT_COLORS = {
    lightPrimary: "225 60% 48%",
    lightBackground: "210 20% 98%",
    lightForeground: "220 20% 12%",
    lightAccent: "220 14% 93%",
    darkPrimary: "225 65% 58%",
    darkBackground: "222 20% 8%",
    darkForeground: "210 20% 92%",
    darkAccent: "222 14% 16%",
    brandMain: "",
    brandSecondary: "",
    brandAccent: "",
    brandHighlight: "",
    navActiveHighlight: "",
  };

  const [lightPrimary, setLightPrimary] = useState(DEFAULT_COLORS.lightPrimary);
  const [lightBackground, setLightBackground] = useState(DEFAULT_COLORS.lightBackground);
  const [lightForeground, setLightForeground] = useState(DEFAULT_COLORS.lightForeground);
  const [lightAccent, setLightAccent] = useState(DEFAULT_COLORS.lightAccent);
  const [darkPrimary, setDarkPrimary] = useState(DEFAULT_COLORS.darkPrimary);
  const [darkBackground, setDarkBackground] = useState(DEFAULT_COLORS.darkBackground);
  const [darkForeground, setDarkForeground] = useState(DEFAULT_COLORS.darkForeground);
  const [darkAccent, setDarkAccent] = useState(DEFAULT_COLORS.darkAccent);
  const [brandMain, setBrandMain] = useState(DEFAULT_COLORS.brandMain);
  const [brandSecondary, setBrandSecondary] = useState(DEFAULT_COLORS.brandSecondary);
  const [brandAccent, setBrandAccent] = useState(DEFAULT_COLORS.brandAccent);
  const [brandHighlight, setBrandHighlight] = useState(DEFAULT_COLORS.brandHighlight);
  const [navActiveHighlight, setNavActiveHighlight] = useState(DEFAULT_COLORS.navActiveHighlight);

  // ── Per-section color state ──
  const [homeCardAccentColor, setHomeCardAccentColor] = useState("");
  const [storeAccentColor, setStoreAccentColor] = useState("");
  const [servicesAccentColor, setServicesAccentColor] = useState("");
  const [musicAccentColor, setMusicAccentColor] = useState("");
  const [wikiTagColor, setWikiTagColor] = useState("");

  // ── Icon pills state ──
  const [iconPills, setIconPills] = useState<IconPill[]>(DEFAULT_ICON_PILLS);

  // ── Platform sections state ──
  const [platformSections, setPlatformSections] = useState<PlatformSection[]>(DEFAULT_PLATFORM_SECTIONS);

  // ── Footer sitemap state ──
  const [sitemapColumns, setSitemapColumns] = useState<SitemapColumn[]>(DEFAULT_SITEMAP);

  useEffect(() => {
    if (isLoading) return;
    setHeroBgUrl(settings["hero.backgroundImageUrl"] ?? "");
    setHeroText(settings["hero.text"] ?? "");
    setHeroOverlayOpacity(settings["hero.overlayOpacity"] ? parseInt(settings["hero.overlayOpacity"]) : 70);
    setFooterTagline(settings["footer.tagline"] ?? "");
    setBtn1Label(settings["hero.button1.label"] ?? "");
    setBtn1Url(settings["hero.button1.url"] ?? "");
    setBtn1Icon(settings["hero.button1.icon"] ?? "");
    setBtn2Label(settings["hero.button2.label"] ?? "");
    setBtn2Url(settings["hero.button2.url"] ?? "");
    setBtn2Icon(settings["hero.button2.icon"] ?? "");
    setFaviconUrl(settings["platform.faviconUrl"] ?? "");
    setOgImageUrl(settings["platform.ogImageUrl"] ?? "");
    setPlatformLogoUrl(settings["platform.logoUrl"] ?? "");
    const vis: Record<string, boolean> = {};
    for (const s of SECTION_KEYS) {
      vis[s.key] = toBool(settings[s.key]);
    }
    setSectionVisibility(vis);
    setLightPrimary(settings["color.light.primary"] || DEFAULT_COLORS.lightPrimary);
    setLightBackground(settings["color.light.background"] || DEFAULT_COLORS.lightBackground);
    setLightForeground(settings["color.light.foreground"] || DEFAULT_COLORS.lightForeground);
    setLightAccent(settings["color.light.accent"] || DEFAULT_COLORS.lightAccent);
    setDarkPrimary(settings["color.dark.primary"] || DEFAULT_COLORS.darkPrimary);
    setDarkBackground(settings["color.dark.background"] || DEFAULT_COLORS.darkBackground);
    setDarkForeground(settings["color.dark.foreground"] || DEFAULT_COLORS.darkForeground);
    setDarkAccent(settings["color.dark.accent"] || DEFAULT_COLORS.darkAccent);
    setBrandMain(settings["color.brand.main"] || DEFAULT_COLORS.brandMain);
    setBrandSecondary(settings["color.brand.secondary"] || DEFAULT_COLORS.brandSecondary);
    setBrandAccent(settings["color.brand.accent"] || DEFAULT_COLORS.brandAccent);
    setBrandHighlight(settings["color.brand.highlight"] || DEFAULT_COLORS.brandHighlight);
    setNavActiveHighlight(settings["color.nav.activeHighlight"] || DEFAULT_COLORS.navActiveHighlight);

    setHomeCardAccentColor(settings["home.cardAccentColor"] || "");
    setStoreAccentColor(settings["store.accentColor"] || "");
    setServicesAccentColor(settings["services.accentColor"] || "");
    setMusicAccentColor(settings["music.accentColor"] || "");
    setWikiTagColor(settings["wiki.tagColor"] || "");

    if (settings["home.iconPills"]) {
      try {
        const parsed = JSON.parse(settings["home.iconPills"]);
        if (Array.isArray(parsed)) setIconPills(parsed);
      } catch {}
    }

    if (settings["home.platformSections"]) {
      try {
        const parsed = JSON.parse(settings["home.platformSections"]);
        if (Array.isArray(parsed) && parsed.length > 0) setPlatformSections(parsed);
      } catch {}
    }

    if (settings["footer.sitemap"]) {
      try {
        const parsed = JSON.parse(settings["footer.sitemap"]);
        if (Array.isArray(parsed)) setSitemapColumns(parsed);
      } catch {}
    }
  }, [settings, isLoading]);

  // ── Display save fns ──
  function saveColors() {
    mutation.mutate({
      "color.light.primary": lightPrimary,
      "color.light.background": lightBackground,
      "color.light.foreground": lightForeground,
      "color.light.accent": lightAccent,
      "color.dark.primary": darkPrimary,
      "color.dark.background": darkBackground,
      "color.dark.foreground": darkForeground,
      "color.dark.accent": darkAccent,
      "color.brand.main": brandMain,
      "color.brand.secondary": brandSecondary,
      "color.brand.accent": brandAccent,
      "color.brand.highlight": brandHighlight,
      "color.nav.activeHighlight": navActiveHighlight,
    });
  }

  function resetColors() {
    mutation.mutate({
      "color.light.primary": "",
      "color.light.background": "",
      "color.light.foreground": "",
      "color.light.accent": "",
      "color.dark.primary": "",
      "color.dark.background": "",
      "color.dark.foreground": "",
      "color.dark.accent": "",
      "color.brand.main": "",
      "color.brand.secondary": "",
      "color.brand.accent": "",
      "color.brand.highlight": "",
      "color.nav.activeHighlight": "",
    });
  }

  function savePerSectionColors() {
    mutation.mutate({
      "home.cardAccentColor": homeCardAccentColor,
      "store.accentColor": storeAccentColor,
      "services.accentColor": servicesAccentColor,
      "music.accentColor": musicAccentColor,
      "wiki.tagColor": wikiTagColor,
    });
  }

  function saveHero() {
    mutation.mutate({
      "platform.logoUrl": platformLogoUrl,
      "hero.backgroundImageUrl": heroBgUrl,
      "hero.text": heroText,
      "hero.overlayOpacity": String(heroOverlayOpacity),
      "footer.tagline": footerTagline,
      "hero.button1.label": btn1Label,
      "hero.button1.url": btn1Url,
      "hero.button1.icon": btn1Icon,
      "hero.button2.label": btn2Label,
      "hero.button2.url": btn2Url,
      "hero.button2.icon": btn2Icon,
    });
  }

  function saveSections() {
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(sectionVisibility)) {
      entries[k] = String(v);
    }
    mutation.mutate(entries);
  }

  function saveAssets() {
    mutation.mutate({
      "platform.faviconUrl": faviconUrl,
      "platform.ogImageUrl": ogImageUrl,
      "platform.logoUrl": platformLogoUrl,
    });
  }

  function saveIconPills() {
    mutation.mutate({ "home.iconPills": JSON.stringify(iconPills) });
  }

  function savePlatformSections() {
    mutation.mutate({ "home.platformSections": JSON.stringify(platformSections) });
  }

  function updatePlatformSection(idx: number, field: keyof PlatformSection, value: string) {
    setPlatformSections((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function resetPlatformSections() {
    setPlatformSections(DEFAULT_PLATFORM_SECTIONS);
    mutation.mutate({ "home.platformSections": "" });
  }

  function saveFooterSitemap() {
    mutation.mutate({ "footer.sitemap": JSON.stringify(sitemapColumns) });
  }

  // ── Brand Assets state ──
  const { data: brandAssets = [], isLoading: brandLoading } = useQuery<BrandAsset[]>({
    queryKey: ["/api/brand-assets"],
  });

  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [assetForm, setAssetForm] = useState<typeof EMPTY_ASSET>({ ...EMPTY_ASSET });

  function openAddDialog() {
    setEditingAsset(null);
    setAssetForm({ ...EMPTY_ASSET });
    setBrandDialogOpen(true);
  }

  function openEditDialog(asset: BrandAsset) {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      description: asset.description ?? "",
      assetType: asset.assetType,
      downloadUrl: asset.downloadUrl,
      previewUrl: asset.previewUrl ?? "",
      fileFormat: asset.fileFormat ?? "",
      displayOrder: asset.displayOrder,
      isPublic: asset.isPublic,
    });
    setBrandDialogOpen(true);
  }

  const createBrandAsset = useMutation({
    mutationFn: async (data: typeof EMPTY_ASSET) =>
      apiRequest("POST", "/api/brand-assets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-assets"] });
      setBrandDialogOpen(false);
      toast({ title: "Asset added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateBrandAsset = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof EMPTY_ASSET }) =>
      apiRequest("PATCH", `/api/brand-assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-assets"] });
      setBrandDialogOpen(false);
      toast({ title: "Asset updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteBrandAsset = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("DELETE", `/api/brand-assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-assets"] });
      toast({ title: "Asset deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleBrandSave() {
    const payload = {
      ...assetForm,
      displayOrder: Number(assetForm.displayOrder) || 0,
    };
    if (editingAsset) {
      updateBrandAsset.mutate({ id: editingAsset.id, data: payload });
    } else {
      createBrandAsset.mutate(payload);
    }
  }

  const isBrandPending = createBrandAsset.isPending || updateBrandAsset.isPending;

  // ── Social Links state ──
  const [showSocialDialog, setShowSocialDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<PlatformSocialLink | undefined>(undefined);

  const { data: socialLinks, isLoading: socialLoading } = useQuery<PlatformSocialLink[]>({
    queryKey: ["/api/social-links"],
  });

  // ─── Icon Pills helpers ───
  function updatePill(idx: number, field: keyof IconPill, value: string) {
    setIconPills((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function addPill() {
    setIconPills((prev) => [...prev, { icon: "Star", label: "New", href: "/", color: "#f97316" }]);
  }

  function removePill(idx: number) {
    setIconPills((prev) => prev.filter((_, i) => i !== idx));
  }

  function movePill(idx: number, dir: -1 | 1) {
    setIconPills((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  // ─── Footer Sitemap helpers ───
  function addColumn() {
    setSitemapColumns((prev) => [...prev, { heading: "New Column", links: [] }]);
  }

  function removeColumn(ci: number) {
    setSitemapColumns((prev) => prev.filter((_, i) => i !== ci));
  }

  function moveColumn(ci: number, dir: -1 | 1) {
    setSitemapColumns((prev) => {
      const next = [...prev];
      const target = ci + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[ci], next[target]] = [next[target], next[ci]];
      return next;
    });
  }

  function updateColumnHeading(ci: number, heading: string) {
    setSitemapColumns((prev) => prev.map((col, i) => i === ci ? { ...col, heading } : col));
  }

  function addLink(ci: number) {
    setSitemapColumns((prev) => prev.map((col, i) =>
      i === ci
        ? { ...col, links: [...col.links, { label: "New Link", path: "/" }] }
        : col
    ));
  }

  function removeLink(ci: number, li: number) {
    setSitemapColumns((prev) => prev.map((col, i) =>
      i === ci ? { ...col, links: col.links.filter((_, j) => j !== li) } : col
    ));
  }

  function updateLink(ci: number, li: number, field: keyof SitemapLink, value: string | boolean) {
    setSitemapColumns((prev) => prev.map((col, i) =>
      i === ci
        ? { ...col, links: col.links.map((lnk, j) => j === li ? { ...lnk, [field]: value } : lnk) }
        : col
    ));
  }

  function moveLink(ci: number, li: number, dir: -1 | 1) {
    setSitemapColumns((prev) => prev.map((col, i) => {
      if (i !== ci) return col;
      const links = [...col.links];
      const target = li + dir;
      if (target < 0 || target >= links.length) return col;
      [links[li], links[target]] = [links[target], links[li]];
      return { ...col, links };
    }));
  }

  // ── Color Picker Row ──
  function ColorPickerRow({
    label,
    hsl,
    onChange,
    testIdBase,
  }: {
    label: string;
    hsl: string;
    onChange: (hsl: string) => void;
    testIdBase: string;
  }) {
    const hexVal = hsl ? hslToHex(hsl) : "#000000";
    return (
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="h-8 w-8 rounded-md border border-border"
            style={{ backgroundColor: hsl ? `hsl(${hsl})` : "transparent" }}
          />
          <input
            type="color"
            value={hexVal}
            onChange={(e) => onChange(hexToHsl(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
            data-testid={`color-picker-${testIdBase}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{hsl || "—"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── DISPLAY ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layout className="h-3.5 w-3.5" />
            Display
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Hero editor, section visibility, and platform assets</p>
        </div>

        <div className="space-y-6">
          {/* Hero Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Hero Editor
              </CardTitle>
              <CardDescription>
                Customize the landing page hero section. Leave the background image URL empty to keep the default gradient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Platform Logo / Icon
                </Label>
                <FileUploadWithFallback
                  bucket="brand-assets"
                  path={`platform-logo/logo.{ext}`}
                  accept="image/*"
                  maxSizeMb={2}
                  currentUrl={platformLogoUrl || null}
                  onUpload={(url) => setPlatformLogoUrl(url)}
                  onUrlChange={(url) => setPlatformLogoUrl(url)}
                  urlValue={platformLogoUrl}
                  label="Upload Logo"
                  urlPlaceholder="https://example.com/logo.png"
                  urlTestId="input-hero-platform-logo-url"
                />
                <p className="text-xs text-muted-foreground">Displayed in the hero and header. Leave empty for the default SEVCO planet icon.</p>
              </div>

              <div className="space-y-2">
                <Label>Hero background image</Label>
                <FileUploadWithFallback
                  bucket="gallery"
                  path={`hero/background.{ext}`}
                  accept="image/*"
                  maxSizeMb={10}
                  currentUrl={heroBgUrl || null}
                  onUpload={(url) => setHeroBgUrl(url)}
                  onUrlChange={(url) => setHeroBgUrl(url)}
                  urlValue={heroBgUrl}
                  label="Upload Background"
                  urlPlaceholder="https://example.com/image.jpg (leave empty for gradient)"
                  urlTestId="input-hero-bg-url"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Overlay Opacity
                  <span className="text-muted-foreground text-xs ml-auto">{heroOverlayOpacity}%</span>
                </Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[heroOverlayOpacity]}
                  onValueChange={([v]) => setHeroOverlayOpacity(v)}
                  data-testid="slider-overlay-opacity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-text">Hero text (tagline)</Label>
                <Textarea
                  id="hero-text"
                  placeholder="One platform for all things SEVCO..."
                  value={heroText}
                  onChange={(e) => setHeroText(e.target.value)}
                  rows={3}
                  data-testid="input-hero-text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer-tagline" className="flex items-center gap-1.5">
                  <AlignLeft className="h-3.5 w-3.5" />
                  Footer Tagline
                </Label>
                <Input
                  id="footer-tagline"
                  placeholder="The creative platform for the SEVCO universe."
                  value={footerTagline}
                  onChange={(e) => setFooterTagline(e.target.value)}
                  data-testid="input-footer-tagline"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Type className="h-3.5 w-3.5" />
                  Button 1 (Primary)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="btn1-label" className="text-xs">Label</Label>
                    <Input id="btn1-label" placeholder="Explore the Wiki" value={btn1Label} onChange={(e) => setBtn1Label(e.target.value)} data-testid="input-btn1-label" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="btn1-url" className="text-xs">URL</Label>
                    <Input id="btn1-url" placeholder="/wiki" value={btn1Url} onChange={(e) => setBtn1Url(e.target.value)} data-testid="input-btn1-url" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="btn1-icon" className="text-xs">Icon name (lucide)</Label>
                    <Input id="btn1-icon" placeholder="BookOpen" value={btn1Icon} onChange={(e) => setBtn1Icon(e.target.value)} data-testid="input-btn1-icon" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Type className="h-3.5 w-3.5" />
                  Button 2 (Secondary)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="btn2-label" className="text-xs">Label</Label>
                    <Input id="btn2-label" placeholder="Shop the Store" value={btn2Label} onChange={(e) => setBtn2Label(e.target.value)} data-testid="input-btn2-label" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="btn2-url" className="text-xs">URL</Label>
                    <Input id="btn2-url" placeholder="/store" value={btn2Url} onChange={(e) => setBtn2Url(e.target.value)} data-testid="input-btn2-url" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="btn2-icon" className="text-xs">Icon name (lucide)</Label>
                    <Input id="btn2-icon" placeholder="ShoppingBag" value={btn2Icon} onChange={(e) => setBtn2Icon(e.target.value)} data-testid="input-btn2-icon" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveHero} disabled={mutation.isPending} className="gap-2" data-testid="button-save-hero">
                  <Save className="h-3.5 w-3.5" />
                  Save Hero
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Section Visibility
              </CardTitle>
              <CardDescription>Toggle which sections appear on the public landing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SECTION_KEYS.map((section) => (
                <div key={section.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sectionVisibility[section.key] !== false ? (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Switch
                      checked={sectionVisibility[section.key] !== false}
                      onCheckedChange={(checked) =>
                        setSectionVisibility((prev) => ({ ...prev, [section.key]: checked }))
                      }
                      data-testid={`switch-section-${section.key}`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button onClick={saveSections} disabled={mutation.isPending} className="gap-2" data-testid="button-save-sections">
                  <Save className="h-3.5 w-3.5" />
                  Save Visibility
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Section Cards */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Platform Section Cards
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Edit the 6 cards shown in the "THE PLATFORM" grid on the home page. Each card has a label, description, link path, and Lucide icon name.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground shrink-0"
                  onClick={resetPlatformSections}
                  disabled={mutation.isPending}
                  data-testid="button-reset-platform-sections"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformSections.map((section, idx) => (
                <div key={idx} className="border border-border/60 rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Card {idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={section.label}
                        onChange={(e) => updatePlatformSection(idx, "label", e.target.value)}
                        placeholder="Wiki"
                        data-testid={`input-platform-section-label-${idx}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Icon Name (Lucide)</Label>
                      <Input
                        value={section.iconName}
                        onChange={(e) => updatePlatformSection(idx, "iconName", e.target.value)}
                        placeholder="BookOpen"
                        list={`icon-options-${idx}`}
                        data-testid={`input-platform-section-icon-${idx}`}
                      />
                      <datalist id={`icon-options-${idx}`}>
                        {LUCIDE_ICON_OPTIONS.map((i) => <option key={i} value={i} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link Path</Label>
                    <Input
                      value={section.path}
                      onChange={(e) => updatePlatformSection(idx, "path", e.target.value)}
                      placeholder="/wiki"
                      data-testid={`input-platform-section-path-${idx}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={section.description}
                      onChange={(e) => updatePlatformSection(idx, "description", e.target.value)}
                      placeholder="Short description shown on the card"
                      data-testid={`input-platform-section-description-${idx}`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button onClick={savePlatformSections} disabled={mutation.isPending} className="gap-2" data-testid="button-save-platform-sections">
                  <Save className="h-3.5 w-3.5" />
                  Save Section Cards
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Platform Assets
              </CardTitle>
              <CardDescription>Update the site favicon and social sharing image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Platform Wordmark / Logo
                </Label>
                <FileUploadWithFallback
                  bucket="brand-assets"
                  path={`platform/logo.{ext}`}
                  accept="image/*"
                  maxSizeMb={2}
                  currentUrl={platformLogoUrl || null}
                  onUpload={(url) => setPlatformLogoUrl(url)}
                  onUrlChange={(url) => setPlatformLogoUrl(url)}
                  urlValue={platformLogoUrl}
                  label="Upload Logo"
                  urlPlaceholder="https://example.com/logo.png"
                  urlTestId="input-platform-logo-url"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Favicon
                </Label>
                <FileUploadWithFallback
                  bucket="brand-assets"
                  path={`favicon/favicon.{ext}`}
                  accept="image/*"
                  maxSizeMb={2}
                  currentUrl={faviconUrl || null}
                  onUpload={(url) => setFaviconUrl(url)}
                  onUrlChange={(url) => setFaviconUrl(url)}
                  urlValue={faviconUrl}
                  label="Upload Favicon"
                  urlPlaceholder="https://example.com/favicon.ico"
                  urlTestId="input-favicon-url"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Social image (OG)
                </Label>
                <FileUploadWithFallback
                  bucket="brand-assets"
                  path={`og/og-image.{ext}`}
                  accept="image/*"
                  maxSizeMb={5}
                  currentUrl={ogImageUrl || null}
                  onUpload={(url) => setOgImageUrl(url)}
                  onUrlChange={(url) => setOgImageUrl(url)}
                  urlValue={ogImageUrl}
                  label="Upload OG Image"
                  urlPlaceholder="https://example.com/og-image.jpg"
                  urlTestId="input-og-image-url"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveAssets} disabled={mutation.isPending} className="gap-2" data-testid="button-save-assets">
                  <Save className="h-3.5 w-3.5" />
                  Save Assets
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── BRAND & COLORS ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Brand & Colors
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Brand colors, CSS overrides, and downloadable brand assets</p>
        </div>

        <div className="space-y-6">
          {/* Platform Colors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Platform Colors
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Customize the color scheme across the platform. Changes take effect immediately after saving.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground shrink-0"
                  onClick={resetColors}
                  disabled={mutation.isPending}
                  data-testid="button-reset-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="light">
                <TabsList className="mb-4" data-testid="tabs-color-mode">
                  <TabsTrigger value="light" data-testid="tab-light-mode">Light Mode</TabsTrigger>
                  <TabsTrigger value="dark" data-testid="tab-dark-mode">Dark Mode</TabsTrigger>
                </TabsList>
                <TabsContent value="light" className="space-y-4">
                  <ColorPickerRow label="Primary" hsl={lightPrimary} onChange={setLightPrimary} testIdBase="light-primary" />
                  <ColorPickerRow label="Background" hsl={lightBackground} onChange={setLightBackground} testIdBase="light-background" />
                  <ColorPickerRow label="Foreground" hsl={lightForeground} onChange={setLightForeground} testIdBase="light-foreground" />
                  <ColorPickerRow label="Accent" hsl={lightAccent} onChange={setLightAccent} testIdBase="light-accent" />
                </TabsContent>
                <TabsContent value="dark" className="space-y-4">
                  <ColorPickerRow label="Primary" hsl={darkPrimary} onChange={setDarkPrimary} testIdBase="dark-primary" />
                  <ColorPickerRow label="Background" hsl={darkBackground} onChange={setDarkBackground} testIdBase="dark-background" />
                  <ColorPickerRow label="Foreground" hsl={darkForeground} onChange={setDarkForeground} testIdBase="dark-foreground" />
                  <ColorPickerRow label="Accent" hsl={darkAccent} onChange={setDarkAccent} testIdBase="dark-accent" />
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Brand Colors</p>
                <p className="text-xs text-muted-foreground">Apply globally across both modes and shown on the About page.</p>
                <ColorPickerRow label="Brand Main" hsl={brandMain} onChange={setBrandMain} testIdBase="brand-main" />
                <ColorPickerRow label="Brand Secondary" hsl={brandSecondary} onChange={setBrandSecondary} testIdBase="brand-secondary" />
                <ColorPickerRow label="Brand Accent" hsl={brandAccent} onChange={setBrandAccent} testIdBase="brand-accent" />
                <ColorPickerRow label="Brand Highlight" hsl={brandHighlight} onChange={setBrandHighlight} testIdBase="brand-highlight" />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Navigation</p>
                <p className="text-xs text-muted-foreground">Controls the active item highlight and focus ring color in the sidebar. Leave blank to use the default sidebar accent.</p>
                <ColorPickerRow label="Nav Active Highlight" hsl={navActiveHighlight} onChange={setNavActiveHighlight} testIdBase="nav-active-highlight" />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveColors} disabled={mutation.isPending} className="gap-2" data-testid="button-save-colors">
                  <Save className="h-3.5 w-3.5" />
                  Save Colors
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Per-Section Colors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Per-Section Colors
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Optional accent colors for individual platform sections. Leave empty to use global brand colors or Tailwind defaults.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: homeCardAccentColor ? `hsl(${homeCardAccentColor})` : "transparent" }}
                    />
                    <input
                      type="color"
                      value={homeCardAccentColor ? hslToHex(homeCardAccentColor) : "#000000"}
                      onChange={(e) => setHomeCardAccentColor(hexToHsl(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                      data-testid="color-picker-home-card-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Home Page Cards</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{homeCardAccentColor || "— using defaults"}</p>
                  </div>
                  {homeCardAccentColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => setHomeCardAccentColor("")}
                      data-testid="button-reset-home-card-accent"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: storeAccentColor ? `hsl(${storeAccentColor})` : "transparent" }}
                    />
                    <input
                      type="color"
                      value={storeAccentColor ? hslToHex(storeAccentColor) : "#000000"}
                      onChange={(e) => setStoreAccentColor(hexToHsl(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                      data-testid="color-picker-store-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Store Page</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{storeAccentColor || "— using defaults"}</p>
                  </div>
                  {storeAccentColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => setStoreAccentColor("")}
                      data-testid="button-reset-store-accent"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: servicesAccentColor ? `hsl(${servicesAccentColor})` : "transparent" }}
                    />
                    <input
                      type="color"
                      value={servicesAccentColor ? hslToHex(servicesAccentColor) : "#000000"}
                      onChange={(e) => setServicesAccentColor(hexToHsl(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                      data-testid="color-picker-services-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Services Page</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{servicesAccentColor || "— using defaults"}</p>
                  </div>
                  {servicesAccentColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => setServicesAccentColor("")}
                      data-testid="button-reset-services-accent"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: musicAccentColor ? `hsl(${musicAccentColor})` : "transparent" }}
                    />
                    <input
                      type="color"
                      value={musicAccentColor ? hslToHex(musicAccentColor) : "#000000"}
                      onChange={(e) => setMusicAccentColor(hexToHsl(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                      data-testid="color-picker-music-accent"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Music Page (RECORDS section)</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{musicAccentColor || "— using defaults"}</p>
                  </div>
                  {musicAccentColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => setMusicAccentColor("")}
                      data-testid="button-reset-music-accent"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ backgroundColor: wikiTagColor ? `hsl(${wikiTagColor})` : "transparent" }}
                    />
                    <input
                      type="color"
                      value={wikiTagColor ? hslToHex(wikiTagColor) : "#000000"}
                      onChange={(e) => setWikiTagColor(hexToHsl(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                      data-testid="color-picker-wiki-tag"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Wiki Tags / Highlights</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{wikiTagColor || "— using defaults"}</p>
                  </div>
                  {wikiTagColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => setWikiTagColor("")}
                      data-testid="button-reset-wiki-tag"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={savePerSectionColors} disabled={mutation.isPending} className="gap-2" data-testid="button-save-per-section-colors">
                  <Save className="h-3.5 w-3.5" />
                  Save Section Colors
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Brand Assets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Brand Assets
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Downloadable brand materials shown on the public About page.
                  </CardDescription>
                </div>
                <Button onClick={openAddDialog} size="sm" className="gap-2 shrink-0" data-testid="button-add-brand-asset">
                  <Plus className="h-3.5 w-3.5" />
                  Add Asset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {brandLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : brandAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-brand-assets-empty-cmd">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No brand assets yet. Add your first one above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {brandAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                      data-testid={`row-brand-asset-${asset.id}`}
                    >
                      {(asset.previewUrl || (asset.assetType === "logo" && asset.downloadUrl)) ? (
                        <img
                          src={asset.previewUrl || asset.downloadUrl}
                          alt={asset.name}
                          className="h-10 w-10 object-contain rounded border border-border shrink-0 bg-muted/30"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border border-border bg-muted/30 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                          <Badge variant="secondary" className="text-[10px]" data-testid={`badge-type-${asset.id}`}>
                            {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                          </Badge>
                          {!asset.isPublic && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Private</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(asset)} data-testid={`button-edit-brand-asset-${asset.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteBrandAsset.mutate(asset.id)} disabled={deleteBrandAsset.isPending} data-testid={`button-delete-brand-asset-${asset.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SOCIAL LINKS ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5" />
            Social Links
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage platform social media presence across footer, contact, and listen pages</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {socialLinks && (
              <span className="text-xs text-muted-foreground">{socialLinks.length} link{socialLinks.length !== 1 ? "s" : ""}</span>
            )}
            <Button
              size="sm"
              className="ml-auto h-7 text-xs gap-1"
              onClick={() => { setEditingLink(undefined); setShowSocialDialog(true); }}
              data-testid="button-add-social"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Link
            </Button>
          </div>

          <Card className="overflow-hidden" data-testid="table-social-links">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Platform</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">URL</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Footer</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Contact</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Listen</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {socialLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                      </tr>
                    ))
                  ) : socialLinks && socialLinks.length > 0 ? (
                    socialLinks.map((link) => <SocialLinkRow key={link.id} link={link} onEdit={(l) => { setEditingLink(l); setShowSocialDialog(true); }} />)
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        No social links configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <SocialLinkDialog
            open={showSocialDialog}
            onClose={() => { setShowSocialDialog(false); setEditingLink(undefined); }}
            existing={editingLink}
            nextOrder={socialLinks?.length ?? 0}
          />
        </div>
      </section>

      {/* ── HOSTING ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Server className="h-3.5 w-3.5" />
            Hosting
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Domain and VPS management via Hostinger</p>
        </div>
        <HostingSection />
      </section>

      {/* ── HOME PAGE ICONS ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Star className="h-3.5 w-3.5" />
            Home Page Icons
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Edit the "Why SEVCO" feature pills shown in the hero bar</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Icon Pills Editor
                </CardTitle>
                <CardDescription className="mt-1">
                  Change the icon, label, link, and accent color for each feature pill. Stored in platform settings.
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={addPill} data-testid="button-add-icon-pill">
                <Plus className="h-3.5 w-3.5" />
                Add Pill
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {iconPills.map((pill, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/20"
                data-testid={`row-icon-pill-${idx}`}
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePill(idx, -1)} disabled={idx === 0} data-testid={`button-pill-up-${idx}`}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move up</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePill(idx, 1)} disabled={idx === iconPills.length - 1} data-testid={`button-pill-down-${idx}`}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move down</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Icon</Label>
                    <Select value={pill.icon} onValueChange={(v) => updatePill(idx, "icon", v)}>
                      <SelectTrigger className="h-7 text-xs" data-testid={`select-pill-icon-${idx}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LUCIDE_ICON_OPTIONS.map((ic) => (
                          <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                    <Input
                      className="h-7 text-xs"
                      value={pill.label}
                      onChange={(e) => updatePill(idx, "label", e.target.value)}
                      placeholder="Label"
                      data-testid={`input-pill-label-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Link URL</Label>
                    <Input
                      className="h-7 text-xs"
                      value={pill.href}
                      onChange={(e) => updatePill(idx, "href", e.target.value)}
                      placeholder="/page"
                      data-testid={`input-pill-href-${idx}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Accent Color</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative shrink-0">
                        <div className="h-7 w-7 rounded-md border border-border" style={{ backgroundColor: pill.color }} />
                        <input
                          type="color"
                          value={pill.color}
                          onChange={(e) => updatePill(idx, "color", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                          data-testid={`color-pill-${idx}`}
                        />
                      </div>
                      <Input
                        className="h-7 text-xs font-mono"
                        value={pill.color}
                        onChange={(e) => updatePill(idx, "color", e.target.value)}
                        placeholder="#f97316"
                        data-testid={`input-pill-color-${idx}`}
                      />
                    </div>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removePill(idx)}
                      data-testid={`button-remove-pill-${idx}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              </div>
            ))}

            {iconPills.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No icon pills. Add one above.</p>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={saveIconPills} disabled={mutation.isPending} className="gap-2" data-testid="button-save-icon-pills">
                <Save className="h-3.5 w-3.5" />
                Save Icon Pills
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── FOOTER SITEMAP ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layout className="h-3.5 w-3.5" />
            Footer Sitemap
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Edit the footer navigation columns and links</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Footer Editor
                </CardTitle>
                <CardDescription className="mt-1">
                  Add, remove, and reorder footer columns and their links. Stored in platform settings.
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={addColumn} data-testid="button-add-footer-column">
                <Plus className="h-3.5 w-3.5" />
                Add Column
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sitemapColumns.map((col, ci) => (
              <div key={ci} className="border border-border rounded-lg p-4 space-y-3" data-testid={`footer-column-${ci}`}>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(ci, -1)} disabled={ci === 0} data-testid={`button-col-up-${ci}`}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move up</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(ci, 1)} disabled={ci === sitemapColumns.length - 1} data-testid={`button-col-down-${ci}`}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Move down</TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    className="h-8 text-sm font-semibold flex-1"
                    value={col.heading}
                    onChange={(e) => updateColumnHeading(ci, e.target.value)}
                    placeholder="Column Heading"
                    data-testid={`input-col-heading-${ci}`}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeColumn(ci)} data-testid={`button-remove-col-${ci}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove column</TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-2 pl-8">
                  {col.links.map((lnk, li) => (
                    <div key={li} className="flex items-center gap-2" data-testid={`footer-link-${ci}-${li}`}>
                      <div className="flex flex-col gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveLink(ci, li, -1)} disabled={li === 0} data-testid={`button-link-up-${ci}-${li}`}>
                              <ChevronUp className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move up</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveLink(ci, li, 1)} disabled={li === col.links.length - 1} data-testid={`button-link-down-${ci}-${li}`}>
                              <ChevronDown className="h-2.5 w-2.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move down</TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        className="h-7 text-xs flex-1"
                        value={lnk.label}
                        onChange={(e) => updateLink(ci, li, "label", e.target.value)}
                        placeholder="Label"
                        data-testid={`input-link-label-${ci}-${li}`}
                      />
                      <Input
                        className="h-7 text-xs flex-1"
                        value={lnk.path}
                        onChange={(e) => updateLink(ci, li, "path", e.target.value)}
                        placeholder="/path or https://..."
                        data-testid={`input-link-path-${ci}-${li}`}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={!!lnk.external}
                                onCheckedChange={(v) => updateLink(ci, li, "external", v)}
                                className="scale-75"
                                data-testid={`switch-link-external-${ci}-${li}`}
                              />
                              <span className="text-[10px] text-muted-foreground">Ext</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Open in new tab</TooltipContent>
                        </Tooltip>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeLink(ci, li)} data-testid={`button-remove-link-${ci}-${li}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove link</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 mt-1"
                    onClick={() => addLink(ci)}
                    data-testid={`button-add-link-${ci}`}
                  >
                    <Plus className="h-3 w-3" />
                    Add Link
                  </Button>
                </div>
              </div>
            ))}

            {sitemapColumns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No footer columns. Add one above.</p>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={saveFooterSitemap} disabled={mutation.isPending} className="gap-2" data-testid="button-save-footer-sitemap">
                <Save className="h-3.5 w-3.5" />
                Save Footer
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Add/Edit Brand Asset Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Brand Asset" : "Add Brand Asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="asset-name">Name <span className="text-destructive">*</span></Label>
              <Input id="asset-name" placeholder="SEVCO Primary Logo — Black" value={assetForm.name} onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))} data-testid="input-asset-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-description">Description</Label>
              <Textarea id="asset-description" placeholder="For use on light backgrounds" value={assetForm.description ?? ""} onChange={(e) => setAssetForm((f) => ({ ...f, description: e.target.value }))} rows={2} data-testid="input-asset-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asset-type">Asset Type <span className="text-destructive">*</span></Label>
                <Select value={assetForm.assetType} onValueChange={(v) => setAssetForm((f) => ({ ...f, assetType: v }))}>
                  <SelectTrigger id="asset-type" data-testid="select-asset-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-format">File Format</Label>
                <Input id="asset-format" placeholder="PNG, SVG, PDF..." value={assetForm.fileFormat ?? ""} onChange={(e) => setAssetForm((f) => ({ ...f, fileFormat: e.target.value }))} data-testid="input-asset-format" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Download / Asset File <span className="text-destructive">*</span></Label>
              <FileUploadWithFallback
                bucket="brand-assets"
                path={`assets/${assetForm.name.replace(/\s+/g, "-").toLowerCase() || "file"}.{ext}`}
                accept="image/*,.pdf,.svg,.zip,.ai,.eps"
                maxSizeMb={25}
                currentUrl={assetForm.downloadUrl || null}
                onUpload={(url) => setAssetForm((f) => ({ ...f, downloadUrl: url }))}
                onUrlChange={(url) => setAssetForm((f) => ({ ...f, downloadUrl: url }))}
                urlValue={assetForm.downloadUrl}
                label="Upload Asset"
                urlPlaceholder="https://cdn.sevco.com/logo-black.png"
                urlTestId="input-asset-download-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preview Image <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <FileUploadWithFallback
                bucket="brand-assets"
                path={`previews/${assetForm.name.replace(/\s+/g, "-").toLowerCase() || "preview"}-thumb.{ext}`}
                accept="image/*"
                maxSizeMb={5}
                currentUrl={assetForm.previewUrl || null}
                onUpload={(url) => setAssetForm((f) => ({ ...f, previewUrl: url }))}
                onUrlChange={(url) => setAssetForm((f) => ({ ...f, previewUrl: url }))}
                urlValue={assetForm.previewUrl ?? ""}
                label="Upload Preview"
                urlPlaceholder="https://cdn.sevco.com/logo-black-thumb.png"
                urlTestId="input-asset-preview-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="asset-order">Display Order</Label>
                <Input id="asset-order" type="number" placeholder="0" value={assetForm.displayOrder} onChange={(e) => setAssetForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} data-testid="input-asset-order" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={assetForm.isPublic} onCheckedChange={(checked) => setAssetForm((f) => ({ ...f, isPublic: checked }))} id="asset-public" data-testid="switch-asset-public" />
                <Label htmlFor="asset-public" className="cursor-pointer">Public</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)} data-testid="button-cancel-brand-asset">Cancel</Button>
            <Button onClick={handleBrandSave} disabled={isBrandPending || !assetForm.name || !assetForm.downloadUrl} data-testid="button-save-brand-asset">
              {isBrandPending ? "Saving…" : editingAsset ? "Save Changes" : "Add Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Hosting Section (inline from command-hosting)
// ─────────────────────────────────────────────────────────
import { Badge as HostingBadge } from "@/components/ui/badge";

interface VirtualMachine {
  id: number;
  hostname: string;
  state: string;
  ip_address?: string;
  ipv4?: Array<{ address: string; reverse_dns?: string }>;
  cpus?: number;
  memory?: number;
  disk?: number;
  bandwidth?: { used: number; total: number };
  datacenter?: { city?: string; country?: string; name?: string };
  template?: { name?: string };
  uptime?: number;
}

interface VpsListResponse {
  data?: VirtualMachine[];
}

import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin,
  Network,
  Clock,
} from "lucide-react";

function StatusBadge({ state }: { state: string }) {
  const isRunning = state === "running";
  return (
    <HostingBadge
      className={`text-xs font-semibold ${
        isRunning
          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
      }`}
      data-testid="badge-vps-state"
    >
      {isRunning ? (
        <CheckCircle2 className="h-3 w-3 mr-1 inline" />
      ) : (
        <AlertCircle className="h-3 w-3 mr-1 inline" />
      )}
      {state}
    </HostingBadge>
  );
}

function MetricRow({ icon: Icon, label, value, subValue }: { icon: React.ElementType; label: string; value: string; subValue?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground" data-testid={`vps-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      </div>
      {subValue && <p className="text-xs text-muted-foreground shrink-0">{subValue}</p>}
    </div>
  );
}

function VpsCard({ vm }: { vm: VirtualMachine }) {
  const primaryIp = vm.ipv4?.[0]?.address ?? vm.ip_address ?? "N/A";
  const location = vm.datacenter
    ? [vm.datacenter.city, vm.datacenter.country].filter(Boolean).join(", ")
    : "Unknown";
  const memoryGb = vm.memory ? (vm.memory / 1024).toFixed(1) : null;
  const diskGb = vm.disk ? (vm.disk / 1024).toFixed(0) : null;

  function formatUptime(secs?: number) {
    if (!secs) return null;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join(" ") || "< 1m";
  }

  return (
    <Card className="overflow-visible" data-testid={`card-vps-${vm.id}`}>
      <div className="p-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold" data-testid="vps-hostname">{vm.hostname}</p>
              <p className="text-xs text-muted-foreground">ID: {vm.id}</p>
            </div>
          </div>
          <StatusBadge state={vm.state} />
        </div>
      </div>
      <div className="p-4 space-y-0">
        {primaryIp !== "N/A" && <MetricRow icon={Network} label="IP Address" value={primaryIp} />}
        {location !== "Unknown" && <MetricRow icon={MapPin} label="Datacenter" value={location} />}
        {vm.cpus && <MetricRow icon={Cpu} label="vCPUs" value={`${vm.cpus} core${vm.cpus !== 1 ? "s" : ""}`} />}
        {memoryGb && <MetricRow icon={MemoryStick} label="RAM" value={`${memoryGb} GB`} />}
        {diskGb && <MetricRow icon={HardDrive} label="Disk" value={`${diskGb} GB`} />}
        {vm.bandwidth && (
          <MetricRow
            icon={Globe}
            label="Bandwidth"
            value={`${((vm.bandwidth.used ?? 0) / 1024).toFixed(1)} GB used`}
            subValue={`of ${((vm.bandwidth.total ?? 0) / 1024).toFixed(0)} GB`}
          />
        )}
        {vm.template?.name && <MetricRow icon={Server} label="OS" value={vm.template.name} />}
        {vm.uptime !== undefined && <MetricRow icon={Clock} label="Uptime" value={formatUptime(vm.uptime) ?? "N/A"} />}
      </div>
      <div className="p-3 border-t border-border/60 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
          <a href="https://hpanel.hostinger.com/vps" target="_blank" rel="noopener noreferrer" data-testid="link-vps-hpanel">
            <ExternalLink className="h-3 w-3" />
            Manage in hPanel
          </a>
        </Button>
      </div>
    </Card>
  );
}

function HostingSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<VpsListResponse>({
    queryKey: ["/api/hostinger/vps"],
    retry: 1,
  });

  const vms: VirtualMachine[] = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Live status from Hostinger API</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching} data-testid="button-vps-refresh">
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="p-4 overflow-visible">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-6 overflow-visible text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive opacity-60" />
          <p className="text-sm font-medium mb-1">Failed to load VPS data</p>
          <p className="text-xs text-muted-foreground mb-3" data-testid="text-vps-error">
            {(error as Error)?.message || "Unable to connect to Hostinger API."}
          </p>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </Card>
      ) : vms.length === 0 ? (
        <Card className="p-10 text-center overflow-visible">
          <Server className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium mb-1">No VPS found</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            No virtual machines are linked to this Hostinger API key.
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" asChild>
            <a href="https://www.hostinger.com/vps-hosting" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Browse VPS Plans
            </a>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vms.map((vm) => (
            <VpsCard key={vm.id} vm={vm} />
          ))}
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Domain portfolio and DNS settings are managed through Hostinger hPanel.
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" asChild>
            <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener noreferrer" data-testid="link-hpanel">
              <ExternalLink className="h-3 w-3" />
              Open hPanel
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
