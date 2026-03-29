import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Pencil, Trash2, Loader2, Newspaper, Eye, RefreshCw, Key, CheckCircle2, XCircle,
  ExternalLink, SlidersHorizontal, Sparkles, Bot, Image, BarChart2, BookmarkCheck,
  ToggleLeft, Zap, MessageSquare, AlertTriangle, TrendingUp, GripVertical
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NewsCategory } from "@shared/schema";
import type { NewsArticle } from "@/components/news-article-card";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  query: z.string().min(1, "Query is required"),
  xQuery: z.string().optional(),
  accentColor: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  enabled: z.boolean().default(true),
  featured: z.boolean().default(false),
  pinned: z.boolean().default(false),
});
type CategoryForm = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: NewsCategory | null;
}

function CategoryDialog({ open, onClose, editing }: CategoryDialogProps) {
  const { toast } = useToast();
  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: editing
      ? {
          name: editing.name,
          query: editing.query,
          xQuery: editing.xQuery || "",
          accentColor: editing.accentColor || "",
          displayOrder: editing.displayOrder,
          enabled: editing.enabled,
          featured: editing.featured,
          pinned: editing.pinned,
        }
      : { name: "", query: "", xQuery: "", accentColor: "#6b7280", displayOrder: 0, enabled: true, featured: false, pinned: false },
  });

  const mutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      if (editing) {
        return apiRequest("PATCH", `/api/news/categories/${editing.id}`, data).then((r) => r.json());
      }
      return apiRequest("POST", "/api/news/categories", data).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
      toast({ title: editing ? "Category updated" : "Category created" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...form.register("name")} placeholder="Music & Entertainment" data-testid="input-category-name" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Search Query</Label>
            <Input {...form.register("query")} placeholder="music industry OR entertainment news" data-testid="input-category-query" />
            <p className="text-[11px] text-muted-foreground">Used as the Google News RSS search term.</p>
            {form.formState.errors.query && (
              <p className="text-xs text-destructive">{form.formState.errors.query.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>X Search Query <span className="text-[10px] text-muted-foreground font-normal ml-1">(optional)</span></Label>
            <Input
              {...form.register("xQuery")}
              placeholder="#music OR from:billboard OR from:pitchfork"
              data-testid="input-category-xquery"
            />
            <p className="text-[11px] text-muted-foreground">
              Custom X search query for this category. Supports hashtags, handles (<code className="bg-muted px-0.5 rounded">from:handle</code>), and OR logic. Overrides the default per-category X query when set.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  {...form.register("accentColor")}
                  className="h-9 w-12 rounded border cursor-pointer"
                  data-testid="input-category-color"
                />
                <Input
                  {...form.register("accentColor")}
                  placeholder="#6b7280"
                  className="flex-1 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" {...form.register("displayOrder")} className="text-sm" data-testid="input-category-order" />
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("enabled")}
                onCheckedChange={(v) => form.setValue("enabled", v)}
                data-testid="switch-category-enabled"
              />
              <Label className="text-xs">Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("featured")}
                onCheckedChange={(v) => form.setValue("featured", v)}
                data-testid="switch-category-featured"
              />
              <Label className="text-xs">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("pinned")}
                onCheckedChange={(v) => form.setValue("pinned", v)}
                data-testid="switch-category-pinned"
              />
              <Label className="text-xs">Pinned</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-category">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  category: NewsCategory;
}

function PreviewDialog({ open, onClose, category }: PreviewDialogProps) {
  const { data: articles, isLoading, refetch } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/feed", category.query, "preview"],
    queryFn: () =>
      fetch(`/api/news/feed?query=${encodeURIComponent(category.query)}&limit=5`).then((r) => r.json()),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: category.accentColor || "#6b7280" }}
            />
            <DialogTitle>Preview — {category.name}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Query: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{category.query}</code></p>
        </DialogHeader>

        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Fetching live feed…</span>
            </div>
          ) : !articles?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No articles found for this query.</p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <a
                  key={article.link}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  data-testid={`preview-article-${encodeURIComponent(article.link).slice(0, 20)}`}
                >
                  {article.imageUrl && (
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-16 h-12 object-cover rounded-md shrink-0"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{article.source} · {article.pubDate ? new Date(article.pubDate).toLocaleDateString() : ""}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5" data-testid="button-preview-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const apiKeySchema = z.object({
  gNewsApiKey: z.string(),
});
type ApiKeyForm = z.infer<typeof apiKeySchema>;

