import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@shared/schema";

const CAN_MANAGE_ROLES = ["admin", "executive", "staff"] as const;

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? null;
}

function formatUpdated(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const STATUS_OPTIONS = ["active", "planning", "completed", "archived"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(STATUS_OPTIONS),
  category: z.string().max(100).optional().or(z.literal("")),
  type: z.string().max(100).optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  linkUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  menuIcon: z.string().max(100).optional().or(z.literal("")),
  appIcon: z.string().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  completed: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

function getDefaultValues(project?: Project): FormValues {
  return {
    name: project?.name ?? "",
    slug: project?.slug ?? "",
    description: project?.description ?? "",
    status: (project?.status as (typeof STATUS_OPTIONS)[number]) ?? "active",
    category: project?.category ?? "",
    type: project?.type ?? "",
    websiteUrl: project?.websiteUrl ?? "",
    linkUrl: project?.linkUrl ?? "",
    menuIcon: project?.menuIcon ?? "",
    appIcon: project?.appIcon ?? "",
    displayOrder: project?.displayOrder ?? 0,
  };
}

function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project;
}) {
  const { toast } = useToast();
  const isEdit = !!project;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(project),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(project));
    }
  }, [open, project?.id]);

  const menuIconValue = form.watch("menuIcon");
  const ResolvedIcon = resolveLucideIcon(menuIconValue);
  const appIconValue = form.watch("appIcon");

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        ...data,
        description: data.description || undefined,
        category: data.category || undefined,
        type: data.type || undefined,
        websiteUrl: data.websiteUrl || undefined,
        linkUrl: data.linkUrl || undefined,
        menuIcon: data.menuIcon || undefined,
        appIcon: data.appIcon || undefined,
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/projects/${project!.id}`, payload);
      }
      return apiRequest("POST", "/api/projects", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: isEdit ? "Project updated" : "Project created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    form.setValue("name", val);
    if (!isEdit) {
      form.setValue("slug", toSlug(val));
    }
  }

  function onSubmit(data: FormValues) {
    mutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={handleNameChange}
                        placeholder="My Project"
                        data-testid="input-project-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="my-project" data-testid="input-project-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Short description…" rows={3} data-testid="input-project-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Music, Tech" data-testid="input-project-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Company, App" data-testid="input-project-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com" data-testid="input-project-website-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub / App URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://github.com/…" data-testid="input-project-link-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0"
                        data-testid="input-project-display-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="menuIcon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu Icon (Lucide name)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input {...field} placeholder="Folder" data-testid="input-project-menu-icon" />
                      {ResolvedIcon && <ResolvedIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appIcon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Icon URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://…" data-testid="input-project-app-icon" />
                  </FormControl>
                  {appIconValue && (
                    <img
                      src={resolveImageUrl(appIconValue)}
                      alt="App icon preview"
                      className="h-10 w-10 rounded object-cover mt-1"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-project-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-project-save">
                {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CommandProjects() {
  const { role } = usePermission();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Project | undefined>(undefined);

  const isAdmin = role === "admin";
  const isExec = role === "executive";
  const isStaff = role === "staff";
  const canManage = isAdmin || isExec || isStaff;

  useEffect(() => {
    if (role && !CAN_MANAGE_ROLES.includes(role as (typeof CAN_MANAGE_ROLES)[number])) {
      setLocation("/command");
    }
  }, [role, setLocation]);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      setDeleteTarget(undefined);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleNewProject() {
    setEditProject(undefined);
    setDialogOpen(true);
  }

  function handleEditProject(p: Project) {
    setEditProject(p);
    setDialogOpen(true);
  }

  function handleDialogClose(v: boolean) {
    setDialogOpen(v);
    if (!v) setEditProject(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={handleNewProject} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects yet. {canManage && "Click \"New Project\" to add one."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} data-testid={`row-project-${p.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.menuIcon && (() => {
                        const Icon = resolveLucideIcon(p.menuIcon);
                        return Icon ? <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> : null;
                      })()}
                      <span data-testid={`text-project-name-${p.id}`}>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground" data-testid={`text-project-slug-${p.id}`}>{p.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs ${STATUS_BADGE[p.status] ?? ""}`}
                      data-testid={`status-project-${p.id}`}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" data-testid={`text-project-category-${p.id}`}>
                      {p.category ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" data-testid={`text-project-type-${p.id}`}>
                      {p.type ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" data-testid={`text-project-updated-${p.id}`}>
                      {formatUpdated(p.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditProject(p)}
                              data-testid={`button-edit-project-${p.id}`}
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
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                              data-testid={`button-delete-project-${p.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectFormDialog
        key={editProject?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        project={editProject}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(undefined); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-project-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-project-confirm"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
