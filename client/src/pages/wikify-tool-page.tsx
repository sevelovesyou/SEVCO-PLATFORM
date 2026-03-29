import { useState, useMemo, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  Tag,
  Info,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { Link } from "wouter";
import type { Category } from "@shared/schema";

interface ArticleSuggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryId: number | null;
  content: string;
  seoDescription: string;
  aeoKeywords: string[];
  confidence: "strong" | "good" | "review";
  selected: boolean;
  previewOpen: boolean;
  previewMode: "rendered" | "raw";
  editOpen: boolean;
  editedContent: string;
  editedTitle: string;
  seoOpen: boolean;
  submitStatus: "idle" | "pending" | "success" | "error";
}

const CONFIDENCE_STYLES: Record<string, string> = {
  strong: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  strong: "Strong",
  good: "Good",
  review: "Review",
};

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdownSafe(md: string): string {
  const lines = md.split("\n");
  const rendered: string[] = [];
  for (const line of lines) {
    const escaped = escapeHtml(line);
    if (/^# (.+)$/.test(line)) {
      rendered.push(`<h1 class="text-xl font-bold mt-4 mb-2">${escapeHtml(line.slice(2))}</h1>`);
    } else if (/^## (.+)$/.test(line)) {
      rendered.push(`<h2 class="text-lg font-semibold mt-3 mb-1.5">${escapeHtml(line.slice(3))}</h2>`);
    } else if (/^### (.+)$/.test(line)) {
      rendered.push(`<h3 class="text-base font-semibold mt-2 mb-1">${escapeHtml(line.slice(4))}</h3>`);
    } else if (/^Q: (.+)$/.test(line)) {
      rendered.push(`<p class="font-semibold mt-2">${escaped}</p>`);
    } else if (/^A: (.+)$/.test(line)) {
      rendered.push(`<p class="text-muted-foreground ml-2 mb-1">${escaped}</p>`);
    } else if (/^- (.+)$/.test(line)) {
      rendered.push(`<li class="ml-4 list-disc">${escapeHtml(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      rendered.push("<br/>");
    } else {
      rendered.push(`<p class="mb-1">${escaped}</p>`);
    }
  }
  return rendered.join("\n");
}

export default function WikifyToolPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { canCreateArticle } = usePermission();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [sourceText, setSourceText] = useState("");
  const [articleCount, setArticleCount] = useState(5);
  const [detailLevel, setDetailLevel] = useState<"brief" | "standard" | "detailed">("standard");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [submissionProgress, setSubmissionProgress] = useState<{ current: number; total: number } | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number>(0);

  const wordCount = useMemo(() => {
    const words = sourceText.trim().split(/\s+/).filter(Boolean).length;
    return words;
  }, [sourceText]);

  const maxArticleCount = useMemo(() => {
    if (wordCount < 200) return 5;
    return 25;
  }, [wordCount]);

  const effectiveCount = Math.min(articleCount, maxArticleCount);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const generateSourceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/wikify/generate-source", { prompt: aiPrompt });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
        throw new Error(errData.message ?? "Failed to generate source");
      }
      return res.json() as Promise<{ text: string }>;
    },
    onSuccess: (data) => {
      setSourceText(data.text);
      setShowAiPrompt(false);
      toast({ title: "Source text generated", description: "AI-generated source text filled in. Review and then analyze." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate source", description: err.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/wikify/analyze", {
        text: sourceText,
        count: effectiveCount,
        detailLevel,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
        throw new Error(errData.message ?? "Analysis failed");
      }
      return res.json() as Promise<{ articles: Omit<ArticleSuggestion, "id" | "selected" | "previewOpen" | "previewMode" | "editOpen" | "editedContent" | "editedTitle" | "seoOpen" | "submitStatus">[] }>;
    },
    onSuccess: (data) => {
      const withState: ArticleSuggestion[] = data.articles.map((a, i) => ({
        ...a,
        id: `article-${i}-${Date.now()}`,
        selected: true,
        previewOpen: false,
        previewMode: "rendered" as const,
        editOpen: false,
        editedContent: a.content,
        editedTitle: a.title,
        seoOpen: false,
        submitStatus: "idle" as const,
      }));
      setSuggestions(withState);
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  function updateSuggestion(id: string, updates: Partial<ArticleSuggestion>) {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
  }

  const selectedSuggestions = suggestions.filter((s) => s.selected);

  async function handleSubmitSelected() {
    if (selectedSuggestions.length === 0) return;
    setSubmissionProgress({ current: 0, total: selectedSuggestions.length });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedSuggestions.length; i++) {
      const s = selectedSuggestions[i];
      setSubmissionProgress({ current: i + 1, total: selectedSuggestions.length });
      updateSuggestion(s.id, { submitStatus: "pending" });
      try {
        const slug = s.editedTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 80) + "-" + Date.now().toString(36);

        await apiRequest("POST", "/api/articles", {
          title: s.editedTitle,
          slug,
          content: s.editedContent,
          summary: s.seoDescription,
          categoryId: s.categoryId,
          status: "draft",
        });
        updateSuggestion(s.id, { submitStatus: "success" });
        successCount++;
      } catch {
        updateSuggestion(s.id, { submitStatus: "error" });
        failCount++;
      }

      if (i < selectedSuggestions.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setSubmissionProgress(null);
    setSubmittedCount(successCount);
    queryClient.invalidateQueries({ queryKey: ["/api/articles"] });

    if (failCount === 0) {
      toast({
        title: `${successCount} article${successCount !== 1 ? "s" : ""} submitted`,
        description: "All selected articles were queued for review.",
      });
    } else {
      toast({
        title: `${successCount} submitted, ${failCount} failed`,
        description: "Some articles could not be submitted. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleDownloadMarkdown = useCallback(async () => {
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0) return;

    const zip = new JSZip();
    selected.forEach((s) => {
      const filename = s.editedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + ".md";
      const meta = `---\ntitle: ${s.editedTitle}\ncategory: ${s.category}\nseoDescription: ${s.seoDescription}\naeoKeywords: ${s.aeoKeywords.join(", ")}\n---\n\n`;
      zip.file(filename, meta + s.editedContent);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wikify-articles-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [suggestions]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="wikify-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!canCreateArticle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8" data-testid="wikify-permission-denied">
        <Wand2 className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Partner+ Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The Wikify Tool is available to Partner, Staff, Executive, and Admin roles.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/wiki">Back to Wiki</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="wikify-tool-page">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Wand2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">Wikify Tool</h1>
            <p className="text-xs text-muted-foreground">Bulk AI wiki article generator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 0 && submittedCount > 0 && (
            <Button variant="outline" size="sm" asChild data-testid="button-view-review-queue">
              <Link href="/review">
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Review Queue
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left: Input Panel */}
        <div className="lg:w-[420px] shrink-0 border-r flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Source text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="wikify-source-text" className="text-xs font-medium">Source Material</Label>
                <span className="text-[10px] text-muted-foreground" data-testid="text-word-count">
                  {wordCount.toLocaleString()} words · {sourceText.length.toLocaleString()} chars
                </span>
              </div>
              <Textarea
                id="wikify-source-text"
                placeholder="Paste your text or source material here..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[200px] resize-y text-sm font-mono"
                data-testid="textarea-source-text"
              />
            </div>

            {/* AI Generate toggle */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {!showAiPrompt ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setShowAiPrompt(true)}
                data-testid="button-toggle-ai-prompt"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Generate with AI
              </Button>
            ) : (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-primary">AI Source Generator</Label>
                  <button
                    onClick={() => setShowAiPrompt(false)}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-close-ai-prompt"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  placeholder="e.g. SEVCO's engineering services and tech stack"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-sm h-8"
                  data-testid="input-ai-prompt"
                />
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={!aiPrompt.trim() || generateSourceMutation.isPending}
                  onClick={() => generateSourceMutation.mutate()}
                  data-testid="button-generate-source"
                >
                  {generateSourceMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" />Generate Source Text</>
                  )}
                </Button>
              </div>
            )}

            {/* Article count slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Suggest {effectiveCount} article{effectiveCount !== 1 ? "s" : ""}</Label>
                {effectiveCount < articleCount && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    Capped at {maxArticleCount} (short input)
                  </span>
                )}
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={articleCount}
                onChange={(e) => setArticleCount(parseInt(e.target.value))}
                className="w-full accent-primary"
                data-testid="slider-article-count"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>25</span>
              </div>
            </div>

            {/* Detail level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Detail Level</Label>
              <div className="flex gap-2" data-testid="detail-level-selector">
                {(["brief", "standard", "detailed"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDetailLevel(level)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors capitalize ${
                      detailLevel === level
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                    data-testid={`button-detail-${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {detailLevel === "brief" && "150–250 words per article"}
                {detailLevel === "standard" && "350–500 words per article"}
                {detailLevel === "detailed" && "600–900 words per article"}
              </p>
            </div>

            {/* Category selector */}
            {categories && categories.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-medium">Categories</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] text-xs">
                      Select categories to guide Grok's assignments. Leave empty for auto-assign.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-1.5" data-testid="category-selector">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryIds((prev) =>
                          isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        )}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                        data-testid={`button-category-${cat.slug}`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                {selectedCategoryIds.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No categories selected — Grok will auto-assign</p>
                )}
              </div>
            )}

            {/* Analyze button */}
            <Button
              className="w-full gap-1.5"
              disabled={!sourceText.trim() || analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate()}
              data-testid="button-analyze-generate"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
              ) : (
                <><Wand2 className="h-4 w-4" />Analyze & Generate Articles</>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {analyzeMutation.isPending ? (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" data-testid="wikify-generating-status">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Analyzing content and generating {effectiveCount} article{effectiveCount !== 1 ? "s" : ""}…
              </div>
              {Array.from({ length: effectiveCount }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2" data-testid={`skeleton-article-${i}`}>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center" data-testid="wikify-empty-state">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No articles generated yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Paste source material on the left and click "Analyze & Generate Articles"
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Results header */}
              <div className="border-b px-4 py-2 flex items-center justify-between shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground" data-testid="text-selection-count">
                    {selectedSuggestions.length} of {suggestions.length} selected
                  </span>
                  <button
                    onClick={() => setSuggestions((prev) => prev.map((s) => ({ ...s, selected: true })))}
                    className="text-[11px] text-primary hover:underline"
                    data-testid="button-select-all"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={() => setSuggestions((prev) => prev.map((s) => ({ ...s, selected: false })))}
                    className="text-[11px] text-muted-foreground hover:underline"
                    data-testid="button-deselect-all"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={selectedSuggestions.length === 0}
                    onClick={handleDownloadMarkdown}
                    data-testid="button-download-markdown"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .zip
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={selectedSuggestions.length === 0 || submissionProgress !== null}
                    onClick={handleSubmitSelected}
                    data-testid="button-submit-selected"
                  >
                    {submissionProgress ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Submitting {submissionProgress.current}/{submissionProgress.total}…</>
                    ) : (
                      <>Submit Selected to Review Queue</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Article cards */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="wikify-results-list">
                {suggestions.map((s) => (
                  <ArticleSuggestionCard
                    key={s.id}
                    suggestion={s}
                    categories={categories ?? []}
                    onUpdate={(updates) => updateSuggestion(s.id, updates)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ArticleSuggestionCardProps {
  suggestion: ArticleSuggestion;
  categories: Category[];
  onUpdate: (updates: Partial<ArticleSuggestion>) => void;
}

function ArticleSuggestionCard({ suggestion: s, categories, onUpdate }: ArticleSuggestionCardProps) {
  return (
    <div
      className={`rounded-lg border transition-colors ${s.selected ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"}`}
      data-testid={`card-article-${s.id}`}
    >
      {/* Card header */}
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={s.selected}
            onCheckedChange={(v) => onUpdate({ selected: !!v })}
            className="mt-0.5 shrink-0"
            data-testid={`checkbox-article-${s.id}`}
          />
          <div className="flex-1 min-w-0">
            {/* Editable title */}
            <input
              type="text"
              value={s.editedTitle}
              onChange={(e) => onUpdate({ editedTitle: e.target.value })}
              className="w-full text-sm font-semibold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors py-0.5"
              data-testid={`input-title-${s.id}`}
            />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Category badge with dropdown */}
              <Select
                value={String(s.categoryId ?? "")}
                onValueChange={(val) => {
                  const cat = categories.find((c) => String(c.id) === val);
                  onUpdate({ categoryId: cat?.id ?? null, category: cat?.name ?? s.category });
                }}
              >
                <SelectTrigger
                  className="h-5 text-[11px] font-medium px-2 py-0 w-auto min-w-0 border-0 bg-primary/10 text-primary rounded-full"
                  data-testid={`select-category-${s.id}`}
                >
                  <SelectValue placeholder={s.category} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)} className="text-xs" data-testid={`option-category-${cat.slug}-${s.id}`}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Confidence indicator */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[s.confidence]}`} data-testid={`badge-confidence-${s.id}`}>
                {CONFIDENCE_LABELS[s.confidence]}
              </span>

              {/* Submit status indicator */}
              {s.submitStatus === "pending" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1" data-testid={`badge-submit-status-${s.id}`}>
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />Submitting
                </span>
              )}
              {s.submitStatus === "success" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1" data-testid={`badge-submit-status-${s.id}`}>
                  <Check className="h-2.5 w-2.5" />Submitted
                </span>
              )}
              {s.submitStatus === "error" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1" data-testid={`badge-submit-status-${s.id}`}>
                  <X className="h-2.5 w-2.5" />Failed
                </span>
              )}

              {/* Read time */}
              <span className="text-[10px] text-muted-foreground" data-testid={`text-readtime-${s.id}`}>
                {estimateReadTime(s.editedContent)}
              </span>
            </div>
          </div>
        </div>

        {/* SEO meta description collapsible */}
        <Collapsible
          open={s.seoOpen}
          onOpenChange={(open) => onUpdate({ seoOpen: open })}
          className="mt-2"
        >
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-toggle-seo-${s.id}`}>
              <Tag className="h-3 w-3" />
              SEO Meta
              {s.seoOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-2">
            <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2" data-testid={`text-seo-description-${s.id}`}>
              {s.seoDescription}
            </p>
            {s.aeoKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1" data-testid={`container-keywords-${s.id}`}>
                {s.aeoKeywords.map((kw, ki) => (
                  <Badge key={ki} variant="secondary" className="text-[10px] px-1.5 py-0 h-4" data-testid={`badge-keyword-${s.id}-${ki}`}>
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-2">
          <Button
            variant={s.previewOpen ? "secondary" : "outline"}
            size="sm"
            className="h-6 text-[11px] px-2 gap-1"
            onClick={() => onUpdate({ previewOpen: !s.previewOpen, editOpen: false })}
            data-testid={`button-preview-${s.id}`}
          >
            <Eye className="h-3 w-3" />
            {s.previewOpen ? "Close" : "Preview"}
          </Button>
          <Button
            variant={s.editOpen ? "secondary" : "outline"}
            size="sm"
            className="h-6 text-[11px] px-2 gap-1"
            onClick={() => onUpdate({ editOpen: !s.editOpen, previewOpen: false })}
            data-testid={`button-edit-${s.id}`}
          >
            <Edit3 className="h-3 w-3" />
            {s.editOpen ? "Done" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Preview pane */}
      {s.previewOpen && (
        <div className="border-t" data-testid={`container-preview-${s.id}`}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
            <button
              onClick={() => onUpdate({ previewMode: "rendered" })}
              className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${s.previewMode === "rendered" ? "bg-background text-foreground shadow-sm border" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`button-preview-rendered-${s.id}`}
            >
              Rendered
            </button>
            <button
              onClick={() => onUpdate({ previewMode: "raw" })}
              className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${s.previewMode === "raw" ? "bg-background text-foreground shadow-sm border" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`button-preview-raw-${s.id}`}
            >
              Raw Markdown
            </button>
          </div>
          <div className="p-3 max-h-64 overflow-y-auto" data-testid={`pane-preview-${s.id}`}>
            {s.previewMode === "rendered" ? (
              <div
                className="text-xs prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(s.editedContent) }}
              />
            ) : (
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground">{s.editedContent}</pre>
            )}
          </div>
        </div>
      )}

      {/* Edit pane */}
      {s.editOpen && (
        <div className="border-t" data-testid={`container-edit-${s.id}`}>
          <Textarea
            value={s.editedContent}
            onChange={(e) => onUpdate({ editedContent: e.target.value })}
            className="border-0 rounded-none text-xs font-mono min-h-[200px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Edit article content (Markdown)..."
            data-testid={`textarea-edit-${s.id}`}
          />
        </div>
      )}
    </div>
  );
}
