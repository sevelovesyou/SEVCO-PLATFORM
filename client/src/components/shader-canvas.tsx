/**
 * ShaderCanvas — unified WebGL renderer supporting all Shader Studio effects.
 *
 * Picks among 10 fragment shader effects via the `effect` prop and feeds
 * declarative params (intensity, speed, palette, …) as uniforms. Capped DPR
 * 1.5, pauses on document.hidden, and respects prefers-reduced-motion (via the
 * caller, which can simply not mount this component).
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  PALETTE_PRESETS,
  type PaletteId,
} from "./shader-background";
import type { ShaderEffectType } from "@shared/schema";

function hexToVec3(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  ];
}

function paletteToColors(p: PaletteId | string | undefined): [string, string, string, string, string] {
  const id = (p ?? "cosmic") as Exclude<PaletteId, "custom">;
  const pp = PALETTE_PRESETS[id] ?? PALETTE_PRESETS.cosmic;
  return [pp.base, pp.shadow, pp.mid, pp.highlight, pp.peak];
}

const EFFECT_INDEX: Record<ShaderEffectType, number> = {
  "plasma": 0,
  // classic-plasma uses the same shader path as plasma to preserve the original
  // legacy hero look; it is exposed as its own effect type so saved presets
  // referencing the six legacy palettes remain valid and identifiable.
  "classic-plasma": 0,
  "mesh-gradient": 1,
  "liquid-chrome": 2,
  "paint-flow": 3,
  "swirl": 4,
  "blob": 5,
  "wave-distortion": 6,
  "chromatic-aberration": 7,
  "glow": 8,
  "film-grain": 9,
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uParamA;
  uniform float uParamB;
  uniform int   uEffect;
  uniform vec3  uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
  }
  float fbm(vec2 p){
    float v=0.0,a=0.5; mat2 r=mat2(0.87758,0.47943,-0.47943,0.87758);
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p=r*p*2.0+vec2(100.0); a*=0.5; } return v;
  }
  vec3 palette(float t){
    t=clamp(t,0.0,1.0);
    vec3 c=uC0;
    c=mix(c,uC1,smoothstep(0.0,0.30,t));
    c=mix(c,uC2,smoothstep(0.20,0.55,t));
    c=mix(c,uC3,smoothstep(0.50,0.80,t));
    c=mix(c,uC4,smoothstep(0.75,1.00,t));
    return c;
  }

  vec3 effectPlasma(vec2 uv, float t){
    vec2 q=vec2(fbm(uv+t*vec2(0.31,0.17)), fbm(uv+vec2(5.2,1.3)+t*vec2(0.19,0.28)));
    vec2 r=vec2(fbm(uv+4.0*q+vec2(1.7,9.2)+0.15*t), fbm(uv+4.0*q+vec2(8.3,2.8)+0.13*t));
    float f=fbm(uv+4.0*r);
    return palette(f * uIntensity);
  }
  vec3 effectMesh(vec2 uv, float t){
    vec3 c=vec3(0.0);
    for(int i=0;i<4;i++){
      float fi=float(i);
      vec2 p=vec2(0.5+0.4*sin(t*0.5+fi*1.7), 0.5+0.4*cos(t*0.6+fi*2.1));
      float d=length(uv-p);
      float w=exp(-d*d*(2.0+uParamA*4.0));
      vec3 col=palette(fract(fi*0.27 + uParamA));
      c+=col*w;
    }
    return c*uIntensity;
  }
  vec3 effectLiquidChrome(vec2 uv, float t){
    float n=fbm(uv*2.5+vec2(t*0.3,0.0));
    float n2=fbm(uv*2.5+vec2(0.0,t*0.4)+n);
    float v=0.5+0.5*sin((n+n2)*6.2831*uIntensity);
    vec3 c=palette(v);
    c*=uParamA; // contrast
    return c;
  }
  vec3 effectPaintFlow(vec2 uv, float t){
    vec2 d=vec2(fbm(uv*1.5+t*0.2), fbm(uv*1.5+10.0+t*0.2));
    float f=fbm(uv*2.0 + d*(1.5+uParamA*1.5));
    return palette(f*uIntensity);
  }
  vec3 effectSwirl(vec2 uv, float t){
    vec2 c=uv-0.5;
    float a=atan(c.y,c.x);
    float r=length(c);
    a += sin(t*0.4)*uParamA + r*uIntensity*3.0;
    vec2 p=vec2(cos(a),sin(a))*r+0.5;
    float f=fbm(p*3.0+t*0.1);
    return palette(f);
  }
  vec3 effectBlob(vec2 uv, float t){
    float v=0.0;
    int N=int(clamp(uParamA, 1.0, 8.0));
    for(int i=0;i<8;i++){
      if(i>=N) break;
      float fi=float(i);
      vec2 p=vec2(0.5+0.35*sin(t*0.4+fi*1.9), 0.5+0.35*cos(t*0.5+fi*1.3));
      float d=length(uv-p);
      v+=0.05/(d*d+0.01);
    }
    v=clamp(v*0.1*uIntensity,0.0,1.0);
    return palette(v);
  }
  vec3 effectWave(vec2 uv, float t){
    float freq=uParamB;
    uv.y += sin(uv.x*freq + t*1.2)*uParamA*0.2;
    uv.x += cos(uv.y*freq + t*0.9)*uParamA*0.15;
    float f=fbm(uv*2.0+t*0.05);
    return palette(f*uIntensity);
  }
  vec3 effectChromatic(vec2 uv, float t){
    float sep=uParamA;
    float r=fbm(uv*2.0+vec2(sep,0.0)+t*0.1);
    float g=fbm(uv*2.0+t*0.1);
    float b=fbm(uv*2.0-vec2(sep,0.0)+t*0.1);
    return mix(palette(g), vec3(palette(r).r, palette(g).g, palette(b).b), uIntensity);
  }
  vec3 effectGlow(vec2 uv, float t){
    float d=length(uv-0.5);
    float halo=exp(-d*d*(4.0-uIntensity*2.0));
    float f=fbm(uv*1.5+t*0.1);
    vec3 base=palette(f*0.6);
    return base + palette(0.85)*halo*uIntensity*0.8;
  }
  vec3 effectFilmGrain(vec2 uv, float t){
    float f=fbm(uv*1.5+t*0.05);
    vec3 base=palette(f);
    float g=hash(uv*vec2(1024.0,1024.0)+t)*2.0-1.0;
    return clamp(base + g*uParamA + uParamB*0.05, 0.0, 1.0);
  }

  void main(){
    vec2 uv=vUv;
    float t=uTime*uSpeed;
    vec3 col;
    if(uEffect==0) col=effectPlasma(uv*1.5, t*0.10);
    else if(uEffect==1) col=effectMesh(uv, t*0.10);
    else if(uEffect==2) col=effectLiquidChrome(uv, t*0.10);
    else if(uEffect==3) col=effectPaintFlow(uv, t*0.10);
    else if(uEffect==4) col=effectSwirl(uv, t*0.10);
    else if(uEffect==5) col=effectBlob(uv, t*0.10);
    else if(uEffect==6) col=effectWave(uv, t*0.10);
    else if(uEffect==7) col=effectChromatic(uv, t*0.10);
    else if(uEffect==8) col=effectGlow(uv, t*0.10);
    else col=effectFilmGrain(uv, t*0.10);

    // mild vignette for depth
    vec2 ctr=vUv-0.5;
    col *= 1.0 - smoothstep(0.30,1.20,dot(ctr,ctr)*2.8)*0.4;
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
  }
`;

interface PlaneProps {
  effect: ShaderEffectType;
  speed: number;
  intensity: number;
  paramA: number;
  paramB: number;
  paletteColors: [string, string, string, string, string];
  paused: boolean;
}

function Plane({ effect, speed, intensity, paramA, paramB, paletteColors, paused, onFps }: PlaneProps & { onFps?: (fps: number) => void }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const fpsAccRef = useRef({ count: 0, t0: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uIntensity: { value: intensity },
      uParamA: { value: paramA },
      uParamB: { value: paramB },
      uEffect: { value: EFFECT_INDEX[effect] },
      uC0: { value: new THREE.Vector3(...hexToVec3(paletteColors[0])) },
      uC1: { value: new THREE.Vector3(...hexToVec3(paletteColors[1])) },
      uC2: { value: new THREE.Vector3(...hexToVec3(paletteColors[2])) },
      uC3: { value: new THREE.Vector3(...hexToVec3(paletteColors[3])) },
      uC4: { value: new THREE.Vector3(...hexToVec3(paletteColors[4])) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    const now = clock.getElapsedTime();
    const dt = now - lastRef.current;
    lastRef.current = now;
    if (!paused) accRef.current += dt;
    u.uTime.value = accRef.current;
    u.uSpeed.value = speed;
    u.uIntensity.value = intensity;
    u.uParamA.value = paramA;
    u.uParamB.value = paramB;
    u.uEffect.value = EFFECT_INDEX[effect];
    const c = paletteColors.map(hexToVec3);
    u.uC0.value.set(...c[0]);
    u.uC1.value.set(...c[1]);
    u.uC2.value.set(...c[2]);
    u.uC3.value.set(...c[3]);
    u.uC4.value.set(...c[4]);
    if (onFps) {
      const acc = fpsAccRef.current;
      acc.count += 1;
      if (acc.t0 === 0) acc.t0 = now;
      if (now - acc.t0 >= 0.5) {
        onFps(Math.round(acc.count / (now - acc.t0)));
        acc.count = 0;
        acc.t0 = now;
      }
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export type ShaderParamValue = number | string | boolean | undefined;
export type ShaderParams = Record<string, ShaderParamValue>;

export interface ShaderCanvasProps {
  effect: ShaderEffectType;
  params?: ShaderParams;
  className?: string;
  /** Override paletteColors instead of resolving from params.palette */
  paletteColors?: [string, string, string, string, string];
}

