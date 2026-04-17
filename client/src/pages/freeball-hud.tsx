import { useMemo } from "react";
import * as THREE from "three";

export type CelestialKind = "voxel" | "moon" | "gas" | "asteroid" | "star";

export interface CompassBody {
  id: string;
  name: string;
  kind: CelestialKind;
  position: THREE.Vector3;
  discovered: boolean;
}

const KIND_COLOR: Record<CelestialKind, string> = {
  voxel: "#22c55e",
  moon: "#9ca3af",
  gas: "#fb923c",
  asteroid: "#a16207",
  star: "#facc15",
};

const COMPASS_RANGE = 6000;
const COMPASS_FOV = Math.PI; // ±90° — full forward hemisphere

interface CompassBarProps {
  spherePos: THREE.Vector3;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  bodies: CompassBody[];
  activeWaypointId: string | null;
}

export function CompassBar({ spherePos, forward, up, bodies, activeWaypointId }: CompassBarProps) {
  const right = useMemo(() => new THREE.Vector3().crossVectors(forward, up).normalize(), [forward, up]);

  const ticks = useMemo(() => {
    return bodies
      .map((b) => {
        const delta = new THREE.Vector3().subVectors(b.position, spherePos);
        const distance = delta.length();
        if (distance > COMPASS_RANGE || distance < 0.01) return null;
        // Project onto heading plane (perpendicular to up)
        const planar = delta.clone().projectOnPlane(up);
        if (planar.lengthSq() < 0.0001) return null;
        const fwdDot = planar.dot(forward);
        const rightDot = planar.dot(right);
        const angle = Math.atan2(rightDot, fwdDot);
        if (Math.abs(angle) > COMPASS_FOV / 2) return null;
        const x = 0.5 + angle / COMPASS_FOV; // 0..1
        return {
          id: b.id,
          name: b.name,
          kind: b.kind,
          distance: Math.round(distance),
          x,
          discovered: b.discovered,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [bodies, spherePos, forward, up, right]);

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 w-[min(720px,80vw)] h-10 pointer-events-none"
      data-testid="freeball-compass"
    >
      <div className="relative w-full h-full bg-black/40 border border-white/10 rounded backdrop-blur-sm">
        {/* Center forward marker */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-white/40" />
        {ticks.map((t) => (
          <div
            key={t.id}
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${t.x * 100}%`, transform: "translateX(-50%)" }}
            data-testid={`freeball-compass-tick-${t.id}`}
          >
            <div
              className="w-2 h-2 mt-1 rounded-full"
              style={{ backgroundColor: t.discovered ? KIND_COLOR[t.kind] : "rgba(255,255,255,0.3)" }}
            />
            <div
              className="text-[9px] font-mono leading-tight whitespace-nowrap mt-0.5"
              style={{
                color: t.discovered ? KIND_COLOR[t.kind] : "rgba(255,255,255,0.5)",
                fontWeight: t.id === activeWaypointId ? 700 : 400,
              }}
            >
              {t.discovered ? t.name : "?"}
            </div>
            <div
              className="text-[9px] font-mono leading-tight whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {t.distance}u
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SystemMapProps {
  spherePos: THREE.Vector3;
  forward: THREE.Vector3;
  bodies: CompassBody[];
  activeWaypointId: string | null;
  onSelectWaypoint: (id: string | null) => void;
  onClose: () => void;
}

const MAP_SIZE = 480;
const MAP_PAD = 40;

export function SystemMap({ spherePos, forward, bodies, activeWaypointId, onSelectWaypoint, onClose }: SystemMapProps) {
  // Top-down projection (XZ plane). Auto-fit to include all bodies + sphere.
  const bounds = useMemo(() => {
    let minX = spherePos.x;
    let maxX = spherePos.x;
    let minZ = spherePos.z;
    let maxZ = spherePos.z;
    for (const b of bodies) {
      minX = Math.min(minX, b.position.x);
      maxX = Math.max(maxX, b.position.x);
      minZ = Math.min(minZ, b.position.z);
      maxZ = Math.max(maxZ, b.position.z);
    }
    const span = Math.max(maxX - minX, maxZ - minZ, 100);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const half = span / 2 + 50;
    return { cx, cz, half };
  }, [bodies, spherePos]);

  const project = (x: number, z: number) => ({
    px: MAP_PAD + ((x - bounds.cx + bounds.half) / (bounds.half * 2)) * (MAP_SIZE - MAP_PAD * 2),
    py: MAP_PAD + ((z - bounds.cz + bounds.half) / (bounds.half * 2)) * (MAP_SIZE - MAP_PAD * 2),
  });

  const sphere = project(spherePos.x, spherePos.z);
  const headingTip = project(spherePos.x + forward.x * bounds.half * 0.15, spherePos.z + forward.z * bounds.half * 0.15);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/50 z-30"
      data-testid="freeball-system-map"
      onClick={onClose}
    >
      <div
        className="bg-gray-950/90 border border-white/20 rounded-xl p-4 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 w-[480px]">
          <div className="text-white text-sm font-bold tracking-wide">System Map</div>
          <button
            className="text-white/60 hover:text-white text-xs px-2 py-0.5 rounded border border-white/20"
            onClick={onClose}
            data-testid="freeball-system-map-close"
          >
            Close [M]
          </button>
        </div>
        <svg width={MAP_SIZE} height={MAP_SIZE} className="bg-black/60 rounded">
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#grid)" />

          {/* Bodies */}
          {bodies.map((b) => {
            const p = project(b.position.x, b.position.z);
            const color = b.discovered ? KIND_COLOR[b.kind] : "rgba(255,255,255,0.3)";
            const isWaypoint = b.id === activeWaypointId;
            return (
              <g
                key={b.id}
                style={{ cursor: b.discovered ? "pointer" : "not-allowed" }}
                onClick={() => {
                  if (!b.discovered) return;
                  onSelectWaypoint(b.id === activeWaypointId ? null : b.id);
                }}
                data-testid={`freeball-map-body-${b.id}`}
              >
                {isWaypoint && (
                  <circle cx={p.px} cy={p.py} r={14} fill="none" stroke="#60a5fa" strokeWidth={2} strokeDasharray="3 3" />
                )}
                {b.kind === "star" ? (
                  <circle cx={p.px} cy={p.py} r={8} fill={color} />
                ) : (
                  <circle cx={p.px} cy={p.py} r={6} fill={color} fillOpacity={b.discovered ? 1 : 0} stroke={color} strokeWidth={1.5} />
                )}
                <text
                  x={p.px + 10}
                  y={p.py + 4}
                  fontSize={11}
                  fontFamily="monospace"
                  fill={b.discovered ? "#e5e7eb" : "rgba(255,255,255,0.4)"}
                >
                  {b.discovered ? b.name : "?"}
                </text>
              </g>
            );
          })}

          {/* Sphere position + heading arrow */}
          <line x1={sphere.px} y1={sphere.py} x2={headingTip.px} y2={headingTip.py} stroke="#3b82f6" strokeWidth={2} />
          <circle cx={sphere.px} cy={sphere.py} r={5} fill="#3b82f6" />
          <circle cx={sphere.px} cy={sphere.py} r={9} fill="none" stroke="#3b82f6" strokeOpacity={0.4} />
        </svg>
        <div className="text-white/50 text-[10px] mt-2 font-mono">
          Click a discovered body to set waypoint · Press M to close
        </div>
      </div>
    </div>
  );
}

interface WaypointMarkerProps {
  spherePos: THREE.Vector3;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  body: CompassBody | null;
}

export function WaypointMarker({ spherePos, forward, up, body }: WaypointMarkerProps) {
  if (!body) return null;
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  const delta = new THREE.Vector3().subVectors(body.position, spherePos);
  const distance = Math.round(delta.length());
  const planar = delta.clone().projectOnPlane(up);
  const fwdDot = planar.dot(forward);
  const rightDot = planar.dot(right);
  const angle = Math.atan2(rightDot, fwdDot);
  const onScreen = Math.abs(angle) < COMPASS_FOV / 2 && fwdDot > 0;
  // Off-screen: pin to left/right edge with directional chevron
  const xPct = onScreen ? 50 + (angle / COMPASS_FOV) * 100 : angle > 0 ? 96 : 4;
  const chevron = onScreen ? "→" : angle > 0 ? "»" : "«";
  return (
    <div
      className="absolute top-16 pointer-events-none"
      style={{ left: `${xPct}%`, transform: "translateX(-50%)" }}
      data-testid="freeball-waypoint-marker"
    >
      <div className="bg-blue-500/20 text-blue-200 border border-blue-400/60 rounded-md px-2 py-1 text-[11px] font-mono backdrop-blur-sm whitespace-nowrap">
        {chevron} {body.name} · {distance}u
      </div>
    </div>
  );
}
