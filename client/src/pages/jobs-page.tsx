import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHead } from "@/components/page-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, MapPin, Clock, ArrowRight, Wifi, DollarSign } from "lucide-react";
import type { Job } from "@shared/schema";

const TYPE_BADGE: Record<string, string> = {
  "full-time":  "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  "part-time":  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "contract":   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
  "internship": "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
};

const DEPT_COLORS: Record<string, string> = {
  "Engineering":     "text-blue-600 dark:text-blue-400",
  "Design":          "text-blue-600 dark:text-blue-400",
  "Operations":      "text-green-600 dark:text-green-400",
  "SEVCO Records":   "text-blue-700 dark:text-blue-400",
  "Marketing":       "text-red-700 dark:text-red-500",
  "Sales":           "text-yellow-600 dark:text-yellow-500",
};

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const deptColor = DEPT_COLORS[job.department] ?? "text-muted-foreground";
  const typeClass = TYPE_BADGE[job.type] ?? "bg-muted text-muted-foreground";

  return (
    <Link href={`/jobs/${job.slug}`}>
      <Card
        className="p-5 hover-elevate active-elevate-2 cursor-pointer overflow-visible group transition-all"
        data-testid={`card-job-${job.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${deptColor}`}>
                {job.department}
              </span>
              {job.featured && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Featured</Badge>
              )}
            </div>
            <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors truncate">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              )}
              {job.remote && (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Remote
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job.type.replace("-", " ")}
              </span>
              {salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {salary}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={`text-[11px] ${typeClass}`}>
              {job.type}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function JobsPage() {
  const { data: jobList, isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const featured = jobList?.filter((j) => j.featured) ?? [];
  const regular = jobList?.filter((j) => !j.featured) ?? [];

  const byDept: Record<string, Job[]> = {};
  for (const job of regular) {
    if (!byDept[job.department]) byDept[job.department] = [];
    byDept[job.department].push(job);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <PageHead
        slug="jobs"
        title="Careers — Join SEVCO"
        description="Explore job opportunities at SEVCO — open positions across engineering, creative, operations, and more."
        ogUrl="https://sevco.us/jobs"
      />
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-widest">
          <Briefcase className="h-3.5 w-3.5" />
          SEVCO
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Work with us</h1>
        <p className="text-muted-foreground max-w-xl">
          We're building the creative platform for the SEVCO universe. If you want to help shape something from the ground up, you're in the right place.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !jobList || jobList.length === 0 ? (
        <Card className="p-10 overflow-visible text-center">
          <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium mb-1">No open positions right now</p>
          <p className="text-sm text-muted-foreground mb-4">
            Check back soon — we're always growing.
          </p>
          <a href="https://discord.gg/sevco" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">Join our Discord</Button>
          </a>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Featured */}
          {featured.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Featured Openings
              </h2>
              <div className="flex flex-col gap-4">
                {featured.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          )}

          {/* By department */}
          {Object.entries(byDept).map(([dept, deptJobs]) => (
            <section key={dept}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {dept}
              </h2>
              <div className="space-y-3">
                {deptJobs.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          ))}

          {/* CTA */}
          <Card className="p-6 overflow-visible bg-muted/30 text-center border-dashed">
            <p className="text-sm text-muted-foreground mb-3">
              Don't see a fit? We're always open to hearing from talented people.
            </p>
            <a href="https://discord.gg/sevco" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                Connect on Discord
              </Button>
            </a>
          </Card>
        </div>
      )}
    </div>
  );
}
