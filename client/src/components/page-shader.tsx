/**
 * <PageShader pageKey="..." /> — drop-in fixed background that resolves the
 * preset assigned to a page in the Shader Studio. Renders nothing if no
 * preset is assigned, the user prefers reduced motion, or data is loading.
 *
 * Optionally accepts a `fallback` to render in the same wrapper while loading
 * or when no preset is configured (e.g. the existing ShaderHeroBackground).
 */

import { useEffect, useState, type ReactNode } from "react";
import { MultiLayerShaderCanvas, presetToLayers } from "./shader-canvas";
import { usePageShader } from "@/hooks/use-page-shader";
import type { ShaderEffectType } from "@shared/schema";

export interface PageShaderProps {
  pageKey: string;
  className?: string;
  fallback?: ReactNode;
}

export function PageShader({ pageKey, className, fallback }: PageShaderProps) {
  const data = usePageShader(pageKey);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Honor the global "mobile fallback" toggle: skip on small viewports if requested.
  const mobileFallback = data?.params.mobileFallback === true;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  if (!data || reduced || (mobileFallback && isMobile)) {
    return fallback ? <>{fallback}</> : null;
  }

  const layers = presetToLayers(
    data.preset.effectType as ShaderEffectType,
    data.params,
  );
  const globalSpeed = typeof data.params.globalSpeed === "number" ? data.params.globalSpeed : 1.0;
  return (
    <div className={className} aria-hidden="true" data-testid={`shader-page-${pageKey}`}>
      <MultiLayerShaderCanvas layers={layers} globalSpeed={globalSpeed} />
    </div>
  );
}
