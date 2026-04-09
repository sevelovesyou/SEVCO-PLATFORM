import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars, PointerLockControls, Html } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { create } from "zustand";
import { createNoise2D } from "simplex-noise";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Planet {
  id: number;
  name: string;
  seed: number;
  type: string;
  size: number;
}

interface Progress {
  userId: string;
  currentPlanetId: number | null;
  sparksSpent: number;
  unlockedSphere: boolean;
  inventory: Record<string, number>;
}

interface ChatMsg {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

interface OtherPlayer {
  userId: string;
  username: string;
  x: number;
  y: number;
  z: number;
  planetId: number;
}

interface SavedBuild {
  chunkX: number;
  chunkY: number;
  chunkZ: number;
  voxelData: Record<string, number>;
}

interface CurrentUser {
  username: string;
}

const BLOCK_TYPES = [
  { id: 1,  name: "Grass",            color: 0x4CAF50 },
  { id: 2,  name: "Dirt",             color: 0x8B6914 },
  { id: 3,  name: "Stone",            color: 0x9E9E9E },
  { id: 4,  name: "Wood",             color: 0xA0522D },
  { id: 5,  name: "Glass",            color: 0xB2EBF2 },
  { id: 6,  name: "SEVCO-Blue Metal", color: 0x1565C0 },
  { id: 7,  name: "Crystal",          color: 0xE1F5FE },
  { id: 8,  name: "Music Node",       color: 0xFF6F00 },
  { id: 9,  name: "Project Tile",     color: 0x6A1B9A },
  { id: 10, name: "Sand",             color: 0xF9A825 },
  { id: 11, name: "Snow",             color: 0xECEFF1 },
  { id: 12, name: "Void Block",       color: 0x212121 },
] as const;

const CRYSTAL_ID = 7;
const CRYSTAL_CRAFT_AMOUNT = 20;
const SPHERE_SPARKS_COST = 500;
const CHUNK_SIZE = 16;
const FLOAT_ORIGIN_SNAP = 64;
const SPACE_ALTITUDE = 60;

interface GameStore {
  selectedBlock: number;
  setSelectedBlock: (b: number) => void;
  speed: number;
  altitude: number;
  setSpeed: (s: number) => void;
  setAltitude: (a: number) => void;
  inVehicle: boolean;
  setInVehicle: (v: boolean) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  pointerLocked: boolean;
  setPointerLocked: (l: boolean) => void;
  thirdPerson: boolean;
  setThirdPerson: (t: boolean) => void;
  crystalsCollected: number;
  setCrystalsCollected: (c: number) => void;
  showTab: boolean;
  setShowTab: (s: boolean) => void;
  renderDistance: number;
  setRenderDistance: (d: number) => void;
}

const useGameStore = create<GameStore>((set) => ({
  selectedBlock: 1,
  setSelectedBlock: (b) => set({ selectedBlock: b }),
  speed: 0,
  altitude: 0,
  setSpeed: (s) => set({ speed: s }),
  setAltitude: (a) => set({ altitude: a }),
  inVehicle: false,
  setInVehicle: (v) => set({ inVehicle: v }),
  paused: false,
  setPaused: (p) => set({ paused: p }),
  pointerLocked: false,
  setPointerLocked: (l) => set({ pointerLocked: l }),
  thirdPerson: false,
  setThirdPerson: (t) => set({ thirdPerson: t }),
  crystalsCollected: 0,
  setCrystalsCollected: (c) => set({ crystalsCollected: c }),
  showTab: false,
  setShowTab: (s) => set({ showTab: s }),
  renderDistance: 3,
  setRenderDistance: (d) => set({ renderDistance: d }),
}));

function generateChunk(cx: number, cz: number, seed: number): Uint8Array {
  const noise2D = createNoise2D(() => (seed * 0.987654321 + cx * 0.31 + cz * 0.17) % 1);
  const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const n = noise2D(wx * 0.05, wz * 0.05);
      const height = Math.floor(((n + 1) / 2) * 8) + 4;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        let block = 0;
        if (ly < height - 3) block = 3;
        else if (ly < height - 1) block = 2;
        else if (ly === height - 1) block = 1;
        if (block === 3 && Math.abs(noise2D(wx * 0.3, wz * 0.3)) > 0.85) block = CRYSTAL_ID;
        data[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE] = block;
      }
    }
  }
  return data;
}

