import { Component, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";
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
import { computeBlendedGravity, preserveHeading, dampingFactor } from "./freeball-gravity";
import { CompassBar, SystemMap, WaypointMarker, type CompassBody, type CelestialKind } from "./freeball-hud";

interface Planet {
  id: number;
  name: string;
  seed: number;
  type: string;
  size: number;
}

// Task #423 — universal voxel interactability (moons + asteroids)
// `kind` is derived from the body's `type` so we can treat them uniformly
// while still rendering distinct visuals + carving distinct biomes.
type BodyKind = "planet" | "moon" | "asteroid";
function bodyKindFor(type: string): BodyKind {
  if (type === "moon") return "moon";
  if (type.startsWith("asteroid")) return "asteroid";
  return "planet";
}
// World-radius (in voxel units) for each body kind. Kept inside the shared 64³
// grid to avoid refactoring the meshing pipeline; smaller bodies just fill
// less of the grid.
function worldRadiusFor(type: string): number {
  const kind = bodyKindFor(type);
  if (kind === "moon") return 18;
  if (kind === "asteroid") return 9;
  return PLANET_RADIUS;
}
function isMineable(type: string): boolean {
  // All bodies in the current galaxy are mineable. Gas giants/stars would
  // return false here once #417's full solar system lands.
  return bodyKindFor(type) !== ("star" as BodyKind);
}

interface Progress {
  userId: string;
  currentPlanetId: number | null;
  sparksSpent: number;
  unlockedSphere: boolean;
  inventory: Record<string, number>;
  discoveredPlanetIds?: string[];
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
const SPHERE_RADIUS = 1.2;
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
  // Task #423 — moon + asteroid materials
  { id: 25, name: "Regolith",       color: 0xBDBDBD },
  { id: 26, name: "Moonstone",      color: 0x90A4AE },
  { id: 27, name: "Iron Ore",       color: 0x8D6E63 },
  { id: 28, name: "Frozen Water",   color: 0x80DEEA },
  { id: 29, name: "Rare Ore",       color: 0xFFC400 },
  { id: 30, name: "Void Crystal",   color: 0xD500F9 },
] as const;

const BLOCK_REGOLITH = 25;
const BLOCK_MOONSTONE = 26;
const BLOCK_IRON_ORE = 27;
const BLOCK_FROZEN_WATER = 28;
const BLOCK_RARE_ORE = 29;
const BLOCK_VOID_CRYSTAL = 30;
const RARE_MATERIAL_IDS = new Set<number>([
  BLOCK_RARE_ORE, BLOCK_VOID_CRYSTAL, BLOCK_MOONSTONE, BLOCK_IRON_ORE,
]);

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
  // Task #423 — moon biome (no foliage, low amplitude rolling regolith)
  moon: {
    surface: BLOCK_REGOLITH, sub: BLOCK_MOONSTONE, deep: 16,
    hasWater: false, waterColor: 0,
    treeTrunk: 0, treeLeaf: 0,
    flowerBlocks: [],
    treeChance: 0, flowerChance: 0,
    terrainAmp: 1.5, noiseFreq: 1.2,
  },
  // Asteroid biomes — irregular shape generated separately, biome.surface/sub/deep
  // pick the materials the asteroid is made of.
  asteroid_common: {
    surface: 3, sub: 3, deep: 3,
    hasWater: false, waterColor: 0,
    treeTrunk: 0, treeLeaf: 0, flowerBlocks: [],
    treeChance: 0, flowerChance: 0,
    terrainAmp: 0, noiseFreq: 1.0,
  },
  asteroid_icy: {
    surface: 16, sub: BLOCK_FROZEN_WATER, deep: BLOCK_FROZEN_WATER,
    hasWater: false, waterColor: 0,
    treeTrunk: 0, treeLeaf: 0, flowerBlocks: [],
    treeChance: 0, flowerChance: 0,
    terrainAmp: 0, noiseFreq: 1.0,
  },
  asteroid_metallic: {
    surface: BLOCK_IRON_ORE, sub: 3, deep: 3,
    hasWater: false, waterColor: 0,
    treeTrunk: 0, treeLeaf: 0, flowerBlocks: [],
    treeChance: 0, flowerChance: 0,
    terrainAmp: 0, noiseFreq: 1.0,
  },
  asteroid_rare: {
    surface: 3, sub: 3, deep: CRYSTAL_ID,
    hasWater: false, waterColor: 0,
    treeTrunk: 0, treeLeaf: 0, flowerBlocks: [],
    treeChance: 0, flowerChance: 0,
    terrainAmp: 0, noiseFreq: 1.0,
  },
};

const PLANET_VISUALS: Record<string, { color: number; glow: number }> = {
  verdania: { color: 0x2ECC40, glow: 0x81D4FA },
  desert: { color: 0xFFB74D, glow: 0xFF8A65 },
  ice: { color: 0xE3F2FD, glow: 0x81D4FA },
  alien: { color: 0xAA00FF, glow: 0xE040FB },
  moon: { color: 0xCFD8DC, glow: 0xECEFF1 },
  asteroid_common: { color: 0x6D6D6D, glow: 0x424242 },
  asteroid_icy: { color: 0xB3E5FC, glow: 0x80DEEA },
  asteroid_metallic: { color: 0x8D6E63, glow: 0xBCAAA4 },
  asteroid_rare: { color: 0xFFC400, glow: 0xFFEB3B },
};

interface VoxelPlanetDef {
  index: number;
  planet: Planet;
  position: THREE.Vector3;
  voxelScale: number;
  voxelRadius: number;
  worldRadius: number;
}

interface StarDef {
  position: THREE.Vector3;
  worldRadius: number;
}

interface GasGiantDef {
  id: string;
  position: THREE.Vector3;
  worldRadius: number;
  seed: number;
  hasRing: boolean;
}

type MoonParent = { kind: "voxel"; index: number } | { kind: "gas-giant"; index: number };

interface MoonDef {
  id: string;
  parent: MoonParent;
  orbitRadius: number;
  orbitSpeed: number;
  inclination: number;
  phase: number;
  worldRadius: number;
  seed: number;
}

interface AsteroidBeltDef {
  center: THREE.Vector3;
  innerRadius: number;
  outerRadius: number;
  count: number;
  seed: number;
}

interface SolarSystem {
  voxelDefs: VoxelPlanetDef[];
  star: StarDef;
  gasGiants: GasGiantDef[];
  moons: MoonDef[];
  asteroidBelt: AsteroidBeltDef;
}

const VOXEL_TIERS = [
  { voxelRadius: 22, scaleMin: 0.7, scaleMax: 1.0 },
  { voxelRadius: 28, scaleMin: 1.6, scaleMax: 2.6 },
  { voxelRadius: 30, scaleMin: 3.2, scaleMax: 4.5 },
];

