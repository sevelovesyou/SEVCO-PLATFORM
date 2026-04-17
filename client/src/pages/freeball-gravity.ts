import * as THREE from "three";

export interface GravityBody {
  position: THREE.Vector3;
  surfaceRadius: number;
}

export interface BlendedGravity {
  blendedUp: THREE.Vector3;
  gravityMagnitude: number;
  nearestDistance: number;
  inSphereOfInfluence: boolean;
}

const EPSILON = 0.001;
const MAX_BODIES = 3;

/**
 * Sum weighted gravity contributions from the nearest K=3 bodies using
 * inverse-square weighting `w_i = 1 / max(distance_i - radius_i, eps)^2`.
 *
 * Outside any planet's sphere-of-influence (all weights tiny), `blendedUp`
 * decays toward "away from the star" so deep-space orientation stays stable.
 */
export function computeBlendedGravity(
  playerPos: THREE.Vector3,
  bodies: GravityBody[],
  starPos: THREE.Vector3,
  baseGravity: number,
): BlendedGravity {
  if (bodies.length === 0) {
    const fallback = new THREE.Vector3().subVectors(playerPos, starPos);
    if (fallback.lengthSq() < EPSILON) fallback.set(0, 1, 0);
    return {
      blendedUp: fallback.normalize(),
      gravityMagnitude: 0,
      nearestDistance: Infinity,
      inSphereOfInfluence: false,
    };
  }

  const ranked = bodies
    .map((b) => {
      const delta = new THREE.Vector3().subVectors(playerPos, b.position);
      const dist = delta.length();
      const surfaceDist = Math.max(dist - b.surfaceRadius, EPSILON);
      const weight = 1 / (surfaceDist * surfaceDist);
      const localUp = dist > EPSILON ? delta.divideScalar(dist) : new THREE.Vector3(0, 1, 0);
      const soi = b.surfaceRadius * 5;
      return { weight, localUp, dist, surfaceDist, body: b, inSoi: dist < soi };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_BODIES);

  const totalWeight = ranked.reduce((s, r) => s + r.weight, 0);
  const nearest = ranked[0];

  if (totalWeight < EPSILON || !nearest.inSoi) {
    // Decay toward star-relative up so we never NaN and deep space has a stable frame
    const starUp = new THREE.Vector3().subVectors(playerPos, starPos);
    if (starUp.lengthSq() < EPSILON) starUp.set(0, 1, 0);
    starUp.normalize();
    // If we're loosely captured, blend toward it; otherwise, full star-relative
    const captureMix = Math.min(1, nearest.weight / Math.max(EPSILON, 1 / (nearest.body.surfaceRadius * nearest.body.surfaceRadius)));
    const blendedUp = nearest.localUp.clone().multiplyScalar(captureMix).addScaledVector(starUp, 1 - captureMix);
    if (blendedUp.lengthSq() < EPSILON) blendedUp.copy(starUp);
    return {
      blendedUp: blendedUp.normalize(),
      gravityMagnitude: 0,
      nearestDistance: nearest.dist,
      inSphereOfInfluence: false,
    };
  }

  const blendedUp = new THREE.Vector3();
  for (const r of ranked) {
    blendedUp.addScaledVector(r.localUp, r.weight);
  }
  if (blendedUp.lengthSq() < EPSILON) {
    blendedUp.copy(nearest.localUp);
  }
  blendedUp.normalize();

  // Gravity magnitude: weighted by per-body contribution clamped to baseGravity
  // so free-fall between bodies stays gentle but surface gravity matches today.
  const nearestSurfaceWeight = 1 / Math.max(EPSILON, EPSILON * EPSILON);
  const normalizedWeight = Math.min(1, totalWeight / nearestSurfaceWeight + nearest.weight * (nearest.body.surfaceRadius * nearest.body.surfaceRadius));
  const gravityMagnitude = baseGravity * Math.min(1, normalizedWeight);

  return {
    blendedUp,
    gravityMagnitude,
    nearestDistance: nearest.dist,
    inSphereOfInfluence: true,
  };
}

/**
 * Project a forward vector onto the plane perpendicular to a (possibly new) up
 * vector and renormalize, preserving heading continuity across up changes.
 * Falls back to a stable tangent if the projection collapses (forward parallel
 * to up).
 */
export function preserveHeading(prevForward: THREE.Vector3, newUp: THREE.Vector3): THREE.Vector3 {
  const forward = prevForward.clone().projectOnPlane(newUp);
  if (forward.lengthSq() < EPSILON) {
    // Pick any tangent — try world X first, then Z
    forward.set(1, 0, 0).projectOnPlane(newUp);
    if (forward.lengthSq() < EPSILON) forward.set(0, 0, 1).projectOnPlane(newUp);
  }
  return forward.normalize();
}

/** Critically-damped lerp factor for a low-pass filter over dt seconds. */
export function dampingFactor(dt: number, rate: number): number {
  return Math.max(0, Math.min(1, dt * rate));
}
