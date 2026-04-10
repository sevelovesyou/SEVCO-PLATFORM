import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Pencil, Trash2, ExternalLink, FileText, Layers } from "lucide-react";

interface SiteWithPageCount {
  id: number;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  theme_json: Record<string, unknown> | null;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
  page_count: number;
}

const createSiteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
});

type CreateSiteForm = z.infer<typeof createSiteSchema>;

export default function SitesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: sites, isLoading } = useQuery<SiteWithPageCount[]>({
    queryKey: ["/api/sites"],
  });

  const form = useForm<CreateSiteForm>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: { title: "", slug: "", description: "" },
  });

  const slugValue = form.watch("slug");

  const createMutation = useMutation({
    mutationFn: (data: CreateSiteForm) =>
      apiRequest("POST", "/api/sites", data).then((r) => r.json()),
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setCreateOpen(false);
      form.reset();
      navigate(`/sites/${site.slug}/edit`);
    },
    onError: async (err: Response | Error) => {
      let message = "Failed to create site";
      if (err instanceof Response) {
        const body = await err.json().catch(() => ({}));
        message = body.message ?? message;
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiRequest("DELETE", `/api/sites/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Site deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete site", variant: "destructive" });
    },
  });

  function onSubmit(data: CreateSiteForm) {
    createMutation.mutate(data);
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-mono text-blue-400 tracking-widest uppercase">SEVCO Sites</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight" data-testid="heading-my-sites">My Sites</h1>
            <p className="text-zinc-500 text-sm mt-1">Create and manage your personal sites on sev.cx</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
            data-testid="button-create-site"
          >
            <Plus className="w-4 h-4" />
            Create New Site
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : !sites || sites.length === 0 ? (
          <EmptyState onCreateClick={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onDelete={() => deleteMutation.mutate(site.slug)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Site Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">Create a new site</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Site title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="My Awesome Site"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                        data-testid="input-site-title"
                        onChange={(e) => {
                          field.onChange(e);
                          if (!form.getFieldState("slug").isDirty) {
                            form.setValue("slug", autoSlug(e.target.value), { shouldValidate: true });
                          }
                        }}
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
                    <FormLabel className="text-zinc-300">Site address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="my-site"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                        data-testid="input-site-slug"
                      />
                    </FormControl>
                    {slugValue && (
                      <p className="text-xs text-blue-400 font-mono mt-1" data-testid="text-slug-preview">
                        {slugValue}.sev.cx
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Description <span className="text-zinc-600">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="A brief description of your site..."
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500 resize-none"
                        rows={2}
                        data-testid="input-site-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setCreateOpen(false); form.reset(); }}
                  className="text-zinc-400 hover:text-white"
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create Site"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
        <Layers className="w-8 h-8 text-zinc-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-title">No sites yet</h2>
      <p className="text-zinc-500 text-sm max-w-sm mb-8">
        Build your presence on sev.cx. Create your first site and launch it in minutes.
      </p>
      <Button
        onClick={onCreateClick}
        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
        data-testid="button-create-first-site"
      >
        <Plus className="w-4 h-4" />
        Create your first site
      </Button>
    </div>
  );
}

function SiteCard({
  site,
  onDelete,
  isDeleting,
}: {
  site: SiteWithPageCount;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <Card
      className="bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
      data-testid={`card-site-${site.id}`}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate text-base" data-testid={`text-site-title-${site.id}`}>
              {site.title}
            </h3>
            <p
              className="font-mono text-xs text-blue-400 mt-0.5 truncate"
              data-testid={`text-site-slug-${site.id}`}
            >
              {site.slug}.sev.cx
            </p>
          </div>
          <Badge
            className={
              site.is_published
                ? "bg-green-500/20 text-green-400 border-green-500/30 shrink-0"
                : "bg-zinc-800 text-zinc-400 border-zinc-700 shrink-0"
            }
            data-testid={`status-publish-${site.id}`}
          >
            {site.is_published ? "Live" : "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-1.5 text-zinc-600 text-xs mb-4">
          <FileText className="w-3.5 h-3.5" />
          <span data-testid={`text-page-count-${site.id}`}>{site.page_count} page{site.page_count !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white gap-1.5 h-8 text-xs"
            onClick={() => navigate(`/sites/${site.slug}/edit`)}
            data-testid={`button-edit-site-${site.id}`}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
          {site.is_published && (
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white gap-1.5 h-8 text-xs"
              asChild
              data-testid={`button-view-site-${site.id}`}
            >
              <a href={`https://${site.slug}.sev.cx`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
                View
              </a>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-zinc-800 text-red-400 hover:bg-red-950 hover:text-red-300 hover:border-red-900 h-8 w-8 p-0"
                disabled={isDeleting}
                data-testid={`button-delete-site-${site.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete "{site.title}"?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  This will permanently delete the site and all its pages. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" data-testid={`button-cancel-delete-${site.id}`}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-500 text-white"
                  data-testid={`button-confirm-delete-${site.id}`}
                >
                  Delete Site
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
