/**
 * SEVCO ShaderBackground — "Cosmic Tide / Galactic Space"
 *
 * A full-screen GLSL fragment shader rendered via React Three Fiber.
 * Creates fluid, organic plasma fields configurable via uniform props.
 *
 * Mouse position creates a curl/swirl in the dust clouds.
 * Stars twinkle across the field at multiple scales.
 * Uses double FBM (fractional Brownian motion) with warm/cool region
 * separation for multi-zone nebula coloring.
 *
 * Performance: low-poly plane (4 verts), capped DPR at 1.5, no post-processing.
 * Mobile: passes uMobile=1.0 to reduce FBM octaves to 3.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Component, useRef, useMemo, type ReactNode } from "react";
import * as THREE from "three";

/* ── WebGL support detection ─────────────────────────────────────────── */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
const WEBGL_SUPPORTED = typeof window !== "undefined" ? detectWebGL() : false;

/* ── WebGL error boundary (backup for unexpected mid-render failures) ── */
class ShaderErrorBoundary extends Component<
  { fallbackStyle?: React.CSSProperties; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            position: "absolute", inset: 0,
            background: this.props.fallbackStyle?.background ??
              "radial-gradient(ellipse at 60% 40%, #1a0a2e 0%, #0d0620 40%, #060412 100%)",
            ...this.props.fallbackStyle,
          }}
          aria-hidden="true"
        />
      );
    }
    return this.props.children;
  }
}

/* ── Palette presets ─────────────────────────────────────────────────── */
export type PaletteId = "cosmic" | "ocean" | "ember" | "midnight" | "galactic" | "nebula" | "custom";

export interface PaletteColors {
  base: string;
  shadow: string;
  mid: string;
  highlight: string;
  peak: string;
}

export const PALETTE_PRESETS: Record<Exclude<PaletteId, "custom">, PaletteColors> = {
  cosmic: {
    base:      "#0b0a29",
    shadow:    "#2d1480",
    mid:       "#1c54e0",
    highlight: "#be0007",
    peak:      "#ff5a14",
  },
  ocean: {
    base:      "#020d1a",
    shadow:    "#023a5c",
    mid:       "#0b7ea8",
    highlight: "#00ccd6",
    peak:      "#80f5ff",
  },
  ember: {
    base:      "#1a0400",
    shadow:    "#6b1a00",
    mid:       "#c04a00",
    highlight: "#e87b00",
    peak:      "#ffcc44",
  },
  midnight: {
    base:      "#010210",
    shadow:    "#050c2e",
    mid:       "#0d1f6e",
    highlight: "#1a3fbb",
    peak:      "#3a6af0",
  },
  galactic: {
    base:      "#000510",
    shadow:    "#080d3a",
    mid:       "#0c6e9a",
    highlight: "#7a1090",
    peak:      "#e8b020",
  },
  nebula: {
    base:      "#040008",
    shadow:    "#1a0040",
    mid:       "#8c0060",
    highlight: "#00a8c8",
    peak:      "#ff8c00",
  },
};