function ApiSettingsCard() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);

  const { data: apiStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ usingGNews: boolean; source: string; hasKey: boolean }>({
    queryKey: ["/api/news/api-status"],
    staleTime: 30000,
  });

  const form = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { gNewsApiKey: "" },
  });

  const saveKeyMutation = useMutation({
    mutationFn: (data: ApiKeyForm) =>
      apiRequest("PUT", "/api/news/api-key", { gNewsApiKey: data.gNewsApiKey }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "API key saved" });
      form.reset({ gNewsApiKey: "" });
      refetchStatus();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="p-4 space-y-4" data-testid="card-api-settings">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">API Settings</h3>
      </div>

      <div className="flex items-center gap-2">
        {statusLoading ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking status…
          </span>
        ) : apiStatus?.hasKey ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Using GNews API — images included
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <XCircle className="h-3.5 w-3.5" />
            Using Google News RSS — no images
          </span>
        )}
      </div>

      <form onSubmit={form.handleSubmit((d) => saveKeyMutation.mutate(d))} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">GNews API Key</Label>
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Enter your GNews API key…"
              className="text-sm flex-1"
              data-testid="input-gnews-api-key"
              {...form.register("gNewsApiKey")}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => setShowKey((v) => !v)}
              data-testid="button-toggle-key-visibility"
            >
              {showKey ? "Hide" : "Show"}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="shrink-0 text-xs"
              disabled={saveKeyMutation.isPending}
              data-testid="button-save-api-key"
            >
              {saveKeyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Get a free key at{" "}
            <a
              href="https://gnews.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
              data-testid="link-gnews"
            >
              gnews.io <ExternalLink className="h-2.5 w-2.5" />
            </a>{" "}
            (100 req/day free tier). When set, articles will include real images.
          </p>
        </div>
      </form>
    </Card>
  );
}

const xFeedSettingsSchema = z.object({
  imageMode: z.enum(["images_only", "ai_generate", "none"]),
  sourceType: z.enum(["both", "rss_only", "x_only"]),
  allowedAccounts: z.string(),
  blockedAccounts: z.string(),
  blockedSources: z.string(),
  minEngagement: z.coerce.number().int().min(0).default(0),
});
type XFeedSettingsForm = z.infer<typeof xFeedSettingsSchema>;

