import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Loader2, Newspaper, Eye, RefreshCw } from "lucide-react";
import type { NewsCategory } from "@shared/schema";
import type { NewsArticle } from "@/components/news-article-card";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  query: z.string().min(1, "Query is required"),
  accentColor: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
  enabled: z.boolean().default(true),
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
          accentColor: editing.accentColor || "",
          displayOrder: editing.displayOrder,
          enabled: editing.enabled,
        }
      : { name: "", query: "", accentColor: "#6b7280", displayOrder: 0, enabled: true },
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
          <div className="flex items-center gap-3">
            <Switch
              checked={form.watch("enabled")}
              onCheckedChange={(v) => form.setValue("enabled", v)}
              data-testid="switch-category-enabled"
            />
            <Label>Enabled</Label>
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

export default function CommandNews() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsCategory | null>(null);
  const [previewing, setPreviewing] = useState<NewsCategory | null>(null);

  const { data: categories, isLoading } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news/categories"],
    staleTime: 60000,
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

  return (
    <div className="space-y-6" data-testid="command-news">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Manage news feed categories and RSS queries.</p>
          </div>
        </div>
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
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm" data-testid="categories-table">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Query</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Color</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Order</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Enabled</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-category-${cat.id}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded line-clamp-1">{cat.query}</code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cat.accentColor && (
                      <span
                        className="inline-block w-6 h-6 rounded-full border border-border"
                        style={{ backgroundColor: cat.accentColor }}
                        title={cat.accentColor}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{cat.displayOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={cat.enabled}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: cat.id, enabled: v })}
                      data-testid={`toggle-enabled-${cat.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setPreviewing(cat)}
                        data-testid={`button-preview-${cat.id}`}
                        title="Preview feed"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditing(cat); setDialogOpen(true); }}
                        data-testid={`button-edit-${cat.id}`}
                        title="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id);
                        }}
                        data-testid={`button-delete-${cat.id}`}
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
