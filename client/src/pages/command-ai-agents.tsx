import { PageHead } from "@/components/page-head";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { resolveImageUrl } from "@/lib/resolve-image-url";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bot, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Sparkles, RefreshCw, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Paperclip, Settings, Circle } from "lucide-react";
import type { AiAgent } from "@shared/schema";

const MODELS = [
  // OpenAI (via OpenRouter)
  { value: "openai/gpt-4o-mini",       label: "GPT-4o Mini",     group: "OpenAI" },
  { value: "openai/gpt-4o",            label: "GPT-4o",          group: "OpenAI" },

  // Anthropic (via OpenRouter)
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku",  group: "Anthropic" },

  // Google (via OpenRouter)
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", group: "Google" },

  // Grok 4 — x.ai Responses API (latest, uses XAI_API_KEY)
  { value: "xai/grok-4.20-reasoning", label: "Grok 4.20 Reasoning", group: "Grok 4" },
  { value: "xai/grok-4",              label: "Grok 4",               group: "Grok 4" },

  // Grok 3 — x.ai chat completions (uses XAI_API_KEY)
  { value: "xai/grok-3",           label: "Grok 3",           group: "Grok 3" },
  { value: "xai/grok-3-fast",      label: "Grok 3 Fast",      group: "Grok 3" },
  { value: "xai/grok-3-mini",      label: "Grok 3 Mini",      group: "Grok 3" },
  { value: "xai/grok-3-mini-fast", label: "Grok 3 Mini Fast", group: "Grok 3" },

  // Grok — via OpenRouter (uses OPENROUTER_API_KEY)
  { value: "x-ai/grok-3",     label: "Grok 3",     group: "Grok (OpenRouter)" },
  { value: "x-ai/grok-3-mini", label: "Grok 3 Mini", group: "Grok (OpenRouter)" },
];

const CAPABILITIES = ["text", "image", "code"] as const;
type Capability = typeof CAPABILITIES[number];

type AgentForm = {
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  modelSlug: string;
  avatarUrl: string;
  enabled: boolean;
  capabilities: Capability[];
};