function buildSolarSystem(planets: Planet[]): SolarSystem {
  const star: StarDef = { position: new THREE.Vector3(0, 0, 0), worldRadius: 1800 };
  const sysRng = makeRng(73821);
  const voxelDefs: VoxelPlanetDef[] = [];
  const placed: { pos: THREE.Vector3; r: number }[] = [];

  // Pad to at least 6 voxel planets with synthetic decorative ones.
  const allPlanets: Planet[] = [...planets];
  const targetCount = 6;
  for (let i = allPlanets.length; i < targetCount; i++) {
    allPlanets.push({
      id: -1000 - i,
      name: `Planetoid ${i + 1}`,
      seed: 90001 + i * 137,
      type: ["verdania", "desert", "ice", "alien"][i % 4],
      size: 120,
    });
  }

  for (let i = 0; i < allPlanets.length; i++) {
    const p = allPlanets[i];
    const prng = makeRng(p.seed * 31 + 17);
    const r = prng();
    const tier = r < 0.25 ? VOXEL_TIERS[0] : r < 0.85 ? VOXEL_TIERS[1] : VOXEL_TIERS[2];
    const voxelScale = tier.scaleMin + prng() * (tier.scaleMax - tier.scaleMin);
    const voxelRadius = Math.min(GRID_HALF - 2, tier.voxelRadius);
    const worldRadius = voxelScale * voxelRadius;

    let pos = new THREE.Vector3();
    for (let attempt = 0; attempt < 40; attempt++) {
      const baseOrbit = star.worldRadius + 800 + i * 700;
      const orbit = baseOrbit + (sysRng() - 0.5) * 600;
      const angle = sysRng() * Math.PI * 2;
      const yJit = (sysRng() - 0.5) * 250;
      pos = new THREE.Vector3(Math.cos(angle) * orbit, yJit, Math.sin(angle) * orbit);
      let ok = true;
      for (const o of placed) {
        if (pos.distanceTo(o.pos) < (worldRadius + o.r) * 2.5) { ok = false; break; }
      }
      if (ok) break;
    }
    placed.push({ pos, r: worldRadius });
    voxelDefs.push({ index: i, planet: p, position: pos, voxelScale, voxelRadius, worldRadius });
  }

  // Gas giant placed beyond the outermost voxel planet
  const gasGiants: GasGiantDef[] = [];
  {
    const angle = sysRng() * Math.PI * 2;
    const orbit = 4500;
    const pos = new THREE.Vector3(Math.cos(angle) * orbit, (sysRng() - 0.5) * 100, Math.sin(angle) * orbit);
    gasGiants.push({ id: "gg-0", position: pos, worldRadius: 450, seed: 99001, hasRing: true });
  }

  // Moons
  const moons: MoonDef[] = [];
  for (let i = 0; i < Math.min(voxelDefs.length, 4); i++) {
    if (sysRng() < 0.55) {
      moons.push({
        id: `moon-v${i}`,
        parent: { kind: "voxel", index: i },
        orbitRadius: voxelDefs[i].worldRadius * (3 + sysRng() * 2),
        orbitSpeed: 0.04 + sysRng() * 0.08,
        inclination: (sysRng() - 0.5) * 0.6,
        phase: sysRng() * Math.PI * 2,
        worldRadius: 5 + sysRng() * 14,
        seed: 1234 + i * 17,
      });
    }
  }
  moons.push({
    id: "moon-gg-0",
    parent: { kind: "gas-giant", index: 0 },
    orbitRadius: 800,
    orbitSpeed: 0.04,
    inclination: 0.18,
    phase: sysRng() * Math.PI * 2,
    worldRadius: 22,
    seed: 5005,
  });
  moons.push({
    id: "moon-gg-1",
    parent: { kind: "gas-giant", index: 0 },
    orbitRadius: 1100,
    orbitSpeed: 0.025,
    inclination: -0.1,
    phase: sysRng() * Math.PI * 2,
    worldRadius: 14,
    seed: 5006,
  });

  const asteroidBelt: AsteroidBeltDef = {
    center: new THREE.Vector3(0, 0, 0),
    innerRadius: 3200,
    outerRadius: 3700,
    count: 22,
    seed: 7777,
  };

  return { voxelDefs, star, gasGiants, moons, asteroidBelt };
}

function getMoonPosition(moon: MoonDef, system: SolarSystem, t: number): THREE.Vector3 {
  let center: THREE.Vector3 | null = null;
  if (moon.parent.kind === "voxel") {
    const idx = moon.parent.index;
    if (idx >= 0 && idx < system.voxelDefs.length) center = system.voxelDefs[idx]?.position ?? null;
  } else {
    const idx = moon.parent.index;
    if (idx >= 0 && idx < system.gasGiants.length) center = system.gasGiants[idx]?.position ?? null;
  }
  if (!center) return new THREE.Vector3();
  const a = moon.phase + t * moon.orbitSpeed;
  const x = Math.cos(a) * moon.orbitRadius;
  const z = Math.sin(a) * moon.orbitRadius;
  const y = Math.sin(a) * moon.orbitRadius * Math.sin(moon.inclination);
  return new THREE.Vector3(center.x + x, center.y + y, center.z + z);
}

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
  // Sphere navigation HUD
  discoveredPlanetIds: string[];
  addDiscoveredPlanet: (id: string) => void;
  setDiscoveredPlanetIds: (ids: string[]) => void;
  activeWaypointId: string | null;
  setActiveWaypointId: (id: string | null) => void;
  isMapOpen: boolean;
  setIsMapOpen: (open: boolean) => void;
  // Per-frame Sphere transform mirror (throttled) so DOM HUD can render
  sphereHud: {
    pos: [number, number, number];
    forward: [number, number, number];
    up: [number, number, number];
    dayTime: number;
  };
  setSphereHud: (h: GameStore["sphereHud"]) => void;
  // Task #423 — Discoveries feed (rare-material finds)
  discoveries: { id: number; text: string; t: number }[];
  pushDiscovery: (text: string) => void;
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
  discoveredPlanetIds: [],
  addDiscoveredPlanet: (id) => {
    const cur = get().discoveredPlanetIds;
    if (cur.includes(id)) return;
    set({ discoveredPlanetIds: [...cur, id] });
  },
  setDiscoveredPlanetIds: (ids) => set({ discoveredPlanetIds: Array.from(new Set(ids)) }),
  activeWaypointId: null,
  setActiveWaypointId: (id) => set({ activeWaypointId: id }),
  isMapOpen: false,
  setIsMapOpen: (open) => set({ isMapOpen: open }),
  sphereHud: {
    pos: [0, 0, 0],
    forward: [0, 0, -1],
    up: [0, 1, 0],
    dayTime: 0.25,
  },
  setSphereHud: (h) => set({ sphereHud: h }),
  discoveries: [],
  pushDiscovery: (text) => set((s) => ({
    discoveries: [{ id: Date.now() + Math.random(), text, t: Date.now() }, ...s.discoveries].slice(0, 5),
  })),
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

function generatePlanetData(seed: number, biomeType: string, worldRadius: number = PLANET_RADIUS): Uint8Array {
  const biome = BIOME_CONFIGS[biomeType] || BIOME_CONFIGS.verdania;
  const rng = makeRng(seed);
  const noise = createNoise3D(rng);
  const data = new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);
  const kind = bodyKindFor(biomeType);

  // Asteroids use a density-threshold generator: lumpy, irregular, sometimes
  // with crude internal tunnels. Otherwise we use the spherical surface-radius
  // approach for planets and moons.
  if (kind === "asteroid") {
    return generateAsteroidData(seed, biomeType, worldRadius, biome, noise, rng);
  }

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gz = 0; gz < GRID_SIZE; gz++) {
        const x = gx - GRID_HALF;
        const y = gy - GRID_HALF;
        const z = gz - GRID_HALF;
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist < 1) continue;

        const nx = x / worldRadius;
        const ny = y / worldRadius;
        const nz = z / worldRadius;

        const terrainNoise =
          noise(nx * biome.noiseFreq, ny * biome.noiseFreq, nz * biome.noiseFreq) * biome.terrainAmp +
          noise(nx * biome.noiseFreq * 2, ny * biome.noiseFreq * 2, nz * biome.noiseFreq * 2) * biome.terrainAmp * 0.5 +
          noise(nx * biome.noiseFreq * 4, ny * biome.noiseFreq * 4, nz * biome.noiseFreq * 4) * biome.terrainAmp * 0.25;

        const maxSurfaceRadius = GRID_HALF - 2;
        const surfaceRadius = Math.min(worldRadius + terrainNoise, maxSurfaceRadius);

        if (dist <= surfaceRadius) {
          const depth = surfaceRadius - dist;
          let blockId: number;
          if (depth < 1) blockId = biome.surface;
          else if (depth < 3) blockId = biome.sub;
          else blockId = biome.deep;

          if (kind === "planet" && depth > 3 && Math.abs(noise(nx * 8, ny * 8, nz * 8)) > 0.82) {
            blockId = CRYSTAL_ID;
          }
          // Moonstone glows; sprinkle iron-ore + rare deep on moons too
          if (kind === "moon" && depth > 4 && Math.abs(noise(nx * 6, ny * 6, nz * 6)) > 0.85) {
            blockId = BLOCK_IRON_ORE;
          }
          // Void-crystal: ultra-rare, deep below worldRadius * 0.3 in any body
          if (dist < worldRadius * 0.3 && Math.abs(noise(nx * 12, ny * 12, nz * 12)) > 0.93) {
            blockId = BLOCK_VOID_CRYSTAL;
          }

          data[gridIndex(gx, gy, gz)] = blockId;
        }
      }
    }
  }

  addFoliage(data, seed, biome);
  return data;
}

