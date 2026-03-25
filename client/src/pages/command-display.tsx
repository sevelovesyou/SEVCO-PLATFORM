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
import { Save, Image, Type, Eye, EyeOff, Globe, Link2, Package, Pencil, Trash2, Plus, Palette, RotateCcw } from "lucide-react";
import type { BrandAsset, InsertBrandAsset } from "@shared/schema";
import { hexToHsl, hslToHex } from "@/lib/colorUtils";

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

export default function CommandDisplay() {
  const { toast } = useToast();

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
      toast({ title: "Settings saved", description: "Platform display settings updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [heroText, setHeroText] = useState("");
  const [btn1Label, setBtn1Label] = useState("");
  const [btn1Url, setBtn1Url] = useState("");
  const [btn1Icon, setBtn1Icon] = useState("");
  const [btn2Label, setBtn2Label] = useState("");
  const [btn2Url, setBtn2Url] = useState("");
  const [btn2Icon, setBtn2Icon] = useState("");
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({});
  const [faviconUrl, setFaviconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");

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

  useEffect(() => {
    if (isLoading) return;
    setHeroBgUrl(settings["hero.backgroundImageUrl"] ?? "");
    setHeroText(settings["hero.text"] ?? "");
    setBtn1Label(settings["hero.button1.label"] ?? "");
    setBtn1Url(settings["hero.button1.url"] ?? "");
    setBtn1Icon(settings["hero.button1.icon"] ?? "");
    setBtn2Label(settings["hero.button2.label"] ?? "");
    setBtn2Url(settings["hero.button2.url"] ?? "");
    setBtn2Icon(settings["hero.button2.icon"] ?? "");
    setFaviconUrl(settings["platform.faviconUrl"] ?? "");
    setOgImageUrl(settings["platform.ogImageUrl"] ?? "");
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
  }, [settings, isLoading]);

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
    });
  }

  function saveHero() {
    mutation.mutate({
      "hero.backgroundImageUrl": heroBgUrl,
      "hero.text": heroText,
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
    });
  }

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
      toast({ title: "Asset added", description: "Brand asset created successfully." });
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
      toast({ title: "Asset updated", description: "Brand asset saved successfully." });
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
    <div className="space-y-8 max-w-3xl">

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
                Customize the color scheme used across the entire platform. Changes take effect immediately after saving.
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
            <p className="text-xs text-muted-foreground">These apply globally across both modes and feed into the Brand &amp; Assets section of the About page.</p>
            <ColorPickerRow label="Brand Main" hsl={brandMain} onChange={setBrandMain} testIdBase="brand-main" />
            <ColorPickerRow label="Brand Secondary" hsl={brandSecondary} onChange={setBrandSecondary} testIdBase="brand-secondary" />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveColors}
              disabled={mutation.isPending}
              className="gap-2"
              data-testid="button-save-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Save Colors
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hero Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Hero Editor
          </CardTitle>
          <CardDescription>
            Customize the landing page hero section. Leave the background image URL empty to keep the default gradient look.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="hero-bg-url">Hero background image URL</Label>
            <Input
              id="hero-bg-url"
              placeholder="https://example.com/image.jpg (leave empty for gradient)"
              value={heroBgUrl}
              onChange={(e) => setHeroBgUrl(e.target.value)}
              data-testid="input-hero-bg-url"
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

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Button 1 (Primary)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="btn1-label" className="text-xs">Label</Label>
                <Input
                  id="btn1-label"
                  placeholder="Explore the Wiki"
                  value={btn1Label}
                  onChange={(e) => setBtn1Label(e.target.value)}
                  data-testid="input-btn1-label"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="btn1-url" className="text-xs">URL</Label>
                <Input
                  id="btn1-url"
                  placeholder="/wiki"
                  value={btn1Url}
                  onChange={(e) => setBtn1Url(e.target.value)}
                  data-testid="input-btn1-url"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="btn1-icon" className="text-xs">Icon name (lucide)</Label>
                <Input
                  id="btn1-icon"
                  placeholder="BookOpen"
                  value={btn1Icon}
                  onChange={(e) => setBtn1Icon(e.target.value)}
                  data-testid="input-btn1-icon"
                />
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
                <Input
                  id="btn2-label"
                  placeholder="Shop the Store"
                  value={btn2Label}
                  onChange={(e) => setBtn2Label(e.target.value)}
                  data-testid="input-btn2-label"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="btn2-url" className="text-xs">URL</Label>
                <Input
                  id="btn2-url"
                  placeholder="/store"
                  value={btn2Url}
                  onChange={(e) => setBtn2Url(e.target.value)}
                  data-testid="input-btn2-url"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="btn2-icon" className="text-xs">Icon name (lucide)</Label>
                <Input
                  id="btn2-icon"
                  placeholder="ShoppingBag"
                  value={btn2Icon}
                  onChange={(e) => setBtn2Icon(e.target.value)}
                  data-testid="input-btn2-icon"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveHero}
              disabled={mutation.isPending}
              className="gap-2"
              data-testid="button-save-hero"
            >
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
          <CardDescription>
            Toggle which sections appear on the public landing page. Disabled sections are hidden completely.
          </CardDescription>
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
            <Button
              onClick={saveSections}
              disabled={mutation.isPending}
              className="gap-2"
              data-testid="button-save-sections"
            >
              <Save className="h-3.5 w-3.5" />
              Save Visibility
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
          <CardDescription>
            Update the site favicon and the social sharing (OG) image. Paste a hosted URL for each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="favicon-url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Favicon URL
            </Label>
            <Input
              id="favicon-url"
              placeholder="https://example.com/favicon.ico"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              data-testid="input-favicon-url"
            />
            <p className="text-xs text-muted-foreground">Supports .ico, .png, .svg. Leave empty to use the default favicon.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og-image-url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Social image (OG) URL
            </Label>
            <Input
              id="og-image-url"
              placeholder="https://example.com/og-image.jpg"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              data-testid="input-og-image-url"
            />
            <p className="text-xs text-muted-foreground">Recommended size: 1200×630px. Used when the site is shared on social media.</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveAssets}
              disabled={mutation.isPending}
              className="gap-2"
              data-testid="button-save-assets"
            >
              <Save className="h-3.5 w-3.5" />
              Save Assets
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
                Manage downloadable brand materials shown on the public About page. Logos, colour palettes, fonts, banners, and more.
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
                  {asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
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
                      {asset.fileFormat && (
                        <Badge variant="outline" className="text-[10px]">
                          {asset.fileFormat}
                        </Badge>
                      )}
                      {!asset.isPublic && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Private
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Order: {asset.displayOrder}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(asset)}
                      data-testid={`button-edit-brand-asset-${asset.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteBrandAsset.mutate(asset.id)}
                      disabled={deleteBrandAsset.isPending}
                      data-testid={`button-delete-brand-asset-${asset.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Brand Asset Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Edit Brand Asset" : "Add Brand Asset"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="asset-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="asset-name"
                placeholder="SEVCO Primary Logo — Black"
                value={assetForm.name}
                onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-asset-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-description">Description</Label>
              <Textarea
                id="asset-description"
                placeholder="For use on light backgrounds"
                value={assetForm.description ?? ""}
                onChange={(e) => setAssetForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                data-testid="input-asset-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asset-type">Asset Type <span className="text-destructive">*</span></Label>
                <Select
                  value={assetForm.assetType}
                  onValueChange={(v) => setAssetForm((f) => ({ ...f, assetType: v }))}
                >
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
                <Input
                  id="asset-format"
                  placeholder="PNG, SVG, PDF..."
                  value={assetForm.fileFormat ?? ""}
                  onChange={(e) => setAssetForm((f) => ({ ...f, fileFormat: e.target.value }))}
                  data-testid="input-asset-format"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-download-url">Download URL <span className="text-destructive">*</span></Label>
              <Input
                id="asset-download-url"
                placeholder="https://cdn.sevco.com/logo-black.png"
                value={assetForm.downloadUrl}
                onChange={(e) => setAssetForm((f) => ({ ...f, downloadUrl: e.target.value }))}
                data-testid="input-asset-download-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-preview-url">Preview URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="asset-preview-url"
                placeholder="https://cdn.sevco.com/logo-black-thumb.png"
                value={assetForm.previewUrl ?? ""}
                onChange={(e) => setAssetForm((f) => ({ ...f, previewUrl: e.target.value }))}
                data-testid="input-asset-preview-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="asset-order">Display Order</Label>
                <Input
                  id="asset-order"
                  type="number"
                  placeholder="0"
                  value={assetForm.displayOrder}
                  onChange={(e) => setAssetForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-asset-order"
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  checked={assetForm.isPublic}
                  onCheckedChange={(checked) => setAssetForm((f) => ({ ...f, isPublic: checked }))}
                  id="asset-public"
                  data-testid="switch-asset-public"
                />
                <Label htmlFor="asset-public" className="cursor-pointer">Public</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)} data-testid="button-cancel-brand-asset">
              Cancel
            </Button>
            <Button
              onClick={handleBrandSave}
              disabled={isBrandPending || !assetForm.name || !assetForm.downloadUrl}
              data-testid="button-save-brand-asset"
            >
              {isBrandPending ? "Saving…" : editingAsset ? "Save Changes" : "Add Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
