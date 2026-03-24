import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Globe, User, BookOpen, CircleX, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/use-permission";
import { queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

const CAN_MANAGE_PROJECTS = ["admin", "executive", "staff"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  "in-development": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  "in-development": "In Development",
  archived: "Archived",
};

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

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-5 w-28" />
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

  const statusColorClass = STATUS_COLORS[project.status] ?? STATUS_COLORS["archived"];
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
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

        <div className="flex items-start gap-4 mb-6">
          <div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1
              className="text-3xl font-black tracking-tight"
              data-testid="text-project-name"
            >
              {project.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColorClass}`}>
                {statusLabel}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {project.type}
              </span>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="mb-8">
            <p
              className="text-muted-foreground leading-relaxed"
              data-testid="text-project-description"
            >
              {project.description}
            </p>
          </div>
        )}

        <div className="border border-border rounded-xl divide-y divide-border">
          {project.teamLead && (
            <div className="flex items-center gap-3 px-5 py-4">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-28 shrink-0">Team Lead</span>
              <span className="text-sm font-medium" data-testid="text-team-lead">{project.teamLead}</span>
            </div>
          )}
          {project.websiteUrl && (
            <div className="flex items-center gap-3 px-5 py-4">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-28 shrink-0">Website</span>
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline truncate"
                data-testid="link-project-website"
              >
                {project.websiteUrl}
              </a>
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-4">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground w-28 shrink-0">Type</span>
            <span className="text-sm font-medium">{project.type}</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="h-4 w-4 shrink-0" />
            <span className="text-sm text-muted-foreground w-28 shrink-0">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColorClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {project.relatedWikiSlugs && project.relatedWikiSlugs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
                    <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