function getBlock(data: Uint8Array, lx: number, ly: number, lz: number): number {
  if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return 0;
  return data[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
}

function setBlock(data: Uint8Array, lx: number, ly: number, lz: number, val: number): Uint8Array {
  const copy = new Uint8Array(data);
  copy[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE] = val;
  return copy;
}

interface ChunkGeo {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

// Greedy meshing: merges adjacent coplanar same-type faces into quads
function buildChunkGeometry(data: Uint8Array): ChunkGeo | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const AXES = [
    { u: 1, v: 2, w: 0, dir: 1,  normal: [1, 0, 0]  },
    { u: 1, v: 2, w: 0, dir: -1, normal: [-1, 0, 0] },
    { u: 0, v: 2, w: 1, dir: 1,  normal: [0, 1, 0]  },
    { u: 0, v: 2, w: 1, dir: -1, normal: [0, -1, 0] },
    { u: 0, v: 1, w: 2, dir: 1,  normal: [0, 0, 1]  },
    { u: 0, v: 1, w: 2, dir: -1, normal: [0, 0, -1] },
  ] as const;

  for (const { u, v, w, dir, normal } of AXES) {
    for (let layer = 0; layer < CHUNK_SIZE; layer++) {
      const mask = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
      for (let a = 0; a < CHUNK_SIZE; a++) {
        for (let b = 0; b < CHUNK_SIZE; b++) {
          const coord: [number, number, number] = [0, 0, 0];
          coord[w] = layer;
          coord[u] = a;
          coord[v] = b;
          const cur = getBlock(data, coord[0], coord[1], coord[2]);
          const neighborLayer = layer + dir;
          let neighbor = 0;
          if (neighborLayer >= 0 && neighborLayer < CHUNK_SIZE) {
            const nc: [number, number, number] = [0, 0, 0];
            nc[w] = neighborLayer;
            nc[u] = a;
            nc[v] = b;
            neighbor = getBlock(data, nc[0], nc[1], nc[2]);
          }
          mask[a + b * CHUNK_SIZE] = (cur !== 0 && neighbor === 0) ? cur : 0;
        }
      }

      const used = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
      for (let a = 0; a < CHUNK_SIZE; a++) {
        for (let b = 0; b < CHUNK_SIZE; b++) {
          const idx = a + b * CHUNK_SIZE;
          if (used[idx] || mask[idx] === 0) continue;
          const blockType = mask[idx];

          let width = 1;
          while (a + width < CHUNK_SIZE && !used[(a + width) + b * CHUNK_SIZE] && mask[(a + width) + b * CHUNK_SIZE] === blockType) width++;

          let height = 1;
          outer: while (b + height < CHUNK_SIZE) {
            for (let k = a; k < a + width; k++) {
              if (used[k + (b + height) * CHUNK_SIZE] || mask[k + (b + height) * CHUNK_SIZE] !== blockType) break outer;
            }
            height++;
          }

          for (let db = 0; db < height; db++) {
            for (let da = 0; da < width; da++) {
              used[(a + da) + (b + db) * CHUNK_SIZE] = 1;
            }
          }

          const blockDef = BLOCK_TYPES.find((bt) => bt.id === blockType) ?? BLOCK_TYPES[2];
          const c = new THREE.Color(blockDef.color);
          const base: [number, number, number] = [0, 0, 0];
          base[w] = dir === 1 ? layer + 1 : layer;
          base[u] = a;
          base[v] = b;

          const corners: [number, number, number][] = [[...base], [...base], [...base], [...base]];
          corners[1][u] += width;
          corners[2][u] += width;
          corners[2][v] += height;
          corners[3][v] += height;

          const orderedCorners = dir === 1 ? [corners[0], corners[1], corners[2], corners[3]] : [corners[0], corners[3], corners[2], corners[1]];
          const baseIdx = positions.length / 3;
          for (const corner of orderedCorners) {
            positions.push(corner[0], corner[1], corner[2]);
            normals.push(normal[0], normal[1], normal[2]);
            colors.push(c.r, c.g, c.b);
          }
          indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
        }
      }
    }
  }

  if (positions.length === 0) return null;
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}

const worldChunks: Map<string, Uint8Array> = new Map();
const dirtyChunks: Set<string> = new Set();

function chunkKey(cx: number, cz: number) { return `${cx},${cz}`; }

function getOrGenChunk(cx: number, cz: number, seed: number): Uint8Array {
  const key = chunkKey(cx, cz);
  if (!worldChunks.has(key)) worldChunks.set(key, generateChunk(cx, cz, seed));
  return worldChunks.get(key)!;
}

function worldGetBlock(wx: number, wy: number, wz: number, seed: number): number {
  if (wy < 0 || wy >= CHUNK_SIZE) return 0;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return getBlock(getOrGenChunk(cx, cz, seed), lx, wy, lz);
}

function worldSetBlock(wx: number, wy: number, wz: number, val: number, seed: number): void {
  if (wy < 0 || wy >= CHUNK_SIZE) return;
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const key = chunkKey(cx, cz);
  worldChunks.set(key, setBlock(getOrGenChunk(cx, cz, seed), lx, wy, lz, val));
  dirtyChunks.add(key);
}

function ChunkMesh({ cx, cz, seed, revision }: { cx: number; cz: number; seed: number; revision: number }) {
  void revision;
  const data = getOrGenChunk(cx, cz, seed);
  const geo = buildChunkGeometry(data);
  if (!geo) return null;
  return (
    <mesh position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]} castShadow receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
        <bufferAttribute attach="attributes-normal" args={[geo.normals, 3]} />
        <bufferAttribute attach="attributes-color" args={[geo.colors, 3]} />
        <bufferAttribute attach="index" args={[geo.indices, 1]} />
      </bufferGeometry>
      <meshLambertMaterial vertexColors side={THREE.FrontSide} />
    </mesh>
  );
}

// Flat invisible collider for the voxel surface — used by Rapier for ground detection
function TerrainCollider({ cx, cz, seed }: { cx: number; cz: number; seed: number }) {
  const noise2D = createNoise2D(() => (seed * 0.987654321 + cx * 0.31 + cz * 0.17) % 1);
  const wx = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
  const wz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
  const n = noise2D(wx * 0.05, wz * 0.05);
  const surfaceY = Math.floor(((n + 1) / 2) * 8) + 4;
  return (
    <RigidBody type="fixed" position={[cx * CHUNK_SIZE, surfaceY, cz * CHUNK_SIZE]}>
      <CuboidCollider args={[CHUNK_SIZE / 2, 0.5, CHUNK_SIZE / 2]} />
    </RigidBody>
  );
}

function Terrain({ playerPos, seed, renderDistance, chunkRevisions }: {
  playerPos: THREE.Vector3;
  seed: number;
  renderDistance: number;
  chunkRevisions: Map<string, number>;
}) {
  const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
  const pcz = Math.floor(playerPos.z / CHUNK_SIZE);
  const chunks: { cx: number; cz: number }[] = [];
  for (let dx = -renderDistance; dx <= renderDistance; dx++) {
    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      chunks.push({ cx: pcx + dx, cz: pcz + dz });
    }
  }
  return (
    <>
      {chunks.map(({ cx, cz }) => {
        const key = chunkKey(cx, cz);
        return (
          <group key={key}>
            <ChunkMesh cx={cx} cz={cz} seed={seed} revision={chunkRevisions.get(key) ?? 0} />
            <TerrainCollider cx={cx} cz={cz} seed={seed} />
          </group>
        );
      })}
    </>
  );
}

interface RaycastResult {
  hit: boolean;
  wx: number;
  wy: number;
  wz: number;
  normal: THREE.Vector3;
}

