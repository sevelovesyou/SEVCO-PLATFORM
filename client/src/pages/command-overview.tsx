import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
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
  BarChart2,
  Server,
  CheckCircle2,
  AlertCircle,
  ScrollText,
  ClipboardList,
  MessageCircle,
  BookMarked,
  StickyNote,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { Role, Resource, Note } from "@shared/schema";

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-primary/10 text-primary border-primary/20",
  executive: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/20",
  staff:     "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  partner:   "bg-red-700/10 text-red-800 dark:text-red-500 border-red-700/20",
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

const STOCK_COLORS: Record<string, string> = {
  available: "hsl(var(--chart-2))",
  sold_out: "hsl(var(--destructive))",
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

interface StoreStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  catalogValue: number;
  avgPrice: number;
  byStockStatus: Array<{ status: string; count: number }>;
}

interface VirtualMachine {
  id: number;
  hostname: string;
  state: string;
  ipv4?: Array<{ address: string }>;
  ip_address?: string;
  datacenter?: { city?: string; country?: string };
  uptime?: number;
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

function formatUptime(secs?: number) {
  if (!secs) return null;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
}

function VpsStatusCard() {
  const { data, isLoading, isError, error } = useQuery<VirtualMachine[] | { data: VirtualMachine[] }>({
    queryKey: ["/api/hostinger/vps"],
    retry: 1,
    staleTime: 60_000,
  });

  const vms: VirtualMachine[] = Array.isArray(data)
    ? data
    : ((data as any)?.data ?? []);

  const primaryVm = vms[0];

  const isNotConfigured = isError && error instanceof Error && error.message.includes("not configured");

  return (
    <Link href="/command/hosting">
      <Card
        className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
        data-testid="card-vps-status"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <Server className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold">VPS Status</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : isError || !primaryVm ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground" data-testid="text-vps-status-error">
              {isNotConfigured ? "Not configured" : isError ? "Unable to connect" : "No VPS found"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {primaryVm.state === "running" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-semibold capitalize ${
                    primaryVm.state === "running"
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                  data-testid="text-vps-state"
                >
                  {primaryVm.state}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-vps-hostname">
                {primaryVm.hostname}
              </p>
              {primaryVm.uptime && (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-vps-uptime">
                  Up {formatUptime(primaryVm.uptime)}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}

function StoreStatsPreview() {
  const { data: stats, isLoading } = useQuery<StoreStats>({
    queryKey: ["/api/store/stats"],
  });

  const donutData = stats?.byStockStatus.map((s) => ({
    name: s.status === "available" ? "In Stock" : "Sold Out",
    value: s.count,
    originalStatus: s.status,
  })) ?? [];

  return (
    <Link href="/command/store">
      <Card
        className="p-4 hover-elevate active-elevate-2 cursor-pointer overflow-visible group"
        data-testid="card-store-stats-preview"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-red-700/10 flex items-center justify-center shrink-0">
              <BarChart2 className="h-3.5 w-3.5 text-red-700 dark:text-red-500" />
            </div>
            <span className="text-sm font-semibold">Store Analytics</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))
            ) : (
              <>
                <div data-testid="preview-total-products">
                  <p className="text-xs text-muted-foreground">Total Products</p>
                  <p className="text-lg font-bold">{stats?.totalProducts ?? 0}</p>
                </div>
                <div data-testid="preview-in-stock">
                  <p className="text-xs text-muted-foreground">In Stock</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats?.inStock ?? 0}</p>
                </div>
                <div data-testid="preview-out-of-stock">
                  <p className="text-xs text-muted-foreground">Sold Out</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats?.outOfStock ?? 0}</p>
                </div>
                <div data-testid="preview-catalog-value">
                  <p className="text-xs text-muted-foreground">Catalog Value</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    ${(stats?.catalogValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </>
            )}
          </div>
          {!isLoading && donutData.length > 0 && (
            <div className="shrink-0">
              <PieChart width={80} height={80}>
                <Pie
                  data={donutData}
                  cx={35}
                  cy={35}
                  innerRadius={22}
                  outerRadius={36}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.originalStatus}
                      fill={STOCK_COLORS[entry.originalStatus] ?? "hsl(var(--chart-1))"}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </PieChart>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

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

function LatestChangelogCard({ entry, isLoading, onRefresh }: { entry: ChangelogEntry | null | undefined; isLoading: boolean; onRefresh?: () => void }) {
  const CATEGORY_COLORS: Record<string, string> = {
    feature:     "bg-primary/10 text-primary border-primary/20",
    fix:         "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    improvement: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    other:       "bg-muted text-muted-foreground border-border",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Latest Release
        </h2>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-muted-foreground"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="button-refresh-changelog"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>
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

function QuickLinksWidget() {
  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const quickLinks = resources?.filter((r) => r.showOnOverview).sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 8) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Links
        </h2>
        <Link href="/command/resources">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
            Manage Resources <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden overflow-visible" data-testid="card-quick-links">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : quickLinks.length === 0 ? (
          <div className="p-6 text-center">
            <BookMarked className="h-7 w-7 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">No quick links configured.</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Add resources and enable "Show on Overview" to display them here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {quickLinks.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                data-testid={`quick-link-${r.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-primary truncate">{r.title}</p>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  )}
                </div>
                {r.category !== "general" && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">{r.category}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function RecentNotesWidget({ userId }: { userId: string }) {
  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: !!userId,
  });

  const recentNotes = notes?.slice(0, 5) ?? [];

  const NOTE_COLOR_MAP: Record<string, string> = {
    default: "bg-muted-foreground",
    yellow: "bg-yellow-400",
    blue: "bg-blue-400",
    green: "bg-green-400",
    red: "bg-red-400",
    purple: "bg-blue-500",
    pink: "bg-pink-400",
    orange: "bg-red-600",
  };

  function relativeTime(dateStr: string) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Notes
        </h2>
        <Link href="/notes">
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
            View All Notes <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden overflow-visible" data-testid="card-recent-notes">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="p-6 text-center">
            <StickyNote className="h-7 w-7 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentNotes.map((note) => (
              <Link key={note.id} href="/notes">
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`recent-note-${note.id}`}>
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${NOTE_COLOR_MAP[note.color] ?? NOTE_COLOR_MAP.default}`}
                    data-testid={`note-color-dot-${note.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(note.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminOverview({ data, summary, summaryLoading, userId, onRefreshSummary }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean; userId: string; onRefreshSummary?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} onRefresh={onRefreshSummary} />

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Platform Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Revisions" value={data.stats.totalRevisions} icon={Clock} testId="stat-revisions" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Citations" value={data.stats.totalCitations} icon={LinkIcon} testId="stat-citations" />
          <StatCard label="Users" value={data.stats.totalUsers} icon={Users} testId="stat-users" color="text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StoreStatsPreview />
        <VpsStatusCard />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <RecentApplicantsCard applicants={summary?.recentApplicants} isLoading={summaryLoading} />
        <RecentSubmissionsCard submissions={summary?.recentSubmissions} isLoading={summaryLoading} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <QuickLinksWidget />
        <RecentNotesWidget userId={userId} />
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

function ExecutiveOverview({ data, summary, summaryLoading, userId, onRefreshSummary }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean; userId: string; onRefreshSummary?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} onRefresh={onRefreshSummary} />

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Business Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Total Users" value={data.stats.totalUsers} icon={Users} testId="stat-users" color="text-green-600 dark:text-green-400" />
          <StatCard label="Feed Posts" value={summary?.counts.feedPosts} icon={MessageCircle} testId="stat-feed-posts" />
        </div>
      </div>
      <div>
        <StoreStatsPreview />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <RecentApplicantsCard applicants={summary?.recentApplicants} isLoading={summaryLoading} />
        <RecentSubmissionsCard submissions={summary?.recentSubmissions} isLoading={summaryLoading} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <QuickLinksWidget />
        <RecentNotesWidget userId={userId} />
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

function StaffOverview({ data, summary, summaryLoading, onRefreshSummary }: { data: DashboardData; summary: DashboardSummary | undefined; summaryLoading: boolean; onRefreshSummary?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Wiki Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Published Articles" value={data.stats.totalArticles} icon={FileText} testId="stat-articles" color="text-primary" />
          <StatCard label="Pending Reviews" value={data.stats.pendingReviews} icon={Shield} testId="stat-pending" color="text-yellow-600 dark:text-yellow-400" />
          <StatCard label="Total Revisions" value={data.stats.totalRevisions} icon={Clock} testId="stat-revisions" />
        </div>
      </div>
      <div>
        <StoreStatsPreview />
      </div>

      <LatestChangelogCard entry={summary?.latestChangelog} isLoading={summaryLoading} onRefresh={onRefreshSummary} />

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
  { label: "Music",    desc: "SEVCO RECORDS releases",          path: "/music",    icon: Music,      color: "text-blue-700 dark:text-blue-400",       bg: "bg-blue-600/10" },
  { label: "Store",    desc: "Merchandise and products",        path: "/store",    icon: ShoppingBag, color: "text-red-700 dark:text-red-500",      bg: "bg-red-700/10" },
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

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    enabled: isStaffOrAbove,
    staleTime: 30 * 1000,
  });

  const isClientOrUser = role === "client" || role === "user";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
      {role === "admin" && <AdminOverview data={data} summary={summary} summaryLoading={summaryLoading} userId={user?.id ?? ""} onRefreshSummary={() => refetchSummary()} />}
      {role === "executive" && <ExecutiveOverview data={data} summary={summary} summaryLoading={summaryLoading} userId={user?.id ?? ""} onRefreshSummary={() => refetchSummary()} />}
      {role === "staff" && <StaffOverview data={data} summary={summary} summaryLoading={summaryLoading} onRefreshSummary={() => refetchSummary()} />}
      {isClientOrUser && <ClientOverview user={{ username: user?.username ?? "", displayName: user?.displayName }} />}
    </>
  );
}
