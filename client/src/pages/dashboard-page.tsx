import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ROLES: Role[] = ["admin", "executive", "staff", "partner", "client", "user"];

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

function UserRoleSelect({
  userId,
  currentRole,
  currentUserId,
}: {
  userId: string;
  currentRole: Role;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const isSelf = userId === currentUserId;

  const mutation = useMutation({
    mutationFn: (newRole: Role) =>
      apiRequest("PATCH", `/api/users/${userId}/role`, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  if (isSelf) {
    return (
      <Badge className={`text-xs capitalize border ${ROLE_COLORS[currentRole]}`}>
        {currentRole} (you)
      </Badge>
    );
  }

  return (
    <Select
      value={currentRole}
      onValueChange={(val) => mutation.mutate(val as Role)}
      disabled={mutation.isPending}
    >
      <SelectTrigger
        className="h-7 w-32 text-xs"
        data-testid={`select-role-${userId}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} className="text-xs capitalize">
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AdminView({ data, userId }: { data: DashboardData; userId: string }) {
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

      {data.users && data.users.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            User Management
          </h2>
          <Card className="overflow-hidden overflow-visible">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Username</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Display Name</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-user-${u.id}`}>
                      <td className="p-3 font-medium text-xs">{u.username}</td>
                      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{u.displayName || "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{u.email || "—"}</td>
                      <td className="p-3">
                        <UserRoleSelect userId={u.id} currentRole={u.role} currentUserId={userId} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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

function ExecutiveView({ data }: { data: DashboardData }) {
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

function StaffView({ data }: { data: DashboardData }) {
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
  { label: "Wiki", desc: "Browse articles and resources", path: "/wiki", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
  { label: "Music", desc: "SEVCO RECORDS releases", path: "/music", icon: Music, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  { label: "Store", desc: "Merchandise and products", path: "/store", icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  { label: "Projects", desc: "SEVCO Ventures", path: "/projects", icon: Folder, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
];

function ClientView({ user }: { user: { username: string; displayName?: string | null } }) {
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { role } = usePermission();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const isClientOrUser = role === "client" || role === "user";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          {role && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize border ${ROLE_COLORS[role]}`}>
              {role}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {role === "admin" && "Platform-wide management and analytics"}
          {role === "executive" && "Business overview and key metrics"}
          {(role === "staff" || role === "partner") && "Your activity and wiki overview"}
          {isClientOrUser && "Platform overview and quick access"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 overflow-visible">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-3 overflow-visible">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          {role === "admin" && <AdminView data={data} userId={user?.id ?? ""} />}
          {role === "executive" && <ExecutiveView data={data} />}
          {(role === "staff" || role === "partner") && <StaffView data={data} />}
          {isClientOrUser && <ClientView user={{ username: user?.username ?? "", displayName: user?.displayName }} />}
        </>
      ) : null}
    </div>
  );
}