function generateAsteroidData(
  seed: number,
  biomeType: string,
  worldRadius: number,
  biome: BiomeConfig,
  noise: ReturnType<typeof createNoise3D>,
  rng: () => number,
): Uint8Array {
  const data = new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);
  const tunnelNoise = createNoise3D(makeRng(seed + 31337));
  const richNoise = createNoise3D(makeRng(seed + 91011));
  const isRare = biomeType === "asteroid_rare";
  const isMetallic = biomeType === "asteroid_metallic";
  const isIcy = biomeType === "asteroid_icy";
  // Place exactly one rare-ore "vein" on rare asteroids
  let placedRare = false;
  // Falloff radius — voxels can survive up to ~worldRadius+2, but density falls off
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gz = 0; gz < GRID_SIZE; gz++) {
        const x = gx - GRID_HALF;
        const y = gy - GRID_HALF;
        const z = gz - GRID_HALF;
        const dist = Math.sqrt(x * x + y * y + z * z);
        const maxR = Math.min(worldRadius + 3, GRID_HALF - 2);
        if (dist > maxR) continue;
        // Density: outer falloff + simplex lump noise
        const nx = x / worldRadius;
        const ny = y / worldRadius;
        const nz = z / worldRadius;
        const lump = noise(nx * 1.6, ny * 1.6, nz * 1.6) * 0.6
                   + noise(nx * 3.2, ny * 3.2, nz * 3.2) * 0.3;
        const radial = 1 - dist / Math.max(worldRadius, 1);
        const density = radial + lump * 0.5;
        if (density < 0.35) continue;
        // Carve a tunnel through the body for interest
        const tn = Math.abs(tunnelNoise(nx * 2.5, ny * 2.5, nz * 2.5));
        if (tn < 0.08 && dist < worldRadius * 0.85) continue;
        const depth = Math.max(0, worldRadius - dist);
        let blockId = depth < 1 ? biome.surface : (depth < 2 ? biome.sub : biome.deep);
        // Metallic asteroids: occasional iron-ore patches
        if (isMetallic && Math.abs(richNoise(nx * 5, ny * 5, nz * 5)) > 0.7) {
          blockId = BLOCK_IRON_ORE;
        }
        // Icy: sprinkle frozen-water near surface
        if (isIcy && depth < 2 && rng() > 0.4) {
          blockId = BLOCK_FROZEN_WATER;
        }
        // Rare asteroid: one rare-ore voxel near the core
        if (isRare && !placedRare && dist < worldRadius * 0.4 && rng() > 0.7) {
          blockId = BLOCK_RARE_ORE;
          placedRare = true;
        }
        // Universal void-crystal in deepest core, all asteroids
        if (dist < worldRadius * 0.25 && Math.abs(noise(nx * 14, ny * 14, nz * 14)) > 0.94) {
          blockId = BLOCK_VOID_CRYSTAL;
        }
        data[gridIndex(gx, gy, gz)] = blockId;
      }
    }
  }
  // Guarantee a rare-ore block exists on rare asteroids even if rng didn't trigger
  if (isRare && !placedRare) {
    const cx = GRID_HALF, cy = GRID_HALF, cz = GRID_HALF;
    if (data[gridIndex(cx, cy, cz)] !== 0) data[gridIndex(cx, cy, cz)] = BLOCK_RARE_ORE;
  }
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

