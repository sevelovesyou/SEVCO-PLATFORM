import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import { Link } from "wouter";
import { Folder, Plus, Globe, AlertCircle, GitBranch, Users, Zap, ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/use-permission";
import type { Project } from "@shared/schema";

const CAN_MANAGE_PROJECTS = ["admin", "executive", "staff"];

const PROJECT_PILLS = [
  { icon: GitBranch, label: "Open Source" },
  { icon: Users, label: "Community Driven" },
  { icon: Zap, label: "Live Updates" },
  { icon: Folder, label: "Contribute" },
];

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

function resolveLucideIcon(name: string | null | undefined): React.ElementType | null {
  if (!name) return null;
  const icons = LucideIcons as Record<string, unknown>;
  const comp = icons[name] ?? icons[name.charAt(0).toUpperCase() + name.slice(1)];
  if (typeof comp === "function" || (typeof comp === "object" && comp !== null)) {
    return comp as React.ComponentType<{ className?: string }>;
  }
  return null;
}

function ProjectCard({ project }: { project: Project }) {
  const MenuIcon = resolveLucideIcon(project.menuIcon) ?? Folder;
  const href = project.linkUrl || `/projects/${project.slug}`;
  const isExternal = href.startsWith("http");
  const cardContent = (
    <div
      data-testid={`card-project-${project.id}`}
      className="group border border-white/8 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 hover:shadow-md transition-all duration-200 cursor-pointer p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 overflow-hidden">
          {project.appIcon ? (
            <img
              src={project.appIcon}
              alt={project.name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <MenuIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground text-sm mt-1 line-clamp-3">
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
  );
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }
  return <Link href={href}>{cardContent}</Link>;
}

function ProjectCardSkeleton() {
  return (
    <div className="border border-white/8 rounded-xl bg-white/[0.03] p-5 flex flex-col gap-3">
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
    <div className="min-h-screen bg-background" data-page="projects">
      <PageHead
        title="Projects — SEVCO Ventures Portfolio"
        description="Explore SEVCO Ventures — active companies, platforms, apps, and initiatives built under the SEVCO umbrella."
        ogUrl="https://sevco.us/projects"
      />
      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden bg-[#0a0a12] px-6 py-20 md:py-28"
        data-testid="section-projects-hero"
      >
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -left-28 w-[500px] h-[500px] rounded-full bg-green-600/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -bottom-20 -right-28 w-[400px] h-[400px] rounded-full bg-emerald-500/15 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] rounded-full bg-teal-600/8 blur-[80px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider mb-5">
              <Folder className="h-3.5 w-3.5" />
              SEVCO Ventures
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                SEVCO Projects
              </span>
            </h1>
            <p className="text-white/60 mt-3 max-w-md text-sm">
              Companies, brands, and initiatives across the SEVCO portfolio.
            </p>
          </div>
          {canManage && (
            <Link href="/projects/new">
              <Button
                data-testid="button-add-project"
                className="bg-green-500 hover:bg-green-400 text-white font-semibold shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── FEATURE PILLS ── */}
      <section
        className="bg-[#0f0f1a] border-y border-white/5 px-4 py-5"
        data-testid="section-projects-pills"
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {PROJECT_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-2.5"
              data-testid={`project-pill-${pill.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/15">
                <pill.icon className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-xs font-semibold text-white/80">{pill.label}</p>
            </div>
          ))}
        </div>
      </section>

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

      {/* ── BOTTOM CONTRIBUTE CTA ── */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-green-900/30 via-background to-emerald-900/20 border-t border-white/5 px-6 py-20 md:py-24 text-center mt-8"
        data-testid="section-projects-cta"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/3 w-[400px] h-[300px] rounded-full bg-green-600/10 blur-[100px] animate-[pulse_9s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px] animate-[pulse_11s_ease-in-out_infinite_2s]" />
        </div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Have a project idea?
            </span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            SEVCO Ventures is always looking for bold ideas and passionate contributors. Pitch a project or reach out to learn how to get involved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-500 text-white font-semibold gap-2"
                data-testid="button-pitch-project"
              >
                Pitch a Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="ghost"
                className="text-foreground/70 hover:text-foreground border border-border font-semibold gap-2"
                data-testid="button-learn-contribute"
              >
                Learn to Contribute
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
