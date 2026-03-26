import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as LucideIcons from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Folder, ShieldOff, Share2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Project } from "@shared/schema";
import { FileUploadWithFallback } from "@/components/file-upload";

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] ?? null;
}

const optUrl = z.string().url("Must be a valid URL").optional().or(z.literal(""));

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  longDescription: z.string().max(10000).optional(),
  status: z.enum(["active", "in-development", "archived"]),
  type: z.enum(["Company", "Record Label", "Brand", "Initiative", "Platform", "App", "Other"]),
  category: z.string().max(100).optional(),
  featured: z.boolean().default(false),
  websiteUrl: optUrl,
  teamLead: z.string().max(200).optional(),
  relatedWikiSlugs: z.string().optional(),
  tags: z.string().optional(),
  launchDate: z.string().max(100).optional(),
  heroImageUrl: optUrl,
  logoUrl: optUrl,
  appIcon: optUrl,
  menuIcon: z.string().max(100).optional(),
  galleryUrls: z.string().optional(),
  socialTwitter: optUrl,
  socialInstagram: optUrl,
  socialYoutube: optUrl,
  socialDiscord: optUrl,
  socialGithub: optUrl,
  socialOther: optUrl,
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

const CAN_EDIT_ICONS = ["admin", "executive"];

function ProjectFormInner({ mode, project }: ProjectFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role } = usePermission();
  const canEditIcons = role ? CAN_EDIT_ICONS.includes(role) : false;

  const sl = (project?.socialLinks ?? {}) as Record<string, string>;

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
      appIcon: project?.appIcon ?? "",
      menuIcon: project?.menuIcon ?? "",
      galleryUrls: project?.galleryUrls?.join(", ") ?? "",
      socialTwitter: sl.twitter ?? "",
      socialInstagram: sl.instagram ?? "",
      socialYoutube: sl.youtube ?? "",
      socialDiscord: sl.discord ?? "",
      socialGithub: sl.github ?? "",
      socialOther: sl.other ?? "",
    },
  });

  function buildSocialLinks(values: FormValues) {
    const links: Record<string, string> = {};
    if (values.socialTwitter)   links.twitter   = values.socialTwitter;
    if (values.socialInstagram) links.instagram = values.socialInstagram;
    if (values.socialYoutube)   links.youtube   = values.socialYoutube;
    if (values.socialDiscord)   links.discord   = values.socialDiscord;
    if (values.socialGithub)    links.github    = values.socialGithub;
    if (values.socialOther)     links.other     = values.socialOther;
    return Object.keys(links).length > 0 ? links : null;
  }

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
        appIcon: values.appIcon || null,
        menuIcon: values.menuIcon || null,
        galleryUrls: galleryList.length > 0 ? galleryList : null,
        socialLinks: buildSocialLinks(values),
      });
    },
    onSuccess: async (res) => {
      const created: Project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.setQueryData(["/api/projects", created.slug], created);
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
        appIcon: values.appIcon || null,
        menuIcon: values.menuIcon || null,
        galleryUrls: galleryList.length > 0 ? galleryList : null,
        socialLinks: buildSocialLinks(values),
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
                        <SelectItem value="Platform">Platform</SelectItem>
                        <SelectItem value="App">App</SelectItem>
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
                      <FormLabel>Hero Image</FormLabel>
                      <FormControl>
                        <FileUploadWithFallback
                          bucket="banners"
                          path={`projects/${form.watch("slug") || "project"}-hero.{ext}`}
                          accept="image/*"
                          maxSizeMb={5}
                          currentUrl={field.value || null}
                          onUpload={(url) => field.onChange(url)}
                          onUrlChange={(url) => field.onChange(url)}
                          urlValue={field.value ?? ""}
                          label="Upload Hero Image"
                          urlPlaceholder="https://... (full-width banner image)"
                          urlTestId="input-project-hero"
                        />
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
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <FileUploadWithFallback
                          bucket="brand-assets"
                          path={`projects/${form.watch("slug") || "project"}-logo.{ext}`}
                          accept="image/*"
                          maxSizeMb={5}
                          currentUrl={field.value || null}
                          onUpload={(url) => field.onChange(url)}
                          onUrlChange={(url) => field.onChange(url)}
                          urlValue={field.value ?? ""}
                          label="Upload Logo"
                          urlPlaceholder="https://... (project logo or icon)"
                          urlTestId="input-project-logo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canEditIcons && (
                  <FormField
                    control={form.control}
                    name="appIcon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Icon</FormLabel>
                        <FormControl>
                          <FileUploadWithFallback
                            bucket="brand-assets"
                            path={`projects/${form.watch("slug") || "project"}-icon.{ext}`}
                            accept="image/*"
                            maxSizeMb={2}
                            currentUrl={field.value || null}
                            onUpload={(url) => field.onChange(url)}
                            onUrlChange={(url) => field.onChange(url)}
                            urlValue={field.value ?? ""}
                            label="Upload App Icon"
                            urlPlaceholder="https://... (square app icon shown in project header)"
                            urlTestId="input-project-app-icon"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Square image shown alongside the project name in the header.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {canEditIcons && (
                  <FormField
                    control={form.control}
                    name="menuIcon"
                    render={({ field }) => {
                      const ResolvedIcon = resolveLucideIcon(field.value);
                      return (
                        <FormItem>
                          <FormLabel>Menu Icon</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input placeholder="e.g. Rocket, Folder, Music (Lucide icon name)" data-testid="input-project-menu-icon" {...field} />
                              {ResolvedIcon && (
                                <div className="h-9 w-9 flex items-center justify-center border border-border rounded-md bg-muted shrink-0">
                                  <ResolvedIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">Lucide icon name (PascalCase) used in navigation menus. Falls back to a category icon if not set.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

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

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                Social Links
              </p>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="socialTwitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X / Twitter</FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/..." data-testid="input-project-social-twitter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialInstagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/..." data-testid="input-project-social-instagram" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="socialYoutube"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube</FormLabel>
                        <FormControl>
                          <Input placeholder="https://youtube.com/..." data-testid="input-project-social-youtube" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialDiscord"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discord</FormLabel>
                        <FormControl>
                          <Input placeholder="https://discord.gg/..." data-testid="input-project-social-discord" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="socialGithub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/..." data-testid="input-project-social-github" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." data-testid="input-project-social-other" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
