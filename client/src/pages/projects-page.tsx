import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Folder, Plus, Globe, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/use-permission";
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

const TYPE_COLORS: Record<string, string> = {
  Company: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Record Label": "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  Brand: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Initiative: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  Other: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS["archived"];
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colorClass = TYPE_COLORS[type] ?? TYPE_COLORS["Other"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {type}
    </span>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.slug}`}>
      <div
        data-testid={`card-project-${project.id}`}
        className="group border border-border rounded-xl bg-card hover:shadow-md transition-all duration-200 cursor-pointer p-5 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div>
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <TypeBadge type={project.type} />
          {project.websiteUrl && (
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>
    </Link>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="border border-border rounded-xl bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5 mt-1" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "in-development", label: "In Development" },
  { value: "archived", label: "Archived" },
];

export default function ProjectsPage() {
  const { role } = usePermission();
  const canManage = role && CAN_MANAGE_PROJECTS.includes(role);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: allProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return allProjects;
    return allProjects.filter((p) => p.status === statusFilter);
  }, [allProjects, statusFilter]);

  const counts = useMemo(() => ({
    all: allProjects.length,
    active: allProjects.filter((p) => p.status === "active").length,
    "in-development": allProjects.filter((p) => p.status === "in-development").length,
    archived: allProjects.filter((p) => p.status === "archived").length,
  }), [allProjects]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-6 py-14 md:py-20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Folder className="h-5 w-5 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium tracking-widest uppercase">SEVCO Ventures</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Projects</h1>
            <p className="text-white/70 mt-2 max-w-md text-sm">
              Companies, brands, and initiatives across the SEVCO portfolio.
            </p>
          </div>
          {canManage && (
            <Link href="/projects/new">
              <Button
                data-testid="button-add-project"
                className="bg-white text-green-700 hover:bg-white/90 font-semibold shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-8">
          <TabsList data-testid="tabs-status-filter" className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} data-testid={`tab-status-${f.value}`}>
                {f.label}
                {counts[f.value as keyof typeof counts] > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">
                    ({counts[f.value as keyof typeof counts]})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-base">No projects found</p>
              <p className="text-muted-foreground text-sm mt-1">
                {statusFilter !== "all"
                  ? `No ${STATUS_LABELS[statusFilter] ?? statusFilter} projects yet.`
                  : "No projects have been added yet."}
              </p>
            </div>
            {canManage && statusFilter === "all" && (
              <Link href="/projects/new">
                <Button variant="outline" size="sm" data-testid="button-add-first-project">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