function raycastVoxel(origin: THREE.Vector3, direction: THREE.Vector3, seed: number, maxDist = 6): RaycastResult {
  const pos = origin.clone();
  const dir = direction.clone().normalize();
  const step = 0.1;
  let prevWx = Math.floor(pos.x), prevWy = Math.floor(pos.y), prevWz = Math.floor(pos.z);
  for (let d = 0; d < maxDist; d += step) {
    pos.addScaledVector(dir, step);
    const wx = Math.floor(pos.x), wy = Math.floor(pos.y), wz = Math.floor(pos.z);
    if (worldGetBlock(wx, wy, wz, seed) !== 0) {
      return { hit: true, wx, wy, wz, normal: new THREE.Vector3(prevWx - wx, prevWy - wy, prevWz - wz) };
    }
    prevWx = wx; prevWy = wy; prevWz = wz;
  }
  return { hit: false, wx: 0, wy: 0, wz: 0, normal: new THREE.Vector3() };
}

function SevcoSphere({ position, visible }: { position: THREE.Vector3; visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.5;
  });
  if (!visible) return null;
  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[1.2, 16, 16]} />
      <meshStandardMaterial color={0x1565C0} emissive={0x0D47A1} emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
      <pointLight color={0x64B5F6} intensity={2} distance={8} />
    </mesh>
  );
}

function OtherPlayers({ players }: { players: OtherPlayer[] }) {
  return (
    <>
      {players.map((p) => (
        <group key={p.userId} position={[p.x, p.y + 1, p.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 1.8, 0.6]} />
            <meshLambertMaterial color={0xFF5722} />
          </mesh>
          <Html center distanceFactor={8} position={[0, 1.4, 0]}>
            <div className="bg-black/70 text-white text-xs px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
              {p.username}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

function SunFlare({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    meshRef.current.lookAt(camera.position);
  });
  const alpha = Math.pow(Math.max(0, intensity), 0.5);
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial
          color={new THREE.Color(1, 0.95, 0.7)}
          transparent
          opacity={0.55 * alpha}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial
          color={new THREE.Color(1, 1, 1)}
          transparent
          opacity={0.7 * alpha}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={0xffeebb} intensity={intensity * 1.5} distance={400} decay={1.5} />
    </group>
  );
}

function Sun({ dayTime }: { dayTime: number }) {
  const angle = dayTime * Math.PI * 2;
  const intensity = Math.max(0, Math.sin(angle));
  const sunPos: [number, number, number] = [Math.cos(angle) * 150, Math.sin(angle) * 150, 0];
  return (
    <>
      <directionalLight
        position={sunPos}
        intensity={intensity * 2 + 0.3}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.3 + intensity * 0.4} />
      {intensity > 0.05 && <SunFlare position={sunPos} intensity={intensity} />}
    </>
  );
}

function DistantPlanet({ planet }: { planet: Planet }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.05;
  });
  return (
    <mesh ref={meshRef} position={[300, 120, -400]}>
      <sphereGeometry args={[planet.size * 0.2, 24, 24]} />
      <meshStandardMaterial color={planet.type === "moon" ? 0xBDBDBD : 0x4CAF50} roughness={0.9} />
    </mesh>
  );
}

function VoxelHighlight({ playerPos, direction, seed }: { playerPos: THREE.Vector3; direction: THREE.Vector3; seed: number }) {
  const result = raycastVoxel(playerPos, direction, seed, 6);
  if (!result.hit) return null;
  return (
    <mesh position={[result.wx + 0.5, result.wy + 0.5, result.wz + 0.5]}>
      <boxGeometry args={[1.01, 1.01, 1.01]} />
      <meshBasicMaterial color={0xffffff} wireframe opacity={0.4} transparent />
    </mesh>
  );
}

// Canonical world-space center of each planet's "gravity well" (the voxel terrain origin).
// Planet 1 (Verdania) is centered at the origin; Planet 2 (Cratera) is placed 800 units away.
// These positions are in the SPHERE's travel space (not terrain-local coordinates).
const PLANET_CENTERS: Record<number, THREE.Vector3> = {
  0: new THREE.Vector3(8, 0, 8),     // Verdania — origin planet
  1: new THREE.Vector3(808, 0, 8),   // Cratera  — 800 units along X
};
// Distance threshold: switch active planet when SPHERE is within landing range of target
const PLANET_LANDING_RANGE = 60;
// Minimum altitude before inter-planet travel engagement
const LAUNCH_ALT = 20;

interface SceneProps {
  planet: Planet;
  planetIndex: number;
  secondPlanet: Planet | null;
  secondPlanetIndex: number;
  progress: Progress;
  savedBuilds: SavedBuild[];
  otherPlayers: OtherPlayer[];
  onSave: (chunks: { cx: number; cy: number; cz: number; data: Uint8Array }[], currentPlanetId: number, crystals: number) => void;
  onPositionUpdate: (x: number, y: number, z: number) => void;
  onCrystalCollected: (count: number) => void;
  onPlanetSwitch: (planet: Planet) => void;
}

