import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Folder, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Project } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  longDescription: z.string().max(10000).optional(),
  status: z.enum(["active", "in-development", "archived"]),
  type: z.enum(["Company", "Record Label", "Brand", "Initiative", "Other"]),
  category: z.string().max(100).optional(),
  featured: z.boolean().default(false),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  teamLead: z.string().max(200).optional(),
  relatedWikiSlugs: z.string().optional(),
  tags: z.string().optional(),
  launchDate: z.string().max(100).optional(),
  heroImageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  galleryUrls: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CAN_MANAGE_PROJECTS = ["admin", "executive", "staff"];

function AccessDenied() {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground opacity-30" />
      <div>
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Only Admin, Executive, and Staff can manage projects.
        </p>
        <Link href="/projects">
          <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-back-to-projects">
            <ChevronLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface ProjectFormProps {
  mode: "create" | "edit";
  project?: Project;
}

function ProjectFormInner({ mode, project }: ProjectFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name ?? "",
      slug: project?.slug ?? "",
      description: project?.description ?? "",
      longDescription: project?.longDescription ?? "",
      status: (project?.status as FormValues["status"]) ?? "active",
      type: (project?.type as FormValues["type"]) ?? "Company",
      category: project?.category ?? "",
      featured: project?.featured ?? false,
      websiteUrl: project?.websiteUrl ?? "",
      teamLead: project?.teamLead ?? "",
      relatedWikiSlugs: project?.relatedWikiSlugs?.join(", ") ?? "",
      tags: project?.tags?.join(", ") ?? "",
      launchDate: project?.launchDate ?? "",
      heroImageUrl: project?.heroImageUrl ?? "",
      logoUrl: project?.logoUrl ?? "",
      galleryUrls: project?.galleryUrls?.join(", ") ?? "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const wikiSlugs = values.relatedWikiSlugs
        ? values.relatedWikiSlugs.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const tagList = values.tags
        ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const galleryList = values.galleryUrls
        ? values.galleryUrls.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      return apiRequest("POST", "/api/projects", {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        longDescription: values.longDescription || null,
        status: values.status,
        type: values.type,
        category: values.category || null,
        featured: values.featured,
        websiteUrl: values.websiteUrl || null,
        teamLead: values.teamLead || null,
        relatedWikiSlugs: wikiSlugs.length > 0 ? wikiSlugs : null,
        tags: tagList.length > 0 ? tagList : null,
        launchDate: values.launchDate || null,
        heroImageUrl: values.heroImageUrl || null,
        logoUrl: values.logoUrl || null,
        galleryUrls: galleryList.length > 0 ? galleryList : null,
      });
    },
    onSuccess: async (res) => {
      const created: Project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created" });
      setLocation(`/projects/${created.slug}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const wikiSlugs = values.relatedWikiSlugs
        ? values.relatedWikiSlugs.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const tagList = values.tags
        ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const galleryList = values.galleryUrls
        ? values.galleryUrls.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      return apiRequest("PATCH", `/api/projects/${project!.id}`, {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        longDescription: values.longDescription || null,
        status: values.status,
        type: values.type,
        category: values.category || null,
        featured: values.featured,
        websiteUrl: values.websiteUrl || null,
        teamLead: values.teamLead || null,
        relatedWikiSlugs: wikiSlugs.length > 0 ? wikiSlugs : null,
        tags: tagList.length > 0 ? tagList : null,
        launchDate: values.launchDate || null,
        heroImageUrl: values.heroImageUrl || null,
        logoUrl: values.logoUrl || null,
        galleryUrls: galleryList.length > 0 ? galleryList : null,
      });
    },
    onSuccess: async (res) => {
      const updated: Project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project?.slug] });
      toast({ title: "Project updated" });
      setLocation(`/projects/${updated.slug}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to update project", description: err.message, variant: "destructive" });
    },
  });

  const mutation = mode === "create" ? createMutation : updateMutation;

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!form.getValues("slug")) {
      form.setValue("slug", toSlug(e.target.value), { shouldValidate: true });
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" data-testid="button-back-to-projects">
            <ChevronLeft className="h-4 w-4" />
            Projects
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <Folder className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {mode === "create" ? "Add Project" : "Edit Project"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Add a new venture to the SEVCO portfolio."
              : "Update project details."}
          </p>
        </div>
      </div>

      <Card className="p-5 overflow-visible">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. SEVCO Records"
                      data-testid="input-project-name"
                      {...field}
                      onBlur={(e) => { field.onBlur(); handleNameBlur(e); }}
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
                    <Input
                      placeholder="e.g. sevco-records"
                      data-testid="input-project-slug"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the project or venture…"
                      rows={4}
                      data-testid="input-project-description"
                      {...field}
                    />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="in-development">In Development</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Record Label">Record Label</SelectItem>
                        <SelectItem value="Brand">Brand</SelectItem>
                        <SelectItem value="Initiative">Initiative</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      data-testid="input-project-website"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamLead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Lead</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Seve"
                      data-testid="input-project-teamlead"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relatedWikiSlugs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Wiki Articles</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. sevco-records, sevco-history (comma-separated slugs)"
                      data-testid="input-project-wiki-slugs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Comma-separated wiki article slugs to link from this project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Marketing Page</p>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Platform, Game, Label" data-testid="input-project-category" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="launchDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Launch Date</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2024 or Coming Soon" data-testid="input-project-launch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-project-featured" />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Featured in nav dropdown</FormLabel>
                        <FormDescription className="text-xs">Show in the Projects mega-menu</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Platform, Web, React (comma-separated)" data-testid="input-project-tags" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description shown on the project marketing page…"
                          rows={5}
                          data-testid="textarea-project-long-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heroImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hero Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://... (full-width banner image)" data-testid="input-project-hero" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://... (project logo or icon)" data-testid="input-project-logo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="galleryUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gallery Image URLs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="https://..., https://... (comma-separated image URLs)"
                          rows={3}
                          data-testid="textarea-project-gallery"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Comma-separated URLs for the project gallery images.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/projects">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-project"
              >
                {mutation.isPending
                  ? (mode === "create" ? "Adding…" : "Saving…")
                  : (mode === "create" ? "Add Project" : "Save Changes")}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export function ProjectCreatePage() {
  const { role } = usePermission();
  if (!CAN_MANAGE_PROJECTS.includes(role ?? "")) return <AccessDenied />;
  return <ProjectFormInner mode="create" />;
}

export function ProjectEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const { role } = usePermission();

  if (!CAN_MANAGE_PROJECTS.includes(role ?? "")) return <AccessDenied />;

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", slug],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${slug}`);
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        <div className="h-8 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-xl mx-auto p-4 md:p-6 flex flex-col items-center gap-4 text-center py-16">
        <p className="font-semibold">Project not found</p>
        <Link href="/projects">
          <Button variant="outline" size="sm" data-testid="button-back-to-projects">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return <ProjectFormInner mode="edit" project={project} />;
}