function XFeedTab() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
    staleTime: 30000,
  });

  const form = useForm<XFeedSettingsForm>({
    resolver: zodResolver(xFeedSettingsSchema),
    defaultValues: {
      imageMode: "images_only",
      sourceType: "both",
      allowedAccounts: "",
      blockedAccounts: "",
      blockedSources: "",
      minEngagement: 0,
    },
    values: settings
      ? {
          imageMode: (settings["news.x.imageMode"] as XFeedSettingsForm["imageMode"]) || "images_only",
          sourceType: (settings["news.x.sourceType"] as XFeedSettingsForm["sourceType"]) || "both",
          allowedAccounts: settings["news.x.allowedAccounts"] || "",
          blockedAccounts: settings["news.x.blockedAccounts"] || "",
          blockedSources: settings["news.rss.blockedSources"] || "",
          minEngagement: parseInt(settings["news.x.minEngagement"] || "0") || 0,
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: XFeedSettingsForm) =>
      apiRequest("PUT", "/api/platform-settings", {
        "news.x.imageMode": data.imageMode,
        "news.x.sourceType": data.sourceType,
        "news.x.allowedAccounts": data.allowedAccounts,
        "news.x.blockedAccounts": data.blockedAccounts,
        "news.rss.blockedSources": data.blockedSources,
        "news.x.minEngagement": String(data.minEngagement),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "X feed settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6" data-testid="tab-xfeed">
      <ApiSettingsCard />

      <Card className="p-4 space-y-4" data-testid="card-xfeed-controls">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">X Feed Controls</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading settings…
          </div>
        ) : (
          <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Image Mode</Label>
                <Select
                  value={form.watch("imageMode")}
                  onValueChange={(v) => form.setValue("imageMode", v as XFeedSettingsForm["imageMode"])}
                >
                  <SelectTrigger data-testid="select-image-mode" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="images_only">Images Only (default)</SelectItem>
                    <SelectItem value="ai_generate">AI Generate</SelectItem>
                    <SelectItem value="none">No Images (fastest)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  "Images Only" fetches only X posts with attached photos. "AI Generate" creates editorial thumbnails for posts without images via Grok Imagine.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Source Type</Label>
                <Select
                  value={form.watch("sourceType")}
                  onValueChange={(v) => form.setValue("sourceType", v as XFeedSettingsForm["sourceType"])}
                >
                  <SelectTrigger data-testid="select-source-type" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (RSS + X posts)</SelectItem>
                    <SelectItem value="rss_only">RSS Only</SelectItem>
                    <SelectItem value="x_only">X Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Control whether the feed shows RSS articles, X posts, or both.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Trusted Accounts</Label>
              <Textarea
                {...form.register("allowedAccounts")}
                placeholder="e.g. @verge, @techcrunch, wired"
                rows={2}
                className="text-sm resize-none"
                data-testid="textarea-allowed-accounts"
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated X handles. When set, restricts X search to only posts from these accounts.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Blocked Accounts</Label>
              <Textarea
                {...form.register("blockedAccounts")}
                placeholder="e.g. @spammer, botaccount"
                rows={2}
                className="text-sm resize-none"
                data-testid="textarea-blocked-accounts"
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated X handles to always exclude from results.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Blocked RSS Sources</Label>
              <Textarea
                {...form.register("blockedSources")}
                placeholder="e.g. lokmattimes, indiaglitz, masala"
                rows={2}
                className="text-sm resize-none"
                data-testid="textarea-blocked-sources"
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated source names (partial match, case-insensitive) to filter out from RSS feeds. These stack on top of the built-in blocklist.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Min Engagement (likes + retweets)</Label>
              <Input
                type="number"
                min={0}
                {...form.register("minEngagement")}
                placeholder="0"
                className="text-sm w-36"
                data-testid="input-min-engagement"
              />
              <p className="text-[11px] text-muted-foreground">
                Posts with fewer combined likes + retweets than this threshold will be filtered out. Set to 0 to disable.
              </p>
            </div>

            <Button
              type="submit"
              size="sm"
              className="text-xs"
              disabled={saveMutation.isPending}
              data-testid="button-save-xfeed-settings"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save X Feed Settings
            </Button>
          </form>
        )}
      </Card>

      <CategoryXQueryEditor />
    </div>
  );
}

function CategoryXQueryEditor() {
  const { toast } = useToast();
  const [previewState, setPreviewState] = useState<{ category: NewsCategory; liveQuery: string } | null>(null);

  const { data: categories, isLoading } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news/categories"],
    staleTime: 60000,
  });

  const updateXQueryMutation = useMutation({
    mutationFn: ({ id, xQuery }: { id: number; xQuery: string }) =>
      apiRequest("PATCH", `/api/news/categories/${id}`, { xQuery }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
      toast({ title: "X query updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading categories…
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 space-y-4" data-testid="card-category-xquery-editor">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Per-Category X Query Overrides</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Override the default X search query for each category. When set, this query is used instead of the category name for X post searches.
        </p>

        {!categories?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">No categories configured.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <CategoryXQueryRow
                key={cat.id}
                category={cat}
                onSave={(xQuery) => updateXQueryMutation.mutate({ id: cat.id, xQuery })}
                onPreview={(liveQuery) => setPreviewState({ category: cat, liveQuery })}
                isSaving={updateXQueryMutation.isPending}
              />
            ))}
          </div>
        )}
      </Card>

      {previewState && (
        <XQueryPreviewDialog
          open={!!previewState}
          onClose={() => setPreviewState(null)}
          category={previewState.category}
          queryOverride={previewState.liveQuery}
        />
      )}
    </>
  );
}

