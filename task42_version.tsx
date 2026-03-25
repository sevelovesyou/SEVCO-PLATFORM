import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FileText,
  Clock,
  Shield,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  BookOpen,
  Music,
  ShoppingBag,
  Folder,
  ArrowRight,
  LayoutDashboard,
  Link as LinkIcon,
  ScrollText,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import type { Role } from "@shared/schema";

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  client:    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20",
  user:      "bg-muted text-muted-foreground border-border",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "text-green-600 dark:text-green-400",
  pending:  "text-yellow-600 dark:text-yellow-400",
  rejected: "text-red-600 dark:text-red-400",
};

const APP_STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  reviewing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  accepted:  "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  rejected:  "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  accepted: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

interface DashboardContribution {
  id: number;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  editSummary: string | null;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalArticles: number;
  totalRevisions: number;
  pendingReviews: number;
  totalCitations: number;
  totalUsers?: number;
}

interface DashboardData {
  stats: DashboardStats;
  usersByRole?: Record<string, number>;
  users?: Array<{ id: string; username: string; displayName: string | null; email: string | null; role: Role }>;
  myContributions?: DashboardContribution[];
}

interface ChangelogEntry {
  id: number;
  title: string;
  version: string | null;
  category: string;
  description: string;
  createdAt: string;
}

interface ApplicantSummary {
  id: number;
  name: string;
  email: string;
  jobId: number;
  jobTitle: string;
  status: string;
  createdAt: string;
}

interface SubmissionSummary {
  id: number;
  artistName: string;
  trackTitle: string;
  submitterName: string;
  type: string;
  status: string;
  createdAt: string;
}

interface DashboardSummary {
  latestChangelog: ChangelogEntry | null;
  recentApplicants: ApplicantSummary[];
  recentSubmissions: SubmissionSummary[];
  counts: {
    feedPosts: number;
    totalUsers: number;
    usersByRole: Record<string, number>;
  };
}

const ROLES: Role[] = ["admin", "executive", "staff", "partner", "client", "user"];

function StatCard({
  label,
  value,
  icon: Icon,
  testId,
  color,
}: {
  label: string;
  value: number | undefined;
  icon: typeof FileText;
  testId?: string;
  color?: string;
}) {
  return (
    <Card className="p-4 overflow-visible">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="text-2xl font-bold" data-testid={testId}>{value}</p>
      )}
    </Card>
  );
}

