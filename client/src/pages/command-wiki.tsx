import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermission } from "@/hooks/use-permission";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, BookOpen, Library, Link2, GraduationCap, FileText, RefreshCw, Loader2, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import type { Category } from "@shared/schema";

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

export default function CommandWiki() {
  const { role } = usePermission();
  const { toast } = useToast();

  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";
  const isExecutivePlus = role === "admin" || role === "executive";
  const canIngest = role === "admin" || role === "executive" || role === "staff" || role === "partner";

  const [activeTab, setActiveTab] = useState<"subcategories" | "sources">("subcategories");

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

  const [urlInput, setUrlInput] = useState("");
  const [academicType, setAcademicType] = useState<"doi" | "pubmed" | "arxiv">("doi");
  const [academicId, setAcademicId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [ingestingUrl, setIngestingUrl] = useState(false);
  const [ingestingAcademic, setIngestingAcademic] = useState(false);
  const [ingestingPdf, setIngestingPdf] = useState(false);

  const [deleteSourceId, setDeleteSourceId] = useState<number | null>(null);

  const { data: allCategories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<WikiSource[]>({
    queryKey: ["/api/tools/wiki/sources"],
    enabled: canIngest,
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

  function openWikifyWithSource(result: IngestResult): void {
    try {
      sessionStorage.setItem("wikify_source_text", result.text);
      sessionStorage.setItem("wikify_source_id", String(result.sourceId));
      sessionStorage.setItem("wikify_citation", result.citation);
      sessionStorage.setItem("wikify_citation_format", result.citationFormat);
    } catch { /* ignore storage errors */ }
    window.open("/tools/wikify?from=source", "_blank");
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

  const [reIngestingId, setReIngestingId] = useState<number | null>(null);

  async function handleReIngest(source: WikiSource) {
    if (source.type === "pdf") {
      toast({ title: "Re-ingest not available for PDF", description: "Please upload the PDF again to re-ingest.", variant: "destructive" });
      return;
    }
    setReIngestingId(source.id);
    try {
      let res: Response;
      if (source.type === "url") {
        res = await apiRequest("POST", "/api/tools/wiki/ingest-url", { url: source.identifier });
      } else {
        res = await apiRequest("POST", "/api/tools/wiki/ingest-academic", {
          type: source.type,
          id: source.identifier,
        });
      }
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
        You do not have permission to manage wiki subcategories.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Wiki</h2>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === "subcategories" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("subcategories")}
          data-testid="tab-subcategories"
        >
          Subcategories
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${activeTab === "sources" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("sources")}
          data-testid="tab-source-library"
        >
          <Library className="h-3.5 w-3.5" />
          Source Library
        </button>
      </div>

      {/* Subcategories Tab */}
      {activeTab === "subcategories" && (
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
      )}

      {/* Source Library Tab */}
      {activeTab === "sources" && (
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

          {/* Source Library Table */}
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
      )}

      {/* Add Subcategory Dialog */}
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
