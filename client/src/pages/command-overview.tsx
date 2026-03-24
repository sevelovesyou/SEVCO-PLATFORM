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

function AdminOverview({ data, userId }: { data: DashboardData; userId: string }) {
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

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          My Recent Contributions
        </h2>
        <ContributionsList items={data.myContributions} isLoading={false} />
      </div>
    </div>
  );
}

function ExecutiveOverview({ data }: { data: DashboardData }) {
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
          <StatCard label="Total Revisions" value={data.stats.totalRevisions} icon={TrendingUp} testId="stat-revisions" />
        </div>
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

function StaffOverview({ data }: { data: DashboardData }) {
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
      {role === "admin" && <AdminOverview data={data} userId={user?.id ?? ""} />}
      {role === "executive" && <ExecutiveOverview data={data} />}
      {(role === "staff" || role === "partner") && <StaffOverview data={data} />}
      {isClientOrUser && <ClientOverview user={{ username: user?.username ?? "", displayName: user?.displayName }} />}
    </>
  );
}