function Scene({ planet, planetIndex, secondPlanet, secondPlanetIndex, progress, savedBuilds, otherPlayers, onSave, onPositionUpdate, onCrystalCollected, onPlanetSwitch }: SceneProps) {
  const { camera, gl } = useThree();
  const {
    selectedBlock, setSelectedBlock,
    inVehicle, setInVehicle,
    paused, setPaused,
    setPointerLocked,
    thirdPerson, setThirdPerson,
    setSpeed, setAltitude,
    crystalsCollected, setCrystalsCollected,
    renderDistance,
  } = useGameStore();

  // Rapier rigid body refs for player and sphere
  const playerRb = useRef<RapierRigidBody>(null);
  const sphereRb = useRef<RapierRigidBody>(null);

  // Visual/camera position refs (updated from Rapier each frame)
  const playerPos = useRef(new THREE.Vector3(8, 20, 8));
  const spherePos = useRef(new THREE.Vector3(4, 18, 4));
  // Floating origin offset to prevent floating-point drift
  const originOffset = useRef(new THREE.Vector3(0, 0, 0));
  const worldGroupRef = useRef<THREE.Group>(null);

  const controlsRef = useRef<{ unlock: () => void } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const [chunkRevisions, setChunkRevisions] = useState<Map<string, number>>(new Map());
  const dayTimeRef = useRef(0.25);
  const [dayTime, setDayTimeState] = useState(0.25);
  const lastSave = useRef(0);
  const lastPresence = useRef(0);
  const lastDayUpdate = useRef(0);
  const lastHudUpdate = useRef(0);

  // Apply floating origin: shift world group so player stays near scene origin
  function applyFloatingOrigin(pos: THREE.Vector3) {
    let shifted = false;
    if (Math.abs(pos.x - originOffset.current.x) > FLOAT_ORIGIN_SNAP) {
      originOffset.current.x = Math.round(pos.x / FLOAT_ORIGIN_SNAP) * FLOAT_ORIGIN_SNAP;
      shifted = true;
    }
    if (Math.abs(pos.z - originOffset.current.z) > FLOAT_ORIGIN_SNAP) {
      originOffset.current.z = Math.round(pos.z / FLOAT_ORIGIN_SNAP) * FLOAT_ORIGIN_SNAP;
      shifted = true;
    }
    if (shifted && worldGroupRef.current) {
      worldGroupRef.current.position.set(-originOffset.current.x, 0, -originOffset.current.z);
    }
  }

  useEffect(() => {
    for (const build of savedBuilds) {
      for (const [key, val] of Object.entries(build.voxelData)) {
        const [lx, ly, lz] = key.split(",").map(Number);
        worldSetBlock(
          build.chunkX * CHUNK_SIZE + lx,
          build.chunkY * CHUNK_SIZE + ly,
          build.chunkZ * CHUNK_SIZE + lz,
          val,
          planet.seed
        );
      }
    }
  }, [savedBuilds, planet.seed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPaused(true); controlsRef.current?.unlock(); return; }
      if (e.key === "t" || e.key === "T") { setThirdPerson(!useGameStore.getState().thirdPerson); return; }
      if (e.key === "e" || e.key === "E") {
        if (!inVehicle) {
          if (playerPos.current.distanceTo(spherePos.current) < 3) setInVehicle(true);
        } else {
          setInVehicle(false);
          playerPos.current.copy(spherePos.current).add(new THREE.Vector3(0, 2, 0));
          if (playerRb.current) {
            playerRb.current.setTranslation({ x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z }, true);
            playerRb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        }
        return;
      }
      if (e.key === "Tab") { e.preventDefault(); useGameStore.getState().setShowTab(true); return; }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) { setSelectedBlock(BLOCK_TYPES[num - 1]?.id ?? 1); return; }
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") { useGameStore.getState().setShowTab(false); return; }
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [inVehicle]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!useGameStore.getState().pointerLocked || paused) return;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const result = raycastVoxel(playerPos.current, dir, planet.seed, 6);
      if (!result.hit) return;
      if (e.button === 0) {
        if (worldGetBlock(result.wx, result.wy, result.wz, planet.seed) === CRYSTAL_ID) {
          const newCount = crystalsCollected + 1;
          setCrystalsCollected(newCount);
          onCrystalCollected(newCount);
        }
        worldSetBlock(result.wx, result.wy, result.wz, 0, planet.seed);
      } else if (e.button === 2) {
        const px = result.wx + result.normal.x;
        const py = result.wy + result.normal.y;
        const pz = result.wz + result.normal.z;
        if (py >= 0 && py < CHUNK_SIZE) worldSetBlock(px, py, pz, useGameStore.getState().selectedBlock, planet.seed);
      }
      const cx = Math.floor(result.wx / CHUNK_SIZE);
      const cz = Math.floor(result.wz / CHUNK_SIZE);
      const key = chunkKey(cx, cz);
      dirtyChunks.add(key);
      setChunkRevisions((prev) => { const next = new Map(prev); next.set(key, (next.get(key) ?? 0) + 1); return next; });
    };
    gl.domElement.addEventListener("mousedown", onMouseDown);
    return () => gl.domElement.removeEventListener("mousedown", onMouseDown);
  }, [paused, crystalsCollected, planet.seed]);

  useFrame((state, dt) => {
    if (paused) return;

    dayTimeRef.current = (dayTimeRef.current + dt / (20 * 60)) % 1;
    if (state.clock.elapsedTime - lastDayUpdate.current > 5) {
      lastDayUpdate.current = state.clock.elapsedTime;
      setDayTimeState(dayTimeRef.current);
    }

    const keys = keysRef.current;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    // Surface "up" is the outward normal from the active planet's center, projected to player/sphere position.
    // This gives center-directed gravity: gravity always pulls toward the planet center's surface (y=0 plane).
    const activePlanetCenter = PLANET_CENTERS[planetIndex] ?? PLANET_CENTERS[0];

    const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    if (inVehicle && sphereRb.current) {
      const linvel = sphereRb.current.linvel();
      const vel = new THREE.Vector3(linvel.x, linvel.y, linvel.z);

      // Compute altitude relative to active planet's center (surface = y=0 of terrain space)
      const distToSurface = spherePos.current.y - activePlanetCenter.y;
      const inSpace = distToSurface > SPACE_ALTITUDE;
      const thrust = inSpace ? 40 : 18;
      const impulseScale = thrust * dt;

      // In space: full 6-DoF thrust; near surface: only horizontal + explicit vertical
      if (keys["w"]) vel.addScaledVector(new THREE.Vector3(-camDir.x, inSpace ? -camDir.y : 0, -camDir.z).normalize(), impulseScale);
      if (keys["s"]) vel.addScaledVector(new THREE.Vector3(camDir.x, inSpace ? camDir.y : 0, camDir.z).normalize(), impulseScale);
      if (keys["a"]) vel.addScaledVector(camRight.clone().negate(), impulseScale);
      if (keys["d"]) vel.addScaledVector(camRight, impulseScale);
      if (keys[" "]) vel.y += impulseScale;
      if (keys["shift"]) vel.y -= impulseScale;

      // Apply center-directed gravity to the velocity when not in deep space
      // Direction toward planet center (outward normal from center = upward from surface)
      if (!inSpace) {
        const gravDir = new THREE.Vector3(0, -9.81, 0); // toward y=0 surface
        vel.addScaledVector(gravDir, dt);
      }

      const drag = inSpace ? 0.998 : 0.97;
      vel.multiplyScalar(drag);
      sphereRb.current.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);

      const t = sphereRb.current.translation();
      spherePos.current.set(t.x, t.y, t.z);

      if (!thirdPerson) {
        camera.position.copy(spherePos.current).add(new THREE.Vector3(0, 0.5, 0));
      } else {
        camera.position.copy(spherePos.current).add(camDir.clone().negate().multiplyScalar(6)).add(new THREE.Vector3(0, 2, 0));
      }

      // Continuous interplanetary travel: compare distance from SPHERE to both planet centers.
      // When the SPHERE is launched high enough and travels toward planet 2, switch when it's
      // within PLANET_LANDING_RANGE of the destination planet and farther from the origin planet.
      if (secondPlanet !== null && progress.unlockedSphere && distToSurface > LAUNCH_ALT) {
        const destCenter = PLANET_CENTERS[secondPlanetIndex] ?? new THREE.Vector3(808, 0, 8);
        const distToOrigin = spherePos.current.distanceTo(activePlanetCenter);
        const distToDest = spherePos.current.distanceTo(destCenter);
        // Switch when closer to destination than origin and within landing range
        if (distToDest < PLANET_LANDING_RANGE && distToDest < distToOrigin) {
          onPlanetSwitch(secondPlanet);
        }
      }

      if (state.clock.elapsedTime - lastHudUpdate.current > 0.1) {
        lastHudUpdate.current = state.clock.elapsedTime;
        setSpeed(Math.round(vel.length() * 10) / 10);
        setAltitude(Math.round(distToSurface));
      }

    } else if (!inVehicle && playerRb.current) {
      // Walking on planet surface: movement relative to surface normal (up = away from planet center).
      // The surface normal at the player's position points from planet center toward player (outward).
      // For a flat terrain model, this simplifies to: up = +Y, horizontal = XZ plane.
      const surfaceUp = new THREE.Vector3(
        playerPos.current.x - activePlanetCenter.x,
        playerPos.current.y - activePlanetCenter.y + 8, // ensure upward bias on flat terrain
        playerPos.current.z - activePlanetCenter.z,
      ).normalize();
      // Project camera forward and right onto the surface tangent plane
      const forward = new THREE.Vector3().copy(camDir).projectOnPlane(surfaceUp).normalize();
      const right = new THREE.Vector3().crossVectors(forward, surfaceUp).negate().normalize();

      const moveDir = new THREE.Vector3();
      const speed = keys["shift"] ? 8 : 5;
      if (keys["w"]) moveDir.add(forward);
      if (keys["s"]) moveDir.addScaledVector(forward, -1);
      if (keys["a"]) moveDir.add(right);
      if (keys["d"]) moveDir.addScaledVector(right, -1);
      if (moveDir.length() > 0) moveDir.normalize();

      const linvel = playerRb.current.linvel();
      // Set horizontal velocity; preserve Rapier's Y (gravity) component
      playerRb.current.setLinvel({
        x: moveDir.x * speed,
        y: linvel.y,
        z: moveDir.z * speed,
      }, true);

      // Jump when near surface (low downward velocity = on ground)
      if ((keys[" "] || keys["spacebar"]) && linvel.y > -1 && linvel.y < 2) {
        playerRb.current.applyImpulse({ x: 0, y: 8, z: 0 }, true);
      }

      const t = playerRb.current.translation();
      playerPos.current.set(t.x, t.y, t.z);

      if (playerPos.current.y < -20) {
        playerRb.current.setTranslation({ x: 8, y: 20, z: 8 }, true);
        playerRb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }

      if (!thirdPerson) {
        camera.position.copy(playerPos.current);
      } else {
        camera.position.copy(playerPos.current).add(camDir.clone().negate().multiplyScalar(5)).add(new THREE.Vector3(0, 2, 0));
      }

      const alt = playerPos.current.y - activePlanetCenter.y;
      if (state.clock.elapsedTime - lastHudUpdate.current > 0.1) {
        lastHudUpdate.current = state.clock.elapsedTime;
        setSpeed(Math.round(moveDir.length() * speed * 10) / 10);
        setAltitude(Math.round(alt));
      }
    }

    // Floating origin
    applyFloatingOrigin(inVehicle ? spherePos.current : playerPos.current);

    // Auto-save every 45s
    if (state.clock.elapsedTime - lastSave.current > 45) {
      lastSave.current = state.clock.elapsedTime;
      const toSave: { cx: number; cy: number; cz: number; data: Uint8Array }[] = [];
      dirtyChunks.forEach((key) => {
        const [cx, cz] = key.split(",").map(Number);
        const data = worldChunks.get(key);
        if (data) toSave.push({ cx, cy: 0, cz, data });
      });
      dirtyChunks.clear();
      onSave(toSave, planet.id, useGameStore.getState().crystalsCollected);
    }

    // Presence every 2s
    if (state.clock.elapsedTime - lastPresence.current > 2) {
      lastPresence.current = state.clock.elapsedTime;
      const pos = inVehicle ? spherePos.current : playerPos.current;
      onPositionUpdate(pos.x, pos.y, pos.z);
    }
  });

  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);

  // Rapier gravity: disabled at space altitude (handled manually), standard downward near surface
  const gravityY = -20;

  return (
    <>
      <color attach="background" args={[0x1a1a2e]} />
      <fog attach="fog" args={[0x1a1a2e, 60, 180]} />

      <Sun dayTime={dayTime} />
      <Sky sunPosition={[Math.cos(dayTime * Math.PI * 2) * 150, Math.sin(dayTime * Math.PI * 2) * 150, 0]} />
      <Stars radius={300} depth={50} count={5000} factor={4} />

      <group ref={worldGroupRef}>
        <Physics gravity={[0, gravityY, 0]}>
          <Terrain playerPos={playerPos.current} seed={planet.seed} renderDistance={renderDistance} chunkRevisions={chunkRevisions} />

          {/* Player rigid body */}
          <RigidBody
            ref={playerRb}
            position={[8, 20, 8]}
            colliders="capsule"
            lockRotations
            linearDamping={0.5}
            enabledRotations={[false, false, false]}
          >
            <mesh visible={thirdPerson} castShadow>
              <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
              <meshLambertMaterial color={0x4FC3F7} />
            </mesh>
          </RigidBody>

          {/* SPHERE rigid body (kinematic when in vehicle for full Newtonian control) */}
          {progress.unlockedSphere && (
            <RigidBody
              ref={sphereRb}
              position={[4, 18, 4]}
              colliders="ball"
              type={inVehicle ? "kinematic-velocity-based" : "dynamic"}
              gravityScale={inVehicle && spherePos.current.y > SPACE_ALTITUDE ? 0 : 1}
              linearDamping={0}
            >
              <SevcoSphere position={new THREE.Vector3(0, 0, 0)} visible />
            </RigidBody>
          )}

          {!progress.unlockedSphere && (
            <SevcoSphere position={spherePos.current} visible />
          )}
        </Physics>

        <VoxelHighlight playerPos={playerPos.current} direction={cameraDir} seed={planet.seed} />
        <OtherPlayers players={otherPlayers} />
        {secondPlanet && <DistantPlanet planet={secondPlanet} />}
      </group>

      <PointerLockControls
        ref={controlsRef}
        onLock={() => setPointerLocked(true)}
        onUnlock={() => setPointerLocked(false)}
      />
    </>
  );
}

