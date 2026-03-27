import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, Image, Type, Eye, EyeOff, Globe, Link2, Package, Pencil, Trash2, Plus,
  Palette, RotateCcw, AlignLeft, Layers, Share2, Server, GripVertical, ExternalLink,
  ChevronUp, ChevronDown, Settings2, Layout, Star, BarChart2, CheckCircle2, AlertCircle,
  Mail, Send, Search, X,
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

const EMPTY_ASSET: InsertBrandAsset = {
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
// Default color swatches
// ─────────────────────────────────────────────────────────
const SWATCH_PALETTE = [
  "#FFFFFF", "#000000", "#0037ff", "#bd0000", "#fbc318", "#00a811",
  "#1a1a2e", "#f5f5f5", "#6b7280", "#7c3aed", "#0891b2",
];

// ─────────────────────────────────────────────────────────
// Social Link parts
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
                aria-label="Edit"
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
                aria-label="Delete"
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
// Email Diagnostics Panel
// ─────────────────────────────────────────────────────────
function EmailDiagnosticsPanel() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({ title: "Email required", description: "Enter an email address to send the test to.", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/send-test-email", { email: testEmail });
      const data = await res.json();
      setLastResult({ success: data.success !== false, message: data.message });
      if (data.success !== false) {
        toast({ title: "Test email sent", description: data.message });
      } else {
        toast({ title: "Test email failed", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Failed to send test email";
      setLastResult({ success: false, message: msg });
      toast({ title: "Test email failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="input-test-email">Recipient Email</Label>
        <div className="flex gap-2">
          <Input
            id="input-test-email"
            data-testid="input-test-email"
            type="email"
            placeholder="admin@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
          />
          <Button
            onClick={handleSendTest}
            disabled={sending}
            data-testid="button-send-test-email"
            size="sm"
          >
            {sending ? (
              <>Sending…</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Send Test
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sends a test email via Resend to confirm the integration is live. Check your inbox and server logs for details.
        </p>
      </div>
      {lastResult && (
        <div
          data-testid="text-test-email-result"
          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            lastResult.success
              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
              : "bg-destructive/10 border-destructive/30"
          }`}
        >
          {lastResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          )}
          <span className={lastResult.success ? "text-green-800 dark:text-green-300" : "text-destructive"}>
            {lastResult.message}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Color Picker Row (reusable)
// ─────────────────────────────────────────────────────────
function ColorPickerRow({
  label,
  hsl,
  onChange,
  testIdBase,
  showSwatches = false,
}: {
  label: string;
  hsl: string;
  onChange: (hsl: string) => void;
  testIdBase: string;
  showSwatches?: boolean;
}) {
  const hexVal = hsl ? hslToHex(hsl) : "#000000";
  return (
    <div className="space-y-1.5">
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
        {hsl && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear"
            className="h-6 w-6 text-muted-foreground shrink-0"
            onClick={() => onChange("")}
            data-testid={`button-clear-${testIdBase}`}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      {showSwatches && (
        <div className="flex flex-wrap gap-1.5 pl-11">
          {SWATCH_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              className="h-5 w-5 rounded border border-border/60 hover:scale-110 transition-transform"
              style={{ backgroundColor: hex }}
              onClick={() => onChange(hexToHsl(hex))}
              data-testid={`swatch-${testIdBase}-${hex.replace("#", "")}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Live Preview Panel (Theme tab)
// ─────────────────────────────────────────────────────────
function LivePreviewPanel({
  primary,
  primaryFg,
  secondary,
  secondaryFg,
  background,
  foreground,
  card,
  cardFg,
  sidebarAccent,
  sidebarAccentFg,
}: {
  primary: string;
  primaryFg: string;
  secondary: string;
  secondaryFg: string;
  background: string;
  foreground: string;
  card: string;
  cardFg: string;
  sidebarAccent: string;
  sidebarAccentFg: string;
}) {
  const toHexOrDefault = (hsl: string, fallback: string) => hsl ? hslToHex(hsl) : fallback;

  const bgColor = toHexOrDefault(background, "#f8f8fa");
  const fgColor = toHexOrDefault(foreground, "#111827");
  const cardColor = toHexOrDefault(card, "#ffffff");
  const cardFgColor = toHexOrDefault(cardFg, "#111827");
  const primaryColor = toHexOrDefault(primary, "#3557ff");
  const primaryFgColor = toHexOrDefault(primaryFg, "#ffffff");
  const secondaryColor = toHexOrDefault(secondary, "#e5e7eb");
  const secondaryFgColor = toHexOrDefault(secondaryFg, "#374151");
  const sidebarColor = toHexOrDefault(sidebarAccent, "#e8eaf0");
  const sidebarFgColor = toHexOrDefault(sidebarAccentFg, "#1f2937");

  return (
    <div className="rounded-lg border border-border overflow-hidden text-[10px]" style={{ backgroundColor: bgColor, color: fgColor }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ backgroundColor: primaryColor, color: primaryFgColor }}>
        <div className="w-4 h-4 rounded-full border border-current/40 flex items-center justify-center text-[8px] font-bold">S</div>
        <span className="font-semibold text-[10px]">SEVCO</span>
        <div className="ml-auto flex gap-1.5">
          <div className="h-3 px-1.5 rounded text-[8px] flex items-center" style={{ backgroundColor: `${primaryFgColor}22` }}>Nav</div>
          <div className="h-3 px-1.5 rounded text-[8px] flex items-center" style={{ backgroundColor: `${primaryFgColor}22` }}>Store</div>
        </div>
      </div>
      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-16 p-2 border-r space-y-1" style={{ backgroundColor: bgColor }}>
          <div className="h-5 px-2 rounded flex items-center gap-1" style={{ backgroundColor: sidebarColor, color: sidebarFgColor }}>
            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
            <span className="text-[8px]">Home</span>
          </div>
          <div className="h-5 px-2 rounded flex items-center gap-1 opacity-50">
            <div className="w-2 h-2 rounded-full border border-current/40" />
            <span className="text-[8px]">Wiki</span>
          </div>
          <div className="h-5 px-2 rounded flex items-center gap-1 opacity-50">
            <div className="w-2 h-2 rounded-full border border-current/40" />
            <span className="text-[8px]">Store</span>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 p-2 space-y-2">
          <div className="rounded border p-2 space-y-1.5" style={{ backgroundColor: cardColor, color: cardFgColor }}>
            <p className="font-semibold text-[10px]">Platform Card</p>
            <p className="text-[8px] opacity-60">Body text in card foreground color</p>
            <div className="flex gap-1.5 mt-1">
              <div className="h-5 px-2 rounded text-[8px] flex items-center font-medium" style={{ backgroundColor: primaryColor, color: primaryFgColor }}>
                Primary
              </div>
              <div className="h-5 px-2 rounded text-[8px] flex items-center font-medium border" style={{ backgroundColor: secondaryColor, color: secondaryFgColor }}>
                Secondary
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="h-4 flex-1 rounded" style={{ backgroundColor: `${fgColor}10` }} />
            <div className="h-4 w-8 rounded" style={{ backgroundColor: `${fgColor}10` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Settings Page
// ─────────────────────────────────────────────────────────
export default function CommandSettings() {
  const { toast } = useToast();
  const { isAdmin } = usePermission();

  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const { data: ga4Status } = useQuery<{
    configured: boolean;
    hasServiceAccount: boolean;
    propertyId: string | null;
    measurementId: string | null;
  }>({
    queryKey: ["/api/analytics/ga4/status"],
  });

  const mutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      return apiRequest("PUT", "/api/platform-settings", entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meta"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ga4/status"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("display");

  // ── Display state ──
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [heroText, setHeroText] = useState("");
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(70);
  const [footerTagline, setFooterTagline] = useState("");
  const [footerVersion, setFooterVersion] = useState("");
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

  // ── Analytics state ──
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
  const [ga4PropertyId, setGa4PropertyId] = useState("");

  // ── Theme color state ──
  // Defaults aligned to: #0037ff, #bd0000, #fbc318, #00a811 palette
  const DEFAULT_COLORS = {
    lightPrimary: "225 100% 50%",
    lightBackground: "0 0% 100%",
    lightForeground: "224 71% 4%",
    lightAccent: "210 40% 96%",
    darkPrimary: "225 100% 65%",
    darkBackground: "222 47% 11%",
    darkForeground: "210 40% 98%",
    darkAccent: "222 14% 16%",
    brandMain: "",
    brandSecondary: "",
    brandAccent: "",
    brandHighlight: "",
  };

  const [lightPrimary, setLightPrimary] = useState(DEFAULT_COLORS.lightPrimary);
  const [lightPrimaryFg, setLightPrimaryFg] = useState("0 0% 100%");
  const [lightBackground, setLightBackground] = useState(DEFAULT_COLORS.lightBackground);
  const [lightForeground, setLightForeground] = useState(DEFAULT_COLORS.lightForeground);
  const [lightAccent, setLightAccent] = useState(DEFAULT_COLORS.lightAccent);
  const [lightAccentFg, setLightAccentFg] = useState("224 71% 4%");
  const [lightSecondary, setLightSecondary] = useState("0 100% 37%");
  const [lightSecondaryFg, setLightSecondaryFg] = useState("0 0% 100%");
  const [lightCard, setLightCard] = useState("0 0% 100%");
  const [lightCardFg, setLightCardFg] = useState("224 71% 4%");
  const [lightMuted, setLightMuted] = useState("210 40% 96%");
  const [lightMutedFg, setLightMutedFg] = useState("215 16% 47%");
  const [lightBorder, setLightBorder] = useState("214 32% 91%");
  const [lightDestructive, setLightDestructive] = useState("0 72% 37%");
  const [darkPrimary, setDarkPrimary] = useState(DEFAULT_COLORS.darkPrimary);
  const [darkBackground, setDarkBackground] = useState(DEFAULT_COLORS.darkBackground);
  const [darkForeground, setDarkForeground] = useState(DEFAULT_COLORS.darkForeground);
  const [darkAccent, setDarkAccent] = useState(DEFAULT_COLORS.darkAccent);
  const [brandMain, setBrandMain] = useState(DEFAULT_COLORS.brandMain);
  const [brandSecondary, setBrandSecondary] = useState(DEFAULT_COLORS.brandSecondary);
  const [brandAccent, setBrandAccent] = useState(DEFAULT_COLORS.brandAccent);
  const [brandHighlight, setBrandHighlight] = useState(DEFAULT_COLORS.brandHighlight);

  // ── Nav color state ──
  const [navMainBg, setNavMainBg] = useState("");
  const [navMainText, setNavMainText] = useState("");
  const [navSubBg, setNavSubBg] = useState("");
  const [navSubText, setNavSubText] = useState("");

  // ── Page button colors ──
  const PAGE_LABELS: Record<string, string> = {
    landing: "Home",
    store: "Store",
    services: "Services",
    projects: "Projects",
    music: "Music",
    news: "News",
  };
  const PAGE_KEYS = ["landing", "store", "services", "projects", "music", "news"] as const;
  type PageKey = typeof PAGE_KEYS[number];
  type PageBtnColors = { primaryBtn: string; primaryBtnText: string; secondaryBtn: string; secondaryBtnText: string };
  const [pageBtnColors, setPageBtnColors] = useState<Record<PageKey, PageBtnColors>>(() => {
    const init: Record<string, PageBtnColors> = {};
    for (const p of PAGE_KEYS) {
      init[p] = { primaryBtn: "", primaryBtnText: "", secondaryBtn: "", secondaryBtnText: "" };
    }
    return init as Record<PageKey, PageBtnColors>;
  });

  // ── Per-section color state ──
  const [homeCardAccentColor, setHomeCardAccentColor] = useState("");
  const [storeAccentColor, setStoreAccentColor] = useState("");
  const [servicesAccentColor, setServicesAccentColor] = useState("");
  const [musicAccentColor, setMusicAccentColor] = useState("");
  const [wikiTagColor, setWikiTagColor] = useState("");

  // ── Typography state ──
  const FONT_OPTIONS = [
    "Inter", "System UI", "Roboto", "Open Sans", "Lato", "Poppins", "Montserrat",
    "Nunito", "Raleway", "Source Sans Pro", "Playfair Display", "Merriweather",
    "Georgia", "serif", "monospace",
  ];
  const [headingFont, setHeadingFont] = useState("Inter");
  const [bodyFont, setBodyFont] = useState("Inter");
  const [baseFontSize, setBaseFontSize] = useState("16");
  const [headingScale, setHeadingScale] = useState("1.25");
  const [googleFontUrl, setGoogleFontUrl] = useState("");

  // ── Advanced CSS vars state (theme.cssVars JSON object) ──
  // Stored as JSON { "--radius": "0.5rem", ... } at platformSettings["theme.cssVars"]
  const DEFAULT_CSS_VARS: Record<string, string> = {
    "--radius": "0.5rem",
  };
  const [cssVarsJson, setCssVarsJson] = useState<Record<string, string>>(DEFAULT_CSS_VARS);
  const [cssVarsText, setCssVarsText] = useState("--radius: 0.5rem;");

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
    setFooterVersion(settings["footer.version"] ?? "");
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
    setLightPrimaryFg(settings["color.light.primaryFg"] || "0 0% 100%");
    setLightBackground(settings["color.light.background"] || DEFAULT_COLORS.lightBackground);
    setLightForeground(settings["color.light.foreground"] || DEFAULT_COLORS.lightForeground);
    setLightAccent(settings["color.light.accent"] || DEFAULT_COLORS.lightAccent);
    setLightAccentFg(settings["color.light.accentFg"] || "224 71% 4%");
    setLightSecondary(settings["color.light.secondary"] || "0 100% 37%");
    setLightSecondaryFg(settings["color.light.secondaryFg"] || "0 0% 100%");
    setLightCard(settings["color.light.card"] || "0 0% 100%");
    setLightCardFg(settings["color.light.cardFg"] || "224 71% 4%");
    setLightMuted(settings["color.light.muted"] || "210 40% 96%");
    setLightMutedFg(settings["color.light.mutedFg"] || "215 16% 47%");
    setLightBorder(settings["color.light.border"] || "214 32% 91%");
    setLightDestructive(settings["color.light.destructive"] || "0 100% 37%");
    setDarkPrimary(settings["color.dark.primary"] || DEFAULT_COLORS.darkPrimary);
    setDarkBackground(settings["color.dark.background"] || DEFAULT_COLORS.darkBackground);
    setDarkForeground(settings["color.dark.foreground"] || DEFAULT_COLORS.darkForeground);
    setDarkAccent(settings["color.dark.accent"] || DEFAULT_COLORS.darkAccent);
    setBrandMain(settings["color.brand.main"] || DEFAULT_COLORS.brandMain);
    setBrandSecondary(settings["color.brand.secondary"] || DEFAULT_COLORS.brandSecondary);
    setBrandAccent(settings["color.brand.accent"] || DEFAULT_COLORS.brandAccent);
    setBrandHighlight(settings["color.brand.highlight"] || DEFAULT_COLORS.brandHighlight);
    setNavMainBg(settings["color.nav.main.bg"] || settings["color.nav.activeHighlight"] || "");
    setNavMainText(settings["color.nav.main.text"] || "");
    setNavSubBg(settings["color.nav.sub.bg"] || "");
    setNavSubText(settings["color.nav.sub.text"] || "");

    setPageBtnColors({
      landing: {
        primaryBtn: settings["color.landing.primaryBtn"] || "",
        primaryBtnText: settings["color.landing.primaryBtnText"] || "",
        secondaryBtn: settings["color.landing.secondaryBtn"] || "",
        secondaryBtnText: settings["color.landing.secondaryBtnText"] || "",
      },
      store: {
        primaryBtn: settings["color.store.primaryBtn"] || "",
        primaryBtnText: settings["color.store.primaryBtnText"] || "",
        secondaryBtn: settings["color.store.secondaryBtn"] || "",
        secondaryBtnText: settings["color.store.secondaryBtnText"] || "",
      },
      services: {
        primaryBtn: settings["color.services.primaryBtn"] || "",
        primaryBtnText: settings["color.services.primaryBtnText"] || "",
        secondaryBtn: settings["color.services.secondaryBtn"] || "",
        secondaryBtnText: settings["color.services.secondaryBtnText"] || "",
      },
      projects: {
        primaryBtn: settings["color.projects.primaryBtn"] || "",
        primaryBtnText: settings["color.projects.primaryBtnText"] || "",
        secondaryBtn: settings["color.projects.secondaryBtn"] || "",
        secondaryBtnText: settings["color.projects.secondaryBtnText"] || "",
      },
      music: {
        primaryBtn: settings["color.music.primaryBtn"] || "",
        primaryBtnText: settings["color.music.primaryBtnText"] || "",
        secondaryBtn: settings["color.music.secondaryBtn"] || "",
        secondaryBtnText: settings["color.music.secondaryBtnText"] || "",
      },
      news: {
        primaryBtn: settings["color.news.primaryBtn"] || "",
        primaryBtnText: settings["color.news.primaryBtnText"] || "",
        secondaryBtn: settings["color.news.secondaryBtn"] || "",
        secondaryBtnText: settings["color.news.secondaryBtnText"] || "",
      },
    });

    setHomeCardAccentColor(settings["home.cardAccentColor"] || "");
    setStoreAccentColor(settings["store.accentColor"] || "");
    setServicesAccentColor(settings["services.accentColor"] || "");
    setMusicAccentColor(settings["music.accentColor"] || "");
    setWikiTagColor(settings["wiki.tagColor"] || "");
    setGa4MeasurementId(settings["analytics.ga4MeasurementId"] || "");
    setGa4PropertyId(settings["analytics.ga4PropertyId"] || "");

    // Typography
    setHeadingFont(settings["theme.font.heading"] || "Inter");
    setBodyFont(settings["theme.font.body"] || "Inter");
    setBaseFontSize(settings["theme.font.baseSize"] || "16");
    setHeadingScale(settings["theme.font.headingScale"] || "1.25");
    setGoogleFontUrl(settings["theme.font.googleUrl"] || "");

    // theme.cssVars stored as JSON { "--var": "value", ... }
    if (settings["theme.cssVars"]) {
      try {
        const parsed = JSON.parse(settings["theme.cssVars"]);
        if (parsed && typeof parsed === "object") {
          setCssVarsJson(parsed);
          setCssVarsText(Object.entries(parsed).map(([k, v]) => `${k}: ${v};`).join("\n"));
        }
      } catch {
        const fallback = settings["theme.cssVars"];
        setCssVarsText(fallback);
      }
    } else if (settings["theme.customCssVars"]) {
      setCssVarsText(settings["theme.customCssVars"]);
    }

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

  // ── Save functions ──
  function saveThemePrimaryPalette() {
    mutation.mutate({
      "color.light.primary": lightPrimary,
      "color.light.primaryFg": lightPrimaryFg,
      "color.dark.primary": darkPrimary,
    });
  }

  function saveThemeSecondaryAccent() {
    mutation.mutate({
      "color.light.secondary": lightSecondary,
      "color.light.secondaryFg": lightSecondaryFg,
      "color.light.accent": lightAccent,
      "color.light.accentFg": lightAccentFg,
    });
  }

  function saveThemeBrandColors() {
    mutation.mutate({
      "color.brand.main": brandMain,
      "color.brand.secondary": brandSecondary,
      "color.brand.accent": brandAccent,
      "color.brand.highlight": brandHighlight,
    });
  }

  function saveThemeNeutrals() {
    mutation.mutate({
      "color.light.background": lightBackground,
      "color.light.foreground": lightForeground,
      "color.light.card": lightCard,
      "color.light.cardFg": lightCardFg,
      "color.light.muted": lightMuted,
      "color.light.mutedFg": lightMutedFg,
      "color.light.border": lightBorder,
      "color.dark.background": darkBackground,
      "color.dark.foreground": darkForeground,
      "color.dark.accent": darkAccent,
    });
  }

  function saveThemeStatusColors() {
    mutation.mutate({
      "color.light.destructive": lightDestructive,
    });
  }

  function parseCssVarsText(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = text.split(/\n|;/).map(l => l.trim()).filter(l => l.startsWith("--"));
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).replace(/;$/, "").trim();
      if (key && val) result[key] = val;
    }
    return result;
  }

  function saveCustomCssVars() {
    const parsed = parseCssVarsText(cssVarsText);
    setCssVarsJson(parsed);
    mutation.mutate({ "theme.cssVars": JSON.stringify(parsed) });
  }

  function saveTypography() {
    mutation.mutate({
      "theme.font.heading": headingFont,
      "theme.font.body": bodyFont,
      "theme.font.baseSize": baseFontSize,
      "theme.font.headingScale": headingScale,
      "theme.font.googleUrl": googleFontUrl,
    });
  }

  function resetAllTheme() {
    setCssVarsText("--radius: 0.5rem;");
    setCssVarsJson({ "--radius": "0.5rem" });
    mutation.mutate({
      "color.light.primary": "",
      "color.light.primaryFg": "",
      "color.light.background": "",
      "color.light.foreground": "",
      "color.light.accent": "",
      "color.light.accentFg": "",
      "color.light.secondary": "",
      "color.light.secondaryFg": "",
      "color.light.card": "",
      "color.light.cardFg": "",
      "color.light.muted": "",
      "color.light.mutedFg": "",
      "color.light.border": "",
      "color.light.destructive": "",
      "color.dark.primary": "",
      "color.dark.background": "",
      "color.dark.foreground": "",
      "color.dark.accent": "",
      "color.brand.main": "",
      "color.brand.secondary": "",
      "color.brand.accent": "",
      "color.brand.highlight": "",
      "theme.cssVars": JSON.stringify({ "--radius": "0.5rem" }),
      "theme.customCssVars": "",
    });
  }

  function saveNavColors() {
    mutation.mutate({
      "color.nav.main.bg": navMainBg,
      "color.nav.main.text": navMainText,
      "color.nav.sub.bg": navSubBg,
      "color.nav.sub.text": navSubText,
      "color.nav.activeHighlight": "",
    });
  }

  function savePageBtnColors() {
    const entries: Record<string, string> = {};
    for (const p of PAGE_KEYS) {
      entries[`color.${p}.primaryBtn`] = pageBtnColors[p].primaryBtn;
      entries[`color.${p}.primaryBtnText`] = pageBtnColors[p].primaryBtnText;
      entries[`color.${p}.secondaryBtn`] = pageBtnColors[p].secondaryBtn;
      entries[`color.${p}.secondaryBtnText`] = pageBtnColors[p].secondaryBtnText;
    }
    mutation.mutate(entries);
  }

  function resetPageBtnColors(page: PageKey) {
    mutation.mutate({
      [`color.${page}.primaryBtn`]: "",
      [`color.${page}.primaryBtnText`]: "",
      [`color.${page}.secondaryBtn`]: "",
      [`color.${page}.secondaryBtnText`]: "",
    });
    setPageBtnColors((prev) => ({
      ...prev,
      [page]: { primaryBtn: "", primaryBtnText: "", secondaryBtn: "", secondaryBtnText: "" },
    }));
  }

  function setPageColor(page: PageKey, field: keyof PageBtnColors, val: string) {
    setPageBtnColors((prev) => ({ ...prev, [page]: { ...prev[page], [field]: val } }));
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
      "footer.version": footerVersion,
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

  function saveAnalytics() {
    mutation.mutate({
      "analytics.ga4MeasurementId": ga4MeasurementId,
      "analytics.ga4PropertyId": ga4PropertyId,
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

  // ─────────────────────────────────────────────────────────
  // Search filtering logic — hides non-matching Cards within tabs
  // ─────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();

  function highlight(text: string): React.ReactNode {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  /**
   * Returns true when the card's search label or any text matches the query.
   * Pass the `data-search-label` value of the card as well as any extra text terms.
   */
  function cardVisible(labelAttr: string, ...extras: string[]): boolean {
    if (!q) return true;
    const combined = [labelAttr, ...extras].join(" ").toLowerCase();
    return combined.includes(q);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Search Bar ── */}
      <div className="relative" data-search-label="settings-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search settings…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
          data-testid="input-settings-search"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
            onClick={() => setSearchQuery("")}
            data-testid="button-clear-search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Tabs value={searchQuery ? "search-all" : activeTab} onValueChange={(v) => { if (!searchQuery) setActiveTab(v); }}>
          <TabsList className="flex flex-wrap gap-1 h-auto mb-6" data-testid="tabs-settings-main">
            <TabsTrigger value="display" data-testid="tab-display" onClick={() => { setSearchQuery(""); setActiveTab("display"); }}>Display</TabsTrigger>
            <TabsTrigger value="theme" data-testid="tab-theme" onClick={() => { setSearchQuery(""); setActiveTab("theme"); }}>Theme</TabsTrigger>
            <TabsTrigger value="navigation" data-testid="tab-navigation" onClick={() => { setSearchQuery(""); setActiveTab("navigation"); }}>Navigation</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" onClick={() => { setSearchQuery(""); setActiveTab("analytics"); }}>Analytics</TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations" onClick={() => { setSearchQuery(""); setActiveTab("integrations"); }}>Integrations</TabsTrigger>
            <TabsTrigger value="advanced" data-testid="tab-advanced" onClick={() => { setSearchQuery(""); setActiveTab("advanced"); }}>Advanced</TabsTrigger>
          </TabsList>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mb-4" data-testid="text-search-scope">Showing results across all settings</p>
          )}

          {/* ════════════ DISPLAY ════════════ */}
          <TabsContent value="display" forceMount className={`space-y-6 ${(!searchQuery && activeTab !== "display") ? "hidden" : ""}`}>
              {/* Hero Editor */}
              <Card data-search-label="hero editor logo background overlay tagline buttons footer version" className={cardVisible("hero editor logo background overlay tagline buttons footer version") ? "" : "hidden"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {highlight("Hero Editor")}
                  </CardTitle>
                  <CardDescription>
                    {highlight("Customize the landing page hero section. Leave the background image URL empty to keep the default gradient.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      {highlight("Platform Logo / Icon")}
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
                    <Label>{highlight("Hero background image")}</Label>
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
                      {highlight("Overlay Opacity")}
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
                    <Label htmlFor="hero-text">{highlight("Hero text (tagline)")}</Label>
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
                      {highlight("Footer Tagline")}
                    </Label>
                    <Input
                      id="footer-tagline"
                      placeholder="The creative platform for the SEVCO universe."
                      value={footerTagline}
                      onChange={(e) => setFooterTagline(e.target.value)}
                      data-testid="input-footer-tagline"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footer-version" className="flex items-center gap-1.5">
                      <AlignLeft className="h-3.5 w-3.5" />
                      {highlight("Footer Version")}
                    </Label>
                    <Input
                      id="footer-version"
                      placeholder="e.g. 2.4.1 (leave blank to use latest changelog version)"
                      value={footerVersion}
                      onChange={(e) => setFooterVersion(e.target.value)}
                      data-testid="input-footer-version"
                    />
                    <p className="text-xs text-muted-foreground">Override the version string shown in the footer. If blank, falls back to the latest changelog entry's version.</p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Type className="h-3.5 w-3.5" />
                      {highlight("Button 1 (Primary)")}
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
                      {highlight("Button 2 (Secondary)")}
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
              <Card data-search-label="section visibility platform grid records spotlight store preview wiki community" className={cardVisible("section visibility platform grid records spotlight store preview wiki community") ? "" : "hidden"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {highlight("Section Visibility")}
                  </CardTitle>
                  <CardDescription>{highlight("Toggle which sections appear on the public landing page.")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SECTION_KEYS.map((section) => (
                    <div key={section.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{highlight(section.label)}</p>
                        <p className="text-xs text-muted-foreground">{highlight(section.description)}</p>
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

              {/* Platform Assets */}
              <Card data-search-label="platform assets favicon social image OG logo wordmark" className={cardVisible("platform assets favicon social image OG logo wordmark") ? "" : "hidden"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {highlight("Platform Assets")}
                  </CardTitle>
                  <CardDescription>{highlight("Update the site favicon and social sharing image.")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      {highlight("Platform Wordmark / Logo")}
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
                      {highlight("Favicon")}
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
                      {highlight("Social image (OG)")}
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
            </TabsContent>

          {/* ════════════ THEME ════════════ */}
          <TabsContent value="theme" forceMount className={(!searchQuery && activeTab !== "theme") ? "hidden" : ""}>
              <div className="flex gap-6">
                {/* Main column */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{highlight("Theme Editor")}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">All color and visual settings. Preview updates instantly.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                      onClick={resetAllTheme}
                      disabled={mutation.isPending}
                      data-testid="button-reset-all-theme"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset all to defaults
                    </Button>
                  </div>

                  <Accordion type="multiple" defaultValue={["group-primary"]} className="space-y-2">

                    {/* Group 1: Primary Palette */}
                    <AccordionItem value="group-primary" className="border rounded-lg px-4" data-search-label="primary palette primary foreground blue">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lightPrimary ? `hsl(${lightPrimary})` : "#3557ff" }} />
                          {highlight("Primary Palette")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Main brand color used for buttons, links, and key UI elements.</p>
                        <div className="space-y-3">
                          <ColorPickerRow label="Primary (light mode)" hsl={lightPrimary} onChange={setLightPrimary} testIdBase="primary-light" showSwatches />
                          <ColorPickerRow label="Primary foreground (text on primary)" hsl={lightPrimaryFg} onChange={setLightPrimaryFg} testIdBase="primary-light-fg" />
                          <ColorPickerRow label="Primary (dark mode)" hsl={darkPrimary} onChange={setDarkPrimary} testIdBase="primary-dark" />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex gap-2">
                            <div className="h-8 px-3 rounded-md flex items-center text-xs font-medium" style={{ backgroundColor: lightPrimary ? `hsl(${lightPrimary})` : "#3557ff", color: lightPrimaryFg ? `hsl(${lightPrimaryFg})` : "#fff" }}>
                              Primary Button
                            </div>
                            <div className="h-8 px-3 rounded-md border flex items-center text-xs font-medium" style={{ borderColor: lightPrimary ? `hsl(${lightPrimary})` : "#3557ff", color: lightPrimary ? `hsl(${lightPrimary})` : "#3557ff" }}>
                              Outlined
                            </div>
                          </div>
                          <Button size="sm" onClick={saveThemePrimaryPalette} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-primary-palette">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 2: Secondary / Accent */}
                    <AccordionItem value="group-secondary" className="border rounded-lg px-4" data-search-label="secondary accent palette foreground red yellow">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lightSecondary ? `hsl(${lightSecondary})` : "#e5e7eb" }} />
                          {highlight("Secondary / Accent Palette")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Secondary and accent colors for badges, highlights, and alternate UI elements.</p>
                        <div className="space-y-3">
                          <ColorPickerRow label="Secondary background" hsl={lightSecondary} onChange={setLightSecondary} testIdBase="secondary-light" showSwatches />
                          <ColorPickerRow label="Secondary foreground" hsl={lightSecondaryFg} onChange={setLightSecondaryFg} testIdBase="secondary-light-fg" />
                          <Separator />
                          <ColorPickerRow label="Accent background" hsl={lightAccent} onChange={setLightAccent} testIdBase="accent-light" showSwatches />
                          <ColorPickerRow label="Accent foreground" hsl={lightAccentFg} onChange={setLightAccentFg} testIdBase="accent-light-fg" />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2 h-6 rounded-full text-[10px] font-medium" style={{ backgroundColor: lightAccent ? `hsl(${lightAccent})` : "#e5e7eb", color: lightAccentFg ? `hsl(${lightAccentFg})` : "#374151" }}>
                              Accent Badge
                            </span>
                            <span className="inline-flex items-center px-2 h-6 rounded-full text-[10px] font-medium" style={{ backgroundColor: lightSecondary ? `hsl(${lightSecondary})` : "#e5e7eb", color: lightSecondaryFg ? `hsl(${lightSecondaryFg})` : "#374151" }}>
                              Secondary Badge
                            </span>
                          </div>
                          <Button size="sm" onClick={saveThemeSecondaryAccent} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-secondary-accent">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 3: Brand Colors */}
                    <AccordionItem value="group-brand" className="border rounded-lg px-4" data-search-label="brand colors main secondary tertiary quaternary highlight">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[brandMain, brandSecondary, brandAccent, brandHighlight].map((c, i) => (
                              <div key={i} className="h-3 w-3 rounded-full border border-border/40" style={{ backgroundColor: c ? `hsl(${c})` : "#9ca3af" }} />
                            ))}
                          </div>
                          {highlight("Brand Colors")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Core brand palette that maps to primary, secondary, and accent when not overridden above.</p>
                        <div className="space-y-3">
                          <ColorPickerRow label="Brand Main" hsl={brandMain} onChange={setBrandMain} testIdBase="brand-main" showSwatches />
                          <ColorPickerRow label="Brand Secondary" hsl={brandSecondary} onChange={setBrandSecondary} testIdBase="brand-secondary" showSwatches />
                          <ColorPickerRow label="Brand Accent" hsl={brandAccent} onChange={setBrandAccent} testIdBase="brand-accent" showSwatches />
                          <ColorPickerRow label="Brand Highlight / Ring" hsl={brandHighlight} onChange={setBrandHighlight} testIdBase="brand-highlight" showSwatches />
                        </div>
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={saveThemeBrandColors} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-brand-colors">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 4: Neutral / Background */}
                    <AccordionItem value="group-neutral" className="border rounded-lg px-4" data-search-label="neutral background foreground card muted border white gray black">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: lightBackground ? `hsl(${lightBackground})` : "#f8f9fa" }} />
                          {highlight("Neutral / Background Colors")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Background, card, muted, and border colors for the overall page and component surfaces.</p>
                        <Tabs defaultValue="light">
                          <TabsList className="mb-3">
                            <TabsTrigger value="light">Light Mode</TabsTrigger>
                            <TabsTrigger value="dark">Dark Mode</TabsTrigger>
                          </TabsList>
                          <TabsContent value="light" className="space-y-3">
                            <ColorPickerRow label="Background" hsl={lightBackground} onChange={setLightBackground} testIdBase="bg-light" />
                            <ColorPickerRow label="Foreground (text)" hsl={lightForeground} onChange={setLightForeground} testIdBase="fg-light" />
                            <ColorPickerRow label="Card" hsl={lightCard} onChange={setLightCard} testIdBase="card-light" />
                            <ColorPickerRow label="Card foreground" hsl={lightCardFg} onChange={setLightCardFg} testIdBase="card-fg-light" />
                            <ColorPickerRow label="Muted" hsl={lightMuted} onChange={setLightMuted} testIdBase="muted-light" />
                            <ColorPickerRow label="Muted foreground" hsl={lightMutedFg} onChange={setLightMutedFg} testIdBase="muted-fg-light" />
                            <ColorPickerRow label="Border" hsl={lightBorder} onChange={setLightBorder} testIdBase="border-light" />
                          </TabsContent>
                          <TabsContent value="dark" className="space-y-3">
                            <ColorPickerRow label="Background" hsl={darkBackground} onChange={setDarkBackground} testIdBase="bg-dark" />
                            <ColorPickerRow label="Foreground (text)" hsl={darkForeground} onChange={setDarkForeground} testIdBase="fg-dark" />
                            <ColorPickerRow label="Accent" hsl={darkAccent} onChange={setDarkAccent} testIdBase="accent-dark" />
                          </TabsContent>
                        </Tabs>
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={saveThemeNeutrals} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-neutrals">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 5: Status / Semantic Colors */}
                    <AccordionItem value="group-status" className="border rounded-lg px-4" data-search-label="status semantic success warning error destructive info green red yellow blue">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#00a811" }} />
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#fbc318" }} />
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lightDestructive ? `hsl(${lightDestructive})` : "#bd0000" }} />
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#0037ff" }} />
                          </div>
                          {highlight("Status / Semantic Colors")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Colors for success, warning, error, and destructive actions.</p>
                        <div className="space-y-3">
                          <ColorPickerRow label="Destructive / Error" hsl={lightDestructive} onChange={setLightDestructive} testIdBase="destructive" showSwatches />
                        </div>
                        <div className="flex gap-2 flex-wrap pt-1">
                          <span className="inline-flex items-center px-2 h-6 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Success</span>
                          <span className="inline-flex items-center px-2 h-6 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">Warning</span>
                          <span className="inline-flex items-center px-2 h-6 rounded text-[10px] font-medium" style={{ backgroundColor: lightDestructive ? `hsl(${lightDestructive}30)` : "#fde8e8", color: lightDestructive ? `hsl(${lightDestructive})` : "#bd0000" }}>Error</span>
                          <span className="inline-flex items-center px-2 h-6 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Info</span>
                        </div>
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={saveThemeStatusColors} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-status-colors">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 6: Per-Section Accent Colors */}
                    <AccordionItem value="group-section-accents" className="border rounded-lg px-4" data-search-label="per section accent home store services music wiki tag colors">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        {highlight("Per-Section Accent Colors")}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Optional accent colors for individual platform sections. Leave empty to use global brand colors.</p>
                        <div className="space-y-3">
                          <ColorPickerRow label="Home Page Cards" hsl={homeCardAccentColor} onChange={setHomeCardAccentColor} testIdBase="home-card-accent" showSwatches />
                          <ColorPickerRow label="Store Page" hsl={storeAccentColor} onChange={setStoreAccentColor} testIdBase="store-accent" showSwatches />
                          <ColorPickerRow label="Services Page" hsl={servicesAccentColor} onChange={setServicesAccentColor} testIdBase="services-accent" showSwatches />
                          <ColorPickerRow label="Music Page (RECORDS section)" hsl={musicAccentColor} onChange={setMusicAccentColor} testIdBase="music-accent" showSwatches />
                          <ColorPickerRow label="Wiki Tags / Highlights" hsl={wikiTagColor} onChange={setWikiTagColor} testIdBase="wiki-tag" showSwatches />
                        </div>
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={savePerSectionColors} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-per-section-colors">
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 7: Page Button Color Overrides */}
                    <AccordionItem value="group-page-buttons" className="border rounded-lg px-4" data-search-label="page button color overrides landing store services projects music news primary secondary">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        {highlight("Page Button Color Overrides")}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Override primary and secondary button colors for individual landing pages. Leave blank to use global theme colors.</p>
                        {PAGE_KEYS.map((page) => (
                          <div key={page} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">{PAGE_LABELS[page]}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground gap-1"
                                onClick={() => resetPageBtnColors(page)}
                                disabled={mutation.isPending}
                                data-testid={`button-reset-page-btns-${page}`}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(["primaryBtn", "primaryBtnText", "secondaryBtn", "secondaryBtnText"] as const).map((field) => {
                                const labels: Record<string, string> = {
                                  primaryBtn: "Primary button background",
                                  primaryBtnText: "Primary button text",
                                  secondaryBtn: "Secondary button background",
                                  secondaryBtnText: "Secondary button text",
                                };
                                const val = pageBtnColors[page][field];
                                return (
                                  <div key={field} className="space-y-1.5">
                                    <p className="text-xs font-medium text-foreground">{labels[field]}</p>
                                    <div className="flex items-center gap-2">
                                      <div className="relative shrink-0">
                                        <div className="h-7 w-7 rounded border border-border" style={{ backgroundColor: val ? `hsl(${val})` : "transparent" }} />
                                        <input
                                          type="color"
                                          value={val ? hslToHex(val) : "#000000"}
                                          onChange={(e) => setPageColor(page, field, hexToHsl(e.target.value))}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                                          data-testid={`color-picker-${page}-${field}`}
                                        />
                                      </div>
                                      <p className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{val || "— default"}</p>
                                      {val && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Clear"
                                          className="h-6 w-6 text-muted-foreground shrink-0"
                                          onClick={() => setPageColor(page, field, "")}
                                          data-testid={`button-clear-${page}-${field}`}
                                        >
                                          <RotateCcw className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {page !== PAGE_KEYS[PAGE_KEYS.length - 1] && <Separator />}
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={savePageBtnColors} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-page-btn-colors">
                            <Save className="h-3 w-3" />
                            Save Button Colors
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 8: Typography */}
                    <AccordionItem value="group-typography" className="border rounded-lg px-4" data-search-label="typography font family heading body base size scale google fonts Inter Roboto Poppins Montserrat">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Type className="h-3.5 w-3.5 text-muted-foreground" />
                          {highlight("Typography")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs" htmlFor="select-heading-font">Heading Font</Label>
                            <Select value={headingFont} onValueChange={(v) => {
                              setHeadingFont(v);
                              if (!["Inter","System UI","Georgia","serif","monospace"].includes(v)) {
                                setGoogleFontUrl(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(v)}:wght@400;600;700&display=swap`);
                              }
                            }}>
                              <SelectTrigger id="select-heading-font" data-testid="select-heading-font">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map((f) => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs" htmlFor="select-body-font">Body Font</Label>
                            <Select value={bodyFont} onValueChange={(v) => {
                              setBodyFont(v);
                              if (!["Inter","System UI","Georgia","serif","monospace"].includes(v) && v !== headingFont) {
                                setGoogleFontUrl((prev) => prev ? prev : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(v)}:wght@400;600;700&display=swap`);
                              }
                            }}>
                              <SelectTrigger id="select-body-font" data-testid="select-body-font">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map((f) => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs" htmlFor="input-base-font-size">Base Font Size (px)</Label>
                            <Input
                              id="input-base-font-size"
                              data-testid="input-base-font-size"
                              type="number"
                              min={12}
                              max={24}
                              value={baseFontSize}
                              onChange={(e) => setBaseFontSize(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs" htmlFor="select-heading-scale">Heading Scale</Label>
                            <Select value={headingScale} onValueChange={setHeadingScale}>
                              <SelectTrigger id="select-heading-scale" data-testid="select-heading-scale">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1.125">Small (1.125)</SelectItem>
                                <SelectItem value="1.25">Medium (1.25)</SelectItem>
                                <SelectItem value="1.414">Large (√2)</SelectItem>
                                <SelectItem value="1.5">XL (1.5)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Live typography preview */}
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-2" data-testid="typography-preview">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-3">Live Preview</p>
                          <div style={{ fontFamily: headingFont !== "System UI" ? `'${headingFont}', sans-serif` : "system-ui, sans-serif", fontSize: `${parseFloat(baseFontSize) * Math.pow(parseFloat(headingScale), 3)}px`, fontWeight: 700, lineHeight: 1.15 }}>
                            Heading H1
                          </div>
                          <div style={{ fontFamily: headingFont !== "System UI" ? `'${headingFont}', sans-serif` : "system-ui, sans-serif", fontSize: `${parseFloat(baseFontSize) * Math.pow(parseFloat(headingScale), 2)}px`, fontWeight: 600, lineHeight: 1.2 }}>
                            Heading H2
                          </div>
                          <p style={{ fontFamily: bodyFont !== "System UI" ? `'${bodyFont}', sans-serif` : "system-ui, sans-serif", fontSize: `${parseFloat(baseFontSize)}px`, lineHeight: 1.6, color: "inherit" }}>
                            The quick brown fox jumps over the lazy dog. Body text uses the selected base size and line height for comfortable reading.
                          </p>
                        </div>

                        {googleFontUrl && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Google Fonts URL (auto-generated)</Label>
                            <Input
                              data-testid="input-google-font-url"
                              value={googleFontUrl}
                              onChange={(e) => setGoogleFontUrl(e.target.value)}
                              className="font-mono text-xs h-7"
                              placeholder="https://fonts.googleapis.com/css2?family=..."
                            />
                            <p className="text-[10px] text-muted-foreground">This link tag will be injected into the page &lt;head&gt; to load the font.</p>
                          </div>
                        )}

                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={saveTypography} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-typography">
                            <Save className="h-3 w-3" />
                            Save Typography
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Group 9: Advanced / Custom CSS Variables */}
                    <AccordionItem value="group-css-vars" className="border rounded-lg px-4" data-search-label="advanced custom CSS variables radius border-radius font size spacing raw override">
                      <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {highlight("Advanced / Custom CSS Variables")}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        <p className="text-xs text-muted-foreground">Raw CSS variable overrides injected after all other color rules. Use for radius, spacing, and any custom variables.</p>
                        <div className="space-y-1.5">
                          <Label htmlFor="custom-css-vars" className="text-xs">CSS Variables (one per line)</Label>
                          <Textarea
                            id="custom-css-vars"
                            data-testid="textarea-custom-css-vars"
                            value={cssVarsText}
                            onChange={(e) => setCssVarsText(e.target.value)}
                            rows={6}
                            className="font-mono text-xs"
                            placeholder="--radius: 0.5rem;
--spacing: 0.25rem;"
                          />
                          <p className="text-[10px] text-muted-foreground">Example: <code className="bg-muted px-1 rounded">--radius: 0.25rem;</code> or <code className="bg-muted px-1 rounded">--font-sans: 'Inter', sans-serif;</code></p>
                        </div>
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" onClick={saveCustomCssVars} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-custom-css-vars">
                            <Save className="h-3 w-3" />
                            Save CSS Variables
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>

                {/* Live Preview Panel — sticky on xl screens */}
                <div className="hidden xl:block w-72 shrink-0">
                  <div className="sticky top-6 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</p>
                    <LivePreviewPanel
                      primary={lightPrimary}
                      primaryFg={lightPrimaryFg}
                      secondary={lightSecondary}
                      secondaryFg={lightSecondaryFg}
                      background={lightBackground}
                      foreground={lightForeground}
                      card={lightCard}
                      cardFg={lightCardFg}
                      sidebarAccent={navMainBg || lightSecondary}
                      sidebarAccentFg={navMainText || lightSecondaryFg}
                    />
                    <p className="text-[10px] text-muted-foreground text-center">Updates as you change colors</p>
                  </div>
                </div>
              </div>
            </TabsContent>

          {/* ════════════ NAVIGATION ════════════ */}
          <TabsContent value="navigation" forceMount className={`space-y-6 ${(!searchQuery && activeTab !== "navigation") ? "hidden" : ""}`}>
              {/* Sidebar Nav Colors */}
              <Card data-search-label="navigation sidebar nav colors active highlight hover menu dropdown" className={cardVisible("navigation sidebar nav colors active highlight hover menu dropdown") ? "" : "hidden"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {highlight("Sidebar & Navigation Colors")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Customize the active item highlight and hover colors in the sidebar and dropdown menus.")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground shrink-0"
                      onClick={() => {
                        setNavMainBg(""); setNavMainText(""); setNavSubBg(""); setNavSubText("");
                        mutation.mutate({ "color.nav.main.bg": "", "color.nav.main.text": "", "color.nav.sub.bg": "", "color.nav.sub.text": "", "color.nav.activeHighlight": "" });
                      }}
                      disabled={mutation.isPending}
                      data-testid="button-reset-nav-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Active / Selected Item</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">Active background</p>
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <div className="h-7 w-7 rounded border border-border" style={{ backgroundColor: navMainBg ? `hsl(${navMainBg})` : "transparent" }} />
                            <input type="color" value={navMainBg ? hslToHex(navMainBg) : "#000000"} onChange={(e) => setNavMainBg(hexToHsl(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" data-testid="color-picker-nav-main-bg" />
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{navMainBg || "— default"}</p>
                          {navMainBg && <Button variant="ghost" size="icon" aria-label="Reset" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setNavMainBg("")} data-testid="button-reset-nav-main-bg"><RotateCcw className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">Active text color</p>
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <div className="h-7 w-7 rounded border border-border" style={{ backgroundColor: navMainText ? `hsl(${navMainText})` : "transparent" }} />
                            <input type="color" value={navMainText ? hslToHex(navMainText) : "#000000"} onChange={(e) => setNavMainText(hexToHsl(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" data-testid="color-picker-nav-main-text" />
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{navMainText || "— default"}</p>
                          {navMainText && <Button variant="ghost" size="icon" aria-label="Reset" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setNavMainText("")} data-testid="button-reset-nav-main-text"><RotateCcw className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Hover / Submenu</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">Hover background</p>
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <div className="h-7 w-7 rounded border border-border" style={{ backgroundColor: navSubBg ? `hsl(${navSubBg})` : "transparent" }} />
                            <input type="color" value={navSubBg ? hslToHex(navSubBg) : "#000000"} onChange={(e) => setNavSubBg(hexToHsl(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" data-testid="color-picker-nav-sub-bg" />
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{navSubBg || "— default"}</p>
                          {navSubBg && <Button variant="ghost" size="icon" aria-label="Reset" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setNavSubBg("")} data-testid="button-reset-nav-sub-bg"><RotateCcw className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">Hover text color</p>
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <div className="h-7 w-7 rounded border border-border" style={{ backgroundColor: navSubText ? `hsl(${navSubText})` : "transparent" }} />
                            <input type="color" value={navSubText ? hslToHex(navSubText) : "#000000"} onChange={(e) => setNavSubText(hexToHsl(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7" data-testid="color-picker-nav-sub-text" />
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{navSubText || "— default"}</p>
                          {navSubText && <Button variant="ghost" size="icon" aria-label="Reset" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => setNavSubText("")} data-testid="button-reset-nav-sub-text"><RotateCcw className="h-3 w-3" /></Button>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveNavColors} disabled={mutation.isPending} className="gap-2" data-testid="button-save-nav-colors">
                      <Save className="h-3.5 w-3.5" />
                      Save Navigation Colors
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          {/* ════════════ ANALYTICS ════════════ */}
          <TabsContent value="analytics" forceMount className={`space-y-6 ${(!searchQuery && activeTab !== "analytics") ? "hidden" : ""}`}>
              <Card data-search-label="Google Analytics GA4 measurement ID property ID service account tracking" className={cardVisible("Google Analytics GA4 measurement ID property ID service account tracking") ? "" : "hidden"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    {highlight("Google Analytics 4")}
                  </CardTitle>
                  <CardDescription>
                    {highlight("Connect GA4 to inject the tracking script on every page and power the native analytics dashboard in CMD → Traffic.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${ga4Status?.configured ? "bg-green-500/10 border-green-500/20" : ga4Status?.measurementId || ga4Status?.propertyId ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/40"}`}>
                    {ga4Status?.configured ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">GA4 fully configured</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Measurement ID, Property ID, and service account are all set. The Data API and tracking script are active.</p>
                        </div>
                      </>
                    ) : ga4Status?.measurementId || ga4Status?.propertyId ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">GA4 partially configured</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ga4Status?.measurementId && ga4Status?.propertyId
                              ? "Measurement ID and Property ID are saved. Add the GOOGLE_SERVICE_ACCOUNT_JSON secret to enable the Data API."
                              : "Enter both Measurement ID and Property ID, then add the GOOGLE_SERVICE_ACCOUNT_JSON secret to enable analytics."}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">GA4 not configured</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Enter your Measurement ID and Property ID below, then add the GOOGLE_SERVICE_ACCOUNT_JSON secret to enable analytics.</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="input-ga4-measurement-id">
                      {highlight("Measurement ID")}
                      <span className="text-muted-foreground text-xs ml-2">(controls gtag.js injection)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="input-ga4-measurement-id"
                        data-testid="input-ga4-measurement-id"
                        placeholder="G-XXXXXXXXXX"
                        value={ga4MeasurementId}
                        onChange={(e) => setGa4MeasurementId(e.target.value)}
                        className="font-mono"
                      />
                      <Button size="sm" onClick={saveAnalytics} disabled={mutation.isPending} data-testid="button-save-ga4-measurement-id">
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Found in GA4 Admin → Data Streams → your web stream. Starts with G-.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="input-ga4-property-id">
                      {highlight("Property ID")}
                      <span className="text-muted-foreground text-xs ml-2">(controls Data API connection)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="input-ga4-property-id"
                        data-testid="input-ga4-property-id"
                        placeholder="123456789"
                        value={ga4PropertyId}
                        onChange={(e) => setGa4PropertyId(e.target.value)}
                        className="font-mono"
                      />
                      <Button size="sm" onClick={saveAnalytics} disabled={mutation.isPending} data-testid="button-save-ga4-property-id">
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Found in GA4 Admin → Property Settings. Numeric ID only (no "properties/" prefix).</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {highlight("Service Account JSON Key")}
                      <span className="text-xs text-muted-foreground">(required for Data API)</span>
                    </Label>
                    <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Add the <span className="font-mono bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</span> environment secret with the contents of your downloaded service account key JSON file.
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li className="text-xs text-muted-foreground">Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console → Service Accounts</a></li>
                        <li className="text-xs text-muted-foreground">Create a service account and download a JSON key</li>
                        <li className="text-xs text-muted-foreground">In GA4 Admin → Property Access Management, add the service account email as a Viewer</li>
                        <li className="text-xs text-muted-foreground">Add the JSON key contents as the <span className="font-mono bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</span> secret in Replit Secrets</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          {/* ════════════ INTEGRATIONS ════════════ */}
          <TabsContent value="integrations" forceMount className={`space-y-6 ${(!searchQuery && activeTab !== "integrations") ? "hidden" : ""}`}>
              {/* Email Diagnostics */}
              <Card data-search-label="email diagnostics Resend test email integration" className={cardVisible("email diagnostics Resend test email integration") ? "" : "hidden"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {highlight("Email Diagnostics")}
                  </CardTitle>
                  <CardDescription>
                    {highlight("Send a test email to verify the Resend integration is working end-to-end.")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <EmailDiagnosticsPanel />
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card data-search-label="social links footer contact listen Instagram Twitter TikTok platform" className={`overflow-hidden${cardVisible("social links footer contact listen Instagram Twitter TikTok platform") ? "" : " hidden"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        {highlight("Social Links")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Manage platform social media presence across footer, contact, and listen pages.")}
                        {socialLinks && <span className="ml-1 text-xs text-muted-foreground">{socialLinks.length} link{socialLinks.length !== 1 ? "s" : ""}</span>}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      className="ml-auto h-7 text-xs gap-1 shrink-0"
                      onClick={() => { setEditingLink(undefined); setShowSocialDialog(true); }}
                      data-testid="button-add-social"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Link
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto" data-testid="table-social-links">
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
                </CardContent>
              </Card>

              {/* Hosting */}
              <div data-search-label="hosting domain VPS Hostinger server" className={cardVisible("hosting domain VPS Hostinger server") ? "" : "hidden"}>
                <HostingSection />
              </div>
            </TabsContent>

          {/* ════════════ ADVANCED ════════════ */}
          <TabsContent value="advanced" forceMount className={`space-y-6 ${(!searchQuery && activeTab !== "advanced") ? "hidden" : ""}`}>
              {/* Platform Section Cards */}
              <Card data-search-label="platform section cards wiki store music projects services community description icon path" className={cardVisible("platform section cards wiki store music projects services community description icon path") ? "" : "hidden"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {highlight("Platform Section Cards")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Edit the 6 cards shown in the \"THE PLATFORM\" grid on the home page.")}
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

              {/* Icon Pills */}
              <Card data-search-label="icon pills home page icons why feature label link color" className={cardVisible("icon pills home page icons why feature label link color") ? "" : "hidden"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        {highlight("Icon Pills Editor")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Change the icon, label, link, and accent color for each feature pill.")}
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
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePill(idx, -1)} disabled={idx === 0} data-testid={`button-pill-up-${idx}`} aria-label="Move up">
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move up</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => movePill(idx, 1)} disabled={idx === iconPills.length - 1} data-testid={`button-pill-down-${idx}`} aria-label="Move down">
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
                            aria-label="Delete"
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

              {/* Footer Sitemap */}
              <Card data-search-label="footer sitemap editor columns links navigation external" className={cardVisible("footer sitemap editor columns links navigation external") ? "" : "hidden"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        {highlight("Footer Sitemap Editor")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Add, remove, and reorder footer columns and their links.")}
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
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(ci, -1)} disabled={ci === 0} data-testid={`button-col-up-${ci}`} aria-label="Move up">
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(ci, 1)} disabled={ci === sitemapColumns.length - 1} data-testid={`button-col-down-${ci}`} aria-label="Move down">
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
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeColumn(ci)} data-testid={`button-remove-col-${ci}`} aria-label="Delete">
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
                                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveLink(ci, li, -1)} disabled={li === 0} data-testid={`button-link-up-${ci}-${li}`} aria-label="Move up">
                                    <ChevronUp className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Move up</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveLink(ci, li, 1)} disabled={li === col.links.length - 1} data-testid={`button-link-down-${ci}-${li}`} aria-label="Move down">
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
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeLink(ci, li)} data-testid={`button-remove-link-${ci}-${li}`} aria-label="Delete">
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

              {/* Brand Assets */}
              <Card data-search-label="brand assets downloadable materials about page logo color palette font banner" className={cardVisible("brand assets downloadable materials about page logo color palette font banner") ? "" : "hidden"}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {highlight("Brand Assets")}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {highlight("Downloadable brand materials shown on the public About page.")}
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
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(asset)} data-testid={`button-edit-brand-asset-${asset.id}`} aria-label="Edit">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteBrandAsset.mutate(asset.id)} disabled={deleteBrandAsset.isPending} data-testid={`button-delete-brand-asset-${asset.id}`} aria-label="Delete">
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
            </TabsContent>

        </Tabs>

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

      <SocialLinkDialog
        open={showSocialDialog}
        onClose={() => { setShowSocialDialog(false); setEditingLink(undefined); }}
        existing={editingLink}
        nextOrder={socialLinks?.length ?? 0}
      />
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
  RefreshCw,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin as MapPinIcon,
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
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const uptime = formatUptime(vm.uptime);

  return (
    <Card className="overflow-hidden" data-testid={`vps-card-${vm.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold truncate" data-testid={`vps-hostname-${vm.id}`}>{vm.hostname}</CardTitle>
            {vm.template?.name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{vm.template.name}</p>
            )}
          </div>
          <StatusBadge state={vm.state} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <MetricRow icon={Network} label="IP Address" value={primaryIp} />
        {vm.cpus && <MetricRow icon={Cpu} label="vCPUs" value={`${vm.cpus} core${vm.cpus > 1 ? "s" : ""}`} />}
        {memoryGb && <MetricRow icon={MemoryStick} label="Memory" value={`${memoryGb} GB RAM`} />}
        {diskGb && <MetricRow icon={HardDrive} label="Storage" value={`${diskGb} GB`} />}
        {vm.datacenter && <MetricRow icon={MapPinIcon} label="Location" value={location} />}
        {uptime && <MetricRow icon={Clock} label="Uptime" value={uptime} />}
        {vm.bandwidth && (
          <MetricRow
            icon={Network}
            label="Bandwidth"
            value={`${(vm.bandwidth.used / 1024 / 1024 / 1024).toFixed(1)} GB used`}
            subValue={`of ${(vm.bandwidth.total / 1024 / 1024 / 1024).toFixed(0)} GB`}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HostingSection() {
  const { data: vpsData, isLoading, refetch, isFetching } = useQuery<VpsListResponse>({
    queryKey: ["/api/hosting/vps-list"],
    staleTime: 60_000,
    gcTime: 120_000,
  });

  const vms = vpsData?.data ?? [];

  return (
    <Card data-search-label="hosting VPS domain Hostinger server">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Hosting / VPS
            </CardTitle>
            <CardDescription className="mt-1">
              Live server status from Hostinger. Requires <code className="bg-muted px-1 rounded text-[11px]">HOSTINGER_API_KEY</code> to be configured.
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-vps"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
          </div>
        ) : vms.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground" data-testid="text-vps-empty">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No VPS instances found.</p>
            <p className="text-xs mt-1">Check that your Hostinger API key is configured correctly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vms.map((vm) => <VpsCard key={vm.id} vm={vm} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
