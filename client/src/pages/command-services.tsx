import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import type { Service } from "@shared/schema";

const SERVICE_CATEGORIES = ["Engineering", "Design", "Marketing", "Operations", "Sales", "Support"];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  category: z.enum(["Engineering", "Design", "Marketing", "Operations", "Sales", "Support"]),
  tagline: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  iconName: z.string().max(100).optional(),
  status: z.enum(["active", "archived"]),
  featured: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const CATEGORY_BADGE: Record<string, string> = {
  Engineering: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Design:      "bg-purple-500/10 text-purple-700 border-purple-500/20",
  Marketing:   "bg-orange-500/10 text-orange-700 border-orange-500/20",
  Operations:  "bg-green-500/10 text-green-700 border-green-500/20",
  Sales:       "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  Support:     "bg-pink-500/10 text-pink-700 border-pink-500/20",
};

function ServiceForm({
  initialData,
  onSuccess,
  onCancel,
}: {
  initialData?: Service;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      category: (initialData?.category as FormValues["category"]) ?? "Engineering",
      tagline: initialData?.tagline ?? "",
      description: initialData?.description ?? "",
      iconName: initialData?.iconName ?? "",
      status: (initialData?.status as FormValues["status"]) ?? "active",
      featured: initialData?.featured ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/services/${initialData!.id}`, values);
      }
      return apiRequest("POST", "/api/services", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", "all"] });
      toast({ title: isEdit ? "Service updated" : "Service created" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const watchName = form.watch("name");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  data-testid="input-service-name"
                  onChange={(e) => {
                    field.onChange(e);
                    if (!isEdit) form.setValue("slug", toSlug(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="slug" render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-service-slug" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-service-category">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-service-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="tagline" render={({ field }) => (
          <FormItem>
            <FormLabel>Tagline</FormLabel>
            <FormControl>
              <Input {...field} placeholder="One-liner shown in menus and cards" data-testid="input-service-tagline" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="iconName" render={({ field }) => (
          <FormItem>
            <FormLabel>Icon Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g. Code2, Palette, TrendingUp" data-testid="input-service-icon" />
            </FormControl>
            <FormDescription className="text-xs">Lucide icon name (PascalCase)</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={6}
                placeholder="Markdown-like content: **Heading**, - bullet points, plain paragraphs"
                data-testid="textarea-service-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="featured" render={({ field }) => (
          <FormItem className="flex items-center gap-3 space-y-0">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-service-featured" />
            </FormControl>
            <div>
              <FormLabel className="cursor-pointer">Featured</FormLabel>
              <FormDescription className="text-xs">Show in navigation menus</FormDescription>
            </div>
          </FormItem>
        )} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-service">
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-service">
            {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Service"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CommandServices() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services", "all"],
    queryFn: () => fetch("/api/services?all=true").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", "all"] });
      toast({ title: "Service deleted" });
      setDeleteService(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const grouped = (services ?? []).reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const total = services?.length ?? 0;
  const active = services?.filter((s) => s.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{total} total</span>
          <span>{active} active</span>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditService(null); setFormOpen(true); }}
          data-testid="button-add-service"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">No services yet</p>
          <p className="text-sm mt-1">Add your first service to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {SERVICE_CATEGORIES.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${CATEGORY_BADGE[cat]}`}>
                  {cat}
                </span>
                <span className="text-xs text-muted-foreground">{grouped[cat].length}</span>
              </div>
              <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                {grouped[cat].map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                    data-testid={`service-row-${service.slug}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{service.name}</span>
                        {service.featured && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            Featured
                          </span>
                        )}
                        {service.status === "archived" && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                      {service.tagline && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/services/${service.slug}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-view-service-${service.slug}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditService(service); setFormOpen(true); }}
                        data-testid={`button-edit-service-${service.slug}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteService(service)}
                        data-testid={`button-delete-service-${service.slug}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditService(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            initialData={editService ?? undefined}
            onSuccess={() => { setFormOpen(false); setEditService(null); }}
            onCancel={() => { setFormOpen(false); setEditService(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteService} onOpenChange={(o) => { if (!o) setDeleteService(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteService?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This service will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteService && deleteMutation.mutate(deleteService.id)}
              data-testid="button-confirm-delete-service"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
