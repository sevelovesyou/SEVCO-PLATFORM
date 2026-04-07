import { useState } from "react";
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
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import type { Category } from "@shared/schema";

export default function CommandWiki() {
  const { role } = usePermission();
  const { toast } = useToast();

  const isStaffPlus = role === "admin" || role === "executive" || role === "staff";
  const isExecutivePlus = role === "admin" || role === "executive";

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

  const { data: allCategories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
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

  if (!isStaffPlus) {
    return (
      <div className="text-sm text-muted-foreground" data-testid="text-wiki-no-access">
        You do not have permission to manage wiki subcategories.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Wiki</h2>
      </div>

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
    </div>
  );
}
