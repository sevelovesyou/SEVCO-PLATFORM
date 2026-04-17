import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { create } from "zustand";
import { createNoise3D } from "simplex-noise";
import { Button } from "@/components/ui/button";

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

const VOXEL_SCALE = 0.45;
const PLANET_RADIUS = 30;
const GRID_SIZE = 64;
const GRID_HALF = 32;
const CRYSTAL_ID = 7;
const CRYSTAL_CRAFT_AMOUNT = 20;
const SPHERE_SPARKS_COST = 500;
const EYE_HEIGHT = VOXEL_SCALE * 2.2;
const GRAVITY_STRENGTH = 18;
const JUMP_IMPULSE = 8;
const WALK_SPEED = 5;
const SPRINT_SPEED = 9;
const SHIP_THRUST = 35;
const SHIP_BOOST_THRUST = 70;
const WATER_LEVEL_OFFSET = -2;
const ATMOSPHERE_SCALE = 2.5;

const BLOCK_TYPES = [
  { id: 1,  name: "Grass",          color: 0x2ECC40 },
  { id: 2,  name: "Dirt",           color: 0x8B4513 },
  { id: 3,  name: "Stone",          color: 0x757575 },
  { id: 4,  name: "Wood",           color: 0x8B5E3C },
  { id: 5,  name: "Glass",          color: 0x81D4FA },
  { id: 6,  name: "SEVCO-Blue Metal", color: 0x1565C0 },
  { id: 7,  name: "Crystal",        color: 0x00E5FF },
  { id: 8,  name: "Music Node",     color: 0xFF6D00 },
  { id: 9,  name: "Project Tile",   color: 0x7B1FA2 },
  { id: 10, name: "Sand",           color: 0xFFD54F },
  { id: 11, name: "Snow",           color: 0xF0F0F0 },
  { id: 12, name: "Void Block",     color: 0x1A1A1A },
  { id: 13, name: "Leaves",         color: 0x00C853 },
  { id: 14, name: "Flower Red",     color: 0xFF1744 },
  { id: 15, name: "Flower Pink",    color: 0xFF4081 },
  { id: 16, name: "Ice",            color: 0xB3E5FC },
  { id: 17, name: "Red Rock",       color: 0xBF360C },
  { id: 18, name: "Cactus",         color: 0x558B2F },
  { id: 19, name: "Alien Surface",  color: 0xAA00FF },
  { id: 20, name: "Alien Rock",     color: 0x6200EA },
  { id: 21, name: "Alien Leaf",     color: 0xE040FB },
  { id: 22, name: "Flower Yellow",  color: 0xFFEB3B },
  { id: 23, name: "Autumn Leaves",  color: 0xFF6F00 },
  { id: 24, name: "Dark Leaves",    color: 0x1B5E20 },
] as const;

interface BiomeConfig {
  surface: number;
  sub: number;
  deep: number;
  hasWater: boolean;
  waterColor: number;
  treeTrunk: number;
  treeLeaf: number;
  flowerBlocks: number[];
  treeChance: number;
  flowerChance: number;
  terrainAmp: number;
  noiseFreq: number;
}

const BIOME_CONFIGS: Record<string, BiomeConfig> = {
  verdania: {
    surface: 1, sub: 2, deep: 3,
    hasWater: true, waterColor: 0x0288D1,
    treeTrunk: 4, treeLeaf: 13,
    flowerBlocks: [14, 15, 22],
    treeChance: 0.06, flowerChance: 0.1,
    terrainAmp: 5, noiseFreq: 1.5,
  },
  desert: {
    surface: 10, sub: 17, deep: 3,
    hasWater: false, waterColor: 0,
    treeTrunk: 18, treeLeaf: 0,
    flowerBlocks: [],
    treeChance: 0.015, flowerChance: 0,
    terrainAmp: 3, noiseFreq: 1.2,
  },
  ice: {
    surface: 11, sub: 16, deep: 3,
    hasWater: true, waterColor: 0x81D4FA,
    treeTrunk: 16, treeLeaf: 7,
    flowerBlocks: [11],
    treeChance: 0.025, flowerChance: 0.03,
    terrainAmp: 4, noiseFreq: 1.8,
  },
  alien: {
    surface: 19, sub: 20, deep: 12,
    hasWater: true, waterColor: 0xAB47BC,
    treeTrunk: 20, treeLeaf: 21,
    flowerBlocks: [19, 21],
    treeChance: 0.04, flowerChance: 0.08,
    terrainAmp: 6, noiseFreq: 2.0,
  },
};

const PLANET_POSITIONS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(280, 50, -120),
  new THREE.Vector3(-220, -30, 260),
  new THREE.Vector3(200, 70, 300),
];

const PLANET_VISUALS: Record<string, { color: number; glow: number }> = {
  verdania: { color: 0x2ECC40, glow: 0x81D4FA },
  desert: { color: 0xFFB74D, glow: 0xFF8A65 },
  ice: { color: 0xE3F2FD, glow: 0x81D4FA },
  alien: { color: 0xAA00FF, glow: 0xE040FB },
};

const PLANET_LANDING_RANGE = PLANET_RADIUS * VOXEL_SCALE * 2.5;

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
  nearSphere: boolean;
  setNearSphere: (n: boolean) => void;
  gameInventory: Record<string, number>;
  setGameInventory: (inv: Record<string, number>) => void;
  addToInventory: (blockId: string | number, amount: number) => void;
  showInventory: boolean;
  setShowInventory: (s: boolean) => void;
  pickupToast: string;
  setPickupToast: (msg: string) => void;
}

const useGameStore = create<GameStore>((set, get) => ({
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
  nearSphere: false,
  setNearSphere: (n) => set({ nearSphere: n }),
  gameInventory: {},
  setGameInventory: (inv) => set({ gameInventory: inv, crystalsCollected: inv["7"] ?? 0 }),
  addToInventory: (blockId, amount) => {
    const key = String(blockId);
    const inv = { ...get().gameInventory };
    inv[key] = Math.max(0, (inv[key] ?? 0) + amount);
    set({ gameInventory: inv, crystalsCollected: inv["7"] ?? 0 });
  },
  showInventory: false,
  setShowInventory: (s) => set({ showInventory: s }),
  pickupToast: "",
  setPickupToast: (msg) => set({ pickupToast: msg }),
}));

function makeRng(seed: number): () => number {
  let s = Math.abs(seed % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gridIndex(gx: number, gy: number, gz: number): number {
  return gx + gy * GRID_SIZE + gz * GRID_SIZE * GRID_SIZE;
}

function getVoxel(data: Uint8Array, gx: number, gy: number, gz: number): number {
  if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return 0;
  return data[gridIndex(gx, gy, gz)];
}

function setVoxel(data: Uint8Array, gx: number, gy: number, gz: number, val: number): void {
  if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return;
  data[gridIndex(gx, gy, gz)] = val;
}

function generatePlanetData(seed: number, biomeType: string): Uint8Array {
  const biome = BIOME_CONFIGS[biomeType] || BIOME_CONFIGS.verdania;
  const rng = makeRng(seed);
  const noise = createNoise3D(rng);
  const data = new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gz = 0; gz < GRID_SIZE; gz++) {
        const x = gx - GRID_HALF;
        const y = gy - GRID_HALF;
        const z = gz - GRID_HALF;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist < 1) continue;

        const nx = x / PLANET_RADIUS;
        const ny = y / PLANET_RADIUS;
        const nz = z / PLANET_RADIUS;

        const terrainNoise =
          noise(nx * biome.noiseFreq, ny * biome.noiseFreq, nz * biome.noiseFreq) * biome.terrainAmp +
          noise(nx * biome.noiseFreq * 2, ny * biome.noiseFreq * 2, nz * biome.noiseFreq * 2) * biome.terrainAmp * 0.5 +
          noise(nx * biome.noiseFreq * 4, ny * biome.noiseFreq * 4, nz * biome.noiseFreq * 4) * biome.terrainAmp * 0.25;

        const maxSurfaceRadius = GRID_HALF - 2;
        const surfaceRadius = Math.min(PLANET_RADIUS + terrainNoise, maxSurfaceRadius);

        if (dist <= surfaceRadius) {
          const depth = surfaceRadius - dist;
          let blockId: number;
          if (depth < 1) blockId = biome.surface;
          else if (depth < 3) blockId = biome.sub;
          else blockId = biome.deep;

          if (depth > 3 && Math.abs(noise(nx * 8, ny * 8, nz * 8)) > 0.82) {
            blockId = CRYSTAL_ID;
          }

          data[gridIndex(gx, gy, gz)] = blockId;
        }
      }
    }
  }

  addFoliage(data, seed, biome);
  return data;
}

