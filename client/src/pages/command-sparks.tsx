import { PageHead } from "@/components/page-head";
import { useState, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Zap,
  Users,
  Package,
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface SparkStats {
  totalIssued: number;
  activeUsersWithSparks: number;
}

interface SparkTransaction {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  type: "purchase" | "free_allocation" | "admin_credit" | "admin_debit" | "usage" | "refund";
  description: string;
  amount: number;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface TransactionPage {
  transactions: SparkTransaction[];
  total: number;
}

interface SparkPack {
  id: number;
  name: string;
  sparks: number;
  price: number;
  sortOrder: number;
  active: boolean;
  stripePriceId: string | null;
  stripeRecurringPriceId: string | null;
}

interface UserSearchResult {
  id: number;
  username: string;
  displayName: string | null;
}

const TRANSACTION_TYPE_STYLES: Record<string, string> = {
  purchase: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  free_allocation: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  admin_credit: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  admin_debit: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  usage: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  refund: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  free_allocation: "Free",
  admin_credit: "Admin Credit",
  admin_debit: "Admin Debit",
  usage: "Usage",
  refund: "Refund",
};

const ALL_TYPES = ["purchase", "free_allocation", "admin_credit", "admin_debit", "usage", "refund"];

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number) {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}${amount.toLocaleString()}`;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function downloadCsv(rows: SparkTransaction[], filename: string) {
  const headers = ["ID", "Timestamp", "User", "Type", "Description", "Amount"];
  const lines = rows.map((r) =>
    [r.id, r.createdAt, r.username, r.type, `"${r.description.replace(/"/g, '""')}"`, r.amount].join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