function CategoryXQueryRow({
  category,
  onSave,
  onPreview,
  isSaving,
}: {
  category: NewsCategory;
  onSave: (xQuery: string) => void;
  onPreview: (liveQuery: string) => void;
  isSaving: boolean;
}) {
  const [localQuery, setLocalQuery] = useState(category.xQuery || "");
  const hasChanged = localQuery !== (category.xQuery || "");

  return (
    <div className="rounded-lg border p-3 space-y-2" data-testid={`xquery-row-${category.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {category.accentColor && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: category.accentColor }}
            />
          )}
          <span className="text-sm font-medium">{category.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onPreview(localQuery)}
            data-testid={`button-xquery-preview-${category.id}`}
          >
            <Eye className="h-3 w-3" /> Preview
          </Button>
          {hasChanged && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onSave(localQuery)}
              disabled={isSaving}
              data-testid={`button-xquery-save-${category.id}`}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          )}
        </div>
      </div>
      <Input
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder={`e.g. #${category.name.toLowerCase().replace(/\s+/g, "")} OR from:relevant_handle`}
        className="text-xs"
        data-testid={`input-xquery-${category.id}`}
      />
    </div>
  );
}

function XQueryPreviewDialog({
  open,
  onClose,
  category,
  queryOverride,
}: {
  open: boolean;
  onClose: () => void;
  category: NewsCategory;
  queryOverride?: string;
}) {
  const xQuery = queryOverride || category.xQuery || category.name;
  const { data: articles, isLoading, refetch } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/x-feed", category.name, xQuery, "x-preview"],
    queryFn: () => {
      const params = new URLSearchParams({ category: category.name, limit: "5" });
      if (queryOverride) params.set("xQueryOverride", queryOverride);
      return fetch(`/api/news/x-feed?${params.toString()}`).then((r) => r.json());
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: category.accentColor || "#6b7280" }}
            />
            <DialogTitle>X Query Preview — {category.name}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Query: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{xQuery}</code>
          </p>
        </DialogHeader>

        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Fetching X feed preview…</span>
            </div>
          ) : !articles?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No articles found for this query.</p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <a
                  key={article.link}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  {article.imageUrl && (
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-16 h-12 object-cover rounded-md shrink-0"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {article.source} · {article.pubDate ? new Date(article.pubDate).toLocaleDateString() : ""}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AISettingsData {
  summariesEnabled: boolean;
  imageGenEnabled: boolean;
  dailyBriefingEnabled: boolean;
  askGrokEnabled: boolean;
  breakingDetectionEnabled: boolean;
  searchEnabled: boolean;
  trendingEnabled: boolean;
  grokModel: string;
  summaryStyle: string;
  imagePromptTemplate: string;
  maxRequestsPerHour: number;
}

function AISettingsTab() {
  const { toast } = useToast();

  const { data: aiData, isLoading } = useQuery<AISettingsData>({
    queryKey: ["/api/news/ai-settings/admin"],
    staleTime: 30000,
  });

  const aiSettingsForm = useForm({
    defaultValues: {
      summariesEnabled: false,
      imageGenEnabled: false,
      dailyBriefingEnabled: false,
      askGrokEnabled: false,
      breakingDetectionEnabled: false,
      searchEnabled: false,
      trendingEnabled: false,
      grokModel: "x-ai/grok-3-mini",
      summaryStyle: "concise",
      imagePromptTemplate: "",
      maxRequestsPerHour: 60,
    },
    values: aiData ? {
      summariesEnabled: aiData.summariesEnabled,
      imageGenEnabled: aiData.imageGenEnabled,
      dailyBriefingEnabled: aiData.dailyBriefingEnabled,
      askGrokEnabled: aiData.askGrokEnabled,
      breakingDetectionEnabled: aiData.breakingDetectionEnabled,
      searchEnabled: aiData.searchEnabled,
      trendingEnabled: aiData.trendingEnabled,
      grokModel: aiData.grokModel,
      summaryStyle: aiData.summaryStyle,
      imagePromptTemplate: aiData.imagePromptTemplate,
      maxRequestsPerHour: aiData.maxRequestsPerHour,
    } : undefined,
  });

  const summariesEnabled = aiSettingsForm.watch("summariesEnabled");
  const imageGenEnabled = aiSettingsForm.watch("imageGenEnabled");
  const dailyBriefingEnabled = aiSettingsForm.watch("dailyBriefingEnabled");
  const askGrokEnabled = aiSettingsForm.watch("askGrokEnabled");
  const breakingDetectionEnabled = aiSettingsForm.watch("breakingDetectionEnabled");
  const searchEnabled = aiSettingsForm.watch("searchEnabled");
  const trendingEnabled = aiSettingsForm.watch("trendingEnabled");
  const grokModel = aiSettingsForm.watch("grokModel");
  const summaryStyle = aiSettingsForm.watch("summaryStyle");
  const imagePromptTemplate = aiSettingsForm.watch("imagePromptTemplate");
  const maxRequestsPerHour = aiSettingsForm.watch("maxRequestsPerHour");

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/api/news/ai-settings/admin", {
        summariesEnabled,
        imageGenEnabled,
        dailyBriefingEnabled,
        askGrokEnabled,
        breakingDetectionEnabled,
        searchEnabled,
        trendingEnabled,
        grokModel,
        summaryStyle,
        imagePromptTemplate,
        maxRequestsPerHour,
      }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "AI settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/news/ai-settings/admin"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading AI settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tab-ai-settings">
      <Card className="p-4 space-y-5" data-testid="card-ai-features">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Feature Toggles</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">AI Summaries</p>
                <p className="text-[11px] text-muted-foreground">Generate Grok-powered article summaries</p>
              </div>
            </div>
            <Switch
              checked={summariesEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("summariesEnabled", v)}
              data-testid="switch-ai-summaries"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">AI Image Generation</p>
                <p className="text-[11px] text-muted-foreground">Create editorial thumbnails via Grok Imagine</p>
              </div>
            </div>
            <Switch
              checked={imageGenEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("imageGenEnabled", v)}
              data-testid="switch-ai-image-gen"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Newspaper className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Daily Briefing</p>
                <p className="text-[11px] text-muted-foreground">AI-curated daily news summary digest</p>
              </div>
            </div>
            <Switch
              checked={dailyBriefingEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("dailyBriefingEnabled", v)}
              data-testid="switch-ai-daily-briefing"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Ask Grok Chat</p>
                <p className="text-[11px] text-muted-foreground">Let users ask questions about news articles</p>
              </div>
            </div>
            <Switch
              checked={askGrokEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("askGrokEnabled", v)}
              data-testid="switch-ai-ask-grok"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Breaking News AI Detection</p>
                <p className="text-[11px] text-muted-foreground">Automatically detect and flag breaking stories</p>
              </div>
            </div>
            <Switch
              checked={breakingDetectionEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("breakingDetectionEnabled", v)}
              data-testid="switch-ai-breaking-detection"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">AI Search</p>
                <p className="text-[11px] text-muted-foreground">Enable Grok-powered natural language news search</p>
              </div>
            </div>
            <Switch
              checked={searchEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("searchEnabled", v)}
              data-testid="switch-ai-search"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Trending AI Commentary</p>
                <p className="text-[11px] text-muted-foreground">Generate Grok commentary on trending X topics</p>
              </div>
            </div>
            <Switch
              checked={trendingEnabled}
              onCheckedChange={(v) => aiSettingsForm.setValue("trendingEnabled", v)}
              data-testid="switch-ai-trending"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-5" data-testid="card-ai-config">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Grok Model</Label>
            <Select value={grokModel} onValueChange={(v) => aiSettingsForm.setValue("grokModel", v)}>
              <SelectTrigger data-testid="select-grok-model" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x-ai/grok-3-mini">Grok 3 Mini (fast)</SelectItem>
                <SelectItem value="x-ai/grok-3">Grok 3 (balanced)</SelectItem>
                <SelectItem value="x-ai/grok-3-mini-fast">Grok 3 Mini Fast</SelectItem>
                <SelectItem value="x-ai/grok-2">Grok 2</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Select the xAI model for summaries and analysis.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Summary Style</Label>
            <Select value={summaryStyle} onValueChange={(v) => aiSettingsForm.setValue("summaryStyle", v)}>
              <SelectTrigger data-testid="select-summary-style" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise (2-3 sentences)</SelectItem>
                <SelectItem value="detailed">Detailed (paragraph)</SelectItem>
                <SelectItem value="editorial">Editorial (opinionated)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Controls the tone and length of AI summaries.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Image Style Prompt Template</Label>
          <Textarea
            value={imagePromptTemplate}
            onChange={(e) => aiSettingsForm.setValue("imagePromptTemplate", e.target.value)}
            placeholder="e.g. Create a professional editorial illustration for a news article about: {topic}. Style: modern, clean, minimalist."
            rows={3}
            className="text-sm resize-none"
            data-testid="textarea-image-prompt-template"
          />
          <p className="text-[11px] text-muted-foreground">
            Art direction template for Grok Imagine. Use <code className="bg-muted px-0.5 rounded">{"{ topic }"}</code> as a placeholder.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Max AI Requests per Hour</Label>
            <Badge variant="secondary" className="text-xs tabular-nums" data-testid="badge-max-requests">
              {maxRequestsPerHour}
            </Badge>
          </div>
          <Slider
            value={[maxRequestsPerHour]}
            onValueChange={([v]) => aiSettingsForm.setValue("maxRequestsPerHour", v)}
            min={10}
            max={200}
            step={5}
            className="w-full"
            data-testid="slider-max-requests"
          />
          <p className="text-[11px] text-muted-foreground">
            Rate limit for AI API calls. Lower values save quota; higher values enable more real-time features.
          </p>
        </div>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="gap-1.5"
        data-testid="button-save-ai-settings"
      >
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Save AI Settings
      </Button>
    </div>
  );
}

