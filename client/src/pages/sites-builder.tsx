import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Layers,
  AlignLeft,
  Image,
  Mail,
  Code,
  Minus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Paintbrush,
  Globe,
  Check,
  Loader2,
  Settings,
} from "lucide-react";

// ─── Block types ────────────────────────────────────────────────────────────

type BlockType = "hero" | "text" | "gallery" | "contact" | "embed" | "divider";

interface HeroBlock { type: "hero"; heading: string; subheading?: string; ctaText?: string; ctaHref?: string; bgColor?: string; color?: string; }
interface TextBlock { type: "text"; heading?: string; body: string; }
interface GalleryBlock { type: "gallery"; heading?: string; images: { url: string; alt?: string; caption?: string }[]; }
interface ContactBlock { type: "contact"; heading?: string; email?: string; body?: string; }
interface EmbedBlock { type: "embed"; url: string; caption?: string; }
interface DividerBlock { type: "divider"; }

type Block = HeroBlock | TextBlock | GalleryBlock | ContactBlock | EmbedBlock | DividerBlock;

interface SiteData {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  theme_json: ThemeSettings | null;
  pages: PageData[];
}

interface PageData {
  id: number;
  slug: string;
  is_homepage: boolean;
  content_json: { blocks: Block[] } | null;
}

interface ThemeSettings {
  primaryColor?: string;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
}

const BLOCK_PALETTE: { type: BlockType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "hero", label: "Hero", icon: Layers, description: "Large header section" },
  { type: "text", label: "Text", icon: AlignLeft, description: "Rich text block" },
  { type: "gallery", label: "Gallery", icon: Image, description: "Image grid" },
  { type: "contact", label: "Contact", icon: Mail, description: "Contact info" },
  { type: "embed", label: "Embed", icon: Code, description: "iFrame embed" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal rule" },
];

function makeDefaultBlock(type: BlockType): Block {
  switch (type) {
    case "hero": return { type: "hero", heading: "Hello World", subheading: "A great subheading", ctaText: "Get started", ctaHref: "#", bgColor: "#1e293b", color: "#ffffff" };
    case "text": return { type: "text", heading: "Section Title", body: "Add your content here." };
    case "gallery": return { type: "gallery", heading: "Gallery", images: [{ url: "", alt: "", caption: "" }] };
    case "contact": return { type: "contact", heading: "Get in touch", email: "", body: "" };
    case "embed": return { type: "embed", url: "", caption: "" };
    case "divider": return { type: "divider" };
  }
}

// ─── Save status ─────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved";

// ─── Main builder ─────────────────────────────────────────────────────────────

