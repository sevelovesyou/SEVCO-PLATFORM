import { useState } from "react";
import { Link } from "wouter";
import { articleUrl } from "@/lib/wiki-urls";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ScrollText,
  Plus,
  BarChart2,
} from "lucide-react";
import type { Role, Changelog, ChangelogCategory, Order } from "@shared/schema";
import { insertChangelogSchema } from "@shared/schema";
import { z } from "zod";

interface StoreStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  catalogValue: number;
  avgPrice: number;
  byStockStatus: Array<{ status: string; count: number }>;
}

const STOCK_COLORS: Record<string, string> = {
  available: "hsl(var(--chart-2))",
  sold_out: "hsl(var(--destructive))",
};

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
    <Link href="/store/stats">
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

const ROLES: Role[] = ["admin", "executive", "staff", "partner", "client", "user"];

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
        <Link key={item.id} href={articleUrl({ slug: item.articleSlug })}>
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
          Store Analytics
        </h2>
        <StoreStatsPreview />
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
          Store Analytics
        </h2>
        <StoreStatsPreview />
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
          Store Analytics
        </h2>
        <StoreStatsPreview />
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

const CHANGELOG_CATEGORY_COLORS: Record<ChangelogCategory, string> = {
  feature:     "bg-primary/10 text-primary border-primary/20",
  fix:         "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  improvement: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  other:       "bg-muted text-muted-foreground border-border",
};

const changelogFormSchema = insertChangelogSchema.extend({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
});
type ChangelogFormValues = z.infer<typeof changelogFormSchema>;

function ChangelogSection() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const { data: entries, isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelog"],
  });

  const form = useForm<ChangelogFormValues>({
    resolver: zodResolver(changelogFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "improvement",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ChangelogFormValues) =>
      apiRequest("POST", "/api/changelog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelog"] });
      form.reset();
      setFormOpen(false);
      toast({ title: "Changelog entry added" });
    },
    onError: () => {
      toast({ title: "Failed to add entry", variant: "destructive" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Platform Changelog
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setFormOpen((v: boolean) => !v)}
          data-testid="button-toggle-changelog-form"
        >
          <Plus className="h-3 w-3" />
          Add Entry
        </Button>
      </div>

      {formOpen && (
        <Card className="p-4 mb-4 overflow-visible">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="flex flex-col gap-3"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What changed?"
                        className="h-8 text-sm"
                        data-testid="input-changelog-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the change..."
                        className="text-sm resize-none"
                        rows={3}
                        data-testid="input-changelog-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm" data-testid="select-changelog-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="fix">Fix</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={mutation.isPending}
                  data-testid="button-submit-changelog"
                >
                  {mutation.isPending ? "Adding..." : "Add Entry"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { form.reset(); setFormOpen(false); }}
                  data-testid="button-cancel-changelog"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 overflow-visible">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(entries ?? []).map((entry) => (
            <Card key={entry.id} className="p-4 overflow-visible" data-testid={`card-changelog-${entry.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span
                      className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${CHANGELOG_CATEGORY_COLORS[entry.category as ChangelogCategory] ?? CHANGELOG_CATEGORY_COLORS.other}`}
                      data-testid={`badge-changelog-category-${entry.id}`}
                    >
                      {entry.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const CLIENT_LINKS = [
  { label: "Wiki", desc: "Browse articles and resources", path: "/wiki", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
  { label: "Music", desc: "SEVCO RECORDS releases", path: "/music", icon: Music, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-600/10" },
  { label: "Store", desc: "Merchandise and products", path: "/store", icon: ShoppingBag, color: "text-red-700 dark:text-red-500", bg: "bg-red-700/10" },
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

function OrdersSection() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Store Orders
        </h2>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-3 overflow-visible">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card className="p-4 overflow-visible">
          <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-orders">No orders yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="p-3 overflow-visible"
              data-testid={`card-order-${order.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" data-testid={`text-order-id-${order.id}`}>
                    Order #{order.id}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-order-date-${order.id}`}>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                      order.status === "paid"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                    }`}
                    data-testid={`text-order-status-${order.id}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-bold" data-testid={`text-order-total-${order.id}`}>
                    ${((order.total ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
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
          {(role === "admin" || role === "executive") && (
            <OrdersSection />
          )}
          {(role === "admin" || role === "executive" || role === "staff") && (
            <ChangelogSection />
          )}
        </>
      ) : null}
    </div>
  );
}