function HUD({ planet, sparksBalance, progress }: { planet: Planet | null; sparksBalance: number; progress: Progress | null }) {
  const { selectedBlock, setSelectedBlock, speed, altitude, inVehicle, pointerLocked, crystalsCollected } = useGameStore();
  return (
    <div className="absolute inset-0 pointer-events-none select-none" data-testid="freeball-hud">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" data-testid="freeball-crosshair">
        <div className="w-5 h-0.5 bg-white/80 absolute top-1/2 -translate-y-1/2 left-0" />
        <div className="h-5 w-0.5 bg-white/80 absolute left-1/2 -translate-x-1/2 top-0" />
      </div>

      <div className="absolute top-3 right-3 flex flex-col items-end gap-1" data-testid="freeball-info">
        {planet && <div className="bg-black/60 text-white text-xs px-2 py-1 rounded font-mono">{planet.name}</div>}
        <div className="bg-black/60 text-yellow-400 text-xs px-2 py-1 rounded font-mono">⚡ {sparksBalance}</div>
        {inVehicle && (
          <>
            <div className="bg-black/60 text-cyan-300 text-xs px-2 py-1 rounded font-mono" data-testid="freeball-speed">Speed: {speed} m/s</div>
            <div className="bg-black/60 text-green-300 text-xs px-2 py-1 rounded font-mono" data-testid="freeball-altitude">Alt: {altitude}m</div>
          </>
        )}
        {crystalsCollected > 0 && (
          <div className="bg-black/60 text-cyan-400 text-xs px-2 py-1 rounded font-mono">Crystals: {crystalsCollected}/{CRYSTAL_CRAFT_AMOUNT}</div>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1" data-testid="freeball-hotbar">
        {BLOCK_TYPES.slice(0, 9).map((b) => {
          const hex = b.color.toString(16).padStart(6, "0");
          return (
            <div
              key={b.id}
              data-testid={`freeball-hotbar-block-${b.id}`}
              className={`w-10 h-10 rounded border-2 flex items-center justify-center cursor-pointer pointer-events-auto ${selectedBlock === b.id ? "border-white scale-110" : "border-white/30"}`}
              style={{ backgroundColor: `#${hex}40` }}
              onClick={() => setSelectedBlock(b.id)}
              title={b.name}
            >
              <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: `#${hex}` }} />
            </div>
          );
        })}
      </div>

      {!pointerLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 text-white/60 text-sm text-center pointer-events-none">
          Click to play
        </div>
      )}

      {pointerLocked && (
        <div className="absolute bottom-20 left-3 text-white/40 text-xs" data-testid="freeball-controls-hint">
          WASD move · Space jump · Shift sprint · LMB break · RMB place · E enter/exit SPHERE · T third-person · Tab players · Esc menu
        </div>
      )}

      {progress?.unlockedSphere && (
        <div className="absolute top-3 left-3 bg-black/60 text-blue-400 text-xs px-2 py-1 rounded font-mono" data-testid="freeball-sphere-status">
          SPHERE ready (E)
        </div>
      )}
    </div>
  );
}

