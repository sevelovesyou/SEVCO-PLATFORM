import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-permission";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Library,
  Link2,
  GraduationCap,
  FileText,
  Search,
  RefreshCw,
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Settings2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  DollarSign,
  Save,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import type { Category, Article } from "@shared/schema";

interface WikiSource {
  id: number;
  type: string;
  identifier: string;
  title: string;
  ingestedAt: string;
  articleCount: number;
}

type IngestResult = {
  text: string;
  title: string;
  sourceId: number;
  citation: string;
  citationFormat: string;
};

type SortKey = "title" | "freshness" | "updatedAt" | "wordCount";

interface GapTopic {
  topic: string;
  category: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface GapAnalysisResult {
  topics: GapTopic[];
  existingCount: number;
}

interface FreshnessArticle extends Article {
  category?: { id: number; name: string; slug: string } | null;
  daysSinceAiReview: number | null;
  freshnessStatus: "green" | "yellow" | "red";
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

const FRESHNESS_DOT: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const FRESHNESS_LABEL: Record<string, string> = {
  green: "Fresh (<45d)",
  yellow: "Aging (45-90d)",
  red: "Stale (>90d)",
};

function getFreshnessStatus(daysSince: number | null): "green" | "yellow" | "red" {
  if (daysSince === null) return "red";
  if (daysSince < 45) return "green";
  if (daysSince <= 90) return "yellow";
  return "red";
}

function getDaysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeFreshnessArticles(articles: (Article & { category?: { id: number; name: string; slug: string } | null })[]): FreshnessArticle[] {
  return articles
    .filter((a) => a.status === "published" || a.status === "draft")
    .map((a) => {
      const reviewDate = a.lastAiReviewedAt ?? a.updatedAt;
      const days = getDaysSince(reviewDate);
      return {
        ...a,
        daysSinceAiReview: days,
        freshnessStatus: getFreshnessStatus(days),
      };
    });
}

function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}


interface StubSummaryItem {
  stubText: string;
  totalOccurrences: number;
  articleCount: number;
}

interface StubsResponse {
  stubs: StubSummaryItem[];
  unresolvedCount: number;
  totalOccurrences: number;
  resolvedCount: number;
}

interface BackfillResponse {
  processed: number;
  totalResolved: number;
  totalUnresolved: number;
}

type SortField = "stubText" | "totalOccurrences" | "articleCount";
type SortDir = "asc" | "desc";

interface LlmCostRow {
  operation: string;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

interface LlmCostResponse {
  year: number;
  month: number;
  rows: LlmCostRow[];
  totalCost: number;
  totalCalls: number;
  alertThreshold: number;
}

interface LlmRatesResponse {
  rates: Record<string, { inputPer1k: number; outputPer1k: number }>;
}

export default function CommandWiki() {
  const { role } = usePermission();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";
  const isExecutivePlus = role === "admin" || role === "executive";
  const canIngest = role === "admin" || role === "executive" || role === "staff" || role === "partner";
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState<"subcategories" | "sources" | "freshness" | "gap-analysis" | "settings" | "ai-cost">("freshness");
  const [filterParentId, setFilterParentId] = useState<string>("all");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParentId, setAddParentId] = useState<string>("");
  const [addDescription, setAddDescription] = useState("");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingCat, setRenamingCat] = useState<Category | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const [stubSort, setStubSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "totalOccurrences",
    dir: "desc",
  });

  const now = new Date();
  const [costYear, setCostYear] = useState(now.getFullYear());
  const [costMonth, setCostMonth] = useState(now.getMonth() + 1);
  const [alertThresholdInput, setAlertThresholdInput] = useState("");
  const [editingRates, setEditingRates] = useState<Record<string, { inputPer1k: string; outputPer1k: string }>>({});
  const [ratesEditing, setRatesEditing] = useState(false);

  const [urlInput, setUrlInput] = useState("");
  const [academicType, setAcademicType] = useState<"doi" | "pubmed" | "arxiv">("doi");
  const [academicId, setAcademicId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [ingestingUrl, setIngestingUrl] = useState(false);
  const [ingestingAcademic, setIngestingAcademic] = useState(false);
  const [ingestingPdf, setIngestingPdf] = useState(false);
  const [reIngestingId, setReIngestingId] = useState<number | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);

  const [gapResults, setGapResults] = useState<GapAnalysisResult | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("freshness");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [rewikifyingId, setRewikifyingId] = useState<number | null>(null);

  const { data: allCategories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: stubsData, isLoading: stubsLoading } = useQuery<StubsResponse>({
    queryKey: ["/api/tools/wiki/stubs"],
    enabled: isStaffPlus,
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<WikiSource[]>({
    queryKey: ["/api/tools/wiki/sources"],
    enabled: canIngest,
  });

  const { data: allArticlesRaw, isLoading: articlesLoading } = useQuery<(Article & { category?: { id: number; name: string; slug: string } | null })[]>({
    queryKey: ["/api/articles"],
  });

  const { data: platformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const { data: costData, isLoading: costLoading } = useQuery<LlmCostResponse>({
    queryKey: ["/api/tools/wiki/llm-cost", costYear, costMonth],
    queryFn: async () => {
      const res = await fetch(`/api/tools/wiki/llm-cost?year=${costYear}&month=${costMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cost data");
      return res.json();
    },
    enabled: isExecutivePlus && activeTab === "ai-cost",
  });

  const { data: ratesData, isLoading: ratesLoading } = useQuery<LlmRatesResponse>({
    queryKey: ["/api/tools/wiki/llm-rates"],
    enabled: isExecutivePlus && activeTab === "ai-cost",
  });

  const saveThresholdMutation = useMutation({
    mutationFn: (threshold: number) =>
      apiRequest("PUT", "/api/tools/wiki/llm-alert-threshold", { threshold }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/llm-cost", costYear, costMonth] });
      toast({ title: "Alert threshold saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveRatesMutation = useMutation({
    mutationFn: (rates: Record<string, { inputPer1k: number; outputPer1k: number }>) =>
      apiRequest("PUT", "/api/tools/wiki/llm-rates", { rates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/llm-rates"] });
      setRatesEditing(false);
      toast({ title: "Rates saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const mainCategories = allCategories?.filter((c) => c.parentId === null) ?? [];
  const subcategories = allCategories?.filter((c) => c.parentId !== null) ?? [];

  const filteredSubcategories =
    filterParentId === "all"
      ? subcategories
      : subcategories.filter((c) => String(c.parentId) === filterParentId);

  const grouped: { parent: Category; children: Category[] }[] = mainCategories
    .map((parent) => ({
      parent,
      children: filteredSubcategories.filter((c) => c.parentId === parent.id),
    }))
    .filter((g) => filterParentId === "all" || String(g.parent.id) === filterParentId);

  const sortedStubs = [...(stubsData?.stubs ?? [])].sort((a, b) => {
    const { field, dir } = stubSort;
    const av = a[field];
    const bv = b[field];
    if (typeof av === "string" && typeof bv === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const freshnessArticles: FreshnessArticle[] = allArticlesRaw ? computeFreshnessArticles(allArticlesRaw) : [];

  const sortedFreshness = [...freshnessArticles].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "freshness") {
      const order = { red: 0, yellow: 1, green: 2 };
      cmp = order[a.freshnessStatus] - order[b.freshnessStatus];
    } else if (sortKey === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (sortKey === "updatedAt") {
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else if (sortKey === "wordCount") {
      cmp = wordCount(a.content) - wordCount(b.content);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const autoPublishStrong = platformSettings?.["wiki.autoPublishStrongConfidence"] === "true";

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const createMutation = useMutation({
    mutationFn: (data: { name: string; parentId: number; description?: string }) =>
      apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setAddDialogOpen(false);
      setAddName("");
      setAddParentId("");
      setAddDescription("");
      toast({ title: "Subcategory created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: number; name: string; description?: string }) =>
      apiRequest("PATCH", `/api/categories/${id}`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setRenameDialogOpen(false);
      setRenamingCat(null);
      toast({ title: "Subcategory updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteDialogOpen(false);
      setDeletingCat(null);
      toast({ title: "Subcategory deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tools/wiki/sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] });
      setDeleteSourceId(null);
      toast({ title: "Source removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const backfillMutation = useMutation<BackfillResponse>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/wiki/resolve-links");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/stubs"] });
      toast({
        title: "Link resolution complete",
        description: `Processed ${data.processed} articles — ${data.totalResolved} links resolved, ${data.totalUnresolved} unresolved stubs recorded.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const gapAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tools/wiki/gap-analysis", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
        throw new Error(err.message ?? "Gap analysis failed");
      }
      return res.json() as Promise<GapAnalysisResult>;
    },
    onSuccess: (data) => {
      setGapResults(data);
      toast({ title: "Gap analysis complete", description: `Found ${data.topics.length} missing topics` });
    },
    onError: (err: Error) => {
      toast({ title: "Gap analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const autoPublishMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PUT", "/api/platform-settings", {
        "wiki.autoPublishStrongConfidence": enabled ? "true" : "false",
      });
      if (!res.ok) throw new Error("Failed to save setting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({ title: "Setting saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  async function handleRewikify(articleId: number, articleTitle: string) {
    setRewikifyingId(articleId);
    try {
      const res = await apiRequest("POST", `/api/tools/wiki/rewikify/${articleId}`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
        throw new Error(err.message ?? "Re-wikify failed");
      }
      const data = await res.json() as { confidence: string; action: string; message: string };
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: `Re-wikified: ${articleTitle}`,
        description: data.message,
      });
    } catch (err: any) {
      toast({ title: "Re-wikify failed", description: err.message, variant: "destructive" });
    } finally {
      setRewikifyingId(null);
    }
  }

  function navigateCostMonth(dir: -1 | 1) {
    let newMonth = costMonth + dir;
    let newYear = costYear;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    setCostMonth(newMonth);
    setCostYear(newYear);
  }

  function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function operationLabel(op: string) {
    const labels: Record<string, string> = {
      wikify: "Wikify Generate",
      rewikify: "Wikify Source",
      semantic_relink: "Semantic Re-link",
      gap_analysis: "Gap Analysis",
      ingest_url: "URL Ingest",
      ingest_academic: "Academic Ingest",
      ingest_pdf: "PDF Ingest",
    };
    return labels[op] ?? op;
  }

  function handleSaveThreshold() {
    const val = parseFloat(alertThresholdInput);
    if (isNaN(val) || val < 0) {
      toast({ title: "Invalid threshold", variant: "destructive" });
      return;
    }
    saveThresholdMutation.mutate(val);
  }

  function startEditRates() {
    if (!ratesData) return;
    const editable: Record<string, { inputPer1k: string; outputPer1k: string }> = {};
    for (const [key, v] of Object.entries(ratesData.rates)) {
      editable[key] = { inputPer1k: String(v.inputPer1k), outputPer1k: String(v.outputPer1k) };
    }
    setEditingRates(editable);
    setRatesEditing(true);
  }

  function handleSaveRates() {
    const rates: Record<string, { inputPer1k: number; outputPer1k: number }> = {};
    for (const [key, v] of Object.entries(editingRates)) {
      rates[key] = { inputPer1k: parseFloat(v.inputPer1k) || 0, outputPer1k: parseFloat(v.outputPer1k) || 0 };
    }
    saveRatesMutation.mutate(rates);
  }

  function openRename(cat: Category) {
    setRenamingCat(cat);
    setRenameName(cat.name);
    setRenameDescription(cat.description ?? "");
    setRenameDialogOpen(true);
  }

  function openDelete(cat: Category) {
    setDeletingCat(cat);
    setDeleteDialogOpen(true);
  }

  function handleAdd() {
    if (!addName.trim() || !addParentId) return;
    createMutation.mutate({
      name: addName.trim(),
      parentId: parseInt(addParentId, 10),
      description: addDescription.trim() || undefined,
    });
  }

  function handleRename() {
    if (!renamingCat || !renameName.trim()) return;
    renameMutation.mutate({
      id: renamingCat.id,
      name: renameName.trim(),
      description: renameDescription.trim() || undefined,
    });
  }

  function handleDelete() {
    if (!deletingCat) return;
    deleteMutation.mutate(deletingCat.id);
  }

  function handleWikifyStub(stubText: string) {
    navigate(`/wikify?topic=${encodeURIComponent(stubText)}`);
  }

  function toggleSort(field: SortField) {
    setStubSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "desc" ? "asc" : "desc",
    }));
  }

  function StubSortIcon({ field }: { field: SortField }) {
    if (stubSort.field !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return stubSort.dir === "asc"
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  }

  function openWikifyWithSource(result: IngestResult): void {
    try {
      sessionStorage.setItem("wikify_source_text", result.text);
      sessionStorage.setItem("wikify_source_id", String(result.sourceId));
      sessionStorage.setItem("wikify_citation", result.citation);
      sessionStorage.setItem("wikify_citation_format", result.citationFormat);
    } catch { /* ignore storage errors */ }
    window.open("/wikify?from=source", "_blank");
  }

  async function handleIngestUrl() {
    if (!urlInput.trim()) return;
    setIngestingUrl(true);
    try {
      const res = await apiRequest("POST", "/api/tools/wiki/ingest-url", { url: urlInput.trim() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" })) as { message?: string };
        toast({ title: "Ingest failed", description: err.message, variant: "destructive" });
        return;
      }
      const result = await res.json() as IngestResult;
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] });
      toast({ title: "URL fetched", description: `"${result.title}" — opening Wikify…` });
      setUrlInput("");
      openWikifyWithSource(result);
    } catch {
      toast({ title: "Ingest failed", description: "Network error", variant: "destructive" });
    } finally {
      setIngestingUrl(false);
    }
  }

  async function handleIngestAcademic() {
    if (!academicId.trim()) return;
    setIngestingAcademic(true);
    try {
      const res = await apiRequest("POST", "/api/tools/wiki/ingest-academic", {
        type: academicType,
        id: academicId.trim(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" })) as { message?: string };
        toast({ title: "Ingest failed", description: err.message, variant: "destructive" });
        return;
      }
      const result = await res.json() as IngestResult;
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] });
      toast({ title: "Academic source fetched", description: `"${result.title}" — opening Wikify…` });
      setAcademicId("");
      openWikifyWithSource(result);
    } catch {
      toast({ title: "Ingest failed", description: "Network error", variant: "destructive" });
    } finally {
      setIngestingAcademic(false);
    }
  }

  async function handleIngestPdf() {
    if (!pdfFile) return;
    setIngestingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const res = await fetch("/api/tools/wiki/ingest-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" })) as { message?: string };
        toast({ title: "Ingest failed", description: err.message, variant: "destructive" });
        return;
      }
      const result = await res.json() as IngestResult;
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] });
      toast({ title: "PDF extracted", description: `"${result.title}" — opening Wikify…` });
      setPdfFile(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      openWikifyWithSource(result);
    } catch {
      toast({ title: "Ingest failed", description: "Network error", variant: "destructive" });
    } finally {
      setIngestingPdf(false);
    }
  }

  async function handleReIngest(source: WikiSource) {
    if (source.type === "pdf") {
      toast({ title: "Re-ingest not available for PDF", description: "Please upload the PDF again to re-ingest.", variant: "destructive" });
      return;
    }
    setReIngestingId(source.id);
    try {
      const endpoint = source.type === "url" ? "/api/tools/wiki/ingest-url" : "/api/tools/wiki/ingest-academic";
      const body = source.type === "url"
        ? { url: source.identifier }
        : { type: source.type, id: source.identifier };
      const res = await apiRequest("POST", endpoint, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" })) as { message?: string };
        toast({ title: "Re-ingest failed", description: err.message, variant: "destructive" });
        return;
      }
      const result = await res.json() as IngestResult;
      queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] });
      toast({ title: "Re-ingested", description: `"${result.title}" — opening Wikify…` });
      openWikifyWithSource(result);
    } catch {
      toast({ title: "Re-ingest failed", description: "Network error", variant: "destructive" });
    } finally {
      setReIngestingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }


  if (!isStaffPlus) {
    return (
      <div className="text-sm text-muted-foreground" data-testid="text-wiki-no-access">
        You do not have permission to manage wiki.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Wiki</h2>
      </div>


      {/* Internal Link Resolver — shown above tabs for executive+ */}
      {isExecutivePlus && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold" data-testid="text-link-resolver-heading">
                Internal Link Resolver
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan all published articles and convert <code className="text-xs">[See: Topic]</code> placeholders to real wiki links.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              data-testid="button-resolve-links"
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backfillMutation.isPending ? "animate-spin" : ""}`} />
              {backfillMutation.isPending ? "Resolving..." : "Resolve All Links"}
            </Button>
          </div>

          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Resolved links:</span>
              {stubsLoading ? (
                <Skeleton className="h-4 w-8 inline-block" />
              ) : (
                <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-resolved-count">
                  {stubsData?.resolvedCount ?? 0}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Unresolved topics:</span>
              {stubsLoading ? (
                <Skeleton className="h-4 w-8 inline-block" />
              ) : (
                <span className="font-semibold" data-testid="text-unresolved-count">
                  {stubsData?.unresolvedCount ?? 0}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Total stub references:</span>
              {stubsLoading ? (
                <Skeleton className="h-4 w-8 inline-block" />
              ) : (
                <span className="font-semibold" data-testid="text-total-occurrences">
                  {stubsData?.totalOccurrences ?? 0}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Unresolved Stubs — shown for all staff+ */}
      {isStaffPlus && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold" data-testid="text-stubs-heading">
              Unresolved Stubs
            </h3>
            {!stubsLoading && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-stub-count">
                {stubsData?.unresolvedCount ?? 0}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Topics referenced with <code className="text-xs">[See: …]</code> in articles but without a wiki article yet. Ranked by reference count — highest-priority gaps first.
          </p>

          {stubsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sortedStubs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3" data-testid="text-no-stubs">
              No unresolved stubs. All internal links are resolved.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 pb-1.5 border-b">
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground text-left"
                  onClick={() => toggleSort("stubText")}
                  data-testid="button-sort-stub-text"
                >
                  Topic <StubSortIcon field="stubText" />
                </button>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground justify-end"
                  onClick={() => toggleSort("totalOccurrences")}
                  data-testid="button-sort-occurrences"
                >
                  <StubSortIcon field="totalOccurrences" /> Refs
                </button>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground justify-end"
                  onClick={() => toggleSort("articleCount")}
                  data-testid="button-sort-article-count"
                >
                  <StubSortIcon field="articleCount" /> Articles
                </button>
                <span className="text-xs font-medium text-muted-foreground text-right">Action</span>
              </div>
              {sortedStubs.slice(0, 20).map((stub, idx) => (
                <div
                  key={stub.stubText}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-1.5 px-2 rounded-md hover:bg-muted/50"
                  data-testid={`row-stub-${idx}`}
                >
                  <span className="text-sm truncate" data-testid={`text-stub-name-${idx}`}>
                    {stub.stubText}
                  </span>
                  <Badge variant="outline" className="text-xs justify-self-end" data-testid={`badge-stub-occurrences-${idx}`}>
                    {stub.totalOccurrences}
                  </Badge>
                  <Badge variant="outline" className="text-xs justify-self-end" data-testid={`badge-stub-articles-${idx}`}>
                    {stub.articleCount}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 justify-self-end"
                    onClick={() => handleWikifyStub(stub.stubText)}
                    data-testid={`button-wikify-stub-${idx}`}
                    title="Open Wikify tool pre-filled with this topic"
                  >
                    <Wand2 className="h-3 w-3" />
                    Wikify
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="flex w-full h-auto p-1 bg-muted/50 border mb-4 flex-wrap gap-0.5">
          <TabsTrigger value="freshness" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Freshness Dashboard</span>
            <span className="sm:hidden">Freshness</span>
          </TabsTrigger>
          <TabsTrigger value="gap-analysis" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gap Analysis</span>
            <span className="sm:hidden">Gaps</span>
          </TabsTrigger>
          <TabsTrigger value="subcategories" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Library className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Subcategories</span>
            <span className="sm:hidden">Cats</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Source Library</span>
            <span className="sm:hidden">Sources</span>
          </TabsTrigger>
          {isExecutivePlus && (
            <TabsTrigger value="ai-cost" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-ai-cost">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Cost</span>
              <span className="sm:hidden">Cost</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="settings" className="py-2 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Freshness Dashboard */}
        <TabsContent value="freshness">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" data-testid="text-freshness-heading">Article Freshness Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Articles sorted by how recently they were AI-reviewed. Click Re-wikify to refresh stale content.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Fresh</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Aging</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Stale</span>
              </div>
            </div>

            {articlesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : freshnessArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4" data-testid="text-no-articles">No articles found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-freshness">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left pb-2 font-medium w-4"></th>
                      <th className="text-left pb-2 font-medium">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("title")} data-testid="sort-title">
                          Title <SortIcon k="title" />
                        </button>
                      </th>
                      <th className="text-left pb-2 font-medium hidden sm:table-cell">Category</th>
                      <th className="text-left pb-2 font-medium hidden md:table-cell">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("wordCount")} data-testid="sort-wordcount">
                          Words <SortIcon k="wordCount" />
                        </button>
                      </th>
                      <th className="text-left pb-2 font-medium">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort("freshness")} data-testid="sort-freshness">
                          Last AI Review <SortIcon k="freshness" />
                        </button>
                      </th>
                      <th className="text-right pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedFreshness.map((article) => {
                      const wc = wordCount(article.content);
                      const isRewikifying = rewikifyingId === article.id;
                      return (
                        <tr key={article.id} className="hover:bg-muted/30" data-testid={`row-article-${article.id}`}>
                          <td className="py-2 pr-2">
                            <span
                              className={`h-2 w-2 rounded-full inline-block ${FRESHNESS_DOT[article.freshnessStatus]}`}
                              title={FRESHNESS_LABEL[article.freshnessStatus]}
                              data-testid={`dot-freshness-${article.id}`}
                            />
                          </td>
                          <td className="py-2 pr-3 max-w-[200px]">
                            <span className="truncate block text-xs font-medium" data-testid={`text-article-title-${article.id}`}>
                              {article.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">{article.status}</span>
                          </td>
                          <td className="py-2 pr-3 hidden sm:table-cell text-xs text-muted-foreground">
                            {article.category?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3 hidden md:table-cell text-xs text-muted-foreground">
                            {wc.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground" data-testid={`text-ai-review-${article.id}`}>
                            {article.daysSinceAiReview !== null
                              ? `${article.daysSinceAiReview}d ago`
                              : "Never"}
                          </td>
                          <td className="py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 px-2"
                              disabled={isRewikifying || rewikifyingId !== null}
                              onClick={() => handleRewikify(article.id, article.title)}
                              data-testid={`button-rewikify-${article.id}`}
                            >
                              {isRewikifying ? (
                                <><Loader2 className="h-3 w-3 animate-spin" />Working…</>
                              ) : (
                                <><RefreshCw className="h-3 w-3" />Re-wikify</>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Gap Analysis */}
        <TabsContent value="gap-analysis">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" data-testid="text-gap-heading">Gap Analysis</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI identifies missing topics based on existing articles and SEVCO context. Each topic can be sent directly to Wikify.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => gapAnalysisMutation.mutate()}
                disabled={gapAnalysisMutation.isPending}
                className="gap-1.5 shrink-0"
                data-testid="button-run-gap-analysis"
              >
                {gapAnalysisMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analyzing…</>
                ) : (
                  <><Search className="h-3.5 w-3.5" />Run Analysis</>
                )}
              </Button>
            </div>

            {gapAnalysisMutation.isPending && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            )}

            {!gapAnalysisMutation.isPending && !gapResults && (
              <div className="text-center py-10 text-muted-foreground" data-testid="text-gap-empty">
                <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click "Run Analysis" to identify missing wiki topics.</p>
              </div>
            )}

            {gapResults && !gapAnalysisMutation.isPending && (
              <div className="space-y-3" data-testid="gap-results-container">
                <p className="text-xs text-muted-foreground">
                  Found <strong>{gapResults.topics.length}</strong> missing topics across {gapResults.existingCount} existing articles.
                </p>
                <div className="space-y-2">
                  {gapResults.topics.map((topic, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                      data-testid={`row-gap-topic-${i}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`text-gap-topic-${i}`}>{topic.topic}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 h-4 ${PRIORITY_STYLES[topic.priority]}`}
                            data-testid={`badge-gap-priority-${i}`}
                          >
                            {topic.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4" data-testid={`badge-gap-category-${i}`}>
                            {topic.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-gap-reason-${i}`}>{topic.reason}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 px-2 shrink-0"
                        asChild
                        data-testid={`button-gap-generate-${i}`}
                      >
                        <Link href={`/wikify?prefill=${encodeURIComponent(topic.topic)}`}>
                          <Wand2 className="h-3 w-3" />
                          Generate
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Source Library */}
        {canIngest && (
          <TabsContent value="sources">
            <div className="space-y-4">
              {/* URL Ingestion */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Ingest URL</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste any web page URL — the server fetches and extracts readable text, then passes it to Wikify.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="text-sm"
                    data-testid="input-ingest-url"
                  />
                  <Button
                    onClick={handleIngestUrl}
                    disabled={!urlInput.trim() || ingestingUrl}
                    className="shrink-0 gap-1.5"
                    data-testid="button-fetch-wikify-url"
                  >
                    {ingestingUrl ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Fetching…</>
                    ) : (
                      "Fetch & Wikify"
                    )}
                  </Button>
                </div>
              </Card>

              {/* Academic ID Ingestion */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Ingest Academic Paper</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a DOI, PubMed ID, or arXiv ID to fetch metadata and abstract.
                </p>
                <div className="flex gap-2">
                  <Select value={academicType} onValueChange={(v) => setAcademicType(v as "doi" | "pubmed" | "arxiv")}>
                    <SelectTrigger className="w-32 text-sm shrink-0" data-testid="select-academic-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doi">DOI</SelectItem>
                      <SelectItem value="pubmed">PubMed</SelectItem>
                      <SelectItem value="arxiv">arXiv</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={academicType === "doi" ? "10.1038/s41586-..." : academicType === "pubmed" ? "12345678" : "2301.00001"}
                    value={academicId}
                    onChange={(e) => setAcademicId(e.target.value)}
                    className="text-sm"
                    data-testid="input-academic-id"
                  />
                  <Button
                    onClick={handleIngestAcademic}
                    disabled={!academicId.trim() || ingestingAcademic}
                    className="shrink-0 gap-1.5"
                    data-testid="button-fetch-wikify-academic"
                  >
                    {ingestingAcademic ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Fetching…</>
                    ) : (
                      "Fetch & Wikify"
                    )}
                  </Button>
                </div>
              </Card>

              {/* PDF Ingestion */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Ingest PDF</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a PDF up to 10 MB — text is extracted and passed to Wikify.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    className="text-sm flex-1"
                    data-testid="input-pdf-file"
                  />
                  <Button
                    onClick={handleIngestPdf}
                    disabled={!pdfFile || ingestingPdf}
                    className="shrink-0 gap-1.5"
                    data-testid="button-fetch-wikify-pdf"
                  >
                    {ingestingPdf ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Extracting…</>
                    ) : (
                      "Extract & Wikify"
                    )}
                  </Button>
                </div>
                {pdfFile && (
                  <p className="text-xs text-muted-foreground" data-testid="text-pdf-selected">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </Card>

              {/* Past Sources Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" data-testid="text-source-library-heading">
                    Past Sources
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/tools/wiki/sources"] })}
                    data-testid="button-refresh-sources"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>

                {sourcesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !sources || sources.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground" data-testid="text-no-sources">
                      No sources ingested yet. Use the panels above to get started.
                    </p>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm" data-testid="table-sources">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Title / Identifier</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Type</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Ingested</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Articles</th>
                          <th className="px-3 py-2 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sources.map((source) => (
                          <tr key={source.id} className="border-b last:border-0 hover:bg-muted/20" data-testid={`row-source-${source.id}`}>
                            <td className="px-3 py-2">
                              <p className="font-medium truncate max-w-[260px]" data-testid={`text-source-title-${source.id}`}>
                                {source.title || source.identifier}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                                {source.identifier}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className="text-[10px] uppercase" data-testid={`badge-source-type-${source.id}`}>
                                {source.type}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground" data-testid={`text-source-date-${source.id}`}>
                              {formatDate(source.ingestedAt)}
                            </td>
                            <td className="px-3 py-2 text-xs" data-testid={`text-source-articles-${source.id}`}>
                              {source.articleCount}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1 justify-end">
                                {source.type !== "pdf" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Re-ingest"
                                    onClick={() => handleReIngest(source)}
                                    disabled={reIngestingId === source.id}
                                    data-testid={`button-reingest-${source.id}`}
                                  >
                                    {reIngestingId === source.id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <RotateCcw className="h-3 w-3" />}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  title="Remove"
                                  onClick={() => setDeleteSourceId(source.id)}
                                  data-testid={`button-delete-source-${source.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* Subcategories */}
        <TabsContent value="subcategories">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold" data-testid="text-subcategories-heading">
                Manage Wiki Subcategories
              </h3>
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                data-testid="button-add-subcategory"
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Filter by category:</Label>
              <Select value={filterParentId} onValueChange={setFilterParentId}>
                <SelectTrigger className="h-8 w-48 text-xs" data-testid="select-filter-category">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4" data-testid="text-no-subcategories">
                No subcategories found.
              </p>
            ) : (
              <div className="space-y-5">
                {grouped.map(({ parent, children }) =>
                  children.length === 0 ? null : (
                    <div key={parent.id} data-testid={`section-parent-${parent.id}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {parent.name}
                      </p>
                      <div className="space-y-1">
                        {children.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                            data-testid={`row-subcategory-${sub.id}`}
                          >
                            <span className="text-sm" data-testid={`text-subcategory-name-${sub.id}`}>
                              {sub.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openRename(sub)}
                                data-testid={`button-rename-subcategory-${sub.id}`}
                                title="Rename"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isExecutivePlus && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => openDelete(sub)}
                                  data-testid={`button-delete-subcategory-${sub.id}`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Settings (Admin only) */}
        {isAdmin && (
          <TabsContent value="settings">
            <Card className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold" data-testid="text-wiki-settings-heading">Wiki Settings</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                  <div className="flex-1">
                    <Label className="text-sm font-medium" htmlFor="toggle-auto-publish">
                      Auto-publish strong-confidence articles
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      When enabled, Wikify-generated and re-wikified articles scored "strong" are automatically published.
                      "Good" confidence articles become drafts. "Review" articles go to the review queue.
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        Strong → Published
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        Good → Draft
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        Review → Queue
                      </span>
                    </div>
                  </div>
                  <Switch
                    id="toggle-auto-publish"
                    checked={autoPublishStrong}
                    onCheckedChange={(checked) => autoPublishMutation.mutate(checked)}
                    disabled={autoPublishMutation.isPending}
                    data-testid="toggle-auto-publish"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* AI Cost Tab */}
        {isExecutivePlus && (
          <TabsContent value="ai-cost">
            <div className="space-y-4" data-testid="section-ai-cost">
              {/* Alert banner when over threshold */}
              {costData && costData.alertThreshold > 0 && costData.totalCost > costData.alertThreshold && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300" data-testid="banner-cost-alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-medium">
                    Monthly AI spend (${costData.totalCost.toFixed(4)}) has exceeded the alert threshold of ${costData.alertThreshold.toFixed(2)}.
                  </p>
                </div>
              )}
              {/* Month selector + Total spend */}
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold" data-testid="text-ai-cost-heading">AI Cost Overview</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateCostMonth(-1)} data-testid="button-cost-prev-month" title="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[130px] text-center" data-testid="text-cost-month">
                      {formatMonthLabel(costYear, costMonth)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateCostMonth(1)} disabled={costYear === now.getFullYear() && costMonth === now.getMonth() + 1} data-testid="button-cost-next-month" title="Next month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {costLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-48" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Total Estimated Spend</p>
                        <p className="text-4xl font-bold tabular-nums" data-testid="text-total-cost">
                          ${costData?.totalCost.toFixed(4) ?? "0.0000"}
                        </p>
                      </div>
                      <div className="pb-1">
                        <p className="text-xs text-muted-foreground mb-0.5">Total AI Calls</p>
                        <p className="text-2xl font-semibold tabular-nums" data-testid="text-total-calls">
                          {costData?.totalCalls ?? 0}
                        </p>
                      </div>
                    </div>
                    {!costData || costData.rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2" data-testid="text-no-cost-data">No AI usage recorded for this month.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="table-cost-breakdown">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground">Operation</th>
                              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Calls</th>
                              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Input Tokens</th>
                              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Output Tokens</th>
                              <th className="text-right px-2 py-2 text-xs font-medium text-muted-foreground">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costData.rows.map((row, idx) => (
                              <tr key={row.operation} className="border-b last:border-0 hover:bg-muted/20" data-testid={`row-cost-${idx}`}>
                                <td className="px-2 py-2 font-medium" data-testid={`text-cost-op-${idx}`}>{operationLabel(row.operation)}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{row.callCount}</td>
                                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.totalInputTokens.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.totalOutputTokens.toLocaleString()}</td>
                                <td className="px-2 py-2 text-right tabular-nums font-medium">${row.totalCostUsd.toFixed(4)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </Card>
              {/* Alert threshold */}
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-semibold">Monthly Spend Alert</h3>
                <p className="text-xs text-muted-foreground">Set a monthly spend threshold. A warning banner will appear when the month's total exceeds it.</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input type="number" min="0" step="0.01" className="pl-6 w-36 text-sm" placeholder={costData ? String(costData.alertThreshold) : "0.00"} value={alertThresholdInput} onChange={(e) => setAlertThresholdInput(e.target.value)} data-testid="input-alert-threshold" />
                  </div>
                  <Button size="sm" onClick={handleSaveThreshold} disabled={saveThresholdMutation.isPending || !alertThresholdInput} className="gap-1.5" data-testid="button-save-threshold">
                    {saveThresholdMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                  {costData && costData.alertThreshold > 0 && (
                    <span className="text-xs text-muted-foreground">Current: ${costData.alertThreshold.toFixed(2)}/mo</span>
                  )}
                </div>
              </Card>
              {/* Rate Card */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Model Rate Card</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Cost per 1,000 tokens used to estimate spend. Update if OpenRouter pricing changes.</p>
                  </div>
                  {!ratesEditing && (
                    <Button variant="outline" size="sm" onClick={startEditRates} disabled={ratesLoading || !ratesData} data-testid="button-edit-rates" className="shrink-0">Edit</Button>
                  )}
                </div>
                {ratesLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : ratesEditing ? (
                  <div className="space-y-3">
                    {Object.entries(editingRates).map(([model, vals]) => (
                      <div key={model} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center" data-testid={`row-rate-edit-${model}`}>
                        <span className="text-sm font-medium capitalize">{model}</span>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">In/1K $</Label>
                          <Input type="number" step="0.0001" min="0" className="h-7 w-24 text-xs" value={vals.inputPer1k} onChange={(e) => setEditingRates((prev) => ({ ...prev, [model]: { ...prev[model], inputPer1k: e.target.value } }))} data-testid={`input-rate-input-${model}`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Out/1K $</Label>
                          <Input type="number" step="0.0001" min="0" className="h-7 w-24 text-xs" value={vals.outputPer1k} onChange={(e) => setEditingRates((prev) => ({ ...prev, [model]: { ...prev[model], outputPer1k: e.target.value } }))} data-testid={`input-rate-output-${model}`} />
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveRates} disabled={saveRatesMutation.isPending} className="gap-1.5" data-testid="button-save-rates">
                        {saveRatesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Rates
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRatesEditing(false)} data-testid="button-cancel-rates">Cancel</Button>
                    </div>
                  </div>
                ) : ratesData ? (
                  <div className="space-y-1.5">
                    {Object.entries(ratesData.rates).map(([model, vals]) => (
                      <div key={model} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50" data-testid={`row-rate-${model}`}>
                        <span className="text-sm font-medium capitalize">{model}</span>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>In: <span className="font-mono text-foreground">${vals.inputPer1k}/1K</span></span>
                          <span>Out: <span className="font-mono text-foreground">${vals.outputPer1k}/1K</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-subcategory">
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-parent">Parent Category</Label>
              <Select value={addParentId} onValueChange={setAddParentId}>
                <SelectTrigger id="add-parent" data-testid="select-add-parent">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Subcategory name"
                data-testid="input-add-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-description">Description (optional)</Label>
              <Textarea
                id="add-description"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Short description"
                rows={3}
                data-testid="input-add-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-add-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addName.trim() || !addParentId || createMutation.isPending}
              data-testid="button-add-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Subcategory Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent data-testid="dialog-rename-subcategory">
          <DialogHeader>
            <DialogTitle>Rename Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Subcategory name"
                data-testid="input-rename-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rename-description">Description (optional)</Label>
              <Textarea
                id="rename-description"
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                placeholder="Short description"
                rows={3}
                data-testid="input-rename-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} data-testid="button-rename-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim() || renameMutation.isPending}
              data-testid="button-rename-submit"
            >
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-subcategory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingCat?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Source Confirmation */}
      <AlertDialog open={deleteSourceId !== null} onOpenChange={(open) => { if (!open) setDeleteSourceId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-source">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Source</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this source from the library? This only removes the record — it does not delete any generated articles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-source-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteSourceId !== null) deleteSourceMutation.mutate(deleteSourceId); }}
              disabled={deleteSourceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-source-confirm"
            >
              {deleteSourceMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
