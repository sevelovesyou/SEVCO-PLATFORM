import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ExternalLink, Briefcase, Tag, ChevronUp, ChevronDown, Save } from "lucide-react";
import { Link } from "wouter";
import type { Service } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? null;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  category: z.string().min(1, "Category is required"),
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

const CATEGORY_BADGE_CLASSES = [
  "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "bg-blue-600/10 text-blue-700 border-blue-600/20",
  "bg-red-700/10 text-red-800 border-red-700/20",
  "bg-green-500/10 text-green-700 border-green-500/20",
  "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "bg-pink-500/10 text-pink-700 border-pink-500/20",
  "bg-sky-500/10 text-sky-700 border-sky-500/20",
  "bg-teal-500/10 text-teal-700 border-teal-500/20",
];

function getCategoryBadge(cat: string, categories: string[]): string {
  const idx = categories.indexOf(cat);
  return CATEGORY_BADGE_CLASSES[idx % CATEGORY_BADGE_CLASSES.length] ?? CATEGORY_BADGE_CLASSES[0];
}

function ServiceForm({
  initialData,
  categories,
  onSuccess,
  onCancel,
}: {
  initialData?: Service;
  categories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initialData;
  const defaultCategory = categories[0] ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      category: (initialData?.category) ?? defaultCategory,
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
      queryClient.invalidateQueries({ queryKey: ["/api/services/categories"] });
      toast({ title: isEdit ? "Service updated" : "Service created" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                  {categories.map((cat) => (
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

        <FormField control={form.control} name="iconName" render={({ field }) => {
          const ResolvedIcon = resolveLucideIcon(field.value);
          return (
            <FormItem>
              <FormLabel>Icon Name</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input {...field} placeholder="e.g. Code2, Palette, TrendingUp" data-testid="input-service-icon" />
                  {ResolvedIcon ? (
                    <div className="h-9 w-9 flex items-center justify-center border border-border rounded-md bg-muted shrink-0">
                      <ResolvedIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 flex items-center justify-center border border-border rounded-md bg-muted shrink-0 opacity-40">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription className="text-xs">Lucide icon name (PascalCase). Falls back to a briefcase icon if not set.</FormDescription>
              <FormMessage />
            </FormItem>
          );
        }} />

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

function CategoriesTab({ categories }: { categories: string[] }) {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PUT", "/api/platform-settings", {
        "services.categories": JSON.stringify([...categories, name]),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({ title: "Category added" });
      setNewCategoryName("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const res = await apiRequest("PATCH", "/api/services/categories/rename", { oldName, newName });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({ title: "Category renamed" });
      setRenameTarget(null);
      setRenameValue("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleAdd() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    addCategoryMutation.mutate(trimmed);
  }

  function startRename(cat: string) {
    setRenameTarget(cat);
    setRenameValue(cat);
  }

  function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || !renameTarget) return;
    if (trimmed === renameTarget) {
      setRenameTarget(null);
      return;
    }
    if (categories.includes(trimmed)) {
      toast({ title: "That category name already exists", variant: "destructive" });
      return;
    }
    renameMutation.mutate({ oldName: renameTarget, newName: trimmed });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Manage the categories used to group services. Renaming a category updates all services in that category.
        </p>

        {categories.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No categories yet. Add one below.</div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`category-row-${cat}`}>
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {renameTarget === cat ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setRenameTarget(null);
                      }}
                      data-testid={`input-rename-category-${cat}`}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={handleRename} disabled={renameMutation.isPending} data-testid={`button-confirm-rename-${cat}`}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRenameTarget(null)} data-testid={`button-cancel-rename-${cat}`}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{cat}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                            aria-label="Edit"
                          className="h-7 w-7 shrink-0"
                          onClick={() => startRename(cat)}
                          data-testid={`button-rename-category-${cat}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rename</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Add New Category</p>
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Analytics"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            data-testid="input-new-category"
          />
          <Button
            onClick={handleAdd}
            disabled={addCategoryMutation.isPending || !newCategoryName.trim()}
            className="gap-1.5 shrink-0"
            data-testid="button-add-category"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">New categories will appear in the service create/edit form and the services mega-menu.</p>
      </div>
    </div>
  );
}

function NavSettingsTab({ categories }: { categories: string[] }) {
  const { toast } = useToast();

  const { data: platformSettings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/platform-settings"],
  });

  const [navTitle, setNavTitle] = useState<string | null>(null);
  const [navIcon, setNavIcon] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);

  const currentTitle = navTitle ?? (platformSettings?.["nav.services.title"] ?? "Services");
  const currentIcon = navIcon ?? (platformSettings?.["nav.services.icon"] ?? "");
  const ResolvedIcon = resolveLucideIcon(currentIcon);

  const currentOrder: string[] = (() => {
    if (categoryOrder !== null) return categoryOrder;
    try {
      const raw = platformSettings?.["nav.services.categoryOrder"];
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return [...categories].sort();
  })();

  const orderedCategories = (() => {
    const inOrder = currentOrder.filter((c) => categories.includes(c));
    const rest = categories.filter((c) => !currentOrder.includes(c)).sort();
    return [...inOrder, ...rest];
  })();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/platform-settings", {
        "nav.services.title": currentTitle,
        "nav.services.icon": currentIcon,
        "nav.services.categoryOrder": JSON.stringify(orderedCategories),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      setNavTitle(null);
      setNavIcon(null);
      setCategoryOrder(null);
      toast({ title: "Navigation settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function moveCategory(index: number, direction: -1 | 1) {
    const newOrder = [...orderedCategories];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCategoryOrder(newOrder);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-xl bg-muted motion-safe:animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Customize how the Services section appears in the top navigation bar.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Navigation Label</label>
            <Input
              value={currentTitle}
              onChange={(e) => setNavTitle(e.target.value)}
              placeholder="Services"
              data-testid="input-nav-services-title"
            />
            <p className="text-xs text-muted-foreground">The label shown in the top nav bar for the Services dropdown.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Navigation Icon</label>
            <div className="flex items-center gap-2">
              <Input
                value={currentIcon}
                onChange={(e) => setNavIcon(e.target.value)}
                placeholder="e.g. Briefcase, Wrench, Sparkles"
                data-testid="input-nav-services-icon"
              />
              {ResolvedIcon ? (
                <div className="h-9 w-9 flex items-center justify-center border border-border rounded-md bg-muted shrink-0">
                  <ResolvedIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="h-9 w-9 flex items-center justify-center border border-border rounded-md bg-muted shrink-0 opacity-40">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Lucide icon name (PascalCase). Leave blank for no icon.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Category Display Order</p>
        <p className="text-xs text-muted-foreground">Drag or use arrow buttons to reorder how categories appear in the Services mega-menu.</p>

        {orderedCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No categories to order. Add categories first.</p>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {orderedCategories.map((cat, index) => (
              <div
                key={cat}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                data-testid={`nav-order-row-${cat}`}
              >
                <span className="text-muted-foreground text-xs w-5 text-center">{index + 1}</span>
                <span className="flex-1 text-sm font-medium">{cat}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveCategory(index, -1)}
                        disabled={index === 0}
                        data-testid={`button-move-up-${cat}`}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move up</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveCategory(index, 1)}
                        disabled={index === orderedCategories.length - 1}
                        data-testid={`button-move-down-${cat}`}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move down</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-1.5"
          data-testid="button-save-nav-settings"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving…" : "Save Navigation Settings"}
        </Button>
      </div>
    </div>
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

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/services/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services/categories"] });
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

  const allCategories = categories.length > 0 ? categories : [...new Set((services ?? []).map((s) => s.category))].sort();

  const total = services?.length ?? 0;
  const active = services?.filter((s) => s.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="services">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="nav" data-testid="tab-nav">Navigation</TabsTrigger>
          </TabsList>
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

        <TabsContent value="services" className="mt-0">
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>{total} total</span>
            <span>{active} active</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted motion-safe:animate-pulse" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-medium">No services yet</p>
              <p className="text-sm mt-1">Add your first service to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {allCategories.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryBadge(cat, allCategories)}`}>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild data-testid={`button-view-service-${service.slug}`} aria-label="View">
                                <Link href={`/services/${service.slug}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                  aria-label="Edit"
                                className="h-7 w-7"
                                onClick={() => { setEditService(service); setFormOpen(true); }}
                                data-testid={`button-edit-service-${service.slug}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                  aria-label="Delete"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteService(service)}
                                data-testid={`button-delete-service-${service.slug}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <CategoriesTab categories={allCategories} />
        </TabsContent>

        <TabsContent value="nav" className="mt-0">
          <NavSettingsTab categories={allCategories} />
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditService(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            initialData={editService ?? undefined}
            categories={allCategories.length > 0 ? allCategories : ["Technology"]}
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