function PauseMenu({ onResume, onSave, onExit, planets, progress, onUnlockSphere, sparksBalance, crystalsCollected }: {
  onResume: () => void;
  onSave: () => void;
  onExit: () => void;
  planets: Planet[];
  progress: Progress | null;
  onUnlockSphere: () => void;
  sparksBalance: number;
  crystalsCollected: number;
}) {
  const { renderDistance, setRenderDistance } = useGameStore();
  const canCraftSphere = crystalsCollected >= CRYSTAL_CRAFT_AMOUNT;
  const canBuySphere = sparksBalance >= SPHERE_SPARKS_COST;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50" data-testid="freeball-pause-menu">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
        <h2 className="text-white text-xl font-bold mb-1">FREEBALL</h2>
        <p className="text-gray-400 text-xs mb-5">Paused · {planets[0]?.name ?? "Galaxy"}</p>

        <div className="flex flex-col gap-2 mb-5">
          <Button data-testid="freeball-btn-resume" onClick={onResume} className="w-full bg-blue-700 hover:bg-blue-600">Resume</Button>
          <Button data-testid="freeball-btn-save" onClick={onSave} variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">Save Game</Button>
        </div>

        {!progress?.unlockedSphere && (
          <div className="border border-blue-900 rounded-lg p-3 mb-4 bg-blue-950/40">
            <h3 className="text-blue-300 text-sm font-semibold mb-2">⚡ SEVCO SPHERE</h3>
            <p className="text-gray-400 text-xs mb-3">
              {canCraftSphere ? "You have enough Crystals to craft it!" : `Collect ${CRYSTAL_CRAFT_AMOUNT} Crystals or spend ${SPHERE_SPARKS_COST} Sparks to unlock the SPHERE and travel between planets.`}
            </p>
            <p className="text-yellow-400 text-xs mb-3">Sparks: {sparksBalance} · Crystals: {crystalsCollected}/{CRYSTAL_CRAFT_AMOUNT}</p>
            <Button
              data-testid="freeball-btn-unlock-sphere"
              onClick={onUnlockSphere}
              disabled={!canCraftSphere && !canBuySphere}
              className="w-full bg-blue-700 hover:bg-blue-600 text-xs h-8"
            >
              {canCraftSphere ? "Craft SPHERE (20 Crystals)" : `Buy SPHERE (${SPHERE_SPARKS_COST} Sparks)`}
            </Button>
          </div>
        )}
        {progress?.unlockedSphere && (
          <div className="border border-green-900 rounded-lg p-3 mb-4 bg-green-950/40">
            <p className="text-green-400 text-sm">✓ SPHERE unlocked — fly high to reach {planets[1]?.name ?? "Planet 2"}!</p>
          </div>
        )}

        <div className="border border-gray-700 rounded-lg p-3 mb-4">
          <h3 className="text-gray-300 text-sm font-semibold mb-2">Settings</h3>
          <span className="text-gray-400 text-xs">Render Distance: {renderDistance}</span>
          <Slider
            data-testid="freeball-slider-render-distance"
            min={1} max={6} step={1}
            value={[renderDistance]}
            onValueChange={([v]) => setRenderDistance(v)}
            className="w-full mt-1"
          />
        </div>

        <Button
          data-testid="freeball-btn-exit"
          onClick={onExit}
          variant="ghost"
          className="w-full text-gray-400 hover:text-red-400 hover:bg-red-950/30"
        >
          Exit to Platform
        </Button>
      </div>
    </div>
  );
}

