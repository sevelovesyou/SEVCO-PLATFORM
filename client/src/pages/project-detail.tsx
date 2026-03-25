import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as LucideIcons from "lucide-react";
import {
  ArrowLeft, Globe, User, BookOpen, CircleX, Pencil, Tag,
  Calendar, ArrowRight, ExternalLink,
} from "lucide-react";
import { SiX, SiInstagram, SiYoutube, SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import { queryClient } from "@/lib/queryClient";
import { AttachNotePanel } from "@/components/attach-note-panel";
import { StaffNotes } from "@/components/staff-notes";
import type { Project } from "@shared/schema";

type SocialLinks = Record<string, string>;

const SOCIAL_ICON_MAP: Record<string, React.ElementType> = {
  twitter:   SiX,
  instagram: SiInstagram,
  youtube:   SiYoutube,
  discord:   SiDiscord,
  github:    SiGithub,
  other:     Globe,
};

const SOCIAL_LABEL_MAP: Record<string, string> = {
  twitter:   "X",
  instagram: "Instagram",
  youtube:   "YouTube",
  discord:   "Discord",
  github:    "GitHub",
  other:     "Other",
};

const SOCIAL_PLATFORM_ORDER = ["twitter", "instagram", "youtube", "discord", "github", "other"];

const CAN_MANAGE_PROJECTS = ["admin", "executive", "staff"];

const STATUS_COLORS: Record<string, { badge: string; dot: string }> = {
  active: { badge: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", dot: "bg-green-500" },
  "in-development": { badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  archived: { badge: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  "in-development": "In Development",
  archived: "Archived",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Platform: "from-blue-600/20 via-blue-500/10 to-transparent",
  App:      "from-purple-600/20 via-purple-500/10 to-transparent",
  Game:     "from-green-600/20 via-green-500/10 to-transparent",
  Label:    "from-pink-600/20 via-pink-500/10 to-transparent",
  Media:    "from-orange-600/20 via-orange-500/10 to-transparent",
  Other:    "from-zinc-600/20 via-zinc-500/10 to-transparent",
};

const CATEGORY_ICON_BG: Record<string, string> = {
  Platform: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  App:      "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  Game:     "bg-green-500/15 text-green-600 dark:text-green-400",
  Label:    "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  Media:    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  Other:    "bg-muted text-muted-foreground",
};

function CategoryIcon({ category, className }: { category: string | null | undefined; className?: string }) {
  const cat = category ?? "Other";
  const initials = cat.slice(0, 2).toUpperCase();
  const bgClass = CATEGORY_ICON_BG[cat] ?? CATEGORY_ICON_BG.Other;
  return (
    <div className={`rounded-2xl flex items-center justify-center font-black text-lg ${bgClass} ${className ?? ""}`}>
      {initials}
    </div>
  );
}

function parseMarkdown(text: string): string[] {
  return text.split("\n\n").filter(Boolean);
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { role } = usePermission();
  const [, navigate] = useLocation();
  const canManage = role && CAN_MANAGE_PROJECTS.includes(role);

  const { data: project, isLoading, isError } = useQuery<Project>({
    queryKey: ["/api/projects", slug],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${slug}`);
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
  });

  const { data: allProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const relatedProjects = (allProjects ?? [])
    .filter((p) => p.slug !== slug && p.featured && p.status !== "archived")
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <CircleX className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-lg">Project Not Found</p>
          <p className="text-muted-foreground text-sm mt-1">
            This project doesn't exist or has been removed.
          </p>
        </div>
        <Link href="/projects">
          <Button variant="outline" size="sm" data-testid="button-back-to-projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_COLORS[project.status] ?? STATUS_COLORS["archived"];
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const gradientClass = CATEGORY_GRADIENTS[project.category ?? "Other"] ?? CATEGORY_GRADIENTS.Other;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <Link href="/projects">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              data-testid="button-back-to-projects"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Projects
            </Button>
          </Link>
          {canManage && (
            <Link href={`/projects/${project.slug}/edit`}>
              <Button variant="outline" size="sm" data-testid="button-edit-project">
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradientClass} border border-border mb-8`}>
          {project.heroImageUrl ? (
            <div className="relative h-64 md:h-80">
              <img
                src={project.heroImageUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
          ) : (
            <div className="h-36 md:h-48" />
          )}

          <div className="relative px-6 pb-8 pt-4">
            <div className="flex items-start gap-4">
              {project.appIcon ? (
                <img
                  src={project.appIcon}
                  alt={`${project.name} icon`}
                  className="h-16 w-16 rounded-xl object-cover border bg-background shadow-sm shrink-0"
                  data-testid="img-project-app-icon"
                />
              ) : project.logoUrl ? (
                <img
                  src={project.logoUrl}
                  alt={project.name}
                  className="h-16 w-16 rounded-xl object-contain border bg-background shadow-sm shrink-0"
                />
              ) : (
                <CategoryIcon
                  category={project.category}
                  className="h-16 w-16 shrink-0 shadow-sm border border-border/50"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusLabel}
                  </span>
                  {project.category && (
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {project.category}
                    </span>
                  )}
                  {project.launchDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {project.launchDate}
                    </span>
                  )}
                </div>

                <h1
                  className="text-3xl md:text-4xl font-black tracking-tight"
                  data-testid="text-project-name"
                >
                  {project.name}
                </h1>

                {project.description && (
                  <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-2xl" data-testid="text-project-description">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  {project.websiteUrl && (
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-project-website"
                    >
                      <Button size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visit Site
                      </Button>
                    </a>
                  )}
                  {SOCIAL_PLATFORM_ORDER.map((platform) => {
                    const links = (project.socialLinks ?? {}) as SocialLinks;
                    const url = links[platform];
                    if (!url) return null;
                    const Icon = SOCIAL_ICON_MAP[platform] ?? Globe;
                    const label = SOCIAL_LABEL_MAP[platform] ?? platform;
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-project-social-${platform}`}
                      >
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </Button>
                      </a>
                    );
                  })}
                  <Link href="/projects">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      All Projects
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {project.longDescription && (
              <section>
                <h2 className="text-lg font-bold mb-4">About</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {parseMarkdown(project.longDescription).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            )}

            {project.tags && project.tags.length > 0 && (
              <section>
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-medium"
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {project.galleryUrls && project.galleryUrls.length > 0 && (
              <section>
                <h2 className="text-base font-bold mb-3">Gallery</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {project.galleryUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${project.name} screenshot ${i + 1}`}
                      className="h-40 w-auto rounded-lg border border-border object-cover shrink-0"
                    />
                  ))}
                </div>
              </section>
            )}

            {project.relatedWikiSlugs && project.relatedWikiSlugs.length > 0 && (
              <section>
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Related Wiki Articles
                </h2>
                <div className="flex flex-col gap-2">
                  {project.relatedWikiSlugs.map((wikiSlug) => (
                    <Link key={wikiSlug} href={`/wiki/${wikiSlug}`}>
                      <div
                        className="border border-border rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between group"
                        data-testid={`link-wiki-${wikiSlug}`}
                      >
                        <span className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                          {wikiSlug}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <StaffNotes resourceType="project" resourceId={project.id} />
          </div>

          <div className="space-y-6">
            <AttachNotePanel resourceType="project" resourceId={project.id} />
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Info</h3>
              </div>
              <div className="divide-y divide-border">
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusLabel}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                  <p className="text-sm font-medium">{project.type}</p>
                </div>
                {project.category && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                    <p className="text-sm font-medium">{project.category}</p>
                  </div>
                )}
                {project.teamLead && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Team Lead</p>
                    <p className="text-sm font-medium flex items-center gap-1.5" data-testid="text-team-lead">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {project.teamLead}
                    </p>
                  </div>
                )}
                {project.launchDate && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Launch</p>
                    <p className="text-sm font-medium">{project.launchDate}</p>
                  </div>
                )}
                {project.websiteUrl && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Website</p>
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      data-testid="link-project-website-sidebar"
                    >
                      <Globe className="h-3 w-3" />
                      Visit
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {relatedProjects.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold">Other SEVCO Projects</h2>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedProjects.map((p) => {
                const pStatus = STATUS_COLORS[p.status] ?? STATUS_COLORS["archived"];
                return (
                  <Link key={p.id} href={`/projects/${p.slug}`}>
                    <div
                      className="border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                      data-testid={`related-project-${p.slug}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <CategoryIcon category={p.category} className="h-9 w-9 text-sm" />
                        <div>
                          <p className="text-sm font-semibold group-hover:text-primary transition-colors">{p.name}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${pStatus.badge.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                            <span className={`h-1 w-1 rounded-full ${pStatus.dot}`} />
                            {STATUS_LABELS[p.status] ?? p.status}
                          </span>
                        </div>
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
