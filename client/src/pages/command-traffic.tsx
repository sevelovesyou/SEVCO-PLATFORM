import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  Save,
  Globe,
  Eye,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  TrendingUp,
  FileText,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type WatchedSite = {
  id: string;
  name: string;
  url: string;
  embedUrl?: string;
};

type TrafficSettings = {
  embedUrl: string;
  watchedSites: WatchedSite[];
};

type SummaryData = {
  sessions: number;
  pageviews: number;
  activeUsers: number;
  bounceRate: number;
  sessionsToday: number;
  activeUsers30d: number;
  pageviews30d: number;
};

type SessionRow = { date: string; sessions: number };
type PageRow = { page: string; pageviews: number };
type SourceRow = { source: string; sessions: number };
type CountryRow = { country: string; sessions: number };
type DeviceRow = { device: string; sessions: number };

const SOURCE_COLORS: Record<string, string> = {
  "Organic Search": "#4ade80",
  "Direct": "#60a5fa",
  "Referral": "#BE0000",
  "Organic Social": "#a78bfa",
  "Paid Search": "#fb7185",
  "Email": "#fbbf24",
  "Unassigned": "#94a3b8",
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#60a5fa",
  mobile: "#4ade80",
  tablet: "#BE0000",
};

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <Card data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
        <p className="text-2xl font-bold" data-testid={`value-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

type RangeOption = "7d" | "28d" | "90d";

function InternalAnalyticsDashboard() {
  const [range, setRange] = useState<RangeOption>("28d");

  async function fetchJson<T>(url: string): Promise<T> {
    const r = await fetch(url);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: r.statusText }));
      throw new Error(err?.message ?? r.statusText);
    }
    return r.json() as Promise<T>;
  }

  const summaryQ = useQuery<SummaryData>({
    queryKey: ["/api/analytics/internal/summary", range],
    queryFn: () => fetchJson<SummaryData>(`/api/analytics/internal/summary?range=${range}`),
  });

  const sessionsQ = useQuery<SessionRow[]>({
    queryKey: ["/api/analytics/internal/sessions", range],
    queryFn: () => fetchJson<SessionRow[]>(`/api/analytics/internal/sessions?range=${range}`),
  });

  const pagesQ = useQuery<PageRow[]>({
    queryKey: ["/api/analytics/internal/pages", range],
    queryFn: () => fetchJson<PageRow[]>(`/api/analytics/internal/pages?range=${range}`),
  });

  const sourcesQ = useQuery<SourceRow[]>({
    queryKey: ["/api/analytics/internal/sources", range],
    queryFn: () => fetchJson<SourceRow[]>(`/api/analytics/internal/sources?range=${range}`),
  });

  const countriesQ = useQuery<CountryRow[]>({
    queryKey: ["/api/analytics/internal/countries", range],
    queryFn: () => fetchJson<CountryRow[]>(`/api/analytics/internal/countries?range=${range}`),
  });

  const devicesQ = useQuery<DeviceRow[]>({
    queryKey: ["/api/analytics/internal/devices", range],
    queryFn: () => fetchJson<DeviceRow[]>(`/api/analytics/internal/devices?range=${range}`),
  });

  const realtimeQ = useQuery<{ activeUsers: number }>({
    queryKey: ["/api/analytics/internal/realtime"],
    queryFn: () => fetchJson<{ activeUsers: number }>("/api/analytics/internal/realtime"),
    refetchInterval: 60000,
  });

  const summary = summaryQ.data;
  const sessionData = (sessionsQ.data ?? []).map(d => ({ ...d, date: formatDate(d.date) }));
  const pageData = pagesQ.data ?? [];
  const sourceData = (sourcesQ.data ?? []).map(d => ({ name: d.source, value: d.sessions }));
  const countryData = countriesQ.data ?? [];
  const deviceData = (devicesQ.data ?? []).map(d => ({ name: d.device, value: d.sessions }));

  const isLoading = summaryQ.isLoading;

  function refetchAll() {
    summaryQ.refetch();
    sessionsQ.refetch();
    pagesQ.refetch();
    sourcesQ.refetch();
    countriesQ.refetch();
    devicesQ.refetch();
    realtimeQ.refetch();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription className="mt-0.5">
                First-party pageview tracking
                {realtimeQ.data && (
                  <span className="ml-3 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full inline-block motion-safe:animate-pulse" />
                    {realtimeQ.data.activeUsers} active now
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden" data-testid="group-range-selector">
              {(["7d", "28d", "90d"] as RangeOption[]).map((r) => (
                <button
                  key={r}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${range === r ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-muted-foreground"}`}
                  onClick={() => setRange(r)}
                  data-testid={`button-range-${r}`}
                >
                  {r === "7d" ? "7 days" : r === "28d" ? "28 days" : "90 days"}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refetchAll} title="Refresh" aria-label="Refresh analytics" data-testid="button-refresh-analytics">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sessions Today" value={summary.sessionsToday.toLocaleString()} icon={TrendingUp} />
            <StatCard label="Active Users (30d)" value={summary.activeUsers30d.toLocaleString()} icon={Users} />
            <StatCard label="Pageviews (30d)" value={summary.pageviews30d.toLocaleString()} icon={FileText} />
            <StatCard label="Bounce Rate" value={`${summary.bounceRate.toFixed(1)}%`} icon={BarChart2} />
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
            {summaryQ.error ? `Error loading summary: ${(summaryQ.error as Error).message}` : "No data available"}
          </div>
        )}

        {/* Sessions Over Time */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Sessions Over Time
          </h3>
          {sessionsQ.isLoading ? (
            <Skeleton className="h-48" />
          ) : sessionData.length > 0 ? (
            <div className="h-48" data-testid="chart-sessions-over-time">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="sessions" stroke="#60a5fa" fill="url(#sessionsGradient)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No session data available</p>
          )}
        </div>

        <Separator />

        {/* Top Pages + Traffic Sources */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Top Pages
            </h3>
            {pagesQ.isLoading ? (
              <Skeleton className="h-48" />
            ) : pageData.length > 0 ? (
              <div className="h-48" data-testid="chart-top-pages">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pageData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="page"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                      tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 14) + "…" : v}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pageviews" fill="#60a5fa" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No page data available</p>
            )}
          </div>

          {/* Traffic Sources */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Traffic Sources
            </h3>
            {sourcesQ.isLoading ? (
              <Skeleton className="h-48" />
            ) : sourceData.length > 0 ? (
              <div className="h-48" data-testid="chart-traffic-sources">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="40%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`source-${index}`} fill={SOURCE_COLORS[entry.name] ?? `hsl(${index * 60}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No source data available</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Countries + Device Split */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Country Breakdown */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Geographic Breakdown
            </h3>
            {countriesQ.isLoading ? (
              <Skeleton className="h-56" />
            ) : countryData.length > 0 ? (
              <div className="space-y-1.5" data-testid="table-countries">
                {countryData.map((row, idx) => {
                  const maxSessions = countryData[0]?.sessions || 1;
                  const pct = Math.round((row.sessions / maxSessions) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-3" data-testid={`row-country-${idx}`}>
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                      <span className="text-xs flex-1 min-w-0 truncate font-medium">{row.country}</span>
                      <div className="flex-1 min-w-0 hidden sm:block">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{row.sessions.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No country data available</p>
            )}
          </div>

          {/* Device Split */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Device Split
            </h3>
            {devicesQ.isLoading ? (
              <Skeleton className="h-56" />
            ) : deviceData.length > 0 ? (
              <div className="h-48" data-testid="chart-device-split">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="40%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell
                          key={`device-${index}`}
                          fill={DEVICE_COLORS[entry.name.toLowerCase()] ?? `hsl(${index * 100}, 70%, 60%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} layout="vertical" align="right" verticalAlign="middle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No device data available</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_SITE: Omit<WatchedSite, "id"> = {
  name: "",
  url: "",
  embedUrl: "",
};

export default function CommandTraffic() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<TrafficSettings>({
    queryKey: ["/api/traffic-settings"],
  });

  const mutation = useMutation({
    mutationFn: async (payload: TrafficSettings) => {
      return apiRequest("POST", "/api/traffic-settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/traffic-settings"] });
      toast({ title: "Traffic settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const [embedUrl, setEmbedUrl] = useState("");
  const [watchedSites, setWatchedSites] = useState<WatchedSite[]>([]);
  const [viewingEmbed, setViewingEmbed] = useState<{ name: string; embedUrl: string } | null>(null);

  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WatchedSite | null>(null);
  const [siteForm, setSiteForm] = useState<Omit<WatchedSite, "id">>(EMPTY_SITE);

  useEffect(() => {
    if (data) {
      setEmbedUrl(data.embedUrl || "");
      setWatchedSites(data.watchedSites || []);
    }
  }, [data]);

  function handleSaveMain() {
    mutation.mutate({ embedUrl, watchedSites });
  }

  function openAddSite() {
    setEditingSite(null);
    setSiteForm(EMPTY_SITE);
    setSiteDialogOpen(true);
  }

  function openEditSite(site: WatchedSite) {
    setEditingSite(site);
    setSiteForm({ name: site.name, url: site.url, embedUrl: site.embedUrl || "" });
    setSiteDialogOpen(true);
  }

  function handleSiteDialogSave() {
    if (!siteForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!siteForm.url.trim()) {
      toast({ title: "URL is required", variant: "destructive" });
      return;
    }
    let updated: WatchedSite[];
    if (editingSite) {
      updated = watchedSites.map((s) =>
        s.id === editingSite.id ? { ...editingSite, ...siteForm } : s
      );
    } else {
      updated = [
        ...watchedSites,
        { ...siteForm, id: crypto.randomUUID() },
      ];
    }
    setWatchedSites(updated);
    setSiteDialogOpen(false);
    mutation.mutate({ embedUrl, watchedSites: updated });
  }

  function handleRemoveSite(id: string) {
    const updated = watchedSites.filter((s) => s.id !== id);
    setWatchedSites(updated);
    mutation.mutate({ embedUrl, watchedSites: updated });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <InternalAnalyticsDashboard />

      {/* Watched Sites */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Watched Sites</CardTitle>
            </div>
            <Button size="sm" onClick={openAddSite} data-testid="button-add-watched-site">
              <Plus className="h-4 w-4 mr-1" />
              Add Site
            </Button>
          </div>
          <CardDescription>
            Track additional owned or monitored websites. Each entry can optionally include an analytics embed URL for external properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchedSites.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No watched sites added yet.</p>
              <p className="text-xs mt-1">Add sites to track and quickly access their analytics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                  data-testid={`card-watched-site-${site.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</p>
                      {site.embedUrl && (
                        <Badge variant="outline" className="text-xs shrink-0">Analytics</Badge>
                      )}
                    </div>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                      data-testid={`link-site-url-${site.id}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {site.url}
                    </a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {site.embedUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                          aria-label="View"
                        className="h-8 w-8"
                        onClick={() => setViewingEmbed({ name: site.name, embedUrl: site.embedUrl! })}
                        data-testid={`button-view-site-embed-${site.id}`}
                        title="View analytics embed"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                        aria-label="Edit"
                      className="h-8 w-8"
                      onClick={() => openEditSite(site)}
                      data-testid={`button-edit-site-${site.id}`}
                      title="Edit site"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                        aria-label="Remove"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveSite(site.id)}
                      data-testid={`button-remove-site-${site.id}`}
                      title="Remove site"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Site Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Add Watched Site"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="input-site-name">Site Name *</Label>
              <Input
                id="input-site-name"
                data-testid="input-site-name"
                placeholder="e.g. SEVCO Records"
                value={siteForm.name}
                onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="input-site-url">Site URL *</Label>
              <Input
                id="input-site-url"
                data-testid="input-site-url"
                placeholder="https://records.sevco.us"
                value={siteForm.url}
                onChange={(e) => setSiteForm((f) => ({ ...f, url: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="input-site-embed-url">Analytics Embed URL (optional)</Label>
              <Input
                id="input-site-embed-url"
                data-testid="input-site-embed-url"
                placeholder="https://plausible.io/share/records.sevco.us?auth=..."
                value={siteForm.embedUrl || ""}
                onChange={(e) => setSiteForm((f) => ({ ...f, embedUrl: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a shareable embed URL from your analytics provider to view traffic inside the dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteDialogOpen(false)} data-testid="button-site-dialog-cancel">
              Cancel
            </Button>
            <Button onClick={handleSiteDialogSave} disabled={mutation.isPending} data-testid="button-site-dialog-save">
              {editingSite ? "Save Changes" : "Add Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Embed Viewer Dialog */}
      <Dialog open={!!viewingEmbed} onOpenChange={(open) => { if (!open) setViewingEmbed(null); }}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{viewingEmbed?.name} — Analytics</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
                aria-label="View"
              className="h-7 w-7"
              onClick={() => setViewingEmbed(null)}
              data-testid="button-close-embed-viewer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {viewingEmbed && (
            <div className="w-full" style={{ height: "700px" }}>
              <iframe
                src={viewingEmbed.embedUrl}
                className="w-full h-full"
                title={`${viewingEmbed.name} Analytics`}
                data-testid="iframe-embed-viewer"
                loading="lazy"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
