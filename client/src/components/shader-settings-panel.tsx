import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PALETTE_PRESETS, type PaletteId } from "@/components/shader-background";

export const SHADER_DEFAULTS = {
  "hero.shader.enabled":         "true",
  "hero.shader.speed":           "1.0",
  "hero.shader.mouseStrength":   "0.5",
  "hero.shader.palette":         "cosmic",
  "hero.shader.noiseScale":      "1.0",
  "hero.shader.vignetteStrength":"0.6",
  "hero.shader.overlayStrength": "0.45",
  "hero.shader.starDensity":     "0.67",
  "hero.shader.colorBase":       "#07071a",
  "hero.shader.colorShadow":     "#1f1066",
  "hero.shader.colorMid":        "#1c54e0",
  "hero.shader.colorHighlight":  "#be0007",
  "hero.shader.colorPeak":       "#d93b0c",
};

const SPEED_STEPS = [
  { label: "Slow",    value: 0.25 },
  { label: "Normal",  value: 1.0  },
  { label: "Fast",    value: 1.5  },
  { label: "Blazing", value: 2.0  },
];

const MOUSE_STEPS = [
  { label: "Off",    value: 0.0  },
  { label: "Subtle", value: 0.25 },
  { label: "Medium", value: 0.5  },
  { label: "Strong", value: 1.0  },
];

const NOISE_STEPS = [
  { label: "Fine",   value: 0.5 },
  { label: "Medium", value: 1.0 },
  { label: "Coarse", value: 3.0 },
];

const STAR_STEPS = [
  { label: "Off",    value: 0.0  },
  { label: "Subtle", value: 0.33 },
  { label: "Normal", value: 0.67 },
  { label: "Dense",  value: 1.0  },
];

function snapToStep(val: number, steps: { value: number }[]): number {
  return steps.reduce((prev, curr) =>
    Math.abs(curr.value - val) < Math.abs(prev.value - val) ? curr : prev
  ).value;
}

function indexOfStep(val: number, steps: { value: number }[]): number {
  return steps.findIndex((s) => s.value === val) ?? 0;
}

interface ShaderSettingsPanelProps {
  settings: Record<string, string>;
}

