import { useState, useMemo } from "react";
import { StaggerGrid, StaggerItem } from "@/components/stagger-grid";
import { useQuery } from "@tanstack/react-query";
import { PageHead } from "@/components/page-head";
import { Link } from "wouter";
import { Folder, Plus, Globe, AlertCircle, ArrowRight } from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import type { Project } from "@shared/schema";
import { SparkButton } from "@/components/spark-button";
import { useAuth } from "@/hooks/use-auth";

type ProjectWithSpark = Project & { sparkCount?: number; sparkedByCurrentUser?: boolean };

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
  Company: "bg-blue-600/10 text-blue-700 dark:text-blue-400",
  "Record Label": "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  Brand: "bg-red-700/10 text-red-800 dark:text-red-500",
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
  return getIcon(name ?? undefined) as React.ElementType | null;
}

function ProjectCard({ project }: { project: ProjectWithSpark }) {
  const { user } = useAuth();
  const MenuIcon = resolveLucideIcon(project.menuIcon) ?? Folder;
  const href = project.linkUrl || `/projects/${project.slug}`;
  const isExternal = href.startsWith("http");
  const heroSrc = project.heroImageUrl || project.logoUrl || project.appIcon || null;
  const cardContent = (
    <div
      data-testid={`card-project-${project.id}`}
      className="group border border-white/8 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {heroSrc ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-xl bg-white/[0.04]">
          <img
            src={resolveImageUrl(heroSrc)}
            alt={project.name}
            className="absolute inset-0 h-full w-full object-cover"
            data-testid={`img-project-hero-${project.id}`}
          />
        </div>
      ) : (
        <div
          className="relative w-full aspect-[16/9] overflow-hidden rounded-t-xl bg-white/[0.04] flex items-center justify-center"
          data-testid={`img-project-hero-${project.id}`}
        >
          <MenuIcon className="h-12 w-12 text-muted-foreground/60" />
        </div>
      )}
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="h-10 w-10 flex items-center justify-center shrink-0 overflow-hidden">
            {project.appIcon ? (
              <img
                src={resolveImageUrl(project.appIcon)}
                alt={project.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <MenuIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg md:text-xl group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-muted-foreground text-sm mt-1 line-clamp-4">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-1 mt-auto">
          <TypeBadge type={project.type} />
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <SparkButton
              entityType="project"
              entityId={project.id}
              sparkCount={project.sparkCount ?? 0}
              sparkedByCurrentUser={project.sparkedByCurrentUser ?? false}
              isOwner={!!user?.id && user.id === project.leadUserId}
            />
            {project.websiteUrl && (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {cardContent}
      </a>
    );
  }
  return <Link href={href} className="block h-full">{cardContent}</Link>;
}

function ProjectCardSkeleton() {
  return (
    <div className="border border-white/8 rounded-xl bg-white/[0.03] overflow-hidden flex flex-col">
      <Skeleton className="w-full aspect-[16/9] rounded-none" />
      <div className="p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mt-1" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
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

const PROJECTS_FAQS: { question: string; answer: string }[] = [
  {
    question: "What are SEVCO Projects?",
    answer:
      "SEVCO Projects is the portfolio of companies, brands, platforms, and initiatives built under the SEVCO umbrella. Each project is incubated and operated in-house — examples include SPHERE, SEVCO Architecture, Freeball, and the SEVCO Minecraft community.",
  },
  {
    question: "What is SPHERE?",
    answer:
      "SPHERE is one of SEVCO's flagship internal projects — a platform built and operated under the SEVCO Projects umbrella. You can find its current status and details on its project page within the SEVCO Projects portfolio.",
  },
  {
    question: "What is Freeball?",
    answer:
      "Freeball is a SEVCO-built game project, listed as one of the active initiatives in the SEVCO Projects portfolio. It is developed and maintained in-house by the SEVCO team alongside the platform's other products.",
  },
  {
    question: "Can I contribute to SEVCO Projects?",
    answer:
      "Yes. SEVCO Projects is community-driven and welcomes contributors. Reach out via sevco.us/contact to learn how to get involved with a specific project — contributions span engineering, design, content, and community work.",
  },
  {
    question: "How do I pitch a new project to SEVCO?",
    answer:
      "Use the contact form at sevco.us/contact and describe the idea, the problem it solves, and what stage it is at. SEVCO reviews pitches for projects that align with the company's mission of building inspiring creative technology.",
  },
  {
    question: "What does each project status mean?",
    answer:
      "Active projects are live and in production. In Development projects are being actively built and not yet publicly launched. Archived projects are no longer under active development but are kept in the portfolio for reference and history.",
  },
];

const PROJECTS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PROJECTS_FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

export default function ProjectsPage() {
  const { role } = usePermission();
  const canManage = role && CAN_MANAGE_PROJECTS.includes(role);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: allProjects = [], isLoading } = useQuery<ProjectWithSpark[]>({
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
        slug="projects"
        title="Projects — SEVCO Projects Portfolio"
        description="Explore SEVCO Projects — active companies, platforms, apps, and initiatives built under the SEVCO umbrella."
        ogUrl="https://sevco.us/projects"
        jsonLd={PROJECTS_JSON_LD}
      />
      <div className="w-full px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            data-testid="heading-projects"
          >
            Projects
          </h1>
          <Tabs
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="flex-1 min-w-0"
          >
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
          {canManage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/projects/new" className="ml-auto">
                  <Button
                    data-testid="button-add-project"
                    aria-label="Add Project"
                    size="icon"
                    className="h-9 w-9 bg-green-500 hover:bg-green-400 text-white shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Add Project</TooltipContent>
            </Tooltip>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <StaggerItem key={project.id} className="h-full">
                <ProjectCard project={project} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </div>

      {/* ── Frequently Asked Questions (GEO) ── */}
      <section
        className="max-w-5xl mx-auto px-6 pb-8"
        data-testid="section-projects-faq"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
          Frequently Asked Questions
        </h2>
        <dl className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
          {PROJECTS_FAQS.map((faq, i) => (
            <div
              key={faq.question}
              className="p-6 space-y-2"
              data-testid={`faq-item-${i}`}
            >
              <dt
                className="text-base md:text-lg font-bold text-foreground"
                data-testid={`faq-question-${i}`}
              >
                {faq.question}
              </dt>
              <dd
                className="text-sm md:text-base text-muted-foreground leading-relaxed"
                data-testid={`faq-answer-${i}`}
              >
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── BOTTOM CONTRIBUTE CTA ── */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-green-900/30 via-background to-emerald-900/20 border-t border-white/5 px-6 py-20 md:py-24 text-center mt-8"
        data-testid="section-projects-cta"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/3 w-[400px] h-[300px] rounded-full bg-green-600/10 blur-[100px] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px] motion-safe:animate-[pulse_11s_ease-in-out_infinite_2s]" />
        </div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Have a project idea?
            </span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            SEVCO Projects is always looking for bold ideas and passionate contributors. Pitch a project or reach out to learn how to get involved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/contact">
              <Button
                size="lg"
                variant="destructive"
                className="font-semibold gap-2"
                data-testid="button-pitch-project"
              >
                Pitch a Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 font-semibold gap-2"
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
