/**
 * SEVCO ShaderHeroBackground — "Magnetic Tide"
 *
 * A full-screen GLSL fragment shader rendered via React Three Fiber.
 * Cinematic plasma field with vivid indigo/blue/crimson palette and
 * magnetic mouse-attraction effect.
 *
 * Performance: low-poly plane (4 verts), capped DPR at 1.5, no post-processing.
 * Mobile: passes uMobile=1.0 to reduce FBM octaves to 3.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

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
  uniform vec2  uMouse;   // normalized -1..1 from screen center
  uniform float uMobile;  // 1.0 on low-power devices, 0.0 otherwise

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
      mix(hash(i),               hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  /* ── FBM — 5 octaves desktop, 3 octaves mobile ── */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.87758, 0.47943, -0.47943, 0.87758);
    /* Unroll to 5; skip last 2 on mobile via early blend */
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p  = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float fbmLow(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.87758, 0.47943, -0.47943, 0.87758);
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p  = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.18;

    /* ── Magnetic mouse attractor ── */
    vec2 m = uMouse * 0.5 + 0.5;     // remap mouse to 0..1 UV space
    vec2 toMouse = m - uv;
    float dist = length(toMouse);
    /* Pull the UV toward the mouse — like a magnetic field or light source */
    float pull = 0.10 / (dist * dist + 0.08);
    uv += toMouse * pull * 0.10;

    /* ── Domain-warped double FBM (iq technique) ── */
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

    /* ── Brightened SEVCO color palette ── */
    /* Lifted floor — no pure black */
    vec3 colDark   = vec3(0.045, 0.040, 0.160);  /* deep indigo-black */
    vec3 colIndigo = vec3(0.18,  0.08,  0.58);   /* vivid indigo */
    vec3 colBlue   = vec3(0.14,  0.42,  1.00);   /* electric blue */
    vec3 colRed    = vec3(0.90,  0.02,  0.05);   /* SEVCO crimson */
    vec3 colOrange = vec3(1.00,  0.35,  0.08);   /* blood-orange bloom */

    /* ── Multi-layer blending ── */
    vec3 col = colDark;
    col = mix(col, colIndigo, smoothstep(0.00, 0.40, f));
    col = mix(col, colBlue,   smoothstep(0.22, 0.60, f) * clamp(r.x * 1.5, 0.0, 1.0));
    col = mix(col, colRed,    smoothstep(0.50, 0.82, f) * 0.72);
    col = mix(col, colOrange, smoothstep(0.74, 1.00, f) * 0.55);

    /* ── Bloom near mouse cursor ── */
    float bloom = smoothstep(0.35, 0.0, dist);
    col = mix(col, colOrange * 1.4, bloom * 0.18);

    /* ── No gamma crush — keep luminance open ── */
    col = clamp(col, 0.0, 1.0);

    /* ── Subtle radial vignette (softer than before) ── */
    vec2 ctr = uv - 0.5;
    float vig = 1.0 - smoothstep(0.30, 1.20, dot(ctr, ctr) * 2.8);
    col = col * (vig * 0.90 + 0.10);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Animated mesh ────────────────────────────────────────────────────── */
interface PlaneProps {
  mouse: React.MutableRefObject<[number, number]>;
  isMobile: boolean;
}

function ShaderPlane({ mouse, isMobile }: PlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const target = useMemo(() => new THREE.Vector2(0, 0), []);

  const uniforms = useMemo(
    () => ({
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uMobile: { value: isMobile ? 1.0 : 0.0 },
    }),
    [isMobile]
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    target.set(mouse.current[0], mouse.current[1]);
    matRef.current.uniforms.uMouse.value.lerp(target, 0.10);
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
export interface ShaderHeroBackgroundProps {
  mouse: React.MutableRefObject<[number, number]>;
  isMobile?: boolean;
}

export function ShaderHeroBackground({ mouse, isMobile = false }: ShaderHeroBackgroundProps) {
  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
      frameloop="always"
      aria-hidden="true"
    >
      <ShaderPlane mouse={mouse} isMobile={isMobile} />
    </Canvas>
  );
}
