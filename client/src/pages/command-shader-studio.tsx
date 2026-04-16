import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2, Copy, ChevronUp, ChevronDown, Eye, EyeOff, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MultiLayerShaderCanvas,
  EFFECT_PARAM_SCHEMA,
  EFFECT_LABELS,
  presetToLayers,
  type ShaderLayer,
  type BlendMode,
  type ShaderParams,
  type ShaderParamValue,
} from "@/components/shader-canvas";
import {
  SHADER_EFFECT_TYPES,
  SHADER_PAGE_KEYS,
  type ShaderEffectType,
  type ShaderPreset,
} from "@shared/schema";
import { PALETTE_PRESETS } from "@/components/shader-background";

const PALETTE_OPTIONS = Object.keys(PALETTE_PRESETS);
const BLEND_OPTIONS: ShaderLayer["blend"][] = ["normal", "screen", "overlay", "multiply", "lighten"];

const PREVIEW_SIZES = {
  full:    { label: "Full HD",  w: "100%", aspect: "16 / 9" },
  square:  { label: "Square",   w: "100%", aspect: "1 / 1" },
  mobile:  { label: "Mobile",   w: "320px", aspect: "9 / 16" },
} as const;
type PreviewSizeKey = keyof typeof PREVIEW_SIZES;

function defaultParamsFor(effect: ShaderEffectType): ShaderParams {
  const out: ShaderParams = {};
  for (const p of EFFECT_PARAM_SCHEMA[effect]) out[p.key] = p.default as ShaderParamValue;
  return out;
}

function makeLayer(effect: ShaderEffectType): ShaderLayer {
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    effectType: effect,
    params: defaultParamsFor(effect),
    enabled: true,
    blend: "screen",
  };
}