export function ShaderCanvas({ effect, params = {}, className, paletteColors, onFps }: ShaderCanvasProps & { onFps?: (fps: number) => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const speed = typeof params.speed === "number" ? params.speed : 1.0;
  const intensity = typeof params.intensity === "number" ? params.intensity : 1.0;
  const paramA = (() => {
    if (typeof params.paramA === "number") return params.paramA;
    // sensible per-effect defaults
    switch (effect) {
      case "mesh-gradient": return params.hueShift ?? 0.0;
      case "liquid-chrome": return params.contrast ?? 1.2;
      case "paint-flow":    return params.viscosity ?? 0.5;
      case "swirl":         return params.twist ?? 1.5;
      case "blob":          return params.blobs ?? 5;
      case "wave-distortion": return params.amplitude ?? 0.4;
      case "chromatic-aberration": return params.separation ?? 0.02;
      case "film-grain":    return params.grain ?? 0.25;
      default: return 0;
    }
  })();
  const paramB = (() => {
    if (typeof params.paramB === "number") return params.paramB;
    switch (effect) {
      case "mesh-gradient": return params.blendSoftness ?? 0.7;
      case "liquid-chrome": return params.tint ?? 0.0;
      case "wave-distortion": return params.frequency ?? 6.0;
      case "film-grain":    return params.tint ?? 0.0;
      default: return 0;
    }
  })();

  const colors = paletteColors ?? paletteToColors(params.palette);

  return (
    <Canvas
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      className={className}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      frameloop={hidden ? "never" : "always"}
      aria-hidden="true"
    >
      <Plane
        effect={effect}
        speed={speed}
        intensity={intensity}
        paramA={paramA}
        paramB={paramB}
        paletteColors={colors}
        paused={hidden}
        onFps={onFps}
      />
    </Canvas>
  );
}

/* ── Multi-layer support ─────────────────────────────────────────────── */
export interface ShaderLayer {
  id: string;
  effectType: ShaderEffectType;
  params: ShaderParams;
  enabled: boolean;
  /** CSS mix-blend-mode for compositing (default: "screen"). */
  blend?: BlendMode;
  /** Layer opacity 0–1 (default: 1). */
  opacity?: number;
  /** Horizontal offset in % (default: 0). */
  offsetX?: number;
  /** Vertical offset in % (default: 0). */
  offsetY?: number;
}

export type BlendMode = "normal" | "screen" | "overlay" | "multiply" | "lighten";

/** Convert a stored preset's paramsJson into a layers array (back-compat). */
export function presetToLayers(
  effectType: ShaderEffectType,
  paramsJson: Record<string, unknown> | null | undefined,
): ShaderLayer[] {
  const json = paramsJson ?? {};
  const layersField = (json as { layers?: unknown }).layers;
  if (Array.isArray(layersField) && layersField.length > 0) {
    return layersField.map((raw, i): ShaderLayer => {
      const l = (raw && typeof raw === "object" ? raw : {}) as Partial<ShaderLayer> & {
        id?: string;
        effectType?: string;
        params?: ShaderParams;
        enabled?: boolean;
        blend?: BlendMode;
        opacity?: number;
        offsetX?: number;
        offsetY?: number;
      };
      return {
        id: l.id ?? `layer-${i}`,
        effectType: (l.effectType ?? effectType) as ShaderEffectType,
        params: l.params ?? {},
        enabled: l.enabled !== false,
        blend: l.blend ?? "screen",
        opacity: typeof l.opacity === "number" ? l.opacity : 1,
        offsetX: typeof l.offsetX === "number" ? l.offsetX : 0,
        offsetY: typeof l.offsetY === "number" ? l.offsetY : 0,
      };
    });
  }
  return [{
    id: "layer-0",
    effectType,
    params: json as ShaderParams,
    enabled: true,
    blend: "normal",
  }];
}

/** Render an ordered stack of ShaderCanvas layers using CSS blending. */
export function MultiLayerShaderCanvas({
  layers,
  className,
  onFps,
  globalSpeed = 1.0,
}: {
  layers: ShaderLayer[];
  className?: string;
  onFps?: (fps: number) => void;
  /** Multiplier applied to every layer's `speed` param before rendering. */
  globalSpeed?: number;
}) {
  const visible = layers.filter((l) => l.enabled);
  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      {visible.map((layer, i) => {
        const baseSpeed = typeof layer.params.speed === "number" ? layer.params.speed : 1.0;
        const scaledParams: ShaderParams = { ...layer.params, speed: baseSpeed * globalSpeed };
        return (
          <div
            key={layer.id}
            style={{
              position: "absolute",
              inset: 0,
              mixBlendMode: i === 0 ? "normal" : (layer.blend ?? "screen"),
              opacity: layer.opacity ?? 1,
              transform: `translate(${layer.offsetX ?? 0}%, ${layer.offsetY ?? 0}%)`,
            }}
          >
            <ShaderCanvas
              effect={layer.effectType}
              params={scaledParams}
              onFps={i === 0 ? onFps : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Per-effect parameter schema for the Studio middle panel ─────────── */
export interface ShaderParamSpec {
  key: string;
  label: string;
  type: "range" | "palette";
  min?: number;
  max?: number;
  step?: number;
  default: any;
}

export const EFFECT_PARAM_SCHEMA: Record<ShaderEffectType, ShaderParamSpec[]> = {
  "plasma": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 1.0 },
    { key: "intensity", label: "Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "cosmic" },
  ],
  "classic-plasma": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 1.0 },
    { key: "intensity", label: "Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "cosmic" },
  ],
  "mesh-gradient": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.5 },
    { key: "hueShift", label: "Hue Shift", type: "range", min: 0, max: 1, step: 0.01, default: 0.0 },
    { key: "blendSoftness", label: "Blend Softness", type: "range", min: 0.1, max: 2, step: 0.05, default: 0.7 },
    { key: "palette", label: "Palette", type: "palette", default: "nebula" },
  ],
  "liquid-chrome": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.8 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2, step: 0.05, default: 1.2 },
    { key: "tint", label: "Tint", type: "range", min: -1, max: 1, step: 0.05, default: 0.0 },
    { key: "palette", label: "Palette", type: "palette", default: "midnight" },
  ],
  "paint-flow": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.7 },
    { key: "viscosity", label: "Viscosity", type: "range", min: 0, max: 1.5, step: 0.05, default: 0.5 },
    { key: "intensity", label: "Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "ember" },
  ],
  "swirl": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.9 },
    { key: "twist", label: "Twist", type: "range", min: 0.1, max: 5, step: 0.1, default: 1.5 },
    { key: "intensity", label: "Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "cosmic" },
  ],
  "blob": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.6 },
    { key: "blobs", label: "Blob Count", type: "range", min: 1, max: 8, step: 1, default: 5 },
    { key: "intensity", label: "Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "ocean" },
  ],
  "wave-distortion": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 1.0 },
    { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 1.5, step: 0.05, default: 0.4 },
    { key: "frequency", label: "Frequency", type: "range", min: 1, max: 20, step: 0.5, default: 6.0 },
    { key: "palette", label: "Palette", type: "palette", default: "ocean" },
  ],
  "chromatic-aberration": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.5 },
    { key: "separation", label: "Separation", type: "range", min: 0, max: 0.2, step: 0.005, default: 0.02 },
    { key: "intensity", label: "Mix", type: "range", min: 0, max: 1, step: 0.05, default: 1.0 },
    { key: "palette", label: "Palette", type: "palette", default: "galactic" },
  ],
  "glow": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 0.4 },
    { key: "intensity", label: "Glow Intensity", type: "range", min: 0.2, max: 2, step: 0.05, default: 0.8 },
    { key: "palette", label: "Palette", type: "palette", default: "midnight" },
  ],
  "film-grain": [
    { key: "speed", label: "Speed", type: "range", min: 0.1, max: 3, step: 0.05, default: 1.0 },
    { key: "grain", label: "Grain", type: "range", min: 0, max: 1, step: 0.02, default: 0.25 },
    { key: "tint", label: "Tint", type: "range", min: -1, max: 1, step: 0.05, default: 0.0 },
    { key: "palette", label: "Palette", type: "palette", default: "midnight" },
  ],
};

export const EFFECT_LABELS: Record<ShaderEffectType, string> = {
  "plasma": "Plasma",
  "classic-plasma": "Classic Plasma",
  "mesh-gradient": "Mesh Gradient",
  "liquid-chrome": "Liquid Chrome",
  "paint-flow": "Paint Flow",
  "swirl": "Swirl",
  "blob": "Blob Field",
  "wave-distortion": "Wave Distortion",
  "chromatic-aberration": "Chromatic Aberration",
  "glow": "Soft Glow",
  "film-grain": "Film Grain",
};