function addFoliage(data: Uint8Array, seed: number, biome: BiomeConfig): void {
  const rng = makeRng(seed + 99999);
  const treeNoise = createNoise3D(makeRng(seed + 54321));

  for (let gx = 2; gx < GRID_SIZE - 2; gx++) {
    for (let gy = 2; gy < GRID_SIZE - 2; gy++) {
      for (let gz = 2; gz < GRID_SIZE - 2; gz++) {
        if (data[gridIndex(gx, gy, gz)] !== biome.surface) continue;

        const x = gx - GRID_HALF;
        const y = gy - GRID_HALF;
        const z = gz - GRID_HALF;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist < 2) continue;

        const nx = x / dist;
        const ny = y / dist;
        const nz = z / dist;

        const outGx = Math.round(gx + nx);
        const outGy = Math.round(gy + ny);
        const outGz = Math.round(gz + nz);
        if (outGx < 0 || outGx >= GRID_SIZE || outGy < 0 || outGy >= GRID_SIZE || outGz < 0 || outGz >= GRID_SIZE) continue;
        if (data[gridIndex(outGx, outGy, outGz)] !== 0) continue;

        const noiseVal = treeNoise(x * 0.12, y * 0.12, z * 0.12);

        if (biome.treeTrunk > 0 && noiseVal > (1 - biome.treeChance * 12)) {
          const trunkH = 3 + Math.floor(rng() * 3);
          for (let h = 1; h <= trunkH; h++) {
            const tx = Math.round(gx + nx * h);
            const ty = Math.round(gy + ny * h);
            const tz = Math.round(gz + nz * h);
            if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && tz >= 0 && tz < GRID_SIZE) {
              if (data[gridIndex(tx, ty, tz)] === 0) data[gridIndex(tx, ty, tz)] = biome.treeTrunk;
            }
          }
          if (biome.treeLeaf > 0) {
            const cx = Math.round(gx + nx * (trunkH + 1));
            const cy = Math.round(gy + ny * (trunkH + 1));
            const cz = Math.round(gz + nz * (trunkH + 1));
            const lr = 2;
            for (let dx = -lr; dx <= lr; dx++) {
              for (let dy = -lr; dy <= lr; dy++) {
                for (let dz = -lr; dz <= lr; dz++) {
                  if (dx * dx + dy * dy + dz * dz > lr * lr + 1) continue;
                  const px = cx + dx, py = cy + dy, pz = cz + dz;
                  if (px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE && pz >= 0 && pz < GRID_SIZE) {
                    if (data[gridIndex(px, py, pz)] === 0) {
                      const leafType = rng() > 0.7 && biomeHasMultiLeaves(biome) ? pickAltLeaf(biome, rng) : biome.treeLeaf;
                      data[gridIndex(px, py, pz)] = leafType;
                    }
                  }
                }
              }
            }
          }
        } else if (biome.flowerBlocks.length > 0 && noiseVal < (-1 + biome.flowerChance * 12)) {
          const fb = biome.flowerBlocks[Math.floor(rng() * biome.flowerBlocks.length)];
          if (data[gridIndex(outGx, outGy, outGz)] === 0) {
            data[gridIndex(outGx, outGy, outGz)] = fb;
          }
        }
      }
    }
  }
}

function biomeHasMultiLeaves(biome: BiomeConfig): boolean {
  return biome === BIOME_CONFIGS.verdania;
}

function pickAltLeaf(biome: BiomeConfig, rng: () => number): number {
  if (biome === BIOME_CONFIGS.verdania) {
    const alts = [13, 23, 24];
    return alts[Math.floor(rng() * alts.length)];
  }
  return biome.treeLeaf;
}

interface PlanetGeo {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

function buildPlanetGeometry(data: Uint8Array): PlanetGeo | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const S = GRID_SIZE;
  const scale = VOXEL_SCALE;

  const AXES = [
    { u: 1, v: 2, w: 0, dir: 1,  normal: [1, 0, 0] },
    { u: 1, v: 2, w: 0, dir: -1, normal: [-1, 0, 0] },
    { u: 0, v: 2, w: 1, dir: 1,  normal: [0, 1, 0] },
    { u: 0, v: 2, w: 1, dir: -1, normal: [0, -1, 0] },
    { u: 0, v: 1, w: 2, dir: 1,  normal: [0, 0, 1] },
    { u: 0, v: 1, w: 2, dir: -1, normal: [0, 0, -1] },
  ] as const;