function ChatPanel({ messages, onSend }: { messages: ChatMsg[]; onSend: (msg: string) => void }) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);
  return (
    <div className="absolute bottom-16 left-3 w-72 z-30" data-testid="freeball-chat-panel">
      <div ref={listRef} className="bg-black/60 rounded-t-lg p-2 h-36 overflow-y-auto space-y-1">
        {messages.map((m, i) => (
          <div key={i} className="text-xs text-white/80">
            <span className="text-blue-400 font-semibold">{m.username}: </span>{m.message}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { onSend(input.trim()); setInput(""); } }} className="flex">
        <input
          data-testid="freeball-chat-input"
          className="flex-1 bg-black/70 text-white text-xs px-2 py-1.5 rounded-bl-lg outline-none border-t border-gray-700"
          placeholder="Chat..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" data-testid="freeball-chat-send" className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 rounded-br-lg">&#8594;</button>
      </form>
    </div>
  );
}

function PlayerList({ players, planets, currentUser }: { players: OtherPlayer[]; planets: Planet[]; currentUser: CurrentUser | null }) {
  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-black/80 rounded-xl p-4 w-64" data-testid="freeball-player-list">
      <h3 className="text-white text-sm font-semibold mb-2">Players Online</h3>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-400">{currentUser?.username ?? "You"} (you)</span>
          <span className="text-gray-500">here</span>
        </div>
        {players.map((p) => (
          <div key={p.userId} className="flex items-center justify-between text-xs">
            <span className="text-white/80">{p.username}</span>
            <span className="text-gray-500">{planets.find((pl) => pl.id === p.planetId)?.name ?? "Unknown"}</span>
          </div>
        ))}
        {players.length === 0 && <div className="text-gray-500 text-xs">No other players online</div>}
      </div>
    </div>
  );
}

