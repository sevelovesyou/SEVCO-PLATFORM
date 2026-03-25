import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield, Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { FileUploadWithFallback } from "@/components/file-upload";
import type { Resource } from "@shared/schema";

const resourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().min(1, "URL is required"),
  description: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  displayOrder: z.coerce.number().int().default(0),
  showOnOverview: z.boolean().default(false),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

function ResourceDialog({
  open,
  onClose,
  existing,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Resource;
  nextOrder: number;
}) {
  const { toast } = useToast();
  const isEdit = !!existing;

  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          url: existing.url,
          description: existing.description ?? "",
          category: existing.category,
          displayOrder: existing.displayOrder,
          showOnOverview: existing.showOnOverview,
        }
      : {
          title: "",
          url: "",
          description: "",
          category: "general",
          displayOrder: nextOrder,
          showOnOverview: false,
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const body = { ...data, description: data.description || null };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/resources/${existing!.id}`, body);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/resources", body);
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: isEdit ? "Resource updated" : "Resource added" });
      form.reset();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save resource", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Resource" : "Add Resource"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} placeholder="SEVCO Handbook" data-testid="input-resource-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="url" render={({ field }) => (
              <FormItem>
                <FormLabel>File / URL</FormLabel>
                <FormControl>
                  <FileUploadWithFallback
                    bucket="brand-assets"
                    path={`resources/${Date.now()}.{ext}`}
                    accept="*/*"
                    maxSizeMb={50}
                    currentUrl={field.value || null}
                    onUpload={(url) => field.onChange(url)}
                    onUrlChange={(url) => field.onChange(url)}
                    urlValue={field.value}
                    label="Upload File"
                    urlPlaceholder="https://..."
                    urlTestId="input-resource-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Textarea {...field} placeholder="Brief description..." rows={2} data-testid="input-resource-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl><Input {...field} placeholder="general" data-testid="input-resource-category" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="displayOrder" render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl><Input {...field} type="number" data-testid="input-resource-order" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="showOnOverview" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-resource-overview" />
                </FormControl>
                <Label className="text-xs">Show on Overview (Quick Links)</Label>
              </FormItem>
            )} />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-resource">
                {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Resource"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ResourceRow({
  resource,
  onEdit,
}: {
  resource: Resource;
  onEdit: (r: Resource) => void;
}) {
  const { toast } = useToast();

  const toggleOverview = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/resources/${resource.id}`, { showOnOverview: !resource.showOnOverview }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/resources"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/resources/${resource.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource removed" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-resource-${resource.id}`}>
      <td className="p-3">
        <div>
          <p className="text-sm font-medium">{resource.title}</p>
          {resource.description && (
            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{resource.description}</p>
          )}
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 max-w-[200px] truncate"
          data-testid={`link-resource-url-${resource.id}`}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {resource.url}
        </a>
      </td>
      <td className="p-3 hidden sm:table-cell">
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{resource.category}</span>
      </td>
      <td className="p-3 text-center">
        <span className="text-xs text-muted-foreground">{resource.displayOrder}</span>
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={resource.showOnOverview}
          onCheckedChange={() => toggleOverview.mutate()}
          disabled={toggleOverview.isPending}
          data-testid={`switch-overview-${resource.id}`}
          className="scale-75"
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(resource)}
            data-testid={`button-edit-resource-${resource.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Remove "${resource.title}"?`)) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            data-testid={`button-delete-resource-${resource.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function CommandResources() {
  const { isAdmin, isExecutive } = usePermission();
  const canManageResources = isAdmin || isExecutive;
  const [showDialog, setShowDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);

  const { data: resourcesList, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  if (!canManageResources) {
    return (
      <Card className="p-6 text-center overflow-visible">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Executive access required.</p>
      </Card>
    );
  }

  const handleAdd = () => {
    setEditingResource(undefined);
    setShowDialog(true);
  };

  const handleEdit = (r: Resource) => {
    setEditingResource(r);
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingResource(undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resources
        </h2>
        {resourcesList && (
          <span className="text-xs text-muted-foreground">
            {resourcesList.length} resource{resourcesList.length !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          size="sm"
          className="ml-auto h-7 text-xs gap-1"
          onClick={handleAdd}
          data-testid="button-add-resource"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Resource
        </Button>
      </div>

      <Card className="overflow-hidden overflow-visible" data-testid="table-resources">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">URL</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Order</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground">Overview</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3 hidden sm:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-6 mx-auto" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                  </tr>
                ))
              ) : resourcesList && resourcesList.length > 0 ? (
                resourcesList.map((r) => (
                  <ResourceRow key={r.id} resource={r} onEdit={handleEdit} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No resources configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ResourceDialog
        open={showDialog}
        onClose={handleClose}
        existing={editingResource}
        nextOrder={resourcesList?.length ?? 0}
      />
    </div>
  );
}
