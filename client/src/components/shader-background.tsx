/**
 * SEVCO ShaderBackground — "Cosmic Tide"
 *
 * A full-screen GLSL fragment shader rendered via React Three Fiber.
 * Creates fluid, organic plasma fields in SEVCO's brand palette:
 * deep navy-black → indigo → electric blue → crimson → blood-orange.
 *
 * Mouse position subtly warps the noise field. Uses double FBM (fractional
 * Brownian motion) for complex organic movement.
 *
 * Performance: low-poly plane (4 verts), capped DPR at 1.5, no post-processing.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/* ── Vertex shader ─────────────────────────────────────────────────────── */
// Bypasses camera/projection — positions quad directly in NDC clip space.
// PlaneGeometry(2, 2) spans exactly -1..1 in XY = full screen.
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
  uniform vec2  uMouse;   // normalized -1..1 from screen center

  varying vec2 vUv;

  /* ── Noise primitives ── */
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

  /* ── Fractal Brownian Motion (6 octaves) ── */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    // Slight rotation per octave prevents axis-aligned artifacts
    mat2 rot = mat2(0.87758, 0.47943, -0.47943, 0.87758);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.068;

    /* ── Mouse ripple distortion ── */
    vec2 m  = uMouse * 0.5 + 0.5;         // remap to 0..1
    float md = length(uv - m);
    // Radial ripple — strength falls off with distance
    uv += (uv - m) * sin(md * 9.0 - t * 4.5) * 0.013 / (md + 0.45);

    /* ── Domain-warped double FBM (iq technique) ── */
    vec2 q = vec2(
      fbm(uv + vec2(0.00, 0.00) + t * vec2(0.31, 0.17)),
      fbm(uv + vec2(5.24, 1.33) + t * vec2(0.19, 0.28))
    );

    vec2 r = vec2(
      fbm(uv + 4.0 * q + vec2(1.70, 9.20) + 0.150 * t),
      fbm(uv + 4.0 * q + vec2(8.30, 2.80) + 0.126 * t)
    );

    float f = fbm(uv + 4.0 * r);

    /* ── SEVCO color palette ──────────────────────────────────────────── */
    // Deep navy-black  #07071a
    vec3 colBlack   = vec3(0.027, 0.027, 0.102);
    // Deep indigo      #1f1066
    vec3 colIndigo  = vec3(0.122, 0.063, 0.400);
    // Electric blue    #1c54e0
    vec3 colBlue    = vec3(0.110, 0.330, 0.878);
    // SEVCO crimson    #be0007
    vec3 colRed     = vec3(0.745, 0.000, 0.027);
    // Blood-orange hot-spot  #d93b0c
    vec3 colOrange  = vec3(0.851, 0.231, 0.047);

    /* ── Multi-layer blending ── */
    vec3 col = colBlack;
    col = mix(col, colIndigo, smoothstep(0.00, 0.45, f));
    col = mix(col, colBlue,   smoothstep(0.25, 0.65, f) * clamp(r.x * 1.3, 0.0, 1.0));
    col = mix(col, colRed,    smoothstep(0.55, 0.85, f) * 0.68);
    col = mix(col, colOrange, smoothstep(0.78, 1.00, f) * 0.42);

    // Gentle gamma lift — opens up the shadows a touch
    col = pow(max(col, vec3(0.0)), vec3(0.76));

    /* ── Radial vignette ── */
    vec2 ctr = uv - 0.5;
    float vig = 1.0 - smoothstep(0.28, 1.15, dot(ctr, ctr) * 3.2);
    col = col * (vig * 0.88 + 0.12);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Animated mesh ────────────────────────────────────────────────────── */
interface PlaneProps {
  mouse: React.MutableRefObject<[number, number]>;
}

function ShaderPlane({ mouse }: PlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const target = useMemo(() => new THREE.Vector2(0, 0), []);

  const uniforms = useMemo(
    () => ({
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    target.set(mouse.current[0], mouse.current[1]);
    matRef.current.uniforms.uMouse.value.lerp(target, 0.055);
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
  /** Mutable ref updated by parent's onPointerMove — values in -1..1 NDC. */
  mouse: React.MutableRefObject<[number, number]>;
  className?: string;
}

export function ShaderBackground({ mouse, className }: ShaderBackgroundProps) {
  return (
    <Canvas
      className={className}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      frameloop="always"
      aria-hidden="true"
    >
      <ShaderPlane mouse={mouse} />
    </Canvas>
  );
}