interface AnalyticsData {
  totalCategories: number;
  enabledCategories: number;
  featuredCategories: number;
  pinnedCategories: number;
  categoryStats: Array<{ id: number; name: string; enabled: boolean; featured: boolean; pinned: boolean; bookmarks: number }>;
  topBookmarked: Array<{ title: string; url: string; count: number }>;
  mostReadCategories: Array<{ id: number; name: string; bookmarks: number }>;
  aiSummariesEnabled: boolean;
  aiImageGenEnabled: boolean;
  sourceType: string;
  articlesFetchedBySource: { rss: number; x: number; total: number };
  aiOperationsToday: { summaries: number; images: number };
}

function AnalyticsTab() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/news/analytics"],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading analytics…</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Could not load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tab-analytics">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center" data-testid="stat-total-categories">
          <Newspaper className="h-5 w-5 mx-auto mb-1.5 text-primary" />
          <p className="text-2xl font-bold tabular-nums">{analytics.totalCategories}</p>
          <p className="text-[11px] text-muted-foreground">Total Categories</p>
        </Card>
        <Card className="p-4 text-center" data-testid="stat-enabled-categories">
          <ToggleLeft className="h-5 w-5 mx-auto mb-1.5 text-emerald-500" />
          <p className="text-2xl font-bold tabular-nums">{analytics.enabledCategories}</p>
          <p className="text-[11px] text-muted-foreground">Active Categories</p>
        </Card>
        <Card className="p-4 text-center" data-testid="stat-ai-summaries-today">
          <Sparkles className="h-5 w-5 mx-auto mb-1.5 text-violet-500" />
          <p className="text-2xl font-bold tabular-nums">{analytics.aiOperationsToday.summaries}</p>
          <p className="text-[11px] text-muted-foreground">AI Summaries Today</p>
        </Card>
        <Card className="p-4 text-center" data-testid="stat-ai-images-today">
          <Image className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
          <p className="text-2xl font-bold tabular-nums">{analytics.aiOperationsToday.images}</p>
          <p className="text-[11px] text-muted-foreground">AI Images Today</p>
        </Card>
      </div>

      <Card className="p-4 space-y-3" data-testid="card-articles-by-source">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Articles Fetched by Source</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-lg font-bold tabular-nums">{analytics.articlesFetchedBySource.rss}</p>
            <p className="text-[11px] text-muted-foreground">RSS</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-lg font-bold tabular-nums">{analytics.articlesFetchedBySource.x}</p>
            <p className="text-[11px] text-muted-foreground">X Posts</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-lg font-bold tabular-nums">{analytics.articlesFetchedBySource.total}</p>
            <p className="text-[11px] text-muted-foreground">Total</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3" data-testid="card-most-read">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Most-Read Categories</h3>
        </div>
        {analytics.mostReadCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No reading data yet.</p>
        ) : (
          <div className="space-y-2">
            {analytics.mostReadCategories.map((cat, i) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{cat.bookmarks} bookmarks</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3" data-testid="card-category-stats">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Category Performance</h3>
        </div>
        {analytics.categoryStats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No categories configured yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm" data-testid="table-category-stats">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Flags</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Bookmarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {analytics.categoryStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{cat.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={cat.enabled ? "default" : "secondary"} className="text-[10px]">
                        {cat.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {cat.featured && <Badge variant="outline" className="text-[10px]">Featured</Badge>}
                        {cat.pinned && <Badge variant="outline" className="text-[10px]">Pinned</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      <span className="flex items-center justify-center gap-1">
                        <BookmarkCheck className="h-3 w-3 text-muted-foreground" />
                        {cat.bookmarks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3" data-testid="card-top-bookmarked">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Top Bookmarked Articles</h3>
        </div>
        {analytics.topBookmarked.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No bookmarked articles yet.</p>
        ) : (
          <div className="space-y-2">
            {analytics.topBookmarked.map((article, i) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                data-testid={`top-bookmark-${i}`}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center pt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{article.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {article.count} bookmark{article.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3" data-testid="card-source-config">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Current Configuration</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground mb-1">Source Type</p>
            <p className="font-medium capitalize">{analytics.sourceType.replace("_", " ")}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground mb-1">AI Summaries</p>
            <p className={`font-medium ${analytics.aiSummariesEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {analytics.aiSummariesEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground mb-1">AI Images</p>
            <p className={`font-medium ${analytics.aiImageGenEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {analytics.aiImageGenEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SortableCategoryRow({
  category: cat,
  aiImageEnabled,
  onToggleAiImage,
  onToggleEnabled,
  onPreview,
  onEdit,
  onDelete,
}: {
  category: NewsCategory;
  aiImageEnabled: boolean;
  onToggleAiImage: (v: boolean) => void;
  onToggleEnabled: (v: boolean) => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto_auto] items-center px-4 py-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors"
      data-testid={`row-category-${cat.id}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        data-testid={`drag-handle-${cat.id}`}
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-medium text-foreground truncate pr-2">{cat.name}</span>
      <span className="text-muted-foreground pr-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded line-clamp-1">{cat.query}</code>
      </span>
      <span className="text-center px-3">
        {cat.accentColor ? (
          <span
            className="inline-block w-6 h-6 rounded-full border border-border"
            style={{ backgroundColor: cat.accentColor }}
            title={cat.accentColor}
          />
        ) : null}
      </span>
      <span className="text-center px-3">
        <Switch
          checked={aiImageEnabled}
          onCheckedChange={onToggleAiImage}
          data-testid={`toggle-ai-image-${cat.id}`}
          className="scale-90"
        />
      </span>
      <span className="text-center px-3">
        <div className="flex items-center justify-center gap-1">
          {cat.featured && <Badge variant="outline" className="text-[10px]">Featured</Badge>}
          {cat.pinned && <Badge variant="outline" className="text-[10px]">Pinned</Badge>}
          {!cat.featured && !cat.pinned && <span className="text-[10px] text-muted-foreground">—</span>}
        </div>
      </span>
      <span className="text-center px-3">
        <Switch
          checked={cat.enabled}
          onCheckedChange={onToggleEnabled}
          data-testid={`toggle-enabled-${cat.id}`}
        />
      </span>
      <span className="text-right px-2">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onPreview}
            data-testid={`button-preview-${cat.id}`}
            title="Preview feed"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            data-testid={`button-edit-${cat.id}`}
            title="Edit category"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-${cat.id}`}
            title="Delete category"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </span>
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsCategory | null>(null);
  const [previewing, setPreviewing] = useState<NewsCategory | null>(null);

  const { data: categories, isLoading } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news/categories"],
    staleTime: 60000,
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/news/categories/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/news/categories/${id}`, { enabled }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!categories) return;
      await Promise.all(
        categories.map((cat) =>
          apiRequest("PATCH", `/api/news/categories/${cat.id}`, { enabled }).then((r) => r.json())
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
      toast({ title: "All categories updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleCategoryAiImage = useMutation({
    mutationFn: async ({ categoryId, enabled }: { categoryId: number; enabled: boolean }) => {
      const key = `news.category.${categoryId}.aiImageGen`;
      await apiRequest("PUT", "/api/platform-settings", {
        [key]: String(enabled),
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({ title: "AI image setting updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: Array<{ id: number; displayOrder: number }>) =>
      apiRequest("PUT", "/api/news/categories/reorder", { order }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news/categories"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error reordering", description: err.message, variant: "destructive" });
    },
  });

  const getCategoryAiImageEnabled = (catId: number): boolean => {
    if (!settings) return false;
    return settings[`news.category.${catId}.aiImageGen`] !== "false";
  };

  const sortedCategories = useMemo(
    () => (categories ? [...categories].sort((a, b) => a.displayOrder - b.displayOrder) : []),
    [categories]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sortedCategories.length) return;
    const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
    const newIndex = sortedCategories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sortedCategories, oldIndex, newIndex);
    const order = reordered.map((c, i) => ({ id: c.id, displayOrder: i }));
    reorderMutation.mutate(order);
  };

  return (
    <div className="space-y-4" data-testid="tab-categories">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Manage news feed categories and RSS queries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => bulkToggleMutation.mutate(true)}
            disabled={bulkToggleMutation.isPending || !categories?.length}
            data-testid="button-enable-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => bulkToggleMutation.mutate(false)}
            disabled={bulkToggleMutation.isPending || !categories?.length}
            data-testid="button-disable-all"
          >
            <XCircle className="h-3.5 w-3.5" />
            Disable All
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            data-testid="button-add-category"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading categories…</span>
        </div>
      ) : !categories?.length ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No categories yet. Add one to get started.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-xl border overflow-hidden" data-testid="categories-table">
              <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto_auto] bg-muted/50 border-b px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                <span className="w-8" />
                <span>Name</span>
                <span>Query</span>
                <span className="text-center px-3">Color</span>
                <span className="text-center px-3">AI Image</span>
                <span className="text-center px-3">Flags</span>
                <span className="text-center px-3">Enabled</span>
                <span className="text-right px-2">Actions</span>
              </div>
              {sortedCategories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  category={cat}
                  aiImageEnabled={getCategoryAiImageEnabled(cat.id)}
                  onToggleAiImage={(v) => toggleCategoryAiImage.mutate({ categoryId: cat.id, enabled: v })}
                  onToggleEnabled={(v) => toggleMutation.mutate({ id: cat.id, enabled: v })}
                  onPreview={() => setPreviewing(cat)}
                  onEdit={() => { setEditing(cat); setDialogOpen(true); }}
                  onDelete={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
      />

      {previewing && (
        <PreviewDialog
          open={!!previewing}
          onClose={() => setPreviewing(null)}
          category={previewing}
        />
      )}
    </div>
  );
}

export default function CommandNews() {
  return (
    <div className="space-y-6" data-testid="command-news">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="news-tabs">
          <TabsTrigger value="categories" className="gap-1.5 text-xs" data-testid="tab-trigger-categories">
            <Newspaper className="h-3.5 w-3.5" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="ai-settings" className="gap-1.5 text-xs" data-testid="tab-trigger-ai-settings">
            <Sparkles className="h-3.5 w-3.5" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="x-feed" className="gap-1.5 text-xs" data-testid="tab-trigger-x-feed">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            X Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs" data-testid="tab-trigger-analytics">
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="ai-settings" className="mt-4">
          <AISettingsTab />
        </TabsContent>

        <TabsContent value="x-feed" className="mt-4">
          <XFeedTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