function buildPlanetGeometry(data: Uint8Array, voxelScale: number = VOXEL_SCALE): PlanetGeo | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const S = GRID_SIZE;
  const scale = voxelScale;

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
          const ny = normal[1];
          let shade: number;
          if (ny > 0.5) shade = 1.0;
          else if (ny < -0.5) shade = 0.55;
          else shade = 0.75;

          // Per-voxel color jitter (±4%) using a 3D hash, dampens the "plastic" look
          const hashSeed = ((a * 374761393) ^ (b * 668265263) ^ (layer * 2147483647) ^ (dir > 0 ? 1 : 11)) >>> 0;
          const variation = 1.0 + (((hashSeed % 1000) / 1000) - 0.5) * 0.08;
          const baseShade = shade * variation;

          c.r = Math.min(1, c.r * baseShade);
          c.g = Math.min(1, c.g * baseShade);
          c.b = Math.min(1, c.b * baseShade);

          // Vertex AO: probe the slab one voxel "above" the face along the normal direction
          const slab = layer + dir;
          const slabValid = slab >= 0 && slab < S;
          const isSolidSlab = (uPos: number, vPos: number): boolean => {
            if (!slabValid) return false;
            if (uPos < 0 || uPos >= S || vPos < 0 || vPos >= S) return false;
            const cc: [number, number, number] = [0, 0, 0];
            cc[w] = slab; cc[u] = uPos; cc[v] = vPos;
            return data[gridIndex(cc[0], cc[1], cc[2])] !== 0;
          };
          const aoLevel = (uPos: number, vPos: number, du: number, dv: number): number => {
            const s1 = isSolidSlab(uPos + du, vPos);
            const s2 = isSolidSlab(uPos, vPos + dv);
            if (s1 && s2) return 0;
            const cor = isSolidSlab(uPos + du, vPos + dv);
            return 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (cor ? 1 : 0));
          };
          const aoFactor = (lvl: number) => 0.55 + lvl * 0.15;
          const ao00 = aoFactor(aoLevel(a, b, -1, -1));
          const ao10 = aoFactor(aoLevel(a + width - 1, b, +1, -1));
          const ao11 = aoFactor(aoLevel(a + width - 1, b + height - 1, +1, +1));
          const ao01 = aoFactor(aoLevel(a, b + height - 1, -1, +1));

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

          const aos = [ao00, ao10, ao11, ao01];
          const orderedIdx = dir === 1 ? [0, 1, 2, 3] : [0, 3, 2, 1];

          const baseIdx = positions.length / 3;
          for (const oi of orderedIdx) {
            const corner = corners[oi];
            const ao = aos[oi];
            positions.push(corner[0], corner[1], corner[2]);
            normals.push(normal[0], normal[1], normal[2]);
            colors.push(c.r * ao, c.g * ao, c.b * ao);
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

function getOrCreatePlanetData(planetId: number, seed: number, biomeType: string, savedBuilds: SavedBuild[], voxelRadius: number = PLANET_RADIUS): Uint8Array {
  const buildsKey = buildsFingerprint(savedBuilds);
  const prevKey = planetBuildsApplied.get(planetId) ?? "";
  if (planetDataCache.has(planetId) && prevKey === buildsKey) return planetDataCache.get(planetId)!;

  const data = generatePlanetData(seed, biomeType, voxelRadius);
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


function worldToGrid(worldPos: THREE.Vector3, planetCenter: THREE.Vector3, voxelScale: number = VOXEL_SCALE): [number, number, number] {
  const local = worldPos.clone().sub(planetCenter);
  return [
    Math.floor(local.x / voxelScale + GRID_HALF),
    Math.floor(local.y / voxelScale + GRID_HALF),
    Math.floor(local.z / voxelScale + GRID_HALF),
  ];
}

function playerCollides(pos: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, up: THREE.Vector3, voxelScale: number = VOXEL_SCALE): boolean {
  const r = voxelScale * 0.38;
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
    up.clone().multiplyScalar(voxelScale * 1.6),
    up.clone().multiplyScalar(-voxelScale * 0.1),
  ];

  for (const off of offsets) {
    const check = pos.clone().add(off);
    const [gx, gy, gz] = worldToGrid(check, center, voxelScale);
    if (getVoxel(data, gx, gy, gz) !== 0) return true;
  }
  return false;
}

function groundCheck(pos: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, up: THREE.Vector3, voxelScale: number = VOXEL_SCALE): boolean {
  const check = pos.clone().addScaledVector(up, -voxelScale * 0.3);
  const [gx, gy, gz] = worldToGrid(check, center, voxelScale);
  return getVoxel(data, gx, gy, gz) !== 0;
}

// Try to push the player out of any voxel they're stuck inside. Returns true if a clear position was found.
function unstickPlayer(pos: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, up: THREE.Vector3, voxelScale: number): boolean {
  if (!playerCollides(pos, data, center, up, voxelScale)) return false;
  const right = new THREE.Vector3(1, 0, 0);
  if (Math.abs(up.dot(right)) > 0.9) right.set(0, 0, 1);
  const tangent = right.clone().cross(up).normalize();
  const bitangent = up.clone().cross(tangent).normalize();
  for (let step = 1; step <= 4; step++) {
    const dist = voxelScale * step * 0.5;
    const probes = [
      up.clone().multiplyScalar(dist),
      up.clone().multiplyScalar(dist).addScaledVector(tangent, dist),
      up.clone().multiplyScalar(dist).addScaledVector(tangent, -dist),
      up.clone().multiplyScalar(dist).addScaledVector(bitangent, dist),
      up.clone().multiplyScalar(dist).addScaledVector(bitangent, -dist),
      tangent.clone().multiplyScalar(dist),
      tangent.clone().multiplyScalar(-dist),
      bitangent.clone().multiplyScalar(dist),
      bitangent.clone().multiplyScalar(-dist),
    ];
    for (const off of probes) {
      const candidate = pos.clone().add(off);
      if (!playerCollides(candidate, data, center, up, voxelScale)) {
        pos.copy(candidate);
        return true;
      }
    }
  }
  return false;
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

function raycastPlanet(origin: THREE.Vector3, dir: THREE.Vector3, data: Uint8Array, center: THREE.Vector3, maxDist = 8, voxelScale: number = VOXEL_SCALE): RayResult {
  const pos = origin.clone();
  const d = dir.clone().normalize();
  const step = voxelScale * 0.25;
  let [pgx, pgy, pgz] = worldToGrid(pos, center, voxelScale);
  for (let t = 0; t < maxDist; t += step) {
    pos.addScaledVector(d, step);
    const [gx, gy, gz] = worldToGrid(pos, center, voxelScale);
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

function PlanetVoxelMesh({ data, center, revision, planetId, voxelScale }: { data: Uint8Array; center: THREE.Vector3; revision: number; planetId: number; voxelScale: number }) {
  const geo = useMemo(() => buildPlanetGeometry(data, voxelScale), [revision, planetId, voxelScale]);
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

// Display name for a body type (used in HUD discoveries feed and planet label)
function bodyDisplayKind(type: string): string {
  const k = bodyKindFor(type);
  if (k === "moon") return "Moon";
  if (k === "asteroid") {
    if (type === "asteroid_icy") return "Icy Asteroid";
    if (type === "asteroid_metallic") return "Metallic Asteroid";
    if (type === "asteroid_rare") return "Rare Asteroid";
    return "Asteroid";
  }
  return "Planet";
}

function WaterShell({ center, biomeType, voxelScale, voxelRadius }: { center: THREE.Vector3; biomeType: string; voxelScale: number; voxelRadius: number }) {
  const biome = BIOME_CONFIGS[biomeType] || BIOME_CONFIGS.verdania;
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });
  if (!biome.hasWater) return null;
  const waterRadius = (voxelRadius + WATER_LEVEL_OFFSET) * voxelScale;
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

function DistantBody({ position, planetType, visualRadius, seed }: {
  position: THREE.Vector3;
  planetType: string;
  visualRadius: number;
  seed: number;
}) {
  const vis = PLANET_VISUALS[planetType] || PLANET_VISUALS.verdania;
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const kind = bodyKindFor(planetType);
  // Asteroids spin around a deterministic random axis derived from seed
  const spinAxis = useMemo(() => {
    if (kind !== "asteroid") return new THREE.Vector3(0, 1, 0);
    const r = makeRng(seed + 7);
    return new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
  }, [kind, seed]);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.02;
    if (kind === "asteroid" && groupRef.current) {
      groupRef.current.rotateOnAxis(spinAxis, dt * 0.15);
    }
  });
  // Asteroids: render as a low-poly irregular icosahedron
  const geomArgs: [number, number, number] = kind === "asteroid"
    ? [visualRadius, 1, 0]
    : [visualRadius, 24, 24];
  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef}>
        {kind === "asteroid" ? (
          <icosahedronGeometry args={[geomArgs[0], geomArgs[1]]} />
        ) : (
          <sphereGeometry args={geomArgs as unknown as [number, number, number]} />
        )}
        <meshStandardMaterial color={vis.color} roughness={0.85} flatShading={kind === "asteroid"} />
      </mesh>
      {kind !== "asteroid" && (
        <mesh>
          <sphereGeometry args={[visualRadius * 1.15, 24, 24]} />
          <meshBasicMaterial color={vis.glow} transparent opacity={0.12} side={THREE.BackSide} />
        </mesh>
      )}
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

function VoxelHighlight({ direction, data, center, voxelScale }: {
  direction: THREE.Vector3;
  data: Uint8Array;
  center: THREE.Vector3;
  voxelScale: number;
}) {
  const { camera } = useThree();
  const result = raycastPlanet(camera.position, direction, data, center, 8, voxelScale);
  if (!result.hit) return null;
  const wx = (result.gx - GRID_HALF + 0.5) * voxelScale + center.x;
  const wy = (result.gy - GRID_HALF + 0.5) * voxelScale + center.y;
  const wz = (result.gz - GRID_HALF + 0.5) * voxelScale + center.z;
  return (
    <mesh position={[wx, wy, wz]}>
      <boxGeometry args={[voxelScale * 1.02, voxelScale * 1.02, voxelScale * 1.02]} />
      <meshBasicMaterial color={0xffffff} wireframe opacity={0.4} transparent />
    </mesh>
  );
}

function makeBandedTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  const rng = makeRng(seed);
  const palettes = [
    ["#d8a86b", "#b8784a", "#e8c8a0", "#a05d3a", "#f0d8b0"],
    ["#c69c6d", "#8b5a2b", "#e8b489", "#6b3a1a", "#d6a07a"],
    ["#7a98c4", "#5b7aa8", "#9cb6d8", "#3e5a8c", "#b8cce4"],
  ];
  const palette = palettes[Math.floor(rng() * palettes.length)];
  let y = 0;
  while (y < size) {
    const bandH = 6 + Math.floor(rng() * 22);
    const color = palette[Math.floor(rng() * palette.length)];
    for (let yy = y; yy < Math.min(size, y + bandH); yy++) {
      for (let x = 0; x < size; x++) {
        const jitter = Math.sin(x * 0.08 + yy * 0.03 + seed) * 0.06;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85 + jitter;
        ctx.fillRect(x, yy, 1, 1);
      }
    }
    y += bandH;
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeCraterTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#9a9a9a";
  ctx.fillRect(0, 0, size, size);
  const rng = makeRng(seed);
  const noise = createNoise3D(rng);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const n = noise(i * 0.05, j * 0.05, 0) * 0.5 + 0.5;
      const v = Math.floor(120 + n * 100);
      const idx = (j * size + i) * 4;
      img.data[idx] = v;
      img.data[idx + 1] = v;
      img.data[idx + 2] = v;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Add a few crater rings
  const craters = 12 + Math.floor(rng() * 12);
  for (let k = 0; k < craters; k++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = 4 + rng() * 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(70,70,70,0.5)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220,220,220,0.3)";
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function Star({ def }: { def: StarDef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (meshRef.current) meshRef.current.rotation.y += 0.0008;
  });
  return (
    <group position={def.position} data-testid="freeball-star">
      <mesh ref={meshRef}>
        <sphereGeometry args={[def.worldRadius, 48, 48]} />
        <shaderMaterial
          ref={matRef}
          uniforms={{ uTime: { value: 0 } }}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPos;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vPos;
            float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
            void main() {
              float fres = pow(1.0 - abs(vNormal.z), 1.6);
              float flare = hash(floor(vPos * 0.005 + uTime * 0.05));
              vec3 hot = vec3(1.0, 0.85, 0.45);
              vec3 cool = vec3(1.0, 0.55, 0.25);
              vec3 col = mix(hot, cool, fres) + vec3(0.3, 0.15, 0.05) * flare;
              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>
      {/* Corona */}
      <mesh>
        <sphereGeometry args={[def.worldRadius * 1.15, 32, 32]} />
        <meshBasicMaterial color={0xffaa55} transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      <pointLight color={0xffeebb} intensity={1.2} distance={def.worldRadius * 8} decay={1.5} />
    </group>
  );
}

function GasGiant({ def }: { def: GasGiantDef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeBandedTexture(def.seed), [def.seed]);
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.04;
  });
  return (
    <group position={def.position} data-testid={`freeball-gas-giant-${def.id}`}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[def.worldRadius, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.85} emissive={0x553311} emissiveIntensity={0.06} />
      </mesh>
      {def.hasRing && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[def.worldRadius * 1.4, def.worldRadius * 2.0, 64]} />
          <meshBasicMaterial color={0xc8a878} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Moon({ def, system }: { def: MoonDef; system: SolarSystem }) {
  // Bail out cleanly if this moon's parent body has been removed from the
  // system (can happen if planet count shrinks between hot-reloads or seeds).
  const parentValid =
    def.parent.kind === "voxel"
      ? def.parent.index >= 0 && def.parent.index < system.voxelDefs.length
      : def.parent.index >= 0 && def.parent.index < system.gasGiants.length;
  const groupRef = useRef<THREE.Group>(null);
  const tex = useMemo(() => makeCraterTexture(def.seed), [def.seed]);
  useFrame((state) => {
    if (groupRef.current && parentValid) {
      const p = getMoonPosition(def, system, state.clock.elapsedTime);
      groupRef.current.position.copy(p);
      groupRef.current.rotation.y += 0.003;
    }
  });
  if (!parentValid) return null;
  return (
    <group ref={groupRef} data-testid={`freeball-moon-${def.id}`}>
      <mesh>
        <sphereGeometry args={[def.worldRadius, 32, 32]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
    </group>
  );
}

function generateAsteroids(def: AsteroidBeltDef): { pos: THREE.Vector3; r: number; rotSpeed: THREE.Vector3 }[] {
  const rng = makeRng(def.seed);
  const list: { pos: THREE.Vector3; r: number; rotSpeed: THREE.Vector3 }[] = [];
  for (let i = 0; i < def.count; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = def.innerRadius + rng() * (def.outerRadius - def.innerRadius);
    const y = (rng() - 0.5) * 80;
    list.push({
      pos: new THREE.Vector3(Math.cos(angle) * radius + def.center.x, y + def.center.y, Math.sin(angle) * radius + def.center.z),
      r: 1.5 + rng() * 4,
      rotSpeed: new THREE.Vector3(rng() * 0.3, rng() * 0.3, rng() * 0.3),
    });
  }
  return list;
}

function AsteroidField({ def }: { def: AsteroidBeltDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const asteroids = useMemo(() => generateAsteroids(def), [def.seed, def.count, def.innerRadius, def.outerRadius, def.center]);
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const a = asteroids[i];
      if (!a) return;
      child.rotation.x += a.rotSpeed.x * dt;
      child.rotation.y += a.rotSpeed.y * dt;
    });
  });
  return (
    <group ref={groupRef} data-testid="freeball-asteroid-belt">
      {asteroids.map((a, i) => (
        <mesh key={i} position={a.pos}>
          <icosahedronGeometry args={[a.r, 0]} />
          <meshStandardMaterial color={0x7a6a55} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

interface CollidableSphere {
  position: THREE.Vector3;
  radius: number;
  isStar?: boolean;
}

let asteroidCollisionCache: { seed: number; spheres: CollidableSphere[] } | null = null;
function getAsteroidColliders(belt: AsteroidBeltDef): CollidableSphere[] {
  if (asteroidCollisionCache && asteroidCollisionCache.seed === belt.seed) return asteroidCollisionCache.spheres;
  const spheres = generateAsteroids(belt).map((a) => ({ position: a.pos, radius: a.r }));
  asteroidCollisionCache = { seed: belt.seed, spheres };
  return spheres;
}

function getMeshCollisionSpheres(system: SolarSystem, t: number): CollidableSphere[] {
  const out: CollidableSphere[] = [];
  out.push({ position: system.star.position.clone(), radius: system.star.worldRadius, isStar: true });
  for (const g of system.gasGiants) out.push({ position: g.position.clone(), radius: g.worldRadius });
  for (const m of system.moons) out.push({ position: getMoonPosition(m, system, t), radius: m.worldRadius });
  for (const a of getAsteroidColliders(system.asteroidBelt)) out.push(a);
  return out;
}

interface SceneProps {
  planets: Planet[];
  activePlanetIndex: number;
  progress: Progress;
  savedBuilds: SavedBuild[];
  otherPlayers: OtherPlayer[];
  system: SolarSystem;
  onSave: (modified: Map<string, number>, currentPlanetId: number, inventory: Record<string, number>) => void;
  onPositionUpdate: (x: number, y: number, z: number) => void;
  onCrystalCollected: (count: number) => void;
  onPlanetSwitch: (newIndex: number) => void;
  onDiscoveryChange: (ids: string[]) => void;
}

function Scene({ planets, activePlanetIndex, progress, savedBuilds, otherPlayers, system, onSave, onPositionUpdate, onCrystalCollected, onPlanetSwitch, onDiscoveryChange }: SceneProps) {
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
  const activeDef = system.voxelDefs[activePlanetIndex];
  const planetCenter = activeDef?.position ?? new THREE.Vector3();
  const voxelScale = activeDef?.voxelScale ?? VOXEL_SCALE;
  const voxelRadius = activeDef?.voxelRadius ?? PLANET_RADIUS;
  const surfaceWorldRadius = voxelRadius * voxelScale;
  const biomeType = activePlanet?.type || "verdania";
  const activeWorldRadius = worldRadiusFor(biomeType);

  const [geoRevision, setGeoRevision] = useState(0);
  const prevBuildsRef = useRef(savedBuilds);

  const planetData = useMemo(() => {
    if (!activePlanet) return new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);
    return getOrCreatePlanetData(activePlanet.id, activePlanet.seed, biomeType, savedBuilds, voxelRadius);
  }, [activePlanet?.id, savedBuilds, voxelRadius]);

  useEffect(() => {
    if (prevBuildsRef.current !== savedBuilds) {
      prevBuildsRef.current = savedBuilds;
      setGeoRevision((r) => r + 1);
    }
  }, [savedBuilds]);

  const spawnUp = new THREE.Vector3(0, 1, 0);
  const spawnPos = planetCenter.clone().addScaledVector(spawnUp, surfaceWorldRadius + 3 * voxelScale);

  const playerPos = useRef(spawnPos.clone());
  const playerVel = useRef(new THREE.Vector3(0, 0, 0));
  const spawnTangent = new THREE.Vector3(1, 0, 0).cross(spawnUp).normalize();
  if (spawnTangent.lengthSq() < 0.01) spawnTangent.set(0, 0, 1);
  const sphereSpawnBase = planetCenter.clone()
    .addScaledVector(spawnUp, surfaceWorldRadius + 4 * voxelScale)
    .addScaledVector(spawnTangent, 3 * voxelScale);
  const spherePos = useRef(sphereSpawnBase);
  const sphereVel = useRef(new THREE.Vector3(0, 0, 0));
  const onGround = useRef(false);
  const justJumped = useRef(false);

  const refForward = useRef(new THREE.Vector3(0, 0, -1));
  const cameraUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const lastSphereHudUpdate = useRef(0);
  const lastDiscoveryCheck = useRef(0);
  const pitchRef = useRef(0);
  const mouseDelta = useRef({ x: 0, y: 0 });

  const keysRef = useRef<Record<string, boolean>>({});
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const planetCenterRef = useRef(planetCenter);
  planetCenterRef.current = planetCenter;
  const dayTimeRef = useRef(0.25);
  const lastSave = useRef(0);
  const lastPresence = useRef(0);
  const lastDayUpdate = useRef(0);
  const lastHudUpdate = useRef(0);

  useEffect(() => {
    if (!activePlanet) return;
    const up = new THREE.Vector3(0, 1, 0);
    const newSpawn = planetCenter.clone().addScaledVector(up, surfaceWorldRadius + 5 * voxelScale);
    playerPos.current.copy(newSpawn);
    playerVel.current.set(0, 0, 0);
    const tangent = new THREE.Vector3(1, 0, 0).cross(up).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(0, 0, 1);
    spherePos.current.copy(planetCenter)
      .addScaledVector(up, surfaceWorldRadius + 4 * voxelScale)
      .addScaledVector(tangent, 3 * voxelScale);
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
      if (e.key === "m" || e.key === "M") {
        // System map only meaningful while piloting the Sphere
        if (useGameStore.getState().inVehicle) {
          const open = !useGameStore.getState().isMapOpen;
          useGameStore.getState().setIsMapOpen(open);
          if (open) {
            useGameStore.getState().setPaused(false);
            document.exitPointerLock();
          }
        }
        return;
      }
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
      const result = raycastPlanet(camera.position, dir, planetData, planetCenter, 8, voxelScale);
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
          // Task #423 — Rare-material discovery feed
          if (RARE_MATERIAL_IDS.has(blockVal)) {
            useGameStore.getState().pushDiscovery(`Discovered ${blockName} on ${activePlanet?.name ?? "this body"}`);
          }
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

    const dx = mouseDelta.current.x;
    const dy = mouseDelta.current.y;
    mouseDelta.current.x = 0;
    mouseDelta.current.y = 0;

    const keys = keysRef.current;
    const activePos = inVehicle ? spherePos.current : playerPos.current;
    const activeVel = inVehicle ? sphereVel.current : playerVel.current;

    // Compute true (physics) gravity from blended K=3 nearest planets so we
    // don't snap orientation when crossing PLANET_LANDING_RANGE.
    const sunAngle = dayTimeRef.current * Math.PI * 2 - Math.PI / 2;
    const starPos = new THREE.Vector3(Math.cos(sunAngle) * 200, Math.sin(sunAngle) * 200, 0);
    const gravityBodies = system.voxelDefs.map((def) => ({
      position: def.position,
      surfaceRadius: def.voxelRadius * def.voxelScale,
    }));
    const blended = computeBlendedGravity(activePos, gravityBodies, starPos, GRAVITY_STRENGTH);
    const trueUp = blended.blendedUp;

    // Nearest planet center (still needed for voxel queries / world-space ops)
    let nearestCenter = planetCenter;
    let nearestDist = activePos.distanceTo(planetCenter);
    let nearestVoxelScale = voxelScale;
    let nearestVoxelRadius = voxelRadius;
    for (let pi = 0; pi < system.voxelDefs.length; pi++) {
      const def = system.voxelDefs[pi];
      const d = activePos.distanceTo(def.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestCenter = def.position;
        nearestVoxelScale = def.voxelScale;
        nearestVoxelRadius = def.voxelRadius;
      }
    }

    const toCenter = nearestCenter.clone().sub(activePos);
    const distFromCenter = toCenter.length();
    const surfaceRadius = nearestVoxelRadius * nearestVoxelScale;
    const altitude = distFromCenter - surfaceRadius;
    const atmosphereHeight = surfaceRadius * ATMOSPHERE_SCALE;
    const inAtmosphere = altitude < atmosphereHeight;

    // Camera up follows true up with low-pass filter (~0.3s time constant).
    // Player controller orients to cameraUp, but gravity force still uses trueUp.
    cameraUpRef.current.lerp(trueUp, dampingFactor(clampedDt, 3));
    if (cameraUpRef.current.lengthSq() < 0.0001) cameraUpRef.current.copy(trueUp);
    cameraUpRef.current.normalize();
    const up = cameraUpRef.current;

    // Preserve heading: re-project previous frame's forward onto the new
    // tangent plane so the camera doesn't whip when up changes.
    refForward.current.copy(preserveHeading(refForward.current, up));

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

      // Use blended gravity direction so transitions between planets are smooth.
      const gravityDir = trueUp.clone().negate();
      if (inSpace) {
        const gravScale = Math.max(0, 1 - altitude / (surfaceRadius * 5));
        sphereVel.current.addScaledVector(gravityDir, GRAVITY_STRENGTH * 0.3 * gravScale * clampedDt);
      } else {
        sphereVel.current.addScaledVector(gravityDir, GRAVITY_STRENGTH * clampedDt);
      }

      const drag = inSpace ? 0.998 : 0.97;
      sphereVel.current.multiplyScalar(Math.pow(drag, clampedDt * 60));

      // Swept sphere collision: substep prev -> new, stop at last clear step on hit.
      const prevPos = spherePos.current.clone();
      const moveVec = sphereVel.current.clone().multiplyScalar(clampedDt);
      const moveLen = moveVec.length();
      const sphereR = SPHERE_RADIUS;
      const subStepLen = Math.max(nearestVoxelScale * 0.4, 0.1);
      const numSubsteps = Math.max(1, Math.ceil(moveLen / subStepLen));
      const stepDelta = moveVec.clone().multiplyScalar(1 / numSubsteps);
      const meshBodies = getMeshCollisionSpheres(system, state.clock.elapsedTime);
      const sampleOffsets = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(sphereR, 0, 0), new THREE.Vector3(-sphereR, 0, 0),
        new THREE.Vector3(0, sphereR, 0), new THREE.Vector3(0, -sphereR, 0),
        new THREE.Vector3(0, 0, sphereR), new THREE.Vector3(0, 0, -sphereR),
      ];
      const sweptDistMargin = sphereR + moveLen + nearestVoxelScale * 4;
      const nearbyVoxelPlanets = system.voxelDefs.filter((def) => {
        const c = def.position;
        const closestApproach = Math.min(prevPos.distanceTo(c), spherePos.current.distanceTo(c));
        return closestApproach < def.worldRadius + sweptDistMargin + 200;
      });

      const cur = prevPos.clone();
      let blocked = false;
      let commitResolved = false;
      const resolvedPos = new THREE.Vector3();
      const blockedNormal = new THREE.Vector3();
      let starHit = false;
      for (let s = 0; s < numSubsteps && !blocked; s++) {
        const next = cur.clone().add(stepDelta);

        for (const body of meshBodies) {
          const diff = next.clone().sub(body.position);
          const d = diff.length();
          const minD = body.radius + sphereR;
          if (d < minD && d > 0.001) {
            const n = diff.divideScalar(d);
            resolvedPos.copy(body.position).addScaledVector(n, minD);
            blockedNormal.copy(n);
            blocked = true;
            commitResolved = true;
            if (body.isStar) starHit = true;
            break;
          }
        }

        if (!blocked) {
          for (const def of nearbyVoxelPlanets) {
            const surfaceR = def.worldRadius;
            const distToCenter = next.distanceTo(def.position);
            if (distToCenter > surfaceR + sphereR + def.voxelScale * 4) continue;
            const planetN = next.clone().sub(def.position).normalize();
            if (def.index === activePlanetIndex) {
              let hit = false;
              for (const off of sampleOffsets) {
                const p = next.clone().add(off);
                const [gx, gy, gz] = worldToGrid(p, def.position, def.voxelScale);
                if (getVoxel(planetData, gx, gy, gz) !== 0) { hit = true; break; }
              }
              if (hit) {
                blockedNormal.copy(planetN);
                blocked = true;
                break;
              }
            } else if (distToCenter < surfaceR + sphereR) {
              resolvedPos.copy(def.position).addScaledVector(planetN, surfaceR + sphereR);
              blockedNormal.copy(planetN);
              blocked = true;
              commitResolved = true;
              break;
            }
          }
        }

        if (!blocked) cur.copy(next);
      }
      spherePos.current.copy(commitResolved ? resolvedPos : cur);

      if (blocked) {
        const into = sphereVel.current.dot(blockedNormal);
        if (into < 0) sphereVel.current.addScaledVector(blockedNormal, -into * 1.4);
        const tangential = sphereVel.current.clone().addScaledVector(blockedNormal, -sphereVel.current.dot(blockedNormal));
        sphereVel.current.addScaledVector(tangential, -0.2);
      }

      // Star hazard: tight heat zone just above the star surface; constant knockback inside.
      const distToStar = spherePos.current.distanceTo(system.star.position);
      const heatRadius = system.star.worldRadius + 200;
      if (distToStar < heatRadius) {
        const awayFromStar = spherePos.current.clone().sub(system.star.position).normalize();
        const heat = 1 - (distToStar - system.star.worldRadius) / 200;
        useGameStore.getState().setPickupToast(`! HEAT WARNING — ${Math.round(Math.max(0, heat) * 100)}%`);
        sphereVel.current.addScaledVector(awayFromStar, 80 * Math.max(0, heat));
        if (starHit || distToStar < system.star.worldRadius * 1.05) {
          // Respawn safely above the active voxel planet.
          spherePos.current.copy(planetCenter).addScaledVector(new THREE.Vector3(0, 1, 0), surfaceRadius + 8 * voxelScale);
          sphereVel.current.set(0, 0, 0);
          useGameStore.getState().setPickupToast("! Respawned away from the star");
          setTimeout(() => useGameStore.getState().setPickupToast(""), 2500);
        }
      }

      // Per-planet radius-based landing transition.
      const distToActivePlanet = spherePos.current.distanceTo(planetCenter);
      for (const def of system.voxelDefs) {
        if (def.index === activePlanetIndex) continue;
        const distToOther = spherePos.current.distanceTo(def.position);
        const landingThreshold = def.worldRadius + def.voxelScale * 6;
        if (distToOther < landingThreshold && distToOther < distToActivePlanet) {
          onPlanetSwitch(def.index);
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
        let sphereNearestCenter = planetCenter;
        let sphereNearestDist = spherePos.current.distanceTo(planetCenter);
        let sphereVScale = voxelScale;
        for (const def of system.voxelDefs) {
          const d = spherePos.current.distanceTo(def.position);
          if (d < sphereNearestDist) {
            sphereNearestDist = d;
            sphereNearestCenter = def.position;
            sphereVScale = def.voxelScale;
          }
        }
        const sphereToCenter = sphereNearestCenter.clone().sub(spherePos.current);
        const sphereDist = sphereToCenter.length();
        const sphereUp = sphereDist > 0.1
          ? spherePos.current.clone().sub(sphereNearestCenter).normalize()
          : new THREE.Vector3(0, 1, 0);
        sphereVel.current.addScaledVector(sphereToCenter.normalize(), GRAVITY_STRENGTH * clampedDt);
        spherePos.current.addScaledVector(sphereVel.current, clampedDt);

        const sphereRadius = SPHERE_RADIUS;
        const maxDrop = sphereVScale * 4;
        const step = sphereVScale * 0.25;
        let dropped = 0;
        let hitGround = false;
        const probe = spherePos.current.clone();
        while (dropped < maxDrop) {
          probe.addScaledVector(sphereUp, -step);
          dropped += step;
          const [sgx, sgy, sgz] = worldToGrid(probe, sphereNearestCenter, sphereVScale);
          if (getVoxel(planetData, sgx, sgy, sgz) !== 0) {
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
      // Pull along blended gravity direction for smooth two-planet hand-off.
      playerVel.current.addScaledVector(trueUp.clone().negate(), GRAVITY_STRENGTH * footGravScale * clampedDt);

      if ((keys[" "] || keys["spacebar"]) && onGround.current) {
        playerVel.current.addScaledVector(up, JUMP_IMPULSE);
        onGround.current = false;
        justJumped.current = true;
      }

      unstickPlayer(playerPos.current, planetData, nearestCenter, up, nearestVoxelScale);

      const tangentialMove = playerVel.current.clone().projectOnPlane(up).multiplyScalar(clampedDt);
      const radialMove = up.clone().multiplyScalar(playerVel.current.dot(up) * clampedDt);

      const newPos = playerPos.current.clone().add(tangentialMove);
      if (!playerCollides(newPos, planetData, nearestCenter, up, nearestVoxelScale)) {
        playerPos.current.copy(newPos);
      } else {
        const canStep = onGround.current || justJumped.current || playerVel.current.dot(up) > 0;
        const stepUpPos = newPos.clone().addScaledVector(up, nearestVoxelScale * 1.0);
        if (canStep && !playerCollides(stepUpPos, planetData, nearestCenter, up, nearestVoxelScale)) {
          playerPos.current.copy(stepUpPos);
        } else {
          const tv = playerVel.current.clone().projectOnPlane(up);
          playerVel.current.sub(tv);
        }
      }

      const newPos2 = playerPos.current.clone().add(radialMove);
      const radialClear = !playerCollides(newPos2, planetData, nearestCenter, up, nearestVoxelScale);
      if (radialClear) {
        playerPos.current.copy(newPos2);
        onGround.current = groundCheck(playerPos.current, planetData, nearestCenter, up, nearestVoxelScale);
        if (onGround.current) justJumped.current = false;
      } else if (justJumped.current && playerVel.current.dot(up) > 0) {
        playerPos.current.copy(newPos2);
        unstickPlayer(playerPos.current, planetData, nearestCenter, up, nearestVoxelScale);
        justJumped.current = false;
      } else {
        const rv = playerVel.current.dot(up);
        playerVel.current.addScaledVector(up, -rv);
        if (rv < 0) {
          onGround.current = true;
          justJumped.current = false;
        }
      }

      if (distFromCenter < surfaceRadius * 0.3) {
        const safePos = nearestCenter.clone().addScaledVector(up.length() > 0 ? up : new THREE.Vector3(0, 1, 0), surfaceRadius + 3 * nearestVoxelScale);
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

    // Sphere navigation HUD: push throttled transform to store, run discovery checks.
    if (state.clock.elapsedTime - lastSphereHudUpdate.current > 0.1) {
      lastSphereHudUpdate.current = state.clock.elapsedTime;
      useGameStore.getState().setSphereHud({
        pos: [spherePos.current.x, spherePos.current.y, spherePos.current.z],
        forward: [refForward.current.x, refForward.current.y, refForward.current.z],
        up: [up.x, up.y, up.z],
        dayTime: dayTimeRef.current,
      });
    }
    if (state.clock.elapsedTime - lastDiscoveryCheck.current > 0.5) {
      lastDiscoveryCheck.current = state.clock.elapsedTime;
      const cur = useGameStore.getState().discoveredPlanetIds;
      const known = new Set(cur);
      let changed = false;
      for (let pi = 0; pi < system.voxelDefs.length; pi++) {
        const def = system.voxelDefs[pi];
        const id = String(def.planet.id);
        if (known.has(id)) continue;
        const sr = def.voxelRadius * def.voxelScale;
        const radius = inVehicle ? sr * 8 : sr * 2.5;
        if (activePos.distanceTo(def.position) < radius) {
          useGameStore.getState().addDiscoveredPlanet(id);
          known.add(id);
          changed = true;
        }
      }
      if (changed) {
        // Persist the new discoveries; merging is handled server-side.
        onDiscoveryChange(useGameStore.getState().discoveredPlanetIds);
      }
    }
  });

  const cameraDir = useRef(new THREE.Vector3());
  camera.getWorldDirection(cameraDir.current);

  const surfaceRadius = surfaceWorldRadius;
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

      <pointLight position={system.star.position.toArray()} intensity={4} distance={20000} decay={0.6} color={0xfff2c8} castShadow />
      <ambientLight intensity={0.25 + atmosphereFactor * 0.25} />
      <CustomStars opacity={starOpacity} />

      <PlanetVoxelMesh data={planetData} center={planetCenter} revision={geoRevision} planetId={activePlanet?.id ?? 0} voxelScale={voxelScale} />
      <WaterShell center={planetCenter} biomeType={biomeType} voxelScale={voxelScale} voxelRadius={voxelRadius} />

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

      {/* Solar system: star, gas giants, moons, asteroid belt */}
      <Star def={system.star} />
      {system.gasGiants.map((g) => (
        <GasGiant key={`gg-${g.id}`} def={g} />
      ))}
      {system.moons.map((m) => (
        <Moon key={`moon-${m.id}`} def={m} system={system} />
      ))}
      <AsteroidField def={system.asteroidBelt} />

      {/* Other voxel planets — shown as scaled spheres at their actual world radius */}
      {system.voxelDefs.map((def, i) => {
        if (i === activePlanetIndex) return null;
        const dist = activePos.distanceTo(def.position);
        if (dist > def.voxelRadius * def.voxelScale * 50) return null;
        return (
          <DistantBody
            key={def.planet.id}
            position={def.position}
            planetType={def.planet.type}
            visualRadius={def.voxelRadius * def.voxelScale}
            seed={def.planet.seed}
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
          voxelScale={voxelScale}
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
  const { selectedBlock, setSelectedBlock, speed, altitude, inVehicle, pointerLocked, crystalsCollected, nearSphere, gameInventory, showInventory, setShowInventory, pickupToast, discoveries } = useGameStore();

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
        {planet && <div className="bg-black/60 text-white text-xs px-2 py-1 rounded font-mono" data-testid="text-active-body">{planet.name} · {bodyDisplayKind(planet.type)}</div>}
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
          WASD move · Space jump · Shift sprint/boost · LMB break · RMB place · E enter/exit SPHERE · T third-person · I inventory · M map (Sphere) · Tab players · Esc menu
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

      {discoveries.length > 0 && (
        <div
          className="absolute top-16 right-3 flex flex-col items-end gap-1 max-w-xs"
          data-testid="freeball-discoveries"
        >
          <div className="bg-black/60 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            Discoveries
          </div>
          {discoveries.slice(0, 5).map((d, i) => (
            <div
              key={`${d.t}-${i}`}
              className="bg-black/70 text-amber-200 text-xs px-2 py-1 rounded font-mono border border-amber-500/30"
              style={{ opacity: Math.max(0.4, 1 - i * 0.15) }}
              data-testid={`text-discovery-${i}`}
            >
              {d.text}
            </div>
          ))}
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

function PauseMenu({ onResume, onSave, onExit, onScreenshot, planets, progress, onUnlockSphere, sparksBalance, crystalsCollected }: {
  onResume: () => void;
  onSave: () => void;
  onExit: () => void;
  onScreenshot: () => void;
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
              <Button data-testid="freeball-btn-screenshot" onClick={onScreenshot} variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">📸 Take Screenshot (P)</Button>
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

function planetKind(type: string): CelestialKind {
  // Existing planet types (verdania/desert/ice/alien) all render as voxel worlds.
  // Future kinds from #417 (moon/gas/asteroid/star) map directly through.
  switch (type) {
    case "moon":
    case "gas":
    case "asteroid":
    case "star":
      return type;
    default:
      return "voxel";
  }
}

function FreeballNavHud({ system }: { system: SolarSystem }) {
  const { sphereHud, discoveredPlanetIds, activeWaypointId, setActiveWaypointId, isMapOpen, setIsMapOpen, inVehicle } = useGameStore();
  const spherePos = useMemo(() => new THREE.Vector3(...sphereHud.pos), [sphereHud.pos]);
  const forward = useMemo(() => new THREE.Vector3(...sphereHud.forward).normalize(), [sphereHud.forward]);
  const up = useMemo(() => new THREE.Vector3(...sphereHud.up).normalize(), [sphereHud.up]);
  const known = useMemo(() => new Set(discoveredPlanetIds), [discoveredPlanetIds]);

  const bodies = useMemo<CompassBody[]>(() => {
    const list: CompassBody[] = system.voxelDefs.map((def) => ({
      id: String(def.planet.id),
      name: def.planet.name,
      kind: planetKind(def.planet.type),
      position: def.position,
      discovered: known.has(String(def.planet.id)),
    }));
    // Star is always rendered (and always "discovered" — Sol is known)
    const sunAngle = sphereHud.dayTime * Math.PI * 2 - Math.PI / 2;
    list.push({
      id: "sun",
      name: "Sol",
      kind: "star",
      position: new THREE.Vector3(Math.cos(sunAngle) * 200, Math.sin(sunAngle) * 200, 0),
      discovered: true,
    });
    return list;
  }, [system, known, sphereHud.dayTime]);

  if (!inVehicle) return null;

  const activeBody = activeWaypointId ? bodies.find((b) => b.id === activeWaypointId) ?? null : null;

  return (
    <>
      <CompassBar spherePos={spherePos} forward={forward} up={up} bodies={bodies} activeWaypointId={activeWaypointId} />
      <WaypointMarker spherePos={spherePos} forward={forward} up={up} body={activeBody} />
      {isMapOpen && (
        <SystemMap
          spherePos={spherePos}
          forward={forward}
          bodies={bodies}
          activeWaypointId={activeWaypointId}
          onSelectWaypoint={(id) => setActiveWaypointId(id)}
          onClose={() => setIsMapOpen(false)}
        />
      )}
    </>
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

interface FreeballErrorBoundaryState { error: Error | null; info: string }
class FreeballErrorBoundary extends Component<{ children: ReactNode }, FreeballErrorBoundaryState> {
  state: FreeballErrorBoundaryState = { error: null, info: "" };
  static getDerivedStateFromError(error: Error): FreeballErrorBoundaryState {
    return { error, info: "" };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const stack = info?.componentStack ?? "";
    // Always log the real error so it's visible in DevTools instead of being eaten.
    console.error("[Freeball] crash:", error, stack);
    this.setState({ error, info: stack });
  }
  private isDevHost(): boolean {
    if (typeof window === "undefined") return false;
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h.endsWith(".replit.dev") || h.endsWith(".repl.co");
  }
  private copyError = () => {
    const { error, info } = this.state;
    if (!error) return;
    const text = `${error.message}\n\n${error.stack ?? ""}\n\nComponent stack:${info}`;
    try { navigator.clipboard?.writeText(text); } catch { /* noop */ }
  };
  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    const showDetails = this.isDevHost();
    const stackLines = (error.stack || "").split("\n").slice(0, 12).join("\n");
    return (
      <div className="fixed inset-0 bg-gray-950 text-white flex items-center justify-center p-6 z-[200]" data-testid="freeball-error-boundary">
        <div className="max-w-2xl w-full bg-gray-900 border border-red-900 rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold mb-2 text-red-300">Freeball hit an error</h2>
          <p className="text-sm text-gray-300 mb-4">
            Something went wrong loading the game. Try refreshing the page. If it keeps happening, copy the error and let us know.
          </p>
          <div className="flex gap-2 mb-4">
            <Button data-testid="freeball-error-reload" onClick={() => window.location.reload()} className="bg-blue-700 hover:bg-blue-600">Reload</Button>
            <Button data-testid="freeball-error-home" onClick={() => { window.location.href = "/"; }} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">Back to platform</Button>
            {showDetails && (
              <Button data-testid="freeball-error-copy" onClick={this.copyError} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">Copy error</Button>
            )}
          </div>
          {showDetails && (
            <details open className="text-xs">
              <summary className="cursor-pointer text-gray-400 mb-2">Error details (visible on dev hosts only)</summary>
              <div className="font-mono text-red-300 mb-2 break-words">{error.message}</div>
              <pre className="bg-black/60 p-3 rounded text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">{stackLines}</pre>
              {info && (
                <pre className="bg-black/60 p-3 mt-2 rounded text-gray-400 overflow-auto max-h-48 whitespace-pre-wrap">{info}</pre>
              )}
            </details>
          )}
        </div>
      </div>
    );
  }
}

function FreeballPageInner() {
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
    if (Array.isArray(progress.discoveredPlanetIds)) {
      useGameStore.getState().setDiscoveredPlanetIds(progress.discoveredPlanetIds);
    }
  }, [progress, planets]);

  const activePlanet = planets[activePlanetIndex] ?? null;
  const activePlanetId = activePlanet?.id ?? null;

  // Single source of truth for the solar system — shared between Scene and the
  // navigation HUD so body IDs / positions never drift between the two.
  const system = useMemo(() => buildSolarSystem(planets), [planets]);

  // Lightweight WebAudio shutter "click" — no asset needed. Honors a global
  // sound-enabled flag stored alongside other game prefs in localStorage so
  // the user can mute it (defaults to on).
  const playShutter = useCallback(() => {
    try {
      const enabled = localStorage.getItem("freeball-sound-enabled");
      if (enabled === "0" || enabled === "false") return;
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
      setTimeout(() => ctx.close().catch(() => {}), 250);
    } catch { /* audio unsupported — silent */ }
  }, []);

  const handleScreenshot = useCallback(() => {
    if (typeof document === "undefined") return;
    // Prefer the R3F canvas via known data-engine attribute if present; fall
    // back to the first <canvas> on the page (in this route only the GL canvas
    // exists, so the fallback is safe).
    const canvas = (document.querySelector("canvas[data-engine]") as HTMLCanvasElement | null)
      ?? (document.querySelector("canvas") as HTMLCanvasElement | null);
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const planetName = (activePlanet?.name ?? "freeball").toLowerCase().replace(/\s+/g, "-");
      const filename = `freeball-${planetName}-${ts}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      try {
        const nav = navigator as Navigator & { clipboard?: { write?: (items: ClipboardItem[]) => Promise<void> } };
        if (nav.clipboard?.write && typeof ClipboardItem !== "undefined") {
          nav.clipboard.write([new ClipboardItem({ "image/png": blob })]).catch(() => {});
        }
      } catch { /* clipboard unsupported — download still works */ }
      playShutter();
      useGameStore.getState().setPickupToast("📸 Screenshot saved");
      setTimeout(() => useGameStore.getState().setPickupToast(""), 1500);
    }, "image/png");
  }, [activePlanet?.name, playShutter]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "p" && e.key !== "P" && e.key !== "F2") return;
      const active = document.activeElement;
      const tag = (active?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (active as HTMLElement | null)?.isContentEditable) return;
      if (useGameStore.getState().paused) return;
      // If the player has released pointer lock and is interacting with the
      // chat (or any DOM input), don't capture — they're probably typing or
      // looking at a menu, not framing a shot.
      const chatFocused = !!document.querySelector('[data-testid="freeball-chat-input"]:focus');
      if (chatFocused) return;
      e.preventDefault();
      handleScreenshot();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleScreenshot]);

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
    mutationFn: (data: { currentPlanetId?: number; inventory?: Record<string, number>; sparksSpent?: number; discoveredPlanetIds?: string[] }) =>
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

  const handleDiscoveryChange = useCallback((ids: string[]) => {
    progressMutation.mutate({ discoveredPlanetIds: ids });
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
          camera={{ fov: 75, near: 0.1, far: 30000, position: [0, (PLANET_RADIUS + 5) * VOXEL_SCALE, 0] }}
          gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          shadows
          onContextMenu={(e) => e.preventDefault()}
        >
          <Scene
            planets={planets}
            activePlanetIndex={activePlanetIndex}
            progress={progress ?? { userId: "", currentPlanetId: null, sparksSpent: 0, unlockedSphere: false, inventory: {} }}
            savedBuilds={savedBuilds}
            otherPlayers={otherPlayers}
            system={system}
            onSave={handleSave}
            onPositionUpdate={handlePositionUpdate}
            onCrystalCollected={handleCrystalCollected}
            onPlanetSwitch={handlePlanetSwitch}
            onDiscoveryChange={handleDiscoveryChange}
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

      {planets.length > 0 && <FreeballNavHud system={system} />}

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
          onScreenshot={handleScreenshot}
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

export default function FreeballPage() {
  return (
    <FreeballErrorBoundary>
      <FreeballPageInner />
    </FreeballErrorBoundary>
  );
}