  for (const { u, v, w, dir, normal } of AXES) {
    for (let layer = 0; layer < S; layer++) {
      const mask = new Int16Array(S * S);
      let hasAny = false;
      for (let a = 0; a < S; a++) {
        for (let b = 0; b < S; b++) {
          const coord: [number, number, number] = [0, 0, 0];
          coord[w] = layer; coord[u] = a; coord[v] = b;
          const cur = getVoxel(data, coord[0], coord[1], coord[2]);
          if (cur === 0) continue;
          const nl = layer + dir;
          let neighbor = 0;
          if (nl >= 0 && nl < S) {
            const nc: [number, number, number] = [0, 0, 0];
            nc[w] = nl; nc[u] = a; nc[v] = b;
            neighbor = getVoxel(data, nc[0], nc[1], nc[2]);
          }
          if (neighbor === 0) { mask[a + b * S] = cur; hasAny = true; }
        }
      }
      if (!hasAny) continue;

      const used = new Uint8Array(S * S);
      for (let a = 0; a < S; a++) {
        for (let b = 0; b < S; b++) {
          const idx = a + b * S;
          if (used[idx] || mask[idx] === 0) continue;
          const bt = mask[idx];

          let width = 1;
          while (a + width < S && !used[(a + width) + b * S] && mask[(a + width) + b * S] === bt) width++;

          let height = 1;
          outer: while (b + height < S) {
            for (let k = a; k < a + width; k++) {
              if (used[k + (b + height) * S] || mask[k + (b + height) * S] !== bt) break outer;
            }
            height++;
          }

          for (let db = 0; db < height; db++) {
            for (let da = 0; da < width; da++) {
              used[(a + da) + (b + db) * S] = 1;
            }
          }

          const blockDef = BLOCK_TYPES.find((t) => t.id === bt) ?? BLOCK_TYPES[2];
          const c = new THREE.Color(blockDef.color);

          // Directional shading based on face normal
          // Top faces (normal.y > 0) get full brightness, sides mid-tone, bottoms darker
          const ny = normal[1];
          let shade: number;
          if (ny > 0.5) shade = 1.0;
          else if (ny < -0.5) shade = 0.55;
          else shade = 0.75;

          // Small seeded per-block variation (±5%) to break up flat plastic look
          const blockSeed = (a * 1000 + b * 100 + layer * 10 + (dir > 0 ? 1 : 0)) * 2654435761;
          const variation = 1.0 + ((blockSeed % 100) / 100 - 0.5) * 0.1;
          const finalShade = shade * variation;

          c.r = Math.min(1, c.r * finalShade);
          c.g = Math.min(1, c.g * finalShade);
          c.b = Math.min(1, c.b * finalShade);

          const base: [number, number, number] = [0, 0, 0];
          base[w] = (dir === 1 ? layer + 1 : layer) - GRID_HALF;
          base[u] = a - GRID_HALF;
          base[v] = b - GRID_HALF;

          const corners: [number, number, number][] = [
            [base[0] * scale, base[1] * scale, base[2] * scale],
            [base[0] * scale, base[1] * scale, base[2] * scale],
            [base[0] * scale, base[1] * scale, base[2] * scale],
            [base[0] * scale, base[1] * scale, base[2] * scale],
          ];
          corners[1][u] += width * scale;
          corners[2][u] += width * scale;
          corners[2][v] += height * scale;
          corners[3][v] += height * scale;

          const ordered = dir === 1
            ? [corners[0], corners[1], corners[2], corners[3]]
            : [corners[0], corners[3], corners[2], corners[1]];

          const baseIdx = positions.length / 3;
          for (const corner of ordered) {
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

const planetDataCache = new Map<number, Uint8Array>();
const modifiedVoxelsMap = new Map<number, Map<string, number>>();

const planetBuildsApplied = new Map<number, string>();

function buildsFingerprint(builds: SavedBuild[]): string {
  let h = 0;
  for (const b of builds) {
    const entries = Object.entries(b.voxelData);
    h = (h * 31 + entries.length) | 0;
    for (const [k, v] of entries) h = (h * 31 + k.length + v) | 0;
  }
  return `${builds.length}:${h}`;
}

function getOrCreatePlanetData(planetId: number, seed: number, biomeType: string, savedBuilds: SavedBuild[]): Uint8Array {
  const buildsKey = buildsFingerprint(savedBuilds);
  const prevKey = planetBuildsApplied.get(planetId) ?? "";
  if (planetDataCache.has(planetId) && prevKey === buildsKey) return planetDataCache.get(planetId)!;

  const data = generatePlanetData(seed, biomeType);
  for (const build of savedBuilds) {
    const cx = (build.chunkX || 0) * GRID_SIZE;
    const cy = (build.chunkY || 0) * GRID_SIZE;
    const cz = (build.chunkZ || 0) * GRID_SIZE;
    for (const [key, val] of Object.entries(build.voxelData)) {
      const [gx, gy, gz] = key.split(",").map(Number);
      setVoxel(data, gx + cx, gy + cy, gz + cz, val);
    }
  }
  const localMods = modifiedVoxelsMap.get(planetId);
  if (localMods) {
    localMods.forEach((val, key) => {
      const [gx, gy, gz] = key.split(",").map(Number);
      setVoxel(data, gx, gy, gz, val);
    });
  }
  planetBuildsApplied.set(planetId, buildsKey);
  planetDataCache.set(planetId, data);
  return data;
}


function worldToGrid(worldPos: THREE.Vector3, planetCenter: THREE.Vector3): [number, number, number] {
  const local = worldPos.clone().sub(planetCenter);
  return [
    Math.floor(local.x / VOXEL_SCALE + GRID_HALF),
    Math.floor(local.y / VOXEL_SCALE + GRID_HALF),
    Math.floor(local.z / VOXEL_SCALE + GRID_HALF),
  ];
}

function playerCollides(pos: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, up: THREE.Vector3): boolean {
  const r = VOXEL_SCALE * 0.42;
  const right = new THREE.Vector3(1, 0, 0);
  if (Math.abs(up.dot(right)) > 0.9) right.set(0, 0, 1);
  const localRight = right.clone().cross(up).normalize().multiplyScalar(r);
  const localFwd = up.clone().cross(localRight).normalize().multiplyScalar(r);

  const offsets = [
    new THREE.Vector3(0, 0, 0),
    localRight, localRight.clone().negate(),
    localFwd, localFwd.clone().negate(),
    localRight.clone().add(localFwd),
    localRight.clone().sub(localFwd),
    localRight.clone().negate().add(localFwd),
    localRight.clone().negate().sub(localFwd),
    up.clone().multiplyScalar(VOXEL_SCALE * 1.6),
    up.clone().multiplyScalar(-VOXEL_SCALE * 0.1),
  ];

  for (const off of offsets) {
    const check = pos.clone().add(off);
    const [gx, gy, gz] = worldToGrid(check, center);
    if (getVoxel(data, gx, gy, gz) !== 0) return true;
  }
  return false;
}

function groundCheck(pos: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, up: THREE.Vector3): boolean {
  const check = pos.clone().addScaledVector(up, -VOXEL_SCALE * 0.3);
  const [gx, gy, gz] = worldToGrid(check, center);
  return getVoxel(data, gx, gy, gz) !== 0;
}

interface RayResult {
  hit: boolean;
  gx: number;
  gy: number;
  gz: number;
  prevGx: number;
  prevGy: number;
  prevGz: number;
}

function raycastPlanet(origin: THREE.Vector3, dir: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, maxDist = 8): RayResult {
  const pos = origin.clone();
  const d = dir.clone().normalize();
  const step = VOXEL_SCALE * 0.25;
  let [pgx, pgy, pgz] = worldToGrid(pos, center);
  for (let t = 0; t < maxDist; t += step) {
    pos.addScaledVector(d, step);
    const [gx, gy, gz] = worldToGrid(pos, center);
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) {
      pgx = gx; pgy = gy; pgz = gz;
      continue;
    }
    if (data[gridIndex(gx, gy, gz)] !== 0) {
      return { hit: true, gx, gy, gz, prevGx: pgx, prevGy: pgy, prevGz: pgz };
    }
    pgx = gx; pgy = gy; pgz = gz;
  }
  return { hit: false, gx: 0, gy: 0, gz: 0, prevGx: 0, prevGy: 0, prevGz: 0 };
}

function PlanetVoxelMesh({ data, center, revision, planetId }: { data: Uint8Array; center: THREE.Vector3; revision: number; planetId: number }) {
  const geo = useMemo(() => buildPlanetGeometry(data), [revision, planetId]);
  if (!geo) return null;
  return (
    <mesh position={center} castShadow receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
        <bufferAttribute attach="attributes-normal" args={[geo.normals, 3]} />
        <bufferAttribute attach="attributes-color" args={[geo.colors, 3]} />
        <bufferAttribute attach="index" args={[geo.indices, 1]} />
      </bufferGeometry>
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

function WaterShell({ center, biomeType }: { center: THREE.Vector3; biomeType: string }) {
  const biome = BIOME_CONFIGS[biomeType] || BIOME_CONFIGS.verdania;
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });
  if (!biome.hasWater) return null;
  const waterRadius = (PLANET_RADIUS + WATER_LEVEL_OFFSET) * VOXEL_SCALE;
  const waterColor = new THREE.Color(biome.waterColor);
  return (
    <mesh ref={meshRef} position={center}>
      <sphereGeometry args={[waterRadius, 48, 48]} />
      <shaderMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: waterColor },
          uSeaLevel: { value: waterRadius },
        }}
        vertexShader={`
          varying vec3 vWorldPos;
          varying vec3 vNormal;
          uniform float uTime;
          void main() {
            vec3 pos = position;
            float wave = sin(pos.x * 3.0 + uTime * 1.5) * 0.08
                       + sin(pos.z * 4.0 + uTime * 1.2) * 0.06
                       + cos(pos.y * 2.5 + uTime * 0.8) * 0.05;
            pos += normalize(pos) * wave;
            vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uTime;
          varying vec3 vWorldPos;
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0))), 2.0);
            float shimmer = sin(vWorldPos.x * 8.0 + uTime * 2.0) * sin(vWorldPos.z * 8.0 + uTime * 1.5) * 0.15 + 0.85;
            float alpha = mix(0.35, 0.6, fresnel) * shimmer;
            vec3 col = uColor * (0.9 + 0.1 * shimmer);
            col += vec3(0.15, 0.15, 0.2) * fresnel;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}

function DistantPlanetSphere({ position, planetType, visualRadius }: {
  position: THREE.Vector3;
  planetType: string;
  visualRadius: number;
}) {
  const vis = PLANET_VISUALS[planetType] || PLANET_VISUALS.verdania;
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.02;
  });
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[visualRadius, 24, 24]} />
        <meshStandardMaterial color={vis.color} roughness={0.8} />
      </mesh>
      <mesh>
        <sphereGeometry args={[visualRadius * 1.15, 24, 24]} />
        <meshBasicMaterial color={vis.glow} transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
    </group>
  );
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
    if (meshRef.current) meshRef.current.lookAt(camera.position);
  });
  const alpha = Math.pow(Math.max(0, intensity), 0.5);
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial color={new THREE.Color(1, 0.95, 0.7)} transparent opacity={0.55 * alpha} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color={0xffeebb} intensity={intensity * 1.5} distance={400} decay={1.5} />
    </group>
  );
}

function Sun({ dayTime }: { dayTime: number }) {
  const angle = dayTime * Math.PI * 2;
  const intensity = Math.max(0, Math.sin(angle));
  const sunPos: [number, number, number] = [Math.cos(angle) * 200, Math.sin(angle) * 200, 0];
  return (
    <>
      <directionalLight position={sunPos} intensity={intensity * 2 + 0.3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <ambientLight intensity={0.3 + intensity * 0.4} />
      {intensity > 0.05 && <SunFlare position={sunPos} intensity={intensity} />}
    </>
  );
}

function CustomStars({ opacity }: { opacity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(5000 * 3);
    const rng = makeRng(12345);
    for (let i = 0; i < 5000; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(rng() * 2 - 1);
      const r = 250 + rng() * 150;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  useFrame(({ camera }) => {
    if (groupRef.current) groupRef.current.position.copy(camera.position);
  });
  if (opacity < 0.01) return null;
  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={2} color={0xffffff} transparent opacity={opacity} sizeAttenuation={false} />
      </points>
    </group>
  );
}

function VoxelHighlight({ direction, data, center }: {
  direction: THREE.Vector3;
  data: Uint8Array;
  center: THREE.Vector3;
}) {
  const { camera } = useThree();
  const result = raycastPlanet(camera.position, direction, data, center, 8);
  if (!result.hit) return null;
  const wx = (result.gx - GRID_HALF + 0.5) * VOXEL_SCALE + center.x;
  const wy = (result.gy - GRID_HALF + 0.5) * VOXEL_SCALE + center.y;
  const wz = (result.gz - GRID_HALF + 0.5) * VOXEL_SCALE + center.z;
  return (
    <mesh position={[wx, wy, wz]}>
      <boxGeometry args={[VOXEL_SCALE * 1.02, VOXEL_SCALE * 1.02, VOXEL_SCALE * 1.02]} />
      <meshBasicMaterial color={0xffffff} wireframe opacity={0.4} transparent />
    </mesh>
  );
}

interface SceneProps {
  planets: Planet[];
  activePlanetIndex: number;
  progress: Progress;
  savedBuilds: SavedBuild[];
  otherPlayers: OtherPlayer[];
  onSave: (modified: Map<string, number>, currentPlanetId: number, inventory: Record<string, number>) => void;
  onPositionUpdate: (x: number, y: number, z: number) => void;
  onCrystalCollected: (count: number) => void;
  onPlanetSwitch: (newIndex: number) => void;
}

function Scene({ planets, activePlanetIndex, progress, savedBuilds, otherPlayers, onSave, onPositionUpdate, onCrystalCollected, onPlanetSwitch }: SceneProps) {
  const { camera, gl } = useThree();
  const {
    setSelectedBlock,
    inVehicle, setInVehicle,
    paused, setPaused,
    setPointerLocked,
    thirdPerson, setThirdPerson,
    setSpeed, setAltitude,
    crystalsCollected, setCrystalsCollected,
  } = useGameStore();

  const activePlanet = planets[activePlanetIndex];
  const planetCenter = PLANET_POSITIONS[activePlanetIndex] || PLANET_POSITIONS[0];
  const biomeType = activePlanet?.type || "verdania";

  const [geoRevision, setGeoRevision] = useState(0);
  const prevBuildsRef = useRef(savedBuilds);

  const planetData = useMemo(() => {
    if (!activePlanet) return new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);
    return getOrCreatePlanetData(activePlanet.id, activePlanet.seed, biomeType, savedBuilds);
  }, [activePlanet?.id, savedBuilds]);

  useEffect(() => {
    if (prevBuildsRef.current !== savedBuilds) {
      prevBuildsRef.current = savedBuilds;
      setGeoRevision((r) => r + 1);
    }
  }, [savedBuilds]);

  const spawnUp = new THREE.Vector3(0, 1, 0);
  const spawnPos = planetCenter.clone().addScaledVector(spawnUp, (PLANET_RADIUS + 3) * VOXEL_SCALE);

  const playerPos = useRef(spawnPos.clone());
  const playerVel = useRef(new THREE.Vector3(0, 0, 0));
  const spawnTangent = new THREE.Vector3(1, 0, 0).cross(spawnUp).normalize();
  if (spawnTangent.lengthSq() < 0.01) spawnTangent.set(0, 0, 1);
  // Start sphere 4 blocks above surface level, offset tangentially — gravity will ground it in frames
  const sphereSpawnBase = planetCenter.clone()
    .addScaledVector(spawnUp, PLANET_RADIUS * VOXEL_SCALE + VOXEL_SCALE * 4)
    .addScaledVector(spawnTangent, 3 * VOXEL_SCALE);
  const spherePos = useRef(sphereSpawnBase);
  const sphereVel = useRef(new THREE.Vector3(0, 0, 0));
  const onGround = useRef(false);

  const refForward = useRef(new THREE.Vector3(0, 0, -1));
  const pitchRef = useRef(0);
  const mouseDelta = useRef({ x: 0, y: 0 });

  const keysRef = useRef<Record<string, boolean>>({});
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const planetCenterRef = useRef(planetCenter);
  planetCenterRef.current = planetCenter;
  const dayTimeRef = useRef(0.25);
  const [dayTime, setDayTimeState] = useState(0.25);
  const lastSave = useRef(0);
  const lastPresence = useRef(0);
  const lastDayUpdate = useRef(0);
  const lastHudUpdate = useRef(0);

  useEffect(() => {
    if (!activePlanet) return;
    const up = new THREE.Vector3(0, 1, 0);
    const newSpawn = planetCenter.clone().addScaledVector(up, (PLANET_RADIUS + 5) * VOXEL_SCALE);
    playerPos.current.copy(newSpawn);
    playerVel.current.set(0, 0, 0);
    const tangent = new THREE.Vector3(1, 0, 0).cross(up).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(0, 0, 1);
    // Place sphere 4 blocks above surface, offset tangentially — gravity will ground it in frames
    spherePos.current.copy(planetCenter)
      .addScaledVector(up, PLANET_RADIUS * VOXEL_SCALE + VOXEL_SCALE * 4)
      .addScaledVector(tangent, 3 * VOXEL_SCALE);
    sphereVel.current.set(0, 0, 0);
    refForward.current.set(0, 0, -1);
    pitchRef.current = 0;
  }, [activePlanet?.id]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      mouseDelta.current.x += e.movementX;
      mouseDelta.current.y += e.movementY;
    };
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setPointerLocked(locked);
      if (!locked && !useGameStore.getState().paused) setPaused(true);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPaused(true); document.exitPointerLock(); return; }
      if (e.key === "t" || e.key === "T") { setThirdPerson(!useGameStore.getState().thirdPerson); return; }
      if (e.key === "e" || e.key === "E") {
        if (!useGameStore.getState().inVehicle) {
          if (progressRef.current.unlockedSphere && playerPos.current.distanceTo(spherePos.current) < 6) setInVehicle(true);
        } else {
          setInVehicle(false);
          const up = playerPos.current.clone().sub(planetCenterRef.current).normalize();
          playerPos.current.copy(spherePos.current).addScaledVector(up, 2);
          playerVel.current.set(0, 0, 0);
        }
        return;
      }
      if (e.code === "Space") {
        try {
          const ptt = JSON.parse(localStorage.getItem("voice-prefs-cache") || "null")?.pttKey;
          if (ptt === "Space") {
            const k = "freeball-ptt-warned";
            if (!localStorage.getItem(k)) {
              localStorage.setItem(k, "1");
              console.warn("[freeball] Spacebar is also assigned to push-to-talk in voice chat — change it in Account → Voice Chat to avoid conflicts.");
            }
          }
        } catch {}
      }
      if (e.key === "Tab") { e.preventDefault(); useGameStore.getState().setShowTab(true); return; }
      if (e.key === "i" || e.key === "I" || e.key === "b" || e.key === "B") {
        useGameStore.getState().setShowInventory(!useGameStore.getState().showInventory);
        return;
      }
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
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        if (!useGameStore.getState().paused) canvas.requestPointerLock();
        return;
      }
      if (useGameStore.getState().paused || useGameStore.getState().inVehicle) return;

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const result = raycastPlanet(camera.position, dir, planetData, planetCenter, 8);
      if (!result.hit) return;

      if (e.button === 0) {
        const blockVal = getVoxel(planetData, result.gx, result.gy, result.gz);
        const LEAF_FLOWER_IDS = new Set([13, 14, 15, 21, 22, 23, 24]);
        const ALIEN_IDS = new Set([19, 20]);
        let shouldDrop = true;
        if (LEAF_FLOWER_IDS.has(blockVal)) {
          shouldDrop = Math.random() < 0.5;
        }
        if (shouldDrop) {
          useGameStore.getState().addToInventory(blockVal, 1);
          if (blockVal === CRYSTAL_ID) {
            const newCount = useGameStore.getState().crystalsCollected;
            setCrystalsCollected(newCount);
            onCrystalCollected(newCount);
          }
          if (ALIEN_IDS.has(blockVal) && Math.random() < 0.2) {
            useGameStore.getState().addToInventory("artifact", 1);
          }
          const blockName = (BLOCK_TYPES as readonly { id: number; name: string; color: number }[]).find((b) => b.id === blockVal)?.name ?? `Block ${blockVal}`;
          useGameStore.getState().setPickupToast(`+1 ${blockName}`);
          setTimeout(() => useGameStore.getState().setPickupToast(""), 1800);
        }
        setVoxel(planetData, result.gx, result.gy, result.gz, 0);
        trackModification(activePlanet?.id ?? 0, result.gx, result.gy, result.gz, 0);
      } else if (e.button === 2) {
        const { prevGx, prevGy, prevGz } = result;
        if (prevGx >= 0 && prevGx < GRID_SIZE && prevGy >= 0 && prevGy < GRID_SIZE && prevGz >= 0 && prevGz < GRID_SIZE) {
          const sb = useGameStore.getState().selectedBlock;
          const inv = useGameStore.getState().gameInventory;
          if ((inv[String(sb)] ?? 0) <= 0) return;
          setVoxel(planetData, prevGx, prevGy, prevGz, sb);
          trackModification(activePlanet?.id ?? 0, prevGx, prevGy, prevGz, sb);
          useGameStore.getState().addToInventory(sb, -1);
        }
      }

      setGeoRevision((r) => r + 1);
    };
    canvas.addEventListener("mousedown", onMouseDown);
    return () => canvas.removeEventListener("mousedown", onMouseDown);
  }, [planetData, activePlanet?.id]);

  useFrame((state, dt) => {
    if (paused || !activePlanet) return;
    const clampedDt = Math.min(dt, 0.05);

    dayTimeRef.current = (dayTimeRef.current + clampedDt / (20 * 60)) % 1;
    if (state.clock.elapsedTime - lastDayUpdate.current > 5) {
      lastDayUpdate.current = state.clock.elapsedTime;
      setDayTimeState(dayTimeRef.current);
    }

    const dx = mouseDelta.current.x;
    const dy = mouseDelta.current.y;
    mouseDelta.current.x = 0;
    mouseDelta.current.y = 0;

    const keys = keysRef.current;
    const activePos = inVehicle ? spherePos.current : playerPos.current;
    const activeVel = inVehicle ? sphereVel.current : playerVel.current;

    let nearestCenter = planetCenter;
    let nearestDist = activePos.distanceTo(planetCenter);
    for (let pi = 0; pi < planets.length; pi++) {
      const pc = PLANET_POSITIONS[pi];
      if (!pc) continue;
      const d = activePos.distanceTo(pc);
      if (d < nearestDist) { nearestDist = d; nearestCenter = pc; }
    }

    const toCenter = nearestCenter.clone().sub(activePos);
    const distFromCenter = toCenter.length();
    const surfaceRadius = PLANET_RADIUS * VOXEL_SCALE;
    const altitude = distFromCenter - surfaceRadius;
    const atmosphereHeight = surfaceRadius * ATMOSPHERE_SCALE;
    const inAtmosphere = altitude < atmosphereHeight;

    const up = distFromCenter > 0.1
      ? activePos.clone().sub(nearestCenter).normalize()
      : new THREE.Vector3(0, 1, 0);

    refForward.current.projectOnPlane(up).normalize();
    if (refForward.current.lengthSq() < 0.01) {
      refForward.current.set(1, 0, 0).projectOnPlane(up).normalize();
    }

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, -dx * 0.002);
    refForward.current.applyQuaternion(yawQuat).projectOnPlane(up).normalize();
    pitchRef.current = Math.max(-1.4, Math.min(1.4, pitchRef.current - dy * 0.002));

    const cosPitch = Math.cos(pitchRef.current);
    const sinPitch = Math.sin(pitchRef.current);
    const lookDir = refForward.current.clone().multiplyScalar(cosPitch).addScaledVector(up, sinPitch).normalize();

    const localRight = new THREE.Vector3().crossVectors(up, refForward.current).normalize();

    if (inVehicle) {
      const inSpace = altitude > surfaceRadius * 0.5;
      const thrust = keys["shift"] ? SHIP_BOOST_THRUST : SHIP_THRUST;

      if (keys["w"]) sphereVel.current.addScaledVector(lookDir, thrust * clampedDt);
      if (keys["s"]) sphereVel.current.addScaledVector(lookDir.clone().negate(), thrust * clampedDt);
      if (keys["a"]) sphereVel.current.addScaledVector(localRight.clone().negate(), thrust * clampedDt);
      if (keys["d"]) sphereVel.current.addScaledVector(localRight, thrust * clampedDt);
      if (keys[" "]) sphereVel.current.addScaledVector(up, thrust * clampedDt);

      if (inSpace) {
        const gravScale = Math.max(0, 1 - altitude / (surfaceRadius * 5));
        sphereVel.current.addScaledVector(toCenter.normalize(), GRAVITY_STRENGTH * 0.3 * gravScale * clampedDt);
      } else {
        sphereVel.current.addScaledVector(toCenter.normalize(), GRAVITY_STRENGTH * clampedDt);
      }

      const drag = inSpace ? 0.998 : 0.97;
      sphereVel.current.multiplyScalar(Math.pow(drag, clampedDt * 60));
      spherePos.current.addScaledVector(sphereVel.current, clampedDt);

      const distToActivePlanet = spherePos.current.distanceTo(planetCenter);
      for (let pi = 0; pi < planets.length; pi++) {
        if (pi === activePlanetIndex) continue;
        const otherCenter = PLANET_POSITIONS[pi] || PLANET_POSITIONS[0];
        const distToOther = spherePos.current.distanceTo(otherCenter);
        if (distToOther < PLANET_LANDING_RANGE && distToOther < distToActivePlanet) {
          onPlanetSwitch(pi);
          return;
        }
      }

      if (!thirdPerson) {
        camera.position.copy(spherePos.current).addScaledVector(up, 0.5);
      } else {
        camera.position.copy(spherePos.current).addScaledVector(lookDir, -6).addScaledVector(up, 2);
      }

    } else {
      // Apply gravity and physics to the SPHERE when not piloted
      {
        // Compute nearest center from SPHERE position (not player position)
        let sphereNearestCenter = planetCenter;
        let sphereNearestDist = spherePos.current.distanceTo(planetCenter);
        for (let pi = 0; pi < planets.length; pi++) {
          const pc = PLANET_POSITIONS[pi];
          if (!pc) continue;
          const d = spherePos.current.distanceTo(pc);
          if (d < sphereNearestDist) { sphereNearestDist = d; sphereNearestCenter = pc; }
        }
        const sphereToCenter = sphereNearestCenter.clone().sub(spherePos.current);
        const sphereDist = sphereToCenter.length();
        const sphereUp = sphereDist > 0.1
          ? spherePos.current.clone().sub(sphereNearestCenter).normalize()
          : new THREE.Vector3(0, 1, 0);
        sphereVel.current.addScaledVector(sphereToCenter.normalize(), GRAVITY_STRENGTH * clampedDt);
        spherePos.current.addScaledVector(sphereVel.current, clampedDt);

        // Voxel-aware ground settle: step downward until hitting solid voxel or absolute floor
        const sphereRadius = VOXEL_SCALE * 0.8;
        const maxDrop = VOXEL_SCALE * 4;
        const step = VOXEL_SCALE * 0.25;
        let dropped = 0;
        let hitGround = false;
        const probe = spherePos.current.clone();
        while (dropped < maxDrop) {
          probe.addScaledVector(sphereUp, -step);
          dropped += step;
          const [sgx, sgy, sgz] = worldToGrid(probe, sphereNearestCenter);
          if (getVoxel(planetData, sgx, sgy, sgz) !== 0) {
            // Snap sphere to just above the hit voxel
            spherePos.current.copy(probe).addScaledVector(sphereUp, step + sphereRadius);
            hitGround = true;
            break;
          }
        }
        if (hitGround) {
          const radialVelS = sphereVel.current.dot(sphereUp);
          if (radialVelS < 0) sphereVel.current.addScaledVector(sphereUp, -radialVelS);
          sphereVel.current.multiplyScalar(0.7);
        }
      }

      // Update HUD sphere proximity state
      const sphereDist6 = playerPos.current.distanceTo(spherePos.current);
      useGameStore.getState().setNearSphere(sphereDist6 < 6);

      const speed = keys["shift"] ? SPRINT_SPEED : WALK_SPEED;
      const moveDir = new THREE.Vector3();
      if (keys["w"]) moveDir.add(refForward.current);
      if (keys["s"]) moveDir.addScaledVector(refForward.current, -1);
      if (keys["a"]) moveDir.addScaledVector(localRight, -1);
      if (keys["d"]) moveDir.add(localRight);
      if (moveDir.lengthSq() > 0) moveDir.normalize();

      const radialVel = up.clone().multiplyScalar(playerVel.current.dot(up));
      playerVel.current.copy(moveDir.multiplyScalar(speed)).add(radialVel);

      const footGravScale = Math.min(1, (surfaceRadius * 3) / Math.max(distFromCenter, 0.1));
      playerVel.current.addScaledVector(toCenter.normalize(), GRAVITY_STRENGTH * footGravScale * clampedDt);

      if ((keys[" "] || keys["spacebar"]) && onGround.current) {
        playerVel.current.addScaledVector(up, JUMP_IMPULSE);
        onGround.current = false;
      }

      const tangentialMove = playerVel.current.clone().projectOnPlane(up).multiplyScalar(clampedDt);
      const radialMove = up.clone().multiplyScalar(playerVel.current.dot(up) * clampedDt);

      const newPos = playerPos.current.clone().add(tangentialMove);
      if (!playerCollides(newPos, planetData, planetCenter, up)) {
        playerPos.current.copy(newPos);
      } else {
        // Step-up: try same move after lifting by 1 full voxel — gate on onGround to avoid mid-air jitter
        const stepUpPos = newPos.clone().addScaledVector(up, VOXEL_SCALE * 1.0);
        if (onGround.current && !playerCollides(stepUpPos, planetData, planetCenter, up)) {
          playerPos.current.copy(stepUpPos);
        } else {
          const tv = playerVel.current.clone().projectOnPlane(up);
          playerVel.current.sub(tv);
        }
      }

      const newPos2 = playerPos.current.clone().add(radialMove);
      if (!playerCollides(newPos2, planetData, planetCenter, up)) {
        playerPos.current.copy(newPos2);
        onGround.current = groundCheck(playerPos.current, planetData, planetCenter, up);
      } else {
        const rv = playerVel.current.dot(up);
        playerVel.current.addScaledVector(up, -rv);
        if (rv < 0) onGround.current = true;
      }

      if (distFromCenter < surfaceRadius * 0.3) {
        const safePos = planetCenter.clone().addScaledVector(up.length() > 0 ? up : new THREE.Vector3(0, 1, 0), surfaceRadius + 3 * VOXEL_SCALE);
        playerPos.current.copy(safePos);
        playerVel.current.set(0, 0, 0);
      }

      if (!thirdPerson) {
        camera.position.copy(playerPos.current).addScaledVector(up, EYE_HEIGHT);
      } else {
        camera.position.copy(playerPos.current).addScaledVector(lookDir, -5).addScaledVector(up, 2);
      }
    }

    camera.up.copy(up);
    camera.lookAt(camera.position.clone().add(lookDir));

    if (state.clock.elapsedTime - lastHudUpdate.current > 0.1) {
      lastHudUpdate.current = state.clock.elapsedTime;
      setSpeed(Math.round(activeVel.length() * 10) / 10);
      setAltitude(Math.round(altitude));
    }

    if (state.clock.elapsedTime - lastSave.current > 45) {
      lastSave.current = state.clock.elapsedTime;
      const mods = modifiedVoxelsMap.get(activePlanet.id);
      if (mods && mods.size > 0) {
        onSave(new Map(mods), activePlanet.id, useGameStore.getState().gameInventory);
      }
    }

    if (state.clock.elapsedTime - lastPresence.current > 2) {
      lastPresence.current = state.clock.elapsedTime;
      const pos = inVehicle ? spherePos.current : playerPos.current;
      onPositionUpdate(pos.x, pos.y, pos.z);
    }
  });

  const cameraDir = useRef(new THREE.Vector3());
  camera.getWorldDirection(cameraDir.current);

  const surfaceRadius = PLANET_RADIUS * VOXEL_SCALE;
  const activePos = inVehicle ? spherePos.current : playerPos.current;
  const distFromCenter = activePos.distanceTo(planetCenter);
  const altitude = distFromCenter - surfaceRadius;
  const atmosphereFactor = Math.max(0, Math.min(1, 1 - altitude / (surfaceRadius * ATMOSPHERE_SCALE)));
  const starOpacity = Math.max(0, Math.min(1, 1 - atmosphereFactor));

  const spaceColor = new THREE.Color(0x050510);
  const skyBaseColor = biomeType === "alien" ? new THREE.Color(0x2D0050) : new THREE.Color(0x5B9BD5);
  const bgColor = spaceColor.clone().lerp(skyBaseColor, atmosphereFactor * 0.6);

  const fogNear = 15 + (1 - atmosphereFactor) * 300;
  const fogFar = 60 + (1 - atmosphereFactor) * 600;

  return (
    <>
      <color attach="background" args={[bgColor.r, bgColor.g, bgColor.b]} />
      <fog attach="fog" args={[bgColor, fogNear, fogFar]} />

      <Sun dayTime={dayTime} />
      <CustomStars opacity={starOpacity} />

      <PlanetVoxelMesh data={planetData} center={planetCenter} revision={geoRevision} planetId={activePlanet?.id ?? 0} />
      <WaterShell center={planetCenter} biomeType={biomeType} />

      {atmosphereFactor > 0.01 && (
        <mesh position={planetCenter}>
          <sphereGeometry args={[surfaceRadius * 1.3, 32, 32]} />
          <meshBasicMaterial
            color={biomeType === "alien" ? 0x7B1FA2 : 0x87CEEB}
            transparent
            opacity={0.08 * atmosphereFactor}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {planets.map((p, i) => {
        if (i === activePlanetIndex) return null;
        const pos = PLANET_POSITIONS[i] || PLANET_POSITIONS[0];
        const dist = activePos.distanceTo(pos);
        if (dist > 800) return null;
        const visRadius = Math.max(surfaceRadius, surfaceRadius * (100 / Math.max(dist, 1)));
        return (
          <DistantPlanetSphere
            key={p.id}
            position={pos}
            planetType={p.type}
            visualRadius={Math.min(visRadius, surfaceRadius * 2)}
          />
        );
      })}

      {(inVehicle && thirdPerson) && (
        <SevcoSphere position={spherePos.current} visible />
      )}

      {!inVehicle && (
        <SevcoSphere position={spherePos.current} visible />
      )}

      {!inVehicle && (
        <VoxelHighlight
          direction={cameraDir.current}
          data={planetData}
          center={planetCenter}
        />
      )}

      <OtherPlayers players={otherPlayers} />
    </>
  );
}

function trackModification(planetId: number, gx: number, gy: number, gz: number, val: number): void {
  if (!modifiedVoxelsMap.has(planetId)) modifiedVoxelsMap.set(planetId, new Map());
  modifiedVoxelsMap.get(planetId)!.set(`${gx},${gy},${gz}`, val);
}

function HUD({ planet, sparksBalance, progress }: { planet: Planet | null; sparksBalance: number; progress: Progress | null }) {
  const { selectedBlock, setSelectedBlock, speed, altitude, inVehicle, pointerLocked, crystalsCollected, nearSphere, gameInventory, showInventory, setShowInventory, pickupToast } = useGameStore();

  const allBlockTypes = BLOCK_TYPES as readonly { id: number; name: string; color: number }[];
  const artifactCount = gameInventory["artifact"] ?? 0;
  return (
    <div className="absolute inset-0 pointer-events-none select-none" data-testid="freeball-hud">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" data-testid="freeball-crosshair">
        <div className="w-5 h-0.5 bg-white/80 absolute top-1/2 -translate-y-1/2 left-0" />
        <div className="h-5 w-0.5 bg-white/80 absolute left-1/2 -translate-x-1/2 top-0" />
      </div>

      {pickupToast && (
        <div
          className="absolute top-[calc(50%+36px)] left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full font-mono pointer-events-none"
          data-testid="freeball-pickup-toast"
          style={{ transition: "opacity 0.3s" }}
        >
          {pickupToast}
        </div>
      )}

      <div className="absolute top-3 right-3 flex flex-col items-end gap-1" data-testid="freeball-info">
        {planet && <div className="bg-black/60 text-white text-xs px-2 py-1 rounded font-mono">{planet.name} ({planet.type})</div>}
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
        {artifactCount > 0 && (
          <div className="bg-black/60 text-purple-400 text-xs px-2 py-1 rounded font-mono" data-testid="freeball-artifact-count">Artifacts: {artifactCount}</div>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1" data-testid="freeball-hotbar">
        {BLOCK_TYPES.slice(0, 9).map((b) => {
          const hex = b.color.toString(16).padStart(6, "0");
          const qty = gameInventory[String(b.id)] ?? 0;
          const depleted = qty <= 0;
          return (
            <div
              key={b.id}
              data-testid={`freeball-hotbar-block-${b.id}`}
              className={`w-10 h-10 rounded border-2 flex items-center justify-center pointer-events-auto relative ${selectedBlock === b.id ? "border-white scale-110" : "border-white/30"} ${depleted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ backgroundColor: `#${hex}40` }}
              onClick={() => { if (!depleted) setSelectedBlock(b.id); }}
              title={`${b.name} (${qty})`}
            >
              <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: `#${hex}` }} />
              <span className="absolute bottom-0 right-0.5 text-white text-[9px] font-bold leading-tight font-mono drop-shadow" data-testid={`freeball-hotbar-qty-${b.id}`}>{qty}</span>
            </div>
          );
        })}
      </div>

      {nearSphere && !inVehicle && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 bg-black/80 text-white px-4 py-2 rounded-lg border border-white/20 flex items-center gap-3 backdrop-blur-sm animate-in fade-in zoom-in duration-200" data-testid="freeball-sphere-prompt">
          <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center border border-blue-500/40 text-blue-400 font-bold">E</div>
          <span className="text-sm font-medium tracking-tight">Press E to board SPHERE</span>
        </div>
      )}

      {!pointerLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 text-white/60 text-sm text-center pointer-events-none">
          Click to play
        </div>
      )}

      {pointerLocked && (
        <div className="absolute bottom-20 left-3 text-white/40 text-xs" data-testid="freeball-controls-hint">
          WASD move · Space jump · Shift sprint/boost · LMB break · RMB place · E enter/exit SPHERE · T third-person · I inventory · Tab players · Esc menu
        </div>
      )}

      {progress?.unlockedSphere && !inVehicle && nearSphere && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-blue-300 text-sm px-4 py-2 rounded-lg font-mono border border-blue-500/40" data-testid="freeball-sphere-prompt">
          Press E to board SPHERE
        </div>
      )}

      {progress?.unlockedSphere && (
        <div className="absolute top-3 left-3 bg-black/60 text-blue-400 text-xs px-2 py-1 rounded font-mono" data-testid="freeball-sphere-status">
          SPHERE ready (E)
        </div>
      )}

      {showInventory && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{ zIndex: 50 }}
          data-testid="freeball-inventory-panel"
        >
          <div className="bg-black/85 backdrop-blur-sm border border-white/20 rounded-xl p-4 w-[420px] max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold text-sm tracking-wide">Inventory</span>
              <button
                className="text-white/50 hover:text-white text-xs px-2 py-0.5 rounded border border-white/20 hover:border-white/50 transition-colors"
                onClick={() => setShowInventory(false)}
                data-testid="freeball-inventory-close"
              >
                Close [I]
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-4 gap-2">
                {allBlockTypes.map((b) => {
                  const qty = gameInventory[String(b.id)] ?? 0;
                  const hex = b.color.toString(16).padStart(6, "0");
                  return (
                    <div
                      key={b.id}
                      className={`flex flex-col items-center gap-1 bg-white/5 rounded-lg p-2 border border-white/10 ${qty === 0 ? "opacity-30" : ""}`}
                      data-testid={`freeball-inv-item-${b.id}`}
                    >
                      <div className="w-7 h-7 rounded" style={{ backgroundColor: `#${hex}` }} />
                      <span className="text-white/70 text-[9px] text-center leading-tight font-mono">{b.name}</span>
                      <span className="text-white font-bold text-xs font-mono">{qty}</span>
                    </div>
                  );
                })}
                {artifactCount > 0 && (
                  <div
                    className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-2 border border-purple-400/30"
                    data-testid="freeball-inv-item-artifact"
                  >
                    <div className="w-7 h-7 rounded bg-purple-500 flex items-center justify-center text-sm">✦</div>
                    <span className="text-purple-300 text-[9px] text-center leading-tight font-mono">Alien Artifact</span>
                    <span className="text-white font-bold text-xs font-mono">{artifactCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SparkPack {
  id: number;
  name: string;
  sparks: number;
  price: number;
}

function SparksStoreTab({ sparksBalance }: { sparksBalance: number }) {
  const { data: packs, isLoading, isError } = useQuery<SparkPack[]>({ queryKey: ["/api/sparks/packs"] });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: ({ packId }: { packId: number }) =>
      apiRequest("POST", "/api/sparks/checkout", { packId, recurring: false }).then((r) => r.json()),
    onSuccess: (data: { url: string }) => {
      setCheckoutError(null);
      if (data?.url) window.open(data.url, "_blank");
    },
    onError: (err: Error) => {
      setCheckoutError(err.message ?? "Checkout failed. Try again.");
    },
  });

  return (
    <div data-testid="freeball-sparks-store">
      <div className="flex items-center justify-between mb-3">
        <span className="text-yellow-400 text-sm font-semibold">Your balance</span>
        <span className="text-yellow-300 text-sm font-mono" data-testid="sparks-store-balance">⚡ {sparksBalance.toLocaleString()}</span>
      </div>
      {checkoutError && (
        <div className="text-red-400 text-xs text-center py-2 mb-2 bg-red-950/30 rounded" data-testid="sparks-store-checkout-error">{checkoutError}</div>
      )}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}
      {isError && (
        <div className="text-red-400 text-xs text-center py-4" data-testid="sparks-store-error">Failed to load packs. Try again later.</div>
      )}
      {!isLoading && !isError && packs && packs.length === 0 && (
        <div className="text-gray-500 text-xs text-center py-4" data-testid="sparks-store-empty">No packs available yet.</div>
      )}
      {!isLoading && !isError && packs && packs.length > 0 && (
        <div className="space-y-2">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              data-testid={`sparks-store-pack-${pack.id}`}
            >
              <div>
                <div className="text-white text-xs font-semibold">{pack.name}</div>
                <div className="text-yellow-400 text-xs">⚡ {pack.sparks.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-bold" data-testid={`sparks-store-price-${pack.id}`}>${(pack.price / 100).toFixed(2)}</span>
                <Button
                  data-testid={`sparks-store-buy-${pack.id}`}
                  size="sm"
                  className="h-7 text-xs bg-yellow-500 hover:bg-yellow-400 text-yellow-950"
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate({ packId: pack.id })}
                >
                  Buy
                </Button>
              </div>
            </div>
          ))}
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
  const [activeTab, setActiveTab] = useState<"game" | "sparks">("game");
  const canCraftSphere = crystalsCollected >= CRYSTAL_CRAFT_AMOUNT;
  const canBuySphere = sparksBalance >= SPHERE_SPARKS_COST;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50" data-testid="freeball-pause-menu">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-white text-xl font-bold mb-1">FREEBALL</h2>
        <p className="text-gray-400 text-xs mb-3">Paused · {planets.length} planets in galaxy</p>

        <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
          <button
            data-testid="freeball-tab-game"
            className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${activeTab === "game" ? "bg-blue-700 text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("game")}
          >
            Game
          </button>
          <button
            data-testid="freeball-tab-sparks"
            className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${activeTab === "sparks" ? "bg-yellow-600 text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => setActiveTab("sparks")}
          >
            Buy Sparks ⚡
          </button>
        </div>

        {activeTab === "game" && (
          <>
            <div className="flex flex-wrap gap-1 mb-4">
              {planets.map((p) => (
                <span key={p.id} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{p.name}</span>
              ))}
            </div>

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
                <p className="text-green-400 text-sm">✓ SPHERE unlocked — fly to other planets!</p>
              </div>
            )}

            <Button
              data-testid="freeball-btn-exit"
              onClick={onExit}
              variant="ghost"
              className="w-full text-gray-400 hover:text-red-400 hover:bg-red-950/30"
            >
              Exit to Platform
            </Button>
          </>
        )}

        {activeTab === "sparks" && (
          <SparksStoreTab sparksBalance={sparksBalance} />
        )}
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

  useEffect(() => {
    if (!progress || !planets.length || progressHydrated.current) return;
    progressHydrated.current = true;
    if (progress.currentPlanetId !== null) {
      const idx = planets.findIndex((p) => p.id === progress.currentPlanetId);
      if (idx !== -1) setActivePlanetIndex(idx);
    }
    const savedInventory: Record<string, number> = {};
    if (progress.inventory && typeof progress.inventory === "object") {
      for (const [k, v] of Object.entries(progress.inventory)) {
        if (typeof v === "number") {
          if (k === "crystals") {
            savedInventory["7"] = Math.max(savedInventory["7"] ?? 0, v);
          } else {
            savedInventory[k] = v;
          }
        }
      }
    }
    const totalItems = Object.values(savedInventory).reduce((a, b) => a + b, 0);
    if (totalItems === 0) {
      savedInventory["1"] = (savedInventory["1"] ?? 0) + 10;
      savedInventory["2"] = (savedInventory["2"] ?? 0) + 10;
      savedInventory["3"] = (savedInventory["3"] ?? 0) + 10;
    }
    useGameStore.getState().setGameInventory(savedInventory);
    setCrystalsCollected(savedInventory["7"] ?? 0);
  }, [progress, planets]);

  const activePlanet = planets[activePlanetIndex] ?? null;
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
      planetDataCache.clear();
      modifiedVoxelsMap.clear();
      planetBuildsApplied.clear();
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ modified, planetId }: { modified: Map<string, number>; planetId: number }) => {
      const voxelData: Record<string, number> = {};
      const savedSnapshot = new Map<string, number>();
      modified.forEach((val, key) => { voxelData[key] = val; savedSnapshot.set(key, val); });
      await apiRequest("POST", `/api/freeball/builds/${planetId}`, {
        chunkX: 0, chunkY: 0, chunkZ: 0, voxelData,
      });
      return { planetId, savedSnapshot };
    },
    onSuccess: ({ planetId: savedPlanetId, savedSnapshot }) => {
      const currentMods = modifiedVoxelsMap.get(savedPlanetId);
      if (currentMods) {
        savedSnapshot.forEach((savedVal, key) => {
          if (currentMods.get(key) === savedVal) currentMods.delete(key);
        });
        if (currentMods.size === 0) modifiedVoxelsMap.delete(savedPlanetId);
      }
      qc.invalidateQueries({ queryKey: ["/api/freeball/builds", savedPlanetId] });
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

  const handleSave = useCallback((modified: Map<string, number>, currentPlanetId: number, inventory: Record<string, number>) => {
    if (modified.size > 0) saveMutation.mutate({ modified, planetId: currentPlanetId });
    progressMutation.mutate({ currentPlanetId, inventory });
  }, []);

  const handleManualSave = useCallback(() => {
    if (!activePlanetId) return;
    const mods = modifiedVoxelsMap.get(activePlanetId);
    if (mods && mods.size > 0) saveMutation.mutate({ modified: new Map(mods), planetId: activePlanetId });
    progressMutation.mutate({ currentPlanetId: activePlanetId, inventory: useGameStore.getState().gameInventory });
  }, [activePlanetId]);

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
      apiRequest("PATCH", "/api/freeball/progress", {
        inventory: useGameStore.getState().gameInventory,
        ...(activePlanetId ? { currentPlanetId: activePlanetId } : {}),
      }).then(() => {
        unlockSphereMutation.mutate();
      }).catch(() => {
        unlockSphereMutation.mutate();
      });
    }
  }, [progress, activePlanetId]);

  const handleSendChat = useCallback(async (msg: string) => {
    try { await apiRequest("POST", "/api/freeball/chat", { message: msg }); } catch { /* ignore */ }
  }, []);

  const handleUnlockSphere = useCallback(() => {
    unlockSphereMutation.mutate();
    setPaused(false);
  }, []);

  const handlePlanetSwitch = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= planets.length) return;
    if (activePlanetId) {
      const mods = modifiedVoxelsMap.get(activePlanetId);
      if (mods && mods.size > 0) saveMutation.mutate({ modified: new Map(mods), planetId: activePlanetId });
    }
    const planet = planets[newIndex];
    planetDataCache.delete(planet.id);
    planetBuildsApplied.delete(planet.id);
    setActivePlanetIndex(newIndex);
    progressMutation.mutate({ currentPlanetId: planet.id });
    qc.invalidateQueries({ queryKey: ["/api/freeball/builds", planet.id] });
  }, [planets, activePlanetId]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Please sign in to play Freeball.</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100]" data-testid="freeball-page">
      {activePlanet && planets.length > 0 && (
        <Canvas
          className="w-full h-full"
          camera={{ fov: 75, near: 0.1, far: 1000, position: [0, (PLANET_RADIUS + 5) * VOXEL_SCALE, 0] }}
          gl={{ antialias: false }}
          shadows
          onContextMenu={(e) => e.preventDefault()}
        >
          <Scene
            planets={planets}
            activePlanetIndex={activePlanetIndex}
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