export default function CommandShaderStudio() {
  const { toast } = useToast();
  const presetsQ = useQuery<ShaderPreset[]>({ queryKey: ["/api/shader-presets"] });
  const assignmentsQ = useQuery<Record<string, number | null>>({ queryKey: ["/api/shader-assignments"] });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftLayers, setDraftLayers] = useState<ShaderLayer[]>([]);
  const [activeLayerIdx, setActiveLayerIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSizeKey>("full");
  const [fps, setFps] = useState<number | null>(null);
  // Global preset-level controls (persisted into paramsJson alongside layers)
  const [globalSpeed, setGlobalSpeed] = useState(1.0);
  const [mobileFallback, setMobileFallback] = useState(false);

  const presets = presetsQ.data ?? [];

  useEffect(() => {
    if (selectedId == null && presets.length > 0) loadPreset(presets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presets.length]);

  function loadPreset(p: ShaderPreset) {
    const raw = (p.paramsJson ?? {}) as Record<string, unknown>;
    const ls = presetToLayers(p.effectType as ShaderEffectType, raw);
    setSelectedId(p.id);
    setDraftName(p.name);
    setDraftLayers(ls.map((l) => ({ ...l, blend: l.blend ?? "screen" })));
    setActiveLayerIdx(0);
    setGlobalSpeed(typeof raw.globalSpeed === "number" ? raw.globalSpeed : 1.0);
    setMobileFallback(raw.mobileFallback === true);
    setDirty(false);
  }

  function newPreset() {
    const layer = makeLayer("plasma");
    layer.blend = "normal";
    setSelectedId(null);
    setDraftName("New Preset");
    setDraftLayers([layer]);
    setActiveLayerIdx(0);
    setDirty(true);
  }

  // Build the storage payload (single primary effectType for indexing + layered paramsJson)
  function buildPayload() {
    const primary = draftLayers[0]?.effectType ?? "plasma";
    return {
      name: draftName,
      effectType: primary as ShaderEffectType,
      paramsJson: { layers: draftLayers, globalSpeed, mobileFallback },
    };
  }

  const createM = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shader-presets", buildPayload());
      return res.json();
    },
    onSuccess: (created: ShaderPreset) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shader-presets"] });
      setSelectedId(created.id);
      setDirty(false);
      toast({ title: "Preset created" });
    },
    onError: (e: any) => toast({ title: "Create failed", description: e?.message, variant: "destructive" }),
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (selectedId == null) return null;
      const res = await apiRequest("PATCH", `/api/shader-presets/${selectedId}`, buildPayload());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shader-presets"] });
      setDirty(false);
      toast({ title: "Preset saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/shader-presets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shader-presets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shader-assignments"] });
      setSelectedId(null);
      setDraftLayers([]);
      toast({ title: "Preset deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  const assignM = useMutation({
    mutationFn: async (next: Record<string, number | null>) =>
      apiRequest("PUT", "/api/shader-assignments", next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shader-assignments"] });
      toast({ title: "Assignments updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message, variant: "destructive" }),
  });

  // ── layer ops ─────────────────────────────────────────────────────
  function addLayer() {
    const l = makeLayer("plasma");
    setDraftLayers((prev) => [...prev, l]);
    setActiveLayerIdx(draftLayers.length);
    setDirty(true);
  }
  function removeLayer(i: number) {
    setDraftLayers((prev) => prev.filter((_, idx) => idx !== i));
    setActiveLayerIdx((idx) => Math.max(0, Math.min(idx, draftLayers.length - 2)));
    setDirty(true);
  }
  function moveLayer(i: number, dir: -1 | 1) {
    setDraftLayers((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setActiveLayerIdx((idx) => (idx === i ? i + dir : idx === i + dir ? i : idx));
    setDirty(true);
  }
  function toggleLayer(i: number) {
    setDraftLayers((prev) => prev.map((l, idx) => idx === i ? { ...l, enabled: !l.enabled } : l));
    setDirty(true);
  }
  function updateActiveLayer(patch: Partial<ShaderLayer>) {
    setDraftLayers((prev) => prev.map((l, idx) => idx === activeLayerIdx ? { ...l, ...patch } : l));
    setDirty(true);
  }
  function setActiveParam(key: string, val: ShaderParamValue) {
    setDraftLayers((prev) => prev.map((l, idx) => idx === activeLayerIdx
      ? { ...l, params: { ...l.params, [key]: val } } : l));
    setDirty(true);
  }
  function changeActiveEffect(effect: ShaderEffectType) {
    setDraftLayers((prev) => prev.map((l, idx) => idx === activeLayerIdx
      ? { ...l, effectType: effect, params: defaultParamsFor(effect) } : l));
    setDirty(true);
  }

  const activeLayer = draftLayers[activeLayerIdx];
  const schema = activeLayer ? EFFECT_PARAM_SCHEMA[activeLayer.effectType] : [];

  function handleAssign(pageKey: string, val: string) {
    const next = { ...(assignmentsQ.data ?? {}) } as Record<string, number | null>;
    next[pageKey] = val === "none" ? null : parseInt(val);
    assignM.mutate(next);
  }

  const previewLayersMemo = useMemo(() => draftLayers, [draftLayers]);
  const sz = PREVIEW_SIZES[previewSize];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] gap-4 h-[calc(100vh-180px)] min-h-[600px]">
      {/* ── Left: Preset Library + Layers ──────────────────────────── */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Presets</h3>
          <Button size="sm" variant="outline" onClick={newPreset} data-testid="button-new-preset">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="max-h-48 border-b">
          <div className="p-2 space-y-1">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p)}
                className={`w-full text-left px-3 py-2 rounded hover-elevate active-elevate-2 text-sm ${selectedId === p.id ? "bg-accent" : ""}`}
                data-testid={`button-preset-${p.id}`}
              >
                <div className="font-medium truncate" data-testid={`text-preset-name-${p.id}`}>{p.name}</div>
                <div className="text-xs text-muted-foreground">{EFFECT_LABELS[p.effectType as ShaderEffectType] ?? p.effectType}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Layers</h3>
          <Button size="sm" variant="outline" onClick={addLayer} data-testid="button-add-layer">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {draftLayers.map((l, i) => (
              <div
                key={l.id}
                onClick={() => setActiveLayerIdx(i)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer hover-elevate active-elevate-2 ${activeLayerIdx === i ? "bg-accent" : ""}`}
                data-testid={`row-layer-${i}`}
              >
                <button onClick={(e) => { e.stopPropagation(); toggleLayer(i); }} className="p-1" data-testid={`button-toggle-layer-${i}`}>
                  {l.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <span className={`flex-1 truncate ${!l.enabled ? "text-muted-foreground line-through" : ""}`}>{EFFECT_LABELS[l.effectType]}</span>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(i, -1); }} disabled={i === 0} className="p-1 disabled:opacity-30" data-testid={`button-up-layer-${i}`}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 1); }} disabled={i === draftLayers.length - 1} className="p-1 disabled:opacity-30" data-testid={`button-down-layer-${i}`}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeLayer(i); }} disabled={draftLayers.length <= 1} className="p-1 disabled:opacity-30" data-testid={`button-remove-layer-${i}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {draftLayers.length === 0 && <div className="text-xs text-muted-foreground p-2">Select or create a preset.</div>}
          </div>
        </ScrollArea>
      </Card>

      {/* ── Middle: Parameters ──────────────────────────────────────── */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <Input
            value={draftName}
            onChange={(e) => { setDraftName(e.target.value); setDirty(true); }}
            placeholder="Preset name"
            className="flex-1"
            data-testid="input-preset-name"
          />
          {dirty && <Badge variant="outline">unsaved</Badge>}
          {selectedId == null ? (
            <Button size="sm" onClick={() => createM.mutate()} disabled={createM.isPending || !draftName || draftLayers.length === 0} data-testid="button-create-preset">
              <Save className="h-4 w-4 mr-1" />Create
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => updateM.mutate()} disabled={updateM.isPending || !dirty} data-testid="button-save-preset">
                <Save className="h-4 w-4 mr-1" />Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedId(null); setDraftName(`${draftName} (copy)`); setDirty(true); }} data-testid="button-duplicate">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => selectedId && deleteM.mutate(selectedId)} data-testid="button-delete-preset">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <ScrollArea className="border-b max-h-[55%]">
          <div className="p-3 space-y-3">
            {/* Global preset-level controls (apply to whole preset) */}
            <div className="rounded-md border p-2 space-y-2 bg-muted/30">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Global</div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Animation Speed</Label>
                  <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-global-speed">{globalSpeed.toFixed(2)}×</span>
                </div>
                <Slider min={0} max={3} step={0.05} value={[globalSpeed]} onValueChange={([v]) => { setGlobalSpeed(v); setDirty(true); }} data-testid="slider-global-speed" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Mobile Fallback</Label>
                  <p className="text-[10px] text-muted-foreground">Hide shader on small screens</p>
                </div>
                <Switch checked={mobileFallback} onCheckedChange={(v) => { setMobileFallback(v); setDirty(true); }} data-testid="switch-mobile-fallback" />
              </div>
              <div className="text-[10px] text-muted-foreground" data-testid="text-dimensions">
                Dimensions: {sz.label} ({sz.w}, aspect {sz.aspect})
              </div>
            </div>
            {activeLayer ? (
              <>
                <div>
                  <Label className="text-xs">Effect Type</Label>
                  <Select value={activeLayer.effectType} onValueChange={(v) => changeActiveEffect(v as ShaderEffectType)}>
                    <SelectTrigger data-testid="select-effect-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHADER_EFFECT_TYPES.map((e) => (
                        <SelectItem key={e} value={e}>{EFFECT_LABELS[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeLayerIdx > 0 && (
                  <div>
                    <Label className="text-xs">Blend Mode</Label>
                    <Select value={activeLayer.blend ?? "screen"} onValueChange={(v) => updateActiveLayer({ blend: v as BlendMode })}>
                      <SelectTrigger data-testid="select-blend"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BLEND_OPTIONS.map((b) => (
                          <SelectItem key={b} value={b!}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Opacity</Label>
                    <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-layer-opacity">{(activeLayer.opacity ?? 1).toFixed(2)}</span>
                  </div>
                  <Slider min={0} max={1} step={0.01} value={[activeLayer.opacity ?? 1]} onValueChange={([v]) => updateActiveLayer({ opacity: v })} data-testid="slider-layer-opacity" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Offset X (%)</Label>
                    <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-layer-offsetx">{(activeLayer.offsetX ?? 0).toFixed(0)}</span>
                  </div>
                  <Slider min={-50} max={50} step={1} value={[activeLayer.offsetX ?? 0]} onValueChange={([v]) => updateActiveLayer({ offsetX: v })} data-testid="slider-layer-offsetx" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Offset Y (%)</Label>
                    <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-layer-offsety">{(activeLayer.offsetY ?? 0).toFixed(0)}</span>
                  </div>
                  <Slider min={-50} max={50} step={1} value={[activeLayer.offsetY ?? 0]} onValueChange={([v]) => updateActiveLayer({ offsetY: v })} data-testid="slider-layer-offsety" />
                </div>
                {schema.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{p.label}</Label>
                      {p.type === "range" && (
                        <span className="text-xs text-muted-foreground tabular-nums" data-testid={`text-param-${p.key}`}>
                          {(activeLayer.params[p.key] ?? p.default).toFixed?.(2) ?? activeLayer.params[p.key]}
                        </span>
                      )}
                    </div>
                    {p.type === "range" ? (
                      <Slider
                        min={p.min!}
                        max={p.max!}
                        step={p.step!}
                        value={[Number(activeLayer.params[p.key] ?? p.default)]}
                        onValueChange={([v]) => setActiveParam(p.key, v)}
                        data-testid={`slider-${p.key}`}
                      />
                    ) : (
                      <Select value={String(activeLayer.params[p.key] ?? p.default)} onValueChange={(v) => setActiveParam(p.key, v)}>
                        <SelectTrigger data-testid={`select-${p.key}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PALETTE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No layer selected.</p>
            )}
          </div>
        </ScrollArea>
        <div className="flex-1 overflow-auto p-3">
          <h4 className="text-sm font-semibold mb-2">Page Assignments</h4>
          <div className="space-y-2">
            {SHADER_PAGE_KEYS.map((pk) => {
              const cur = assignmentsQ.data?.[pk] ?? null;
              return (
                <div key={pk} className="flex items-center gap-2">
                  <span className="text-xs w-32 text-muted-foreground" data-testid={`text-page-${pk}`}>{pk}</span>
                  <Select value={cur == null ? "none" : String(cur)} onValueChange={(v) => handleAssign(pk, v)}>
                    <SelectTrigger className="flex-1" data-testid={`select-assign-${pk}`}>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {presets.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Right: Live Preview ──────────────────────────────────────── */}
      <Card className="overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Preview</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums" data-testid="text-fps">{fps != null ? `${fps} fps` : "—"}</span>
            <Select value={previewSize} onValueChange={(v) => setPreviewSize(v as PreviewSizeKey)}>
              <SelectTrigger className="h-7 w-28 text-xs" data-testid="select-preview-size"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PREVIEW_SIZES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-3 bg-muted/20 overflow-auto">
          <div
            className="relative bg-black rounded-md overflow-hidden border border-border/40"
            style={{ width: sz.w, maxWidth: "100%", aspectRatio: sz.aspect }}
            data-testid="container-preview"
          >
            {previewLayersMemo.length > 0 && (
              <MultiLayerShaderCanvas layers={previewLayersMemo} onFps={setFps} globalSpeed={globalSpeed} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