export function ShaderSettingsPanel({ settings }: ShaderSettingsPanelProps) {
  const { toast } = useToast();

  const vignetteStrengthFromSettings = parseFloat(settings["hero.shader.vignetteStrength"] ?? SHADER_DEFAULTS["hero.shader.vignetteStrength"]);
  const overlayStrengthFromSettings = parseFloat(settings["hero.shader.overlayStrength"] ?? SHADER_DEFAULTS["hero.shader.overlayStrength"]);

  const speedFromSettings    = parseFloat(settings["hero.shader.speed"] ?? SHADER_DEFAULTS["hero.shader.speed"]);
  const mouseFromSettings    = parseFloat(settings["hero.shader.mouseStrength"] ?? SHADER_DEFAULTS["hero.shader.mouseStrength"]);
  const noiseFromSettings    = parseFloat(settings["hero.shader.noiseScale"] ?? SHADER_DEFAULTS["hero.shader.noiseScale"]);
  const starDensityFromSettings = parseFloat(settings["hero.shader.starDensity"] ?? SHADER_DEFAULTS["hero.shader.starDensity"]);

  const [localVignette, setLocalVignette] = useState(Math.round(vignetteStrengthFromSettings * 100));
  const [localOverlay, setLocalOverlay] = useState(Math.round(overlayStrengthFromSettings * 100));
  const [localSpeedIdx, setLocalSpeedIdx] = useState(indexOfStep(snapToStep(speedFromSettings, SPEED_STEPS), SPEED_STEPS));
  const [localMouseIdx, setLocalMouseIdx] = useState(indexOfStep(snapToStep(mouseFromSettings, MOUSE_STEPS), MOUSE_STEPS));
  const [localNoiseIdx, setLocalNoiseIdx] = useState(indexOfStep(snapToStep(noiseFromSettings, NOISE_STEPS), NOISE_STEPS));
  const [localStarIdx, setLocalStarIdx] = useState(indexOfStep(snapToStep(starDensityFromSettings, STAR_STEPS), STAR_STEPS));

  useEffect(() => {
    setLocalVignette(Math.round(vignetteStrengthFromSettings * 100));
  }, [vignetteStrengthFromSettings]);

  useEffect(() => {
    setLocalOverlay(Math.round(overlayStrengthFromSettings * 100));
  }, [overlayStrengthFromSettings]);

  useEffect(() => {
    setLocalSpeedIdx(indexOfStep(snapToStep(speedFromSettings, SPEED_STEPS), SPEED_STEPS));
  }, [speedFromSettings]);

  useEffect(() => {
    setLocalMouseIdx(indexOfStep(snapToStep(mouseFromSettings, MOUSE_STEPS), MOUSE_STEPS));
  }, [mouseFromSettings]);

  useEffect(() => {
    setLocalNoiseIdx(indexOfStep(snapToStep(noiseFromSettings, NOISE_STEPS), NOISE_STEPS));
  }, [noiseFromSettings]);

  useEffect(() => {
    setLocalStarIdx(indexOfStep(snapToStep(starDensityFromSettings, STAR_STEPS), STAR_STEPS));
  }, [starDensityFromSettings]);

  const mutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      return apiRequest("PUT", "/api/platform-settings", entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({ title: "Shader settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  function save(key: string, value: string) {
    mutation.mutate({ [key]: value });
  }

  const enabled = settings["hero.shader.enabled"] !== "false";
  const palette = (settings["hero.shader.palette"] ?? "cosmic") as PaletteId;
  const colorBase = settings["hero.shader.colorBase"] ?? SHADER_DEFAULTS["hero.shader.colorBase"];
  const colorShadow = settings["hero.shader.colorShadow"] ?? SHADER_DEFAULTS["hero.shader.colorShadow"];
  const colorMid = settings["hero.shader.colorMid"] ?? SHADER_DEFAULTS["hero.shader.colorMid"];
  const colorHighlight = settings["hero.shader.colorHighlight"] ?? SHADER_DEFAULTS["hero.shader.colorHighlight"];
  const colorPeak = settings["hero.shader.colorPeak"] ?? SHADER_DEFAULTS["hero.shader.colorPeak"];

  function resetDefaults() {
    mutation.mutate({ ...SHADER_DEFAULTS });
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="shader" className="border rounded-lg px-4">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" />
            Shader
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Shader</p>
              <p className="text-xs text-muted-foreground">When off, a static gradient is shown instead.</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => save("hero.shader.enabled", v ? "true" : "false")}
              data-testid="switch-shader-enabled"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Animation Speed</Label>
              <span className="text-xs text-muted-foreground">{SPEED_STEPS[localSpeedIdx]?.label ?? "Normal"}</span>
            </div>
            <Slider
              min={0}
              max={SPEED_STEPS.length - 1}
              step={1}
              value={[localSpeedIdx]}
              onValueChange={([i]) => setLocalSpeedIdx(i)}
              onValueCommit={([i]) => save("hero.shader.speed", String(SPEED_STEPS[i].value))}
              data-testid="slider-shader-speed"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {SPEED_STEPS.map((s) => <span key={s.label}>{s.label}</span>)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mouse Sensitivity</Label>
              <span className="text-xs text-muted-foreground">{MOUSE_STEPS[localMouseIdx]?.label ?? "Medium"}</span>
            </div>
            <Slider
              min={0}
              max={MOUSE_STEPS.length - 1}
              step={1}
              value={[localMouseIdx]}
              onValueChange={([i]) => setLocalMouseIdx(i)}
              onValueCommit={([i]) => save("hero.shader.mouseStrength", String(MOUSE_STEPS[i].value))}
              data-testid="slider-shader-mouse"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {MOUSE_STEPS.map((s) => <span key={s.label}>{s.label}</span>)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Noise Scale</Label>
              <span className="text-xs text-muted-foreground">{NOISE_STEPS[localNoiseIdx]?.label ?? "Medium"}</span>
            </div>
            <Slider
              min={0}
              max={NOISE_STEPS.length - 1}
              step={1}
              value={[localNoiseIdx]}
              onValueChange={([i]) => setLocalNoiseIdx(i)}
              onValueCommit={([i]) => save("hero.shader.noiseScale", String(NOISE_STEPS[i].value))}
              data-testid="slider-shader-noise"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {NOISE_STEPS.map((s) => <span key={s.label}>{s.label}</span>)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Star Density</Label>
              <span className="text-xs text-muted-foreground">{STAR_STEPS[localStarIdx]?.label ?? "Normal"}</span>
            </div>
            <Slider
              min={0}
              max={STAR_STEPS.length - 1}
              step={1}
              value={[localStarIdx]}
              onValueChange={([i]) => setLocalStarIdx(i)}
              onValueCommit={([i]) => save("hero.shader.starDensity", String(STAR_STEPS[i].value))}
              data-testid="slider-shader-star-density"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {STAR_STEPS.map((s) => <span key={s.label}>{s.label}</span>)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Vignette Strength</Label>
              <span className="text-xs text-muted-foreground">{localVignette}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[localVignette]}
              onValueChange={([v]) => setLocalVignette(v)}
              onValueCommit={([v]) => save("hero.shader.vignetteStrength", String(v / 100))}
              data-testid="slider-shader-vignette"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Overlay Strength</Label>
              <span className="text-xs text-muted-foreground">{localOverlay}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[localOverlay]}
              onValueChange={([v]) => setLocalOverlay(v)}
              onValueCommit={([v]) => save("hero.shader.overlayStrength", String(v / 100))}
              data-testid="slider-shader-overlay"
            />
            <p className="text-xs text-muted-foreground">Controls the semi-transparent overlay that keeps text readable.</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm">Color Palette</Label>
            <Select
              value={palette}
              onValueChange={(v) => save("hero.shader.palette", v)}
            >
              <SelectTrigger data-testid="select-shader-palette">
                <SelectValue placeholder="Select palette" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cosmic">Cosmic Tide (default)</SelectItem>
                <SelectItem value="ocean">Deep Ocean</SelectItem>
                <SelectItem value="ember">Ember</SelectItem>
                <SelectItem value="midnight">Midnight</SelectItem>
                <SelectItem value="galactic">Galactic</SelectItem>
                <SelectItem value="nebula">Nebula</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {palette === "custom" && (
            <div className="space-y-3 pl-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Custom Colors</p>
              {[
                { key: "hero.shader.colorBase",      label: "Base",      value: colorBase },
                { key: "hero.shader.colorShadow",    label: "Shadow",    value: colorShadow },
                { key: "hero.shader.colorMid",       label: "Mid",       value: colorMid },
                { key: "hero.shader.colorHighlight", label: "Highlight", value: colorHighlight },
                { key: "hero.shader.colorPeak",      label: "Peak",      value: colorPeak },
              ].map(({ key, label, value }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="h-7 w-7 rounded-md border border-border"
                      style={{ backgroundColor: value }}
                    />
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => save(key, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                      data-testid={`color-picker-shader-${label.toLowerCase()}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={resetDefaults}
              disabled={mutation.isPending}
              data-testid="button-reset-shader"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