export default function SitesBuilderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [siteTitle, setSiteTitle] = useState("");
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: "#3b82f6",
    bgColor: "#ffffff",
    textColor: "#0f172a",
    fontFamily: "system",
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  // Fetch site data
  const { data: site, isLoading, isError } = useQuery<SiteData>({
    queryKey: ["/api/sites", slug],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${slug}`);
      if (!res.ok) throw new Error(`Failed to load site (${res.status})`);
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  // Hydrate state from server data
  useEffect(() => {
    if (!site || !initialLoad.current) return;
    initialLoad.current = false;
    setSiteTitle(site.title);
    if (site.theme_json) setTheme(site.theme_json);
    const homepage = site.pages?.find((p) => p.is_homepage) ?? site.pages?.[0];
    if (homepage?.content_json?.blocks) {
      setBlocks(homepage.content_json.blocks);
    }
  }, [site]);

  // Save page content
  const savePageMutation = useMutation({
    mutationFn: (newBlocks: Block[]) =>
      apiRequest("PUT", `/api/sites/${slug}/pages/home`, {
        contentJson: { blocks: newBlocks },
      }),
    onSuccess: () => setSaveStatus("saved"),
    onError: () => {
      setSaveStatus("idle");
      toast({ title: "Save failed", description: "Could not save page changes.", variant: "destructive" });
    },
  });

  // Save site (title/theme)
  const saveSiteMutation = useMutation({
    mutationFn: (data: { title?: string; themeJson?: ThemeSettings }) =>
      apiRequest("PUT", `/api/sites/${slug}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", slug] });
    },
    onError: () => toast({ title: "Error", description: "Failed to save site settings.", variant: "destructive" }),
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sites/${slug}/publish`).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: data.is_published ? "Site published!" : "Site unpublished",
        description: data.is_published ? `Live at ${slug}.sev.cx` : "Your site is now in draft mode.",
      });
    },
    onError: () => toast({ title: "Error", description: "Failed to toggle publish state.", variant: "destructive" }),
  });

  // Debounced auto-save on block changes
  const debouncedSave = useCallback(
    (newBlocks: Block[]) => {
      if (initialLoad.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(() => {
        savePageMutation.mutate(newBlocks);
      }, 1500);
    },
    [slug]
  );

  function updateBlocks(newBlocks: Block[]) {
    setBlocks(newBlocks);
    debouncedSave(newBlocks);
  }

  function addBlock(type: BlockType) {
    const newBlocks = [...blocks, makeDefaultBlock(type)];
    updateBlocks(newBlocks);
    setSelectedIndex(newBlocks.length - 1);
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const newBlocks = [...blocks];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= newBlocks.length) return;
    [newBlocks[index], newBlocks[swap]] = [newBlocks[swap], newBlocks[index]];
    updateBlocks(newBlocks);
    setSelectedIndex(swap);
  }

  function deleteBlock(index: number) {
    const newBlocks = blocks.filter((_, i) => i !== index);
    updateBlocks(newBlocks);
    setSelectedIndex(null);
  }

  function updateBlock(index: number, updates: Partial<Block>) {
    const newBlocks = blocks.map((b, i) => (i === index ? { ...b, ...updates } : b));
    updateBlocks(newBlocks);
  }

  function handleSaveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    savePageMutation.mutate(blocks);
    saveSiteMutation.mutate({ title: siteTitle, themeJson: theme });
  }

  function handleThemeSave() {
    saveSiteMutation.mutate({ themeJson: theme });
    setThemeOpen(false);
    toast({ title: "Theme saved" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (isError || (!isLoading && !site)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f] text-white">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Site not found</h2>
          <p className="text-zinc-500 text-sm mb-4">This site doesn't exist or you don't have access to it.</p>
          <Button variant="ghost" onClick={() => navigate("/sites")} className="text-blue-400" data-testid="button-back-not-found">
            Back to My Sites
          </Button>
        </div>
      </div>
    );
  }

  const isPublished = site.is_published;

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-white overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-zinc-800 bg-[#111111] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white h-8 px-2 gap-1.5"
          onClick={() => navigate("/sites")}
          data-testid="button-back-to-sites"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Sites</span>
        </Button>

        <div className="w-px h-5 bg-zinc-800" />

        <input
          type="text"
          value={siteTitle}
          onChange={(e) => setSiteTitle(e.target.value)}
          onBlur={() => saveSiteMutation.mutate({ title: siteTitle })}
          className="bg-transparent text-sm font-semibold text-white border-none outline-none focus:bg-zinc-900 focus:px-2 rounded transition-all max-w-48 truncate"
          data-testid="input-site-title-inline"
        />

        <div className="flex-1" />

        {/* Save status */}
        <div className="text-xs text-zinc-600 flex items-center gap-1" data-testid="text-save-status">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
          {saveStatus === "saved" && <><Check className="w-3 h-3 text-green-500" /> Saved</>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white h-8 gap-1.5 text-xs"
          onClick={() => setThemeOpen(true)}
          data-testid="button-open-theme"
        >
          <Paintbrush className="w-3.5 h-3.5" />
          Theme
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={`h-8 text-xs gap-1.5 font-medium border ${
            isPublished
              ? "border-green-600 text-green-400 hover:bg-green-950"
              : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          }`}
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
          data-testid="button-toggle-publish"
        >
          <Globe className="w-3.5 h-3.5" />
          {publishMutation.isPending ? "..." : isPublished ? "Published" : "Publish"}
        </Button>

        <Button
          size="sm"
          className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          onClick={handleSaveNow}
          disabled={saveSiteMutation.isPending}
          data-testid="button-save-site"
        >
          {saveSiteMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Three-column workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Block palette */}
        <div className="w-[260px] shrink-0 bg-[#111111] border-r border-zinc-800 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Blocks</p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {BLOCK_PALETTE.map(({ type, label, icon: Icon, description }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 transition-all text-left group"
                data-testid={`button-add-block-${type}`}
              >
                <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 group-hover:border-blue-500/30 transition-colors">
                  <Icon className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</p>
                  <p className="text-xs text-zinc-600">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto bg-zinc-700 p-6">
          <div className="max-w-3xl mx-auto shadow-2xl rounded-lg overflow-hidden" style={{ minHeight: "600px" }}>
            {/* Browser chrome */}
            <div className="bg-zinc-200 flex items-center gap-2 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3 bg-white rounded text-xs text-zinc-500 px-3 py-1 font-mono">
                {slug}.sev.cx
              </div>
            </div>

            {/* Canvas body */}
            <div
              className="bg-white min-h-[560px]"
              style={{
                fontFamily:
                  theme.fontFamily === "serif"
                    ? "Georgia, serif"
                    : theme.fontFamily === "mono"
                    ? "monospace"
                    : theme.fontFamily === "rounded"
                    ? "ui-rounded, sans-serif"
                    : "system-ui, sans-serif",
                backgroundColor: theme.bgColor || "#ffffff",
                color: theme.textColor || "#0f172a",
              }}
            >
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
                  <Layers className="w-10 h-10 mb-3 text-zinc-300" />
                  <p className="text-sm">Add blocks from the panel on the left</p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <CanvasBlock
                    key={index}
                    block={block}
                    index={index}
                    isSelected={selectedIndex === index}
                    isFirst={index === 0}
                    isLast={index === blocks.length - 1}
                    theme={theme}
                    onClick={() => setSelectedIndex(index)}
                    onMoveUp={() => moveBlock(index, "up")}
                    onMoveDown={() => moveBlock(index, "down")}
                    onDelete={() => deleteBlock(index)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="w-[280px] shrink-0 bg-[#111111] border-l border-zinc-800 flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {selectedIndex !== null ? "Properties" : "Page Settings"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedIndex !== null && blocks[selectedIndex] ? (
              <BlockProperties
                block={blocks[selectedIndex]}
                onChange={(updates) => updateBlock(selectedIndex, updates)}
              />
            ) : (
              <PageSettingsPanel
                  site={site}
                  onSaveSite={(data) => saveSiteMutation.mutate(data)}
                />
            )}
          </div>
        </div>
      </div>

      {/* Theme Sheet */}
      <Sheet open={themeOpen} onOpenChange={setThemeOpen}>
        <SheetContent
          side="right"
          className="bg-zinc-950 border-zinc-800 text-white w-[300px]"
          data-testid="sheet-theme"
        >
          <SheetHeader>
            <SheetTitle className="text-white">Theme Customizer</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div>
              <Label className="text-zinc-300 text-xs mb-2 block">Primary color</Label>
              <input
                type="color"
                value={theme.primaryColor ?? "#3b82f6"}
                onChange={(e) => setTheme((t) => ({ ...t, primaryColor: e.target.value }))}
                className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 cursor-pointer"
                data-testid="input-theme-primary-color"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-xs mb-2 block">Background color</Label>
              <input
                type="color"
                value={theme.bgColor ?? "#ffffff"}
                onChange={(e) => setTheme((t) => ({ ...t, bgColor: e.target.value }))}
                className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 cursor-pointer"
                data-testid="input-theme-bg-color"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-xs mb-2 block">Text color</Label>
              <input
                type="color"
                value={theme.textColor ?? "#0f172a"}
                onChange={(e) => setTheme((t) => ({ ...t, textColor: e.target.value }))}
                className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 cursor-pointer"
                data-testid="input-theme-text-color"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-xs mb-2 block">Font family</Label>
              <Select
                value={theme.fontFamily ?? "system"}
                onValueChange={(v) => setTheme((t) => ({ ...t, fontFamily: v }))}
              >
                <SelectTrigger
                  className="bg-zinc-900 border-zinc-700 text-white focus:ring-blue-500"
                  data-testid="select-theme-font"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="system" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">System Default</SelectItem>
                  <SelectItem value="serif" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">Serif</SelectItem>
                  <SelectItem value="mono" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">Mono</SelectItem>
                  <SelectItem value="rounded" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold mt-4"
              onClick={handleThemeSave}
              data-testid="button-save-theme"
            >
              Apply Theme
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Canvas Block ─────────────────────────────────────────────────────────────

function CanvasBlock({
  block,
  index,
  isSelected,
  isFirst,
  isLast,
  theme,
  onClick,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: Block;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  theme: ThemeSettings;
  onClick: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      style={{
        outline: isSelected
          ? "2px solid #3b82f6"
          : hovered
          ? "2px solid #93c5fd"
          : "2px solid transparent",
        outlineOffset: "-2px",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`canvas-block-${index}`}
    >
      {/* Action toolbar */}
      {(hovered || isSelected) && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md px-1.5 py-1 z-10 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            onClick={onMoveUp}
            disabled={isFirst}
            data-testid={`button-move-up-${index}`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            onClick={onMoveDown}
            disabled={isLast}
            data-testid={`button-move-down-${index}`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-400 hover:text-red-300 transition-colors"
            onClick={onDelete}
            data-testid={`button-delete-block-${index}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <BlockRenderer block={block} theme={theme} />
    </div>
  );
}