function ContributionsList({ items, isLoading }: { items?: DashboardContribution[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-3 overflow-visible">
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className="p-4 overflow-visible text-center">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">No contributions yet.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link key={item.id} href={`/wiki/${item.articleSlug}`}>
          <Card
            className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible"
            data-testid={`card-contribution-${item.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.articleTitle}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs capitalize ${STATUS_COLORS[item.status] ?? "text-muted-foreground"}`}>
                    {item.status === "approved" && <CheckCircle className="h-3 w-3 inline mr-0.5" />}
                    {item.status === "rejected" && <XCircle className="h-3 w-3 inline mr-0.5" />}
                    {item.status}
                  </span>
                  {item.editSummary && (
                    <span className="text-xs text-muted-foreground truncate">· {item.editSummary}</span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function LatestChangelogCard({ entry, isLoading }: { entry: ChangelogEntry | null | undefined; isLoading: boolean }) {
  const CATEGORY_COLORS: Record<string, string> = {
    feature:     "bg-primary/10 text-primary border-primary/20",
    fix:         "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    other:       "bg-muted text-muted-foreground border-border",
  };

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Latest Release
      </h2>
      <Link href="/command/changelog">
        <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group" data-testid="card-latest-changelog">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : !entry ? (
            <p className="text-sm text-muted-foreground">No changelog entries yet.</p>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold">{entry.title}</p>
                  {entry.version && (
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{entry.version}</span>
                  )}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.other}`}>
                    {entry.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{entry.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
            </div>
          )}
        </Card>
      </Link>
    </div>
  );
}

function RecentApplicantsCard({ applicants, isLoading }: { applicants: ApplicantSummary[] | undefined; isLoading: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Applicants
        </h2>
        <Link href="/command/jobs">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden overflow-visible" data-testid="card-recent-applicants">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : !applicants || applicants.length === 0 ? (
          <div className="p-6 text-center">
            <ClipboardList className="h-7 w-7 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">No applications yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {applicants.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`overview-applicant-${a.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.jobTitle} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize shrink-0 ${APP_STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RecentSubmissionsCard({ submissions, isLoading }: { submissions: SubmissionSummary[] | undefined; isLoading: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Music Submissions
        </h2>
        <Link href="/command/music">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden overflow-visible" data-testid="card-recent-submissions">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : !submissions || submissions.length === 0 ? (
          <div className="p-6 text-center">
            <Music className="h-7 w-7 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">No submissions yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`overview-submission-${s.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.artistName} — {s.trackTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.submitterName} · {s.type === "playlist" ? "Playlist Pitch" : "A&R"} · {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize shrink-0 ${SUBMISSION_STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminOverview({ data, summary, summaryLoading, userId }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean; userId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Platform Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Revisions" value={data.stats.totalRevisions} icon={Clock} testId="stat-revisions" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Citations" value={data.stats.totalCitations} icon={LinkIcon} testId="stat-citations" />
          <StatCard label="Users" value={data.stats.totalUsers} icon={Users} testId="stat-users" color="text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Feed posts + user by role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 overflow-visible" data-testid="card-feed-post-count">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Feed Posts</span>
          </div>
          {summaryLoading ? <Skeleton className="h-7 w-12" /> : (
            <p className="text-2xl font-bold">{summary?.counts.feedPosts ?? 0}</p>
          )}
        </Card>
        {["admin", "executive", "staff"].map((r) => (
          <Card key={r} className="p-4 overflow-visible" data-testid={`card-role-count-${r}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize">{r}s</span>
            </div>
            {summaryLoading ? <Skeleton className="h-7 w-8" /> : (
              <p className="text-2xl font-bold">{summary?.counts.usersByRole[r] ?? 0}</p>
            )}
          </Card>
        ))}
      </div>

      {data.usersByRole && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Users by Role
          </h2>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <div
                key={r}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${ROLE_COLORS[r]}`}
                data-testid={`role-count-${r}`}
              >
                <span className="capitalize">{r}</span>
                <span className="font-bold">{data.usersByRole![r] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} />

      <div className="grid md:grid-cols-2 gap-6">
        <RecentApplicantsCard applicants={summary?.recentApplicants} isLoading={summaryLoading} />
        <RecentSubmissionsCard submissions={summary?.recentSubmissions} isLoading={summaryLoading} />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My Recent Contributions
        </h2>
        <ContributionsList items={data.myContributions} isLoading={false} />
      </div>
    </div>
  );
}

function ExecutiveOverview({ data, summary, summaryLoading }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Business Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Total Users" value={data.stats.totalUsers} icon={Users} testId="stat-users" color="text-green-600 dark:text-green-400" />
          <StatCard label="Feed Posts" value={summary?.counts.feedPosts} icon={MessageCircle} testId="stat-feed-posts" />
        </div>
      </div>

      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} />

      <div className="grid md:grid-cols-2 gap-6">
        <RecentApplicantsCard applicants={summary?.recentApplicants} isLoading={summaryLoading} />
        <RecentSubmissionsCard submissions={summary?.recentSubmissions} isLoading={summaryLoading} />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My Recent Contributions
        </h2>
        <ContributionsList items={data.myContributions} isLoading={false} />
      </div>
    </div>
  );
}

function StaffOverview({ data, summary, summaryLoading }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Wiki Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Published Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Total Revisions" value={data.stats.totalRevisions} icon={Clock} testId="stat-revisions" />
        </div>
      </div>

      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} />

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My Contributions
        </h2>
        <ContributionsList items={data.myContributions} isLoading={false} />
      </div>
    </div>
  );
}

const CLIENT_LINKS = [
  { label: "Wiki",     desc: "Browse articles and resources",  path: "/wiki",     icon: BookOpen,   color: "text-primary",                               bg: "bg-primary/10" },
  { label: "Music",    desc: "SEVCO RECORDS releases",          path: "/music",    icon: Music,      color: "text-violet-600 dark:text-violet-400",       bg: "bg-violet-500/10" },
  { label: "Store",    desc: "Merchandise and products",        path: "/store",    icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400",      bg: "bg-orange-500/10" },
  { label: "Projects", desc: "SEVCO Ventures",                  path: "/projects", icon: Folder,     color: "text-green-600 dark:text-green-400",         bg: "bg-green-500/10" },
];

function ClientOverview({ user }: { user: { username: string; displayName?: string | null } }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 overflow-visible text-center">
        <LayoutDashboard className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
        <h2 className="text-lg font-semibold mb-1">
          Welcome, {user.displayName || user.username}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Explore the SEVCO Platform using the links below or the navigation above.
        </p>
      </Card>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick Access
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CLIENT_LINKS.map((item) => (
            <Link key={item.path} href={item.path}>
              <Card className="p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible group" data-testid={`card-link-${item.label.toLowerCase()}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-md ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CommandOverview() {
  const { user } = useAuth();
  const { role } = usePermission();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const isStaffOrAbove = role === "admin" || role === "executive" || role === "staff";

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    enabled: isStaffOrAbove,
  });

  const isClientOrUser = role === "client" || role === "user";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {role === "admin" && <AdminOverview data={data} summary={summary} summaryLoading={summaryLoading} userId={user?.id ?? ""} />}
      {role === "executive" && <ExecutiveOverview data={data} summary={summary} summaryLoading={summaryLoading} />}
      {role === "staff" && <StaffOverview data={data} summary={summary} summaryLoading={summaryLoading} />}
      {isClientOrUser && <ClientOverview user={{ username: user?.username ?? "", displayName: user?.displayName }} />}
    </>
  );
}
