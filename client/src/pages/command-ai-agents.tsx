import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Bot, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import type { AiAgent } from "@shared/schema";

const MODELS = [
  // OpenAI
  { value: "openai/gpt-4o-mini",                         label: "GPT-4o Mini",         group: "OpenAI" },
  { value: "openai/gpt-4o",                              label: "GPT-4o",              group: "OpenAI" },

  // Anthropic
  { value: "anthropic/claude-3-haiku",                   label: "Claude 3 Haiku",      group: "Anthropic" },
  { value: "anthropic/claude-3.5-sonnet",                label: "Claude 3.5 Sonnet",   group: "Anthropic" },

  // Google
  { value: "google/gemini-flash-1.5",                    label: "Gemini Flash 1.5",    group: "Google" },

  // Meta
  { value: "meta-llama/llama-3.1-8b-instruct:free",      label: "Llama 3.1 8B (free)", group: "Meta" },

  // Grok (x.ai direct API — requires XAI_API_KEY from https://console.x.ai/)
  { value: "xai/grok-3",                                 label: "Grok 3",              group: "Grok" },
  { value: "xai/grok-3-fast",                            label: "Grok 3 Fast",         group: "Grok" },
  { value: "xai/grok-3-mini",                            label: "Grok 3 Mini",         group: "Grok" },
  { value: "xai/grok-3-mini-fast",                       label: "Grok 3 Mini Fast",    group: "Grok" },
  { value: "xai/grok-2-1212",                            label: "Grok 2",              group: "Grok" },
  { value: "xai/grok-2-vision-1212",                     label: "Grok 2 Vision",       group: "Grok" },
  { value: "xai/grok-beta",                              label: "Grok Beta",           group: "Grok" },
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
                {(["OpenAI", "Anthropic", "Google", "Meta", "Grok"] as const).map((group) => (
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
            <Card key={i} className="animate-pulse">
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
                      <img src={agent.avatarUrl} alt={agent.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
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