const DEFAULT_FORM: AgentForm = {
  name: "",
  slug: "",
  description: "",
  systemPrompt: "You are a helpful AI assistant for SEVCO, a creative technology platform. Be concise and professional.",
  modelSlug: "openai/gpt-4o-mini",
  avatarUrl: "",
  enabled: true,
  capabilities: ["text"],
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AgentDialog({
  open,
  agent,
  onClose,
}: {
  open: boolean;
  agent: AiAgent | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AgentForm>(agent ? {
    name: agent.name,
    slug: agent.slug,
    description: agent.description ?? "",
    systemPrompt: agent.systemPrompt,
    modelSlug: agent.modelSlug,
    avatarUrl: agent.avatarUrl ?? "",
    enabled: agent.enabled,
    capabilities: (agent.capabilities ?? ["text"]) as Capability[],
  } : { ...DEFAULT_FORM });

  useEffect(() => {
    if (open) {
      setForm(agent ? {
        name: agent.name,
        slug: agent.slug,
        description: agent.description ?? "",
        systemPrompt: agent.systemPrompt,
        modelSlug: agent.modelSlug,
        avatarUrl: agent.avatarUrl ?? "",
        enabled: agent.enabled,
        capabilities: (agent.capabilities ?? ["text"]) as Capability[],
      } : { ...DEFAULT_FORM });
    }
  }, [open, agent?.id]);

  const createMutation = useMutation({
    mutationFn: (data: AgentForm) => apiRequest("POST", "/api/ai-agents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({ title: "Agent created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AgentForm>) => apiRequest("PATCH", `/api/ai-agents/${agent!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({ title: "Agent updated" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleSave() {
    const payload = {
      ...form,
      avatarUrl: form.avatarUrl || null,
      description: form.description || null,
    };
    if (agent) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as AgentForm);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? "Edit Agent" : "New AI Agent"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: agent ? f.slug : slugify(name) }));
                }}
                placeholder="SEVCO Assistant"
                className="mt-1"
                data-testid="input-agent-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="sevco-assistant"
                className="mt-1"
                data-testid="input-agent-slug"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="A brief description of this agent"
              className="mt-1"
              data-testid="input-agent-description"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Model</label>
            <Select value={form.modelSlug} onValueChange={(v) => setForm((f) => ({ ...f, modelSlug: v }))}>
              <SelectTrigger className="mt-1" data-testid="select-agent-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(MODELS.map((m) => m.group))).map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {MODELS.filter((m) => m.group === group).map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
              rows={5}
              className="mt-1 text-sm"
              placeholder="Instructions that define the agent's personality and behavior…"
              data-testid="textarea-agent-system-prompt"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Avatar URL (optional)</label>
            <Input
              value={form.avatarUrl}
              onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-1"
              data-testid="input-agent-avatar-url"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Capabilities</label>
            <div className="flex gap-3 mt-2">
              {CAPABILITIES.map((cap) => (
                <label key={cap} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.capabilities.includes(cap)}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        capabilities: e.target.checked
                          ? [...f.capabilities, cap]
                          : f.capabilities.filter((c) => c !== cap),
                      }));
                    }}
                    data-testid={`checkbox-capability-${cap}`}
                  />
                  <span className="text-sm capitalize">{cap}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              data-testid="checkbox-agent-enabled"
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || !form.slug.trim() || isPending} data-testid="button-save-agent">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-center" data-testid={`paperclip-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function PaperclipDashboardSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [cfgForm, setCfgForm] = useState({ baseUrl: "", apiKey: "", companyId: "" });

  const { data: status, isLoading: statusLoading, dataUpdatedAt: statusUpdatedAt, refetch: refetchStatus } =
    useQuery<any>({ queryKey: ["/api/paperclip/status"], refetchInterval: 60_000, retry: false });

  const isStatusReady = !statusLoading && status !== undefined;
  const isConfiguredReady = isStatusReady && status?.configured !== false;

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } =
    useQuery<any>({ queryKey: ["/api/paperclip/dashboard"], refetchInterval: 60_000, retry: false, enabled: isConfiguredReady });

  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } =
    useQuery<any>({ queryKey: ["/api/paperclip/agents"], refetchInterval: 60_000, retry: false, enabled: isConfiguredReady });

  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } =
    useQuery<any>({ queryKey: ["/api/paperclip/activity"], refetchInterval: 60_000, retry: false, enabled: isConfiguredReady });

  const { data: cfgData } = useQuery<any>({
    queryKey: ["/api/paperclip/config"],
    enabled: configOpen,
    retry: false,
  });

  useEffect(() => {
    if (cfgData) {
      setCfgForm({ baseUrl: cfgData.baseUrl || "", apiKey: "", companyId: cfgData.companyId || "" });
    }
  }, [cfgData]);

  const saveCfgMutation = useMutation({
    mutationFn: (data: { baseUrl: string; apiKey: string; companyId: string }) =>
      apiRequest("PUT", "/api/paperclip/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paperclip/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paperclip/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paperclip/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paperclip/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paperclip/config"] });
      toast({ title: "Paperclip settings saved" });
      setConfigOpen(false);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function handleRefresh() {
    refetchStatus();
    refetchDash();
    refetchAgents();
    refetchActivity();
  }

  const isConfigured = isStatusReady && status?.configured !== false;
  const isUnreachable = isConfigured && !!status?.error;
  const isReachable = isConfigured && !isUnreachable && !statusLoading;
  const isLoading = statusLoading || dashLoading || agentsLoading || activityLoading;

  const lastUpdated = statusUpdatedAt
    ? new Date(statusUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const baseUrl: string | null = status?.baseUrl ?? null;

  const agentList: any[] = Array.isArray(agents) ? agents : (agents?.agents ?? agents?.data ?? []);
  const activityList: any[] = Array.isArray(activity) ? activity : (activity?.events ?? activity?.activity ?? activity?.data ?? []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left group" data-testid="paperclip-section-toggle">
                <Paperclip className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base">Paperclip Dashboard</CardTitle>
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2 shrink-0">
              {isConfigured && (
                <div className="flex items-center gap-1.5" data-testid="paperclip-connection-status">
                  <Circle
                    className={`h-2.5 w-2.5 fill-current ${isReachable ? "text-green-500" : isUnreachable ? "text-red-500" : "text-yellow-500"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {statusLoading ? "Connecting…" : isReachable ? "Connected" : status?.error === "unhealthy" ? "Unhealthy" : "Unreachable"}
                  </span>
                </div>
              )}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden sm:inline">Updated {lastUpdated}</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleRefresh}
                disabled={isLoading}
                data-testid="paperclip-refresh-btn"
                title="Refresh Paperclip data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setConfigOpen(true)}
                data-testid="paperclip-configure-btn"
                title="Configure Paperclip"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {!isConfigured && (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-3" data-testid="paperclip-not-configured">
                <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="font-medium text-sm">Paperclip not configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your Paperclip base URL and API key below to connect.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)} data-testid="paperclip-setup-btn">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Configure
                </Button>
              </div>
            )}

            {isUnreachable && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mb-4 text-sm text-destructive" data-testid="paperclip-unreachable-banner">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Paperclip is unreachable — showing cached data.{status?.message ? ` (${status.message})` : ""}</span>
              </div>
            )}

            {isConfigured && (
              <div className="space-y-5">
                {dashLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="rounded-lg border bg-card px-4 py-3 animate-pulse h-16" />
                    ))}
                  </div>
                ) : dashboard && !dashboard.error ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="paperclip-metrics">
                    <StatCard label="Total Agents" value={dashboard?.totalAgents ?? dashboard?.total_agents ?? 0} />
                    <StatCard label="Active Agents" value={dashboard?.activeAgents ?? dashboard?.active_agents ?? 0} />
                    <StatCard label="Open Issues" value={dashboard?.openIssues ?? dashboard?.open_issues ?? 0} />
                    <StatCard label="Active Goals" value={dashboard?.activeGoals ?? dashboard?.active_goals ?? 0} />
                    <StatCard
                      label="Total Spend"
                      value={
                        dashboard?.totalSpend != null
                          ? `$${Number(dashboard.totalSpend).toFixed(2)}`
                          : dashboard?.total_spend != null
                          ? `$${Number(dashboard.total_spend).toFixed(2)}`
                          : "—"
                      }
                    />
                  </div>
                ) : null}

                {agentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : agentList.length > 0 ? (
                  <div data-testid="paperclip-agent-table">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agents</p>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Role / Status</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Budget Remaining</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Open Issues</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentList.map((agent: any, idx: number) => (
                            <tr key={agent.id ?? idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`paperclip-agent-row-${agent.id ?? idx}`}>
                              <td className="px-3 py-2.5 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary uppercase">
                                    {(agent.name ?? agent.agent_name ?? "?")[0]}
                                  </div>
                                  <span className="truncate max-w-[140px]">{agent.name ?? agent.agent_name ?? "Unknown"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 hidden sm:table-cell">
                                <div className="flex items-center gap-1.5">
                                  {agent.role && <span className="text-xs text-muted-foreground">{agent.role}</span>}
                                  {(agent.status ?? agent.state) && (
                                    <Badge
                                      variant={(agent.status ?? agent.state) === "active" ? "default" : "secondary"}
                                      className="text-[10px] px-1.5 py-0 h-4 capitalize"
                                    >
                                      {agent.status ?? agent.state}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right hidden md:table-cell text-muted-foreground text-xs">
                                {agent.budgetRemaining != null
                                  ? `$${Number(agent.budgetRemaining).toFixed(2)}`
                                  : agent.budget_remaining != null
                                  ? `$${Number(agent.budget_remaining).toFixed(2)}`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <Badge variant="outline" className="text-[10px]">
                                  {agent.openIssues ?? agent.open_issues ?? 0}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {activityLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : activityList.length > 0 ? (
                  <div data-testid="paperclip-activity-feed">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Activity</p>
                    <div className="space-y-1.5">
                      {activityList.slice(0, 5).map((event: any, idx: number) => (
                        <div key={event.id ?? idx} className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0" data-testid={`paperclip-activity-${idx}`}>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums mt-0.5">
                            {event.timestamp
                              ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : event.created_at
                              ? new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </span>
                          {(event.agentName ?? event.agent_name) && (
                            <span className="font-medium text-xs shrink-0">{event.agentName ?? event.agent_name}</span>
                          )}
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {event.description ?? event.event ?? event.message ?? ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {baseUrl && (
                  <div className="flex justify-end pt-1">
                    <a
                      href={baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="paperclip-open-link"
                    >
                      Open Paperclip
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Configure Paperclip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Credentials are stored server-side and never sent to the browser. If environment variables
              (<code className="bg-muted px-1 rounded text-xs">PAPERCLIP_BASE_URL</code> /{" "}
              <code className="bg-muted px-1 rounded text-xs">PAPERCLIP_API_KEY</code>) are set, they take priority.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  className="mt-1"
                  placeholder="https://my.paperclip.ing"
                  value={cfgForm.baseUrl}
                  onChange={(e) => setCfgForm((f) => ({ ...f, baseUrl: e.target.value }))}
                  data-testid="input-paperclip-base-url"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  API Key
                  {cfgData?.hasApiKey && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">(currently set — leave blank to keep)</span>
                  )}
                </label>
                <Input
                  className="mt-1"
                  type="password"
                  placeholder={cfgData?.hasApiKey ? "••••••••••••" : "pk_live_..."}
                  value={cfgForm.apiKey}
                  onChange={(e) => setCfgForm((f) => ({ ...f, apiKey: e.target.value }))}
                  data-testid="input-paperclip-api-key"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company ID <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  className="mt-1"
                  placeholder="your-company-id"
                  value={cfgForm.companyId}
                  onChange={(e) => setCfgForm((f) => ({ ...f, companyId: e.target.value }))}
                  data-testid="input-paperclip-company-id"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveCfgMutation.mutate(cfgForm)}
              disabled={!cfgForm.baseUrl.trim() || (!cfgForm.apiKey.trim() && !cfgData?.hasApiKey) || saveCfgMutation.isPending}
              data-testid="button-save-paperclip-config"
            >
              {saveCfgMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

export default function CommandAiAgentsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);

  const { data: agents = [], isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai-agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      toast({ title: "Agent deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/ai-agents/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] }),
  });

  function openNew() {
    setEditingAgent(null);
    setDialogOpen(true);
  }

  function openEdit(agent: AiAgent) {
    setEditingAgent(agent);
    setDialogOpen(true);
  }

  function handleDelete(agent: AiAgent) {
    if (!confirm(`Delete agent "${agent.name}"? All conversation history will be lost.`)) return;
    deleteMutation.mutate(agent.id);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHead slug="ai" title="AI Agents — SEVCO" description="Manage SEVCO AI agents and configurations." noIndex={true} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Agents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure AI assistants powered by OpenRouter. Admins and executives can chat with agents from the Chat panel.
          </p>
        </div>
        <Button onClick={openNew} data-testid="button-new-agent">
          <Plus className="h-4 w-4 mr-1" />
          New Agent
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="motion-safe:animate-pulse">
              <CardContent className="p-4 h-28" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && agents.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No AI agents yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create your first agent to get started</p>
            <Button className="mt-4" onClick={openNew} data-testid="button-create-first-agent">
              <Plus className="h-4 w-4 mr-1" />
              Create Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="group" data-testid={`agent-card-${agent.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {agent.avatarUrl ? (
                      <img src={resolveImageUrl(agent.avatarUrl)} alt={agent.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">@{agent.slug}</p>
                    </div>
                  </div>
                  <Badge variant={agent.enabled ? "default" : "secondary"} className="shrink-0 text-[10px]">
                    {agent.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {agent.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{agent.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-muted-foreground/60 font-mono">{agent.modelSlug}</p>
                  {agent.modelSlug.startsWith("xai/") ? (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-400/50 text-blue-500">x.ai</Badge>
                  ) : agent.modelSlug.startsWith("x-ai/") ? (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-400/30 text-blue-400/70">Grok↗</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground/50">OpenRouter</Badge>
                  )}
                </div>
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openEdit(agent)}
                    data-testid={`button-edit-agent-${agent.id}`}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => toggleMutation.mutate({ id: agent.id, enabled: !agent.enabled })}
                    data-testid={`button-toggle-agent-${agent.id}`}
                  >
                    {agent.enabled ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                    {agent.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleDelete(agent)}
                    data-testid={`button-delete-agent-${agent.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Setup:</span> Add{" "}
            <code className="bg-muted px-1 rounded">OPENROUTER_API_KEY</code> for OpenAI, Anthropic, Google, and Meta models.
            For Grok models, add <code className="bg-muted px-1 rounded">XAI_API_KEY</code> (get it at{" "}
            <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" className="underline">console.x.ai</a>).
            Chat with agents via the Chat icon in the header.
          </p>
        </CardContent>
      </Card>

      <PaperclipDashboardSection />

      <AgentDialog
        open={dialogOpen}
        agent={editingAgent}
        onClose={() => {
          setDialogOpen(false);
          setEditingAgent(null);
        }}
      />
    </div>
  );
}