function hexToVec3(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/* ── Vertex shader ─────────────────────────────────────────────────────── */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* ── Fragment shader ────────────────────────────────────────────────────── */
const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uMobile;
  uniform float uTimeScale;
  uniform float uMouseStrength;
  uniform float uNoiseScale;
  uniform float uVignetteStrength;
  uniform float uStarDensity;

  uniform vec3 uColor0;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),              hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.87758, 0.47943, -0.47943, 0.87758);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float fbmLow(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.87758, 0.47943, -0.87758, 0.87758);
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float starLayer(vec2 uv, float scale, float threshold) {
    vec2 grid = floor(uv * scale);
    vec2 local = fract(uv * scale) - 0.5;
    float h = hash(grid);
    if (h < threshold) return 0.0;
    float norm = (h - threshold) / (1.0 - threshold);
    float size = 0.010 + norm * 0.018;
    float freq = 1.5 + h * 4.5;
    float phase = h * 6.28318;
    float twinkle = 0.45 + 0.55 * sin(uTime * freq + phase);
    return twinkle * smoothstep(size, size * 0.25, length(local));
  }

  float starField(vec2 uv) {
    float s = 0.0;
    s += starLayer(uv, 70.0, 0.960) * 0.60;
    s += starLayer(uv, 40.0, 0.920) * 1.10;
    s += starLayer(uv, 22.0, 0.870) * 1.80;
    s += starLayer(uv, 10.0, 0.820) * 3.20;
    return clamp(s, 0.0, 1.0);
  }

  float starFieldLow(vec2 uv) {
    float s = 0.0;
    s += starLayer(uv, 50.0, 0.960) * 0.70;
    s += starLayer(uv, 22.0, 0.900) * 1.50;
    return clamp(s, 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv * uNoiseScale;
    float t = uTime * uTimeScale * 0.10;

    vec2 mouseUV = (uMouse * 0.5 + 0.5) * uNoiseScale;
    vec2 toMouse = uv - mouseUV;
    float dist = length(toMouse);

    float swirlAngle = uMouseStrength * 1.8 * exp(-dist * dist * 1.6);
    float cosA = cos(swirlAngle);
    float sinA = sin(swirlAngle);
    uv = mouseUV + vec2(
        cosA * toMouse.x - sinA * toMouse.y,
        sinA * toMouse.x + cosA * toMouse.y
    );
    float pull = 0.05 / (dist * dist + 0.12);
    uv -= (uv - mouseUV) * pull * uMouseStrength * 0.06;

    vec2 q, r;
    float f;

    if (uMobile > 0.5) {
      q = vec2(
        fbmLow(uv + vec2(0.00, 0.00) + t * vec2(0.31, 0.17)),
        fbmLow(uv + vec2(5.24, 1.33) + t * vec2(0.19, 0.28))
      );
      r = vec2(
        fbmLow(uv + 4.0 * q + vec2(1.70, 9.20) + 0.150 * t),
        fbmLow(uv + 4.0 * q + vec2(8.30, 2.80) + 0.126 * t)
      );
      f = fbmLow(uv + 4.0 * r);
    } else {
      q = vec2(
        fbm(uv + vec2(0.00, 0.00) + t * vec2(0.31, 0.17)),
        fbm(uv + vec2(5.24, 1.33) + t * vec2(0.19, 0.28))
      );
      r = vec2(
        fbm(uv + 4.0 * q + vec2(1.70, 9.20) + 0.150 * t),
        fbm(uv + 4.0 * q + vec2(8.30, 2.80) + 0.126 * t)
      );
      f = fbm(uv + 4.0 * r);
    }

    float fCool, fWarm;
    if (uMobile > 0.5) {
      fCool = fbmLow(uv + 4.0 * q + vec2(2.3, 0.7) + t * 0.09);
      fWarm = fbmLow(uv + 4.0 * r + vec2(0.5, 3.1) + t * 0.07);
    } else {
      fCool = fbm(uv + 4.0 * q + vec2(2.3, 0.7) + t * 0.09);
      fWarm = fbm(uv + 4.0 * r + vec2(0.5, 3.1) + t * 0.07);
    }

    vec3 col = uColor0;
    col = mix(col, uColor1, smoothstep(0.00, 0.45, f));
    col = mix(col, uColor2, smoothstep(0.25, 0.68, fCool) * 0.85);
    col = mix(col, uColor3, smoothstep(0.48, 0.82, fWarm) * 0.80);
    col = mix(col, uColor4, smoothstep(0.72, 1.00, f) * 0.65);

    float bloom = exp(-dist * dist * 1.2) * uMouseStrength * 0.28;
    col = mix(col, uColor4 * 1.5, bloom);
    col = clamp(col, 0.0, 1.0);

    vec2 ctr = vUv - 0.5;
    float vig = 1.0 - smoothstep(0.30, 1.20, dot(ctr, ctr) * 2.8) * uVignetteStrength;
    col = col * vig;

    float stars = (uMobile > 0.5)
      ? starFieldLow(vUv * 2.0)
      : starField(vUv * 2.0);
    stars *= uStarDensity;

    vec3 starColor = mix(vec3(0.85, 0.90, 1.0), vec3(1.0, 0.95, 0.80), stars * 0.5);
    col = mix(col, starColor, stars * (0.85 - length(col) * 0.4));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Animated mesh ────────────────────────────────────────────────────── */
interface PlaneProps {
  mouse: React.MutableRefObject<[number, number]>;
  isMobile: boolean;
  timeScale: number;
  mouseStrength: number;
  noiseScale: number;
  vignetteStrength: number;
  paletteColors: [string, string, string, string, string];
  starDensity: number;
}

function ShaderPlane({ mouse, isMobile, timeScale, mouseStrength, noiseScale, vignetteStrength, paletteColors, starDensity }: PlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const target = useMemo(() => new THREE.Vector2(0, 0), []);

  const uniforms = useMemo(
    () => ({
      uTime:             { value: 0 },
      uMouse:            { value: new THREE.Vector2(0, 0) },
      uMobile:           { value: isMobile ? 1.0 : 0.0 },
      uTimeScale:        { value: timeScale },
      uMouseStrength:    { value: mouseStrength },
      uNoiseScale:       { value: noiseScale },
      uVignetteStrength: { value: vignetteStrength },
      uStarDensity:      { value: starDensity },
      uColor0: { value: new THREE.Vector3(...hexToVec3(paletteColors[0])) },
      uColor1: { value: new THREE.Vector3(...hexToVec3(paletteColors[1])) },
      uColor2: { value: new THREE.Vector3(...hexToVec3(paletteColors[2])) },
      uColor3: { value: new THREE.Vector3(...hexToVec3(paletteColors[3])) },
      uColor4: { value: new THREE.Vector3(...hexToVec3(paletteColors[4])) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = clock.getElapsedTime();
    u.uMobile.value = isMobile ? 1.0 : 0.0;
    u.uTimeScale.value = timeScale;
    u.uMouseStrength.value = mouseStrength;
    u.uNoiseScale.value = noiseScale;
    u.uVignetteStrength.value = vignetteStrength;
    u.uStarDensity.value = starDensity;
    const c = paletteColors.map(hexToVec3);
    u.uColor0.value.set(...c[0]);
    u.uColor1.value.set(...c[1]);
    u.uColor2.value.set(...c[2]);
    u.uColor3.value.set(...c[3]);
    u.uColor4.value.set(...c[4]);
    target.set(mouse.current[0], mouse.current[1]);
    u.uMouse.value.lerp(target, 0.10);
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

/* ── Public component ─────────────────────────────────────────────────── */
export interface ShaderBackgroundProps {
  mouse: React.MutableRefObject<[number, number]>;
  className?: string;
  isMobile?: boolean;
  timeScale?: number;
  mouseStrength?: number;
  noiseScale?: number;
  vignetteStrength?: number;
  paletteColors?: [string, string, string, string, string];
  starDensity?: number;
}

const DEFAULT_PALETTE: [string, string, string, string, string] = [
  PALETTE_PRESETS.cosmic.base,
  PALETTE_PRESETS.cosmic.shadow,
  PALETTE_PRESETS.cosmic.mid,
  PALETTE_PRESETS.cosmic.highlight,
  PALETTE_PRESETS.cosmic.peak,
];

export function ShaderBackground({
  mouse,
  className,
  isMobile = false,
  timeScale = 1.0,
  mouseStrength = 0.5,
  noiseScale = 1.0,
  vignetteStrength = 0.6,
  paletteColors = DEFAULT_PALETTE,
  starDensity = 0.67,
}: ShaderBackgroundProps) {
  if (!WEBGL_SUPPORTED) {
    return (
      <div
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 60% 40%, #1a0a2e 0%, #0d0620 40%, #060412 100%)",
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    <ShaderErrorBoundary>
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        className={className}
        gl={{ antialias: false, alpha: false, powerPreference: "default" }}
        dpr={[1, 1.5]}
        frameloop="always"
        aria-hidden="true"
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
        }}
      >
        <ShaderPlane
          mouse={mouse}
          isMobile={isMobile}
          timeScale={timeScale}
          mouseStrength={mouseStrength}
          noiseScale={noiseScale}
          vignetteStrength={vignetteStrength}
          paletteColors={paletteColors}
          starDensity={starDensity}
        />
      </Canvas>
    </ShaderErrorBoundary>
  );
}