export default function FreeballPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { paused, setPaused, showTab } = useGameStore();
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [crystalsCollected, setCrystalsCollected] = useState(0);
  const [activePlanetIndex, setActivePlanetIndex] = useState(0);
  const progressHydrated = useRef(false);

  const { data: planets = [] } = useQuery<Planet[]>({ queryKey: ["/api/freeball/planets"] });
  const { data: progress } = useQuery<Progress>({ queryKey: ["/api/freeball/progress"] });
  const { data: sparksData } = useQuery<{ balance: number }>({ queryKey: ["/api/sparks/balance"] });

  // Hydrate from persisted progress on first load (runs once when both data sets are available)
  useEffect(() => {
    if (!progress || !planets.length || progressHydrated.current) return;
    progressHydrated.current = true;
    if (progress.currentPlanetId !== null) {
      const idx = planets.findIndex((p) => p.id === progress.currentPlanetId);
      if (idx !== -1) setActivePlanetIndex(idx);
    }
    const savedCrystals = typeof progress.inventory?.crystals === "number" ? progress.inventory.crystals : 0;
    if (savedCrystals > 0) {
      // Sync into both React state and the Zustand store so autosave reads the correct value
      setCrystalsCollected(savedCrystals);
      useGameStore.getState().setCrystalsCollected(savedCrystals);
    }
  }, [progress, planets]);

  const activePlanet = planets[activePlanetIndex] ?? null;
  const secondPlanet = planets[activePlanetIndex === 0 ? 1 : 0] ?? null;
  const activePlanetId = activePlanet?.id ?? null;

  const { data: savedBuilds = [] } = useQuery<SavedBuild[]>({
    queryKey: ["/api/freeball/builds", activePlanetId],
    enabled: !!activePlanetId,
    queryFn: () => fetch(`/api/freeball/builds/${activePlanetId}`).then((r) => r.json()),
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [chatRes, presRes] = await Promise.all([
          fetch("/api/freeball/chat"),
          fetch("/api/freeball/presence"),
        ]);
        if (chatRes.ok) setChatMessages(await chatRes.json());
        if (presRes.ok) setOtherPlayers(await presRes.json());
      } catch { /* ignore polling errors */ }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      worldChunks.clear();
      dirtyChunks.clear();
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (chunks: { cx: number; cy: number; cz: number; data: Uint8Array }[]) => {
      if (!activePlanetId) return;
      for (const chunk of chunks) {
        const voxelData: Record<string, number> = {};
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          for (let ly = 0; ly < CHUNK_SIZE; ly++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
              const v = chunk.data[lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE];
              if (v !== 0) voxelData[`${lx},${ly},${lz}`] = v;
            }
          }
        }
        await apiRequest("POST", `/api/freeball/builds/${activePlanetId}`, {
          chunkX: chunk.cx, chunkY: chunk.cy, chunkZ: chunk.cz, voxelData,
        });
      }
    },
  });

  const progressMutation = useMutation({
    mutationFn: (data: { currentPlanetId?: number; inventory?: Record<string, number>; sparksSpent?: number }) =>
      apiRequest("PATCH", "/api/freeball/progress", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/freeball/progress"] }),
  });

  const unlockSphereMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/freeball/unlock-sphere", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/freeball/progress"] });
      qc.invalidateQueries({ queryKey: ["/api/sparks/balance"] });
    },
  });

  const handleSave = useCallback((chunks: { cx: number; cy: number; cz: number; data: Uint8Array }[], currentPlanetId: number, crystals: number) => {
    if (chunks.length > 0) saveMutation.mutate(chunks);
    progressMutation.mutate({ currentPlanetId, inventory: { crystals } });
  }, []);

  const handleManualSave = useCallback(() => {
    const toSave: { cx: number; cy: number; cz: number; data: Uint8Array }[] = [];
    worldChunks.forEach((data, key) => {
      const [cx, cz] = key.split(",").map(Number);
      toSave.push({ cx, cy: 0, cz, data });
    });
    if (toSave.length > 0) saveMutation.mutate(toSave);
    if (activePlanetId) progressMutation.mutate({ currentPlanetId: activePlanetId, inventory: { crystals: crystalsCollected } });
  }, [activePlanetId, crystalsCollected]);

  const handlePositionUpdate = useCallback((x: number, y: number, z: number) => {
    if (!activePlanetId) return;
    fetch("/api/freeball/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, z, planetId: activePlanetId }),
    }).catch(() => {});
  }, [activePlanetId]);

  const handleCrystalCollected = useCallback((count: number) => {
    setCrystalsCollected(count);
    useGameStore.getState().setCrystalsCollected(count);
    if (count >= CRYSTAL_CRAFT_AMOUNT && !progress?.unlockedSphere) {
      // Persist crystals to DB first, then unlock once inventory is authoritative
      apiRequest("PATCH", "/api/freeball/progress", {
        inventory: { crystals: count },
        ...(activePlanetId ? { currentPlanetId: activePlanetId } : {}),
      }).then(() => {
        unlockSphereMutation.mutate();
      }).catch(() => {
        // If persist fails, still attempt unlock — server will recheck DB
        unlockSphereMutation.mutate();
      });
    }
  }, [progress, activePlanetId]);

  const handleSendChat = useCallback(async (msg: string) => {
    try { await apiRequest("POST", "/api/freeball/chat", { message: msg }); } catch { /* ignore */ }
  }, []);

  const handleUnlockSphere = useCallback(() => {
    // Both crafting (crystals) and buying (Sparks) route through the server endpoint,
    // which validates the unlock conditions and debits the appropriate resource.
    unlockSphereMutation.mutate();
    setPaused(false);
  }, []);

  const handlePlanetSwitch = useCallback((planet: Planet) => {
    const idx = planets.findIndex((p) => p.id === planet.id);
    if (idx === -1) return;
    worldChunks.clear();
    dirtyChunks.clear();
    setActivePlanetIndex(idx);
    progressMutation.mutate({ currentPlanetId: planet.id });
    qc.invalidateQueries({ queryKey: ["/api/freeball/builds", planet.id] });
  }, [planets]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Please sign in to play Freeball.</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100]" data-testid="freeball-page">
      {activePlanet && (
        <Canvas
          className="w-full h-full"
          camera={{ fov: 75, near: 0.1, far: 500, position: [8, 20, 8] }}
          gl={{ antialias: false }}
          shadows
          onContextMenu={(e) => e.preventDefault()}
        >
          <Scene
            planet={activePlanet}
            planetIndex={activePlanetIndex}
            secondPlanet={secondPlanet}
            secondPlanetIndex={activePlanetIndex === 0 ? 1 : 0}
            progress={progress ?? { userId: "", currentPlanetId: null, sparksSpent: 0, unlockedSphere: false, inventory: {} }}
            savedBuilds={savedBuilds}
            otherPlayers={otherPlayers}
            onSave={handleSave}
            onPositionUpdate={handlePositionUpdate}
            onCrystalCollected={handleCrystalCollected}
            onPlanetSwitch={handlePlanetSwitch}
          />
        </Canvas>
      )}

      {activePlanet && (
        <HUD
          planet={activePlanet}
          sparksBalance={sparksData?.balance ?? 0}
          progress={progress ?? null}
        />
      )}

      <ChatPanel messages={chatMessages} onSend={handleSendChat} />
      {showTab && <PlayerList players={otherPlayers} planets={planets} currentUser={user} />}

      {paused && (
        <PauseMenu
          onResume={() => {
            setPaused(false);
            setTimeout(() => document.querySelector("canvas")?.requestPointerLock(), 100);
          }}
          onSave={() => { handleManualSave(); setPaused(false); }}
          onExit={() => navigate("/")}
          planets={planets}
          progress={progress ?? null}
          onUnlockSphere={handleUnlockSphere}
          sparksBalance={sparksData?.balance ?? 0}
          crystalsCollected={crystalsCollected}
        />
      )}

      {planets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950" data-testid="freeball-loading">
          <div className="text-center text-white">
            <div className="text-3xl font-bold mb-2">FREEBALL</div>
            <div className="text-gray-400 text-sm">Loading galaxy...</div>
            <div className="mt-4 motion-safe:animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