// ─── Block Renderer ───────────────────────────────────────────────────────────

function BlockRenderer({ block, theme }: { block: Block; theme: ThemeSettings }) {
  switch (block.type) {
    case "hero":
      return (
        <div
          style={{ backgroundColor: block.bgColor || theme.primaryColor || "#1e293b", color: block.color || "#ffffff" }}
          className="px-8 py-16 text-center"
        >
          <h1 className="text-4xl font-bold mb-3">{block.heading || "Heading"}</h1>
          {block.subheading && <p className="text-lg opacity-80 mb-6">{block.subheading}</p>}
          {block.ctaText && (
            <span
              className="inline-block px-6 py-2.5 rounded-md text-sm font-semibold"
              style={{ backgroundColor: theme.primaryColor || "#3b82f6", color: "#ffffff" }}
            >
              {block.ctaText}
            </span>
          )}
        </div>
      );
    case "text":
      return (
        <div className="px-8 py-10">
          {block.heading && <h2 className="text-2xl font-bold mb-4">{block.heading}</h2>}
          <p className="text-base leading-relaxed whitespace-pre-wrap">{block.body}</p>
        </div>
      );
    case "gallery":
      return (
        <div className="px-8 py-10">
          {block.heading && <h2 className="text-2xl font-bold mb-6">{block.heading}</h2>}
          <div className="grid grid-cols-2 gap-3">
            {block.images.map((img, i) =>
              img.url ? (
                <div key={i} className="rounded-md overflow-hidden bg-zinc-100 aspect-video">
                  <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover" />
                  {img.caption && <p className="text-xs text-zinc-500 p-1 text-center">{img.caption}</p>}
                </div>
              ) : (
                <div key={i} className="rounded-md bg-zinc-100 aspect-video flex items-center justify-center">
                  <Image className="w-8 h-8 text-zinc-400" />
                </div>
              )
            )}
          </div>
        </div>
      );
    case "contact":
      return (
        <div className="px-8 py-10">
          {block.heading && <h2 className="text-2xl font-bold mb-4">{block.heading}</h2>}
          {block.body && <p className="mb-3 leading-relaxed">{block.body}</p>}
          {block.email && (
            <a
              href={`mailto:${block.email}`}
              className="text-sm font-medium"
              style={{ color: theme.primaryColor || "#3b82f6" }}
            >
              {block.email}
            </a>
          )}
        </div>
      );
    case "embed":
      return (
        <div className="px-8 py-10">
          {block.url ? (
            <div className="rounded-md overflow-hidden bg-zinc-100 aspect-video">
              <iframe src={block.url} className="w-full h-full" title="Embed" />
            </div>
          ) : (
            <div className="rounded-md bg-zinc-100 aspect-video flex items-center justify-center">
              <Code className="w-8 h-8 text-zinc-400" />
            </div>
          )}
          {block.caption && <p className="text-xs text-zinc-500 mt-2 text-center">{block.caption}</p>}
        </div>
      );
    case "divider":
      return (
        <div className="px-8 py-4">
          <hr className="border-zinc-200" />
        </div>
      );
    default:
      return null;
  }
}

