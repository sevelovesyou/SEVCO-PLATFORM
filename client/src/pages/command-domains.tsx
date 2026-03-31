import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDomainSchema } from "@shared/schema";
import type { Domain, Project } from "@shared/schema";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, ExternalLink, Calendar, Home, Target, FolderOpen } from "lucide-react";
import { PageHead } from "@/components/page-head";

const formSchema = insertDomainSchema.extend({
  name: z.string().min(1, "Domain name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" },
  expiring: { label: "Expiring", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  expired: { label: "Expired", className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
  pending: { label: "Pending", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  parked: { label: "Parked", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30" },
};

function isExpiringSoon(renewalDate: string | null | undefined): boolean {
  if (!renewalDate) return false;
  const diff = new Date(renewalDate).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function formatRenewalDate(renewalDate: string | null | undefined): string {
  if (!renewalDate) return "—";
  try {
    return new Date(renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return renewalDate;
  }
}

interface DomainFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain?: Domain | null;
  projects: Project[];
}

function DomainFormDialog({ open, onOpenChange, domain, projects }: DomainFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!domain;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: domain?.name ?? "",
      url: domain?.url ?? "",
      status: domain?.status ?? "active",
      renewalDate: domain?.renewalDate ?? "",
      renewalPrice: domain?.renewalPrice ?? "",
      hostingProvider: domain?.hostingProvider ?? "",
      purpose: domain?.purpose ?? "",
      projectId: domain?.projectId ?? null,
      displayOrder: domain?.displayOrder ?? 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/domains", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain added" });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("PATCH", `/api/domains/${domain!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain updated" });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: FormValues) {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-domain-form">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Domain" : "Add Domain"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="sevco.us" {...field} data-testid="input-domain-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://sevco.us" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "active"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expiring">Expiring</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="parked">Parked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Date</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="YYYY-MM-DD" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="renewalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Price</FormLabel>
                    <FormControl>
                      <Input placeholder="$14.99/yr" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="hostingProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hosting Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="Cloudflare, Namecheap, Replit..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe what this domain is used for..." {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Project</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">— No project —</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value ?? 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Domain"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmProps {
  domain: Domain | null;
  onClose: () => void;
}

function DeleteConfirm({ domain, onClose }: DeleteConfirmProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/domains/${domain!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain removed" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <AlertDialog open={!!domain} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove domain?</AlertDialogTitle>
          <AlertDialogDescription>
            Remove <span className="font-semibold">{domain?.name}</span> from your domain list? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CommandDomains() {
  const { role } = usePermission();
  const isExecPlus = role === "admin" || role === "executive";

  const [formOpen, setFormOpen] = useState(false);
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [deleteDomain, setDeleteDomain] = useState<Domain | null>(null);

  const { data: domainsData, isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const domains = domainsData ?? [];
  const projects = projectsData ?? [];

  function getProjectName(projectId: number | null | undefined): string {
    if (!projectId) return "—";
    const project = projects.find((p) => p.id === projectId);
    return project?.title ?? "—";
  }

  function openEdit(domain: Domain) {
    setEditDomain(domain);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditDomain(null);
  }

  return (
    <>
      <PageHead title="Domains | SEVCO CMD" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div />
          {isExecPlus && (
            <Button size="sm" onClick={() => { setEditDomain(null); setFormOpen(true); }} data-testid="button-add-domain">
              <Plus className="h-4 w-4 mr-1" />
              Add Domain
            </Button>
          )}
        </div>

        {domainsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-lg" />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No domains added yet.</p>
            {isExecPlus && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditDomain(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add your first domain
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => {
              const statusCfg = STATUS_CONFIG[domain.status] ?? STATUS_CONFIG.active;
              const soonExpiring = domain.status === "expiring" && isExpiringSoon(domain.renewalDate);

              return (
                <Card key={domain.id} data-testid={`card-domain-${domain.id}`} className="relative flex flex-col">
                  <CardContent className="pt-4 pb-3 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-base font-semibold font-mono truncate ${soonExpiring ? "font-bold" : ""}`}>
                          {domain.name}
                        </p>
                        {domain.url ? (
                          <a
                            href={domain.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{domain.url}</span>
                          </a>
                        ) : null}
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    <hr className="border-border" />

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-start gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground shrink-0">Renewal:</span>
                        <span className={`${soonExpiring ? "text-yellow-600 dark:text-yellow-400 font-semibold" : ""}`}>
                          {formatRenewalDate(domain.renewalDate)}
                          {domain.renewalPrice ? ` · ${domain.renewalPrice}` : ""}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Home className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground shrink-0">Hosting:</span>
                        <span>{domain.hostingProvider || "—"}</span>
                      </div>
                      {domain.purpose ? (
                        <div className="flex items-start gap-2 text-xs">
                          <Target className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-muted-foreground shrink-0">Purpose:</span>
                          <span className="line-clamp-2">{domain.purpose}</span>
                        </div>
                      ) : null}
                      <div className="flex items-start gap-2 text-xs">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground shrink-0">Project:</span>
                        <span>{getProjectName(domain.projectId)}</span>
                      </div>
                    </div>

                    {isExecPlus && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(domain)}
                          data-testid={`button-edit-domain-${domain.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteDomain(domain)}
                          data-testid={`button-delete-domain-${domain.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DomainFormDialog
        open={formOpen}
        onOpenChange={(open) => { if (!open) closeForm(); else setFormOpen(true); }}
        domain={editDomain}
        projects={projects}
      />
      <DeleteConfirm domain={deleteDomain} onClose={() => setDeleteDomain(null)} />
    </>
  );
}