async function fetchTransactions(params: Record<string, string | number | undefined>): Promise<TransactionPage> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const res = await fetch(`/api/sparks/admin/transactions?${qs.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <p className="text-xl font-bold leading-tight" data-testid={`text-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${TRANSACTION_TYPE_STYLES[type] ?? ""}`}>
      {TRANSACTION_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

function TransactionTable({
  transactions,
  showMeta = false,
}: {
  transactions: SparkTransaction[];
  showMeta?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!transactions.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-36">Timestamp</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="max-w-xs">Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showMeta && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <Fragment key={tx.id}>
            <TableRow data-testid={`row-transaction-${tx.id}`}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(tx.createdAt)}
              </TableCell>
              <TableCell className="text-sm font-medium">
                @{tx.username}
                {tx.displayName && (
                  <span className="text-muted-foreground font-normal ml-1 text-xs">({tx.displayName})</span>
                )}
              </TableCell>
              <TableCell>
                <TypeBadge type={tx.type} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {tx.description}
              </TableCell>
              <TableCell
                className={`text-right text-sm font-mono font-semibold ${
                  tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                ⚡ {formatAmount(tx.amount)}
              </TableCell>
              {showMeta && tx.metadata && (
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                    data-testid={`button-expand-meta-${tx.id}`}
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
            {showMeta && expandedId === tx.id && tx.metadata && (
              <TableRow>
                <TableCell colSpan={6} className="bg-muted/40 text-xs font-mono py-2 px-4">
                  <pre>{JSON.stringify(tx.metadata, null, 2)}</pre>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

function OverviewTab() {
  const { data: stats, isLoading: statsLoading } = useQuery<SparkStats>({
    queryKey: ["/api/sparks/admin/stats"],
    refetchInterval: 30_000,
  });

  const { data: packs, isLoading: packsLoading } = useQuery<SparkPack[]>({
    queryKey: ["/api/sparks/admin/packs"],
  });

  const { data: recentData, isLoading: txLoading } = useQuery<TransactionPage>({
    queryKey: ["/api/sparks/admin/transactions", "overview"],
    queryFn: () => fetchTransactions({ limit: 20 }),
    refetchInterval: 30_000,
  });

  const activePacks = packs?.filter((p) => p.active).length ?? 0;
  const transactions = recentData?.transactions ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Sparks Issued"
          value={(stats?.totalIssued ?? 0).toLocaleString()}
          icon={Zap}
          loading={statsLoading}
        />
        <StatCard
          label="Active Users With Sparks"
          value={(stats?.activeUsersWithSparks ?? 0).toLocaleString()}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          label="Active Packs"
          value={packsLoading ? "—" : activePacks}
          icon={Package}
          loading={packsLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Recent Transactions
            <span className="text-xs font-normal text-muted-foreground ml-auto">Auto-refreshes every 30s</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TransactionTable transactions={transactions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const adjustSchema = z.object({
  amount: z.number().int().refine((n) => n !== 0, { message: "Amount cannot be 0" }),
  description: z.string().min(1, "Description is required"),
});

type AdjustForm = z.infer<typeof adjustSchema>;

function SparkControlsTab() {
  const { toast } = useToast();
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { amount: 0, description: "" },
  });

  const { data: allUsers } = useQuery<UserSearchResult[]>({
    queryKey: ["/api/users"],
  });

  const filteredUsers = allUsers
    ? allUsers
        .filter((u) => {
          const q = userQuery.toLowerCase();
          return u.username.toLowerCase().includes(q) || (u.displayName?.toLowerCase().includes(q) ?? false);
        })
        .slice(0, 10)
    : [];

  const { data: userBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/sparks/admin/balance", selectedUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/sparks/admin/balance/${selectedUser!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedUser,
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: { userId: number; amount: number; description: string }) => {
      const res = await apiRequest("POST", "/api/sparks/admin/adjust", data);
      return res.json();
    },
    onSuccess: (data: { newBalance?: number }) => {
      const amount = form.getValues("amount");
      const username = selectedUser?.username ?? "user";
      const verb = amount >= 0 ? "credited to" : "debited from";
      toast({
        title: `⚡ ${formatAmount(amount)} ${verb} @${username}`,
        description: data?.newBalance != null ? `New balance: ⚡ ${data.newBalance.toLocaleString()}` : undefined,
      });
      form.reset({ amount: 0, description: "" });
      setSelectedUser(null);
      setUserQuery("");
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/admin/stats"] });
    },
    onError: () => {
      toast({ title: "Failed to adjust Sparks", variant: "destructive" });
    },
  });

  function handleSelectUser(u: UserSearchResult) {
    setSelectedUser(u);
    setUserQuery(u.displayName ? `${u.displayName} (@${u.username})` : `@${u.username}`);
    setDropdownOpen(false);
  }

  function onSubmit(data: AdjustForm) {
    if (!selectedUser) {
      toast({ title: "Please select a user first", variant: "destructive" });
      return;
    }
    adjustMutation.mutate({ userId: selectedUser.id, ...data });
  }

  function quickFill(delta: number) {
    const current = form.getValues("amount");
    form.setValue("amount", current + delta, { shouldValidate: true });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Manual Spark Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder="Search by username or display name..."
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  setSelectedUser(null);
                  setDropdownOpen(true);
                }}
                onFocus={() => {
                  if (userQuery) setDropdownOpen(true);
                }}
                className="pl-9"
                data-testid="input-user-search"
              />
              {dropdownOpen && filteredUsers.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden"
                >
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      onClick={() => handleSelectUser(u)}
                      data-testid={`button-select-user-${u.id}`}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[9px]">
                          {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.displayName ?? u.username}</span>
                      <span className="text-muted-foreground">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30" data-testid="card-selected-user">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs">
                    {(selectedUser.displayName || selectedUser.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none">{selectedUser.displayName ?? selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@{selectedUser.username}</p>
                </div>
                {userBalance != null && (
                  <div className="text-sm font-mono font-semibold text-muted-foreground">
                    ⚡ {userBalance.balance.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (positive = credit, negative = debit)</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-spark-amount"
                        />
                      </FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {[100, 500, 1000].map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => quickFill(v)}
                            data-testid={`button-quick-credit-${v}`}
                          >
                            +{v}
                          </Button>
                        ))}
                        {[-100, -500].map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => quickFill(v)}
                            data-testid={`button-quick-debit-${Math.abs(v)}`}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason / Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="e.g. Community event reward"
                        rows={2}
                        data-testid="textarea-spark-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={adjustMutation.isPending || !selectedUser}
                data-testid="button-submit-adjustment"
              >
                <Zap className="h-4 w-4 mr-2" />
                {adjustMutation.isPending ? "Submitting…" : "Apply Adjustment"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionHistoryTab() {
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [usernameInput, setUsernameInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedUsername = useDebounce(usernameInput, 300);

  const { data: allUsers } = useQuery<UserSearchResult[]>({
    queryKey: ["/api/users"],
  });

  const resolvedUserId = allUsers?.find(
    (u) => u.username.toLowerCase() === debouncedUsername.toLowerCase()
  )?.id;

  const filters = {
    ...(resolvedUserId != null ? { userId: resolvedUserId } : debouncedUsername ? { username: debouncedUsername } : {}),
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
    page,
    limit: PAGE_SIZE,
  };

  const { data: txData, isLoading } = useQuery<TransactionPage>({
    queryKey: ["/api/sparks/admin/transactions", "history", filters],
    queryFn: () => fetchTransactions(filters as Record<string, string | number | undefined>),
    placeholderData: (prev) => prev,
  });

  const transactions = txData?.transactions ?? [];
  const total = txData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleExportCsv() {
    if (!transactions.length) return;
    downloadCsv(transactions, `sparks-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-muted-foreground mb-1 block">Filter by username</label>
          <Input
            placeholder="Username..."
            value={usernameInput}
            onChange={(e) => { setUsernameInput(e.target.value); setPage(1); }}
            data-testid="input-filter-username"
          />
        </div>

        <div className="w-44">
          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger data-testid="select-filter-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36"
            data-testid="input-filter-date-from"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36"
            data-testid="input-filter-date-to"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!transactions.length}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TransactionTable transactions={transactions} showMeta />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
            : "No results"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const packSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sparksAmount: z.number().int().min(1, "Must be at least 1 Spark"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  sortOrder: z.number().int().min(0),
});

type PackForm = z.infer<typeof packSchema>;

function CopyableBadge({ value }: { value: string }) {
  const { toast } = useToast();
  function handleCopy() {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied to clipboard" });
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted rounded px-1.5 py-0.5 hover:bg-muted/70 transition-colors"
      data-testid={`button-copy-${value.slice(0, 12)}`}
    >
      <span className="max-w-[120px] truncate">{value}</span>
      <Copy className="h-2.5 w-2.5 shrink-0 opacity-50" />
    </button>
  );
}

function PackCatalogTab() {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<SparkPack | null>(null);
  const [deleteDialogPack, setDeleteDialogPack] = useState<SparkPack | null>(null);

  const { data: packs, isLoading } = useQuery<SparkPack[]>({
    queryKey: ["/api/sparks/admin/packs"],
  });

  const form = useForm<PackForm>({
    resolver: zodResolver(packSchema),
    defaultValues: { name: "", sparksAmount: 100, price: 0.99, sortOrder: 0 },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PackForm) => {
      const res = await apiRequest("POST", "/api/sparks/admin/packs", {
        name: data.name,
        sparks: data.sparksAmount,
        price: Math.round(data.price * 100),
        sortOrder: data.sortOrder,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pack created" });
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/admin/packs"] });
      setSheetOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to create pack", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PackForm & { active: boolean }> }) => {
      const body: Record<string, unknown> = { ...data };
      if (typeof body.price === "number") {
        body.price = Math.round((body.price as number) * 100);
      }
      if (typeof body.sparksAmount !== "undefined") {
        body.sparks = body.sparksAmount;
        delete body.sparksAmount;
      }
      const res = await apiRequest("PATCH", `/api/sparks/admin/packs/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pack updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/admin/packs"] });
      setSheetOpen(false);
      setEditingPack(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update pack", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sparks/admin/packs/${id}`);
      return res.json().catch(() => null);
    },
    onSuccess: () => {
      toast({ title: "Pack deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/sparks/admin/packs"] });
      setDeleteDialogPack(null);
    },
    onError: () => toast({ title: "Failed to delete pack", variant: "destructive" }),
  });

  function openCreate() {
    setEditingPack(null);
    form.reset({ name: "", sparksAmount: 100, price: 0.99, sortOrder: 0 });
    setSheetOpen(true);
  }

  function openEdit(pack: SparkPack) {
    setEditingPack(pack);
    form.reset({
      name: pack.name,
      sparksAmount: pack.sparks,
      price: pack.price / 100,
      sortOrder: pack.sortOrder,
    });
    setSheetOpen(true);
  }

  function onSubmit(data: PackForm) {
    if (editingPack) {
      updateMutation.mutate({ id: editingPack.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleActive(pack: SparkPack) {
    updateMutation.mutate({ id: pack.id, data: { active: !pack.active } });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {packs?.length ?? 0} pack{packs?.length !== 1 ? "s" : ""} total
        </p>
        <Button size="sm" onClick={openCreate} data-testid="button-new-pack">
          <Plus className="h-4 w-4 mr-2" />
          New Pack
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !packs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No packs yet. Create your first Spark pack.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">⚡ Sparks</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Stripe IDs</TableHead>
                    <TableHead className="text-center">Sort</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packs.map((pack) => (
                    <TableRow key={pack.id} data-testid={`row-pack-${pack.id}`}>
                      <TableCell className="font-medium text-sm">{pack.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {pack.sparks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatPrice(pack.price)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {pack.stripePriceId && <CopyableBadge value={pack.stripePriceId} />}
                          {pack.stripeRecurringPriceId && <CopyableBadge value={pack.stripeRecurringPriceId} />}
                          {!pack.stripePriceId && !pack.stripeRecurringPriceId && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {pack.sortOrder}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={pack.active ? "default" : "outline"}
                          className="h-6 text-[10px] px-2"
                          onClick={() => toggleActive(pack)}
                          disabled={updateMutation.isPending}
                          data-testid={`button-toggle-active-${pack.id}`}
                        >
                          {pack.active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(pack)}
                            data-testid={`button-edit-pack-${pack.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialogPack(pack)}
                            data-testid={`button-delete-pack-${pack.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingPack(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingPack ? "Edit Pack" : "New Spark Pack"}</SheetTitle>
          </SheetHeader>

          {editingPack && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                Editing a pack's price will create a NEW Stripe Price. Old prices remain active for existing subscribers.
              </span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Starter Pack" data-testid="input-pack-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sparksAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sparks Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-pack-sparks"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-pack-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-pack-sort-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving} className="w-full" data-testid="button-save-pack">
                {isSaving ? "Saving…" : editingPack ? "Save Changes" : "Create Pack"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteDialogPack} onOpenChange={(open) => { if (!open) setDeleteDialogPack(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pack</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialogPack?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogPack(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogPack && deleteMutation.mutate(deleteDialogPack.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CommandSparksPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHead
        slug="command-sparks"
        title="Sparks — SEVCO CMD"
        description="Admin panel for managing platform Sparks currency"
        noIndex
      />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Sparks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor platform Sparks activity, adjust user balances, and manage pack catalog.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="controls" data-testid="tab-controls">Spark Controls</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Transaction History</TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-catalog">Pack Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="controls">
          <SparkControlsTab />
        </TabsContent>
        <TabsContent value="history">
          <TransactionHistoryTab />
        </TabsContent>
        <TabsContent value="catalog">
          <PackCatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