// ─── Block Properties Panel ───────────────────────────────────────────────────

function BlockProperties({ block, onChange }: { block: Block; onChange: (updates: Partial<Block>) => void }) {
  const fieldClass = "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 text-sm focus-visible:ring-blue-500";
  const labelClass = "text-zinc-400 text-xs mb-1 block";

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Heading</label>
            <Input
              value={block.heading}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<HeroBlock>)}
              className={fieldClass}
              data-testid="input-prop-heading"
            />
          </div>
          <div>
            <label className={labelClass}>Subheading</label>
            <Input
              value={block.subheading ?? ""}
              onChange={(e) => onChange({ subheading: e.target.value } as Partial<HeroBlock>)}
              className={fieldClass}
              data-testid="input-prop-subheading"
            />
          </div>
          <div>
            <label className={labelClass}>CTA Text</label>
            <Input
              value={block.ctaText ?? ""}
              onChange={(e) => onChange({ ctaText: e.target.value } as Partial<HeroBlock>)}
              className={fieldClass}
              data-testid="input-prop-cta-text"
            />
          </div>
          <div>
            <label className={labelClass}>CTA URL</label>
            <Input
              value={block.ctaHref ?? ""}
              onChange={(e) => onChange({ ctaHref: e.target.value } as Partial<HeroBlock>)}
              className={fieldClass}
              placeholder="https://"
              data-testid="input-prop-cta-url"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Background</label>
              <input
                type="color"
                value={block.bgColor ?? "#1e293b"}
                onChange={(e) => onChange({ bgColor: e.target.value } as Partial<HeroBlock>)}
                className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer"
                data-testid="input-prop-bg-color"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Text color</label>
              <input
                type="color"
                value={block.color ?? "#ffffff"}
                onChange={(e) => onChange({ color: e.target.value } as Partial<HeroBlock>)}
                className="w-full h-9 rounded border border-zinc-700 bg-zinc-900 cursor-pointer"
                data-testid="input-prop-text-color"
              />
            </div>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Heading (optional)</label>
            <Input
              value={block.heading ?? ""}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<TextBlock>)}
              className={fieldClass}
              data-testid="input-prop-text-heading"
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <Textarea
              value={block.body}
              onChange={(e) => onChange({ body: e.target.value } as Partial<TextBlock>)}
              className={`${fieldClass} resize-none`}
              rows={8}
              data-testid="input-prop-body"
            />
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Heading (optional)</label>
            <Input
              value={block.heading ?? ""}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<GalleryBlock>)}
              className={fieldClass}
              data-testid="input-prop-gallery-heading"
            />
          </div>
          <div>
            <label className={labelClass}>Images</label>
            <div className="space-y-3">
              {block.images.map((img, i) => (
                <div key={i} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-2">
                  <Input
                    value={img.url}
                    onChange={(e) => {
                      const imgs = [...block.images];
                      imgs[i] = { ...imgs[i], url: e.target.value };
                      onChange({ images: imgs } as Partial<GalleryBlock>);
                    }}
                    className={fieldClass}
                    placeholder="Image URL"
                    data-testid={`input-gallery-url-${i}`}
                  />
                  <Input
                    value={img.alt ?? ""}
                    onChange={(e) => {
                      const imgs = [...block.images];
                      imgs[i] = { ...imgs[i], alt: e.target.value };
                      onChange({ images: imgs } as Partial<GalleryBlock>);
                    }}
                    className={fieldClass}
                    placeholder="Alt text"
                    data-testid={`input-gallery-alt-${i}`}
                  />
                  <Input
                    value={img.caption ?? ""}
                    onChange={(e) => {
                      const imgs = [...block.images];
                      imgs[i] = { ...imgs[i], caption: e.target.value };
                      onChange({ images: imgs } as Partial<GalleryBlock>);
                    }}
                    className={fieldClass}
                    placeholder="Caption"
                    data-testid={`input-gallery-caption-${i}`}
                  />
                  {block.images.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 text-xs h-7 px-2"
                      onClick={() => {
                        const imgs = block.images.filter((_, j) => j !== i);
                        onChange({ images: imgs } as Partial<GalleryBlock>);
                      }}
                      data-testid={`button-remove-image-${i}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white text-xs"
                onClick={() =>
                  onChange({ images: [...block.images, { url: "", alt: "", caption: "" }] } as Partial<GalleryBlock>)
                }
                data-testid="button-add-image"
              >
                + Add image
              </Button>
            </div>
          </div>
        </div>
      );
    case "contact":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Heading (optional)</label>
            <Input
              value={block.heading ?? ""}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<ContactBlock>)}
              className={fieldClass}
              data-testid="input-prop-contact-heading"
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <Input
              value={block.email ?? ""}
              onChange={(e) => onChange({ email: e.target.value } as Partial<ContactBlock>)}
              className={fieldClass}
              placeholder="hello@example.com"
              data-testid="input-prop-email"
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <Textarea
              value={block.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value } as Partial<ContactBlock>)}
              className={`${fieldClass} resize-none`}
              rows={4}
              data-testid="input-prop-contact-body"
            />
          </div>
        </div>
      );
    case "embed":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Embed URL</label>
            <Input
              value={block.url}
              onChange={(e) => onChange({ url: e.target.value } as Partial<EmbedBlock>)}
              className={fieldClass}
              placeholder="https://www.youtube.com/embed/..."
              data-testid="input-prop-embed-url"
            />
          </div>
          <div>
            <label className={labelClass}>Caption</label>
            <Input
              value={block.caption ?? ""}
              onChange={(e) => onChange({ caption: e.target.value } as Partial<EmbedBlock>)}
              className={fieldClass}
              data-testid="input-prop-embed-caption"
            />
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="py-6 text-center">
          <p className="text-xs text-zinc-600">No settings for this block</p>
        </div>
      );
    default:
      return null;
  }
}

// ─── Page Settings Panel ──────────────────────────────────────────────────────

function PageSettingsPanel({ site, onSaveSite }: { site: SiteData; onSaveSite: (data: { title?: string; description?: string }) => void }) {
  const [pageTitle, setPageTitle] = useState(site.title);
  const [pageDesc, setPageDesc] = useState(site.description ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-500 mb-3">
        <Settings className="w-4 h-4" />
        <span className="text-xs font-medium">Page Settings</span>
      </div>
      <div>
        <label className="text-zinc-400 text-xs mb-1 block">Page title</label>
        <Input
          value={pageTitle}
          onChange={(e) => setPageTitle(e.target.value)}
          onBlur={() => onSaveSite({ title: pageTitle })}
          className="bg-zinc-900 border-zinc-700 text-white text-sm focus-visible:ring-blue-500"
          data-testid="input-page-title"
        />
      </div>
      <div>
        <label className="text-zinc-400 text-xs mb-1 block">Description</label>
        <Textarea
          value={pageDesc}
          onChange={(e) => setPageDesc(e.target.value)}
          onBlur={() => onSaveSite({ description: pageDesc })}
          className="bg-zinc-900 border-zinc-700 text-white text-sm focus-visible:ring-blue-500 resize-none"
          rows={3}
          data-testid="input-page-description"
        />
      </div>
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
        <p className="text-xs text-zinc-500">Active page</p>
        <p className="text-sm font-medium text-white">Homepage</p>
      </div>
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
        <p className="text-xs text-zinc-500">Site URL</p>
        <p className="text-sm font-mono text-blue-400">{site.slug}.sev.cx</p>
      </div>
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
        <p className="text-xs text-zinc-500">Status</p>
        <p className={`text-sm font-medium ${site.is_published ? "text-green-400" : "text-zinc-400"}`}>
          {site.is_published ? "Published" : "Draft"}
        </p>
      </div>
      <p className="text-xs text-zinc-700 mt-4">Click a block on the canvas to edit its properties.</p>
    </div>
  );
}
