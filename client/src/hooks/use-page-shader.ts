import { useQuery } from "@tanstack/react-query";
import type { ShaderPreset } from "@shared/schema";

export interface PageShaderData {
  preset: ShaderPreset;
  params: Record<string, unknown>;
}

/**
 * Resolve the shader preset assigned to a given page key via
 * platform_settings (`shader.page.<pageKey>` → preset id).
 *
 * Returns `null` when no preset is assigned (or while loading), or
 * `{ preset, params }` where `params` is the normalized paramsJson
 * payload ready to feed into a renderer.
 */
export function usePageShader(pageKey: string): PageShaderData | null {
  const presetsQ = useQuery<ShaderPreset[]>({ queryKey: ["/api/shader-presets"] });
  const assignmentsQ = useQuery<Record<string, number | null>>({ queryKey: ["/api/shader-assignments"] });

  if (presetsQ.isLoading || assignmentsQ.isLoading) return null;
  const presetId = assignmentsQ.data?.[pageKey] ?? null;
  if (presetId == null) return null;
  const preset = presetsQ.data?.find((p) => p.id === presetId);
  if (!preset) return null;
  const raw = preset.paramsJson;
  const params: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return { preset, params };
}
