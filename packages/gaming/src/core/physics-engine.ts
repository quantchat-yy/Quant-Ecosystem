// ============================================================================
// Gaming Package - 2D Physics Engine
// ============================================================================

import {
  Vector2D,
  RigidBody,
  CollisionResult,
  Collider,
  AABBCollider,
  CircleCollider,
  SpatialCell,
} from '../types';

// ---------------------------------------------------------------------------
// Vector Math Utilities
// ---------------------------------------------------------------------------

function vecAdd(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecSub(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vecScale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

function vecDot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

function vecLength(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vecNormalize(v: Vector2D): Vector2D {
  const len = vecLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vecCross2D(a: Vector2D, b: Vector2D): number {
  return a.x * b.y - a.y * b.x;
}

// ---------------------------------------------------------------------------
// Spatial Hash Grid for Broad-Phase Collision
// ---------------------------------------------------------------------------

class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private getCellCoords(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  clear(): void {
    this.cells.clear();
  }

  insertBody(body: RigidBody): void {
    const bounds = this.getBodyBounds(body);
    const minCell = this.getCellCoords(bounds.minX, bounds.minY);
    const maxCell = this.getCellCoords(bounds.maxX, bounds.maxY);

    for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
      for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
        const key = this.getKey(cx, cy);
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        this.cells.get(key)!.add(body.id);
      }
    }
  }

  queryPotentialCollisions(body: RigidBody): Set<string> {
    const candidates = new Set<string>();
    const bounds = this.getBodyBounds(body);
    const minCell = this.getCellCoords(bounds.minX, bounds.minY);
    const maxCell = this.getCellCoords(bounds.maxX, bounds.maxY);

    for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
      for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            if (id !== body.id) {
              candidates.add(id);
            }
          }
        }
      }
    }
    return candidates;
  }

  private getBodyBounds(body: RigidBody): { minX: number; minY: number; maxX: number; maxY: number } {
    const collider = body.collider;
    if (collider.type === 'aabb') {
      const hw = collider.width / 2;
      const hh = collider.height / 2;
      return {
        minX: body.position.x + collider.offset.x - hw,
        minY: body.position.y + collider.offset.y - hh,
        maxX: body.position.x + collider.offset.x + hw,
        maxY: body.position.y + collider.offset.y + hh,
      };
    } else {
      const r = collider.radius;
      return {
        minX: body.position.x + collider.offset.x - r,
        minY: body.position.y + collider.offset.y - r,
        maxX: body.position.x + collider.offset.x + r,
        maxY: body.position.y + collider.offset.y + r,
      };
    }
  }

  getCells(): SpatialCell[] {
    const result: SpatialCell[] = [];
    for (const [key, bodies] of this.cells.entries()) {
      const [x, y] = key.split(',').map(Number);
      result.push({ x, y, bodies: [...bodies] });
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Physics Engine
// ---------------------------------------------------------------------------

export class PhysicsEngine {
  private bodies: Map<string, RigidBody> = new Map();
  private gravity: Vector2D;
  private spatialGrid: SpatialHashGrid;
  private fixedDeltaTime: number;
  private accumulator: number = 0;
  private collisions: CollisionResult[] = [];
  private forces: Map<string, Vector2D[]> = new Map();
  private iterationCount: number;
  private damping: number;
  private maxVelocity: number;
  private collisionCallbacks: Array<(collision: CollisionResult) => void> = [];
  private layerMask: Map<number, Set<number>> = new Map();

  constructor(config?: {
    gravity?: Vector2D;
    cellSize?: number;
    fixedDeltaTime?: number;
    iterations?: number;
    damping?: number;
    maxVelocity?: number;
  }) {
    this.gravity = config?.gravity || { x: 0, y: 980 };
    this.spatialGrid = new SpatialHashGrid(config?.cellSize || 64);
    this.fixedDeltaTime = config?.fixedDeltaTime || 1 / 60;
    this.iterationCount = config?.iterations || 4;
    this.damping = config?.damping || 0.99;
    this.maxVelocity = config?.maxVelocity || 2000;
  }

  /** Add a rigid body to the simulation */
  addBody(body: RigidBody): void {
    body.inverseMass = body.isStatic ? 0 : 1 / body.mass;
    this.bodies.set(body.id, body);
    this.forces.set(body.id, []);
  }

  /** Remove a rigid body from the simulation */
  removeBody(id: string): void {
    this.bodies.delete(id);
    this.forces.delete(id);
  }

  /** Get a body by ID */
  getBody(id: string): RigidBody | undefined {
    return this.bodies.get(id);
  }

  /** Get all bodies */
  getAllBodies(): RigidBody[] {
    return [...this.bodies.values()];
  }

  /** Apply a force to a body */
  applyForce(bodyId: string, force: Vector2D): void {
    const forces = this.forces.get(bodyId);
    if (forces) {
      forces.push(force);
    }
  }

  /** Apply an impulse directly to velocity */
  applyImpulse(bodyId: string, impulse: Vector2D): void {
    const body = this.bodies.get(bodyId);
    if (body && !body.isStatic) {
      body.velocity = vecAdd(body.velocity, vecScale(impulse, body.inverseMass));
    }
  }

  /** Set collision layer interaction */
  setLayerCollision(layer1: number, layer2: number, collide: boolean): void {
    if (!this.layerMask.has(layer1)) this.layerMask.set(layer1, new Set());
    if (!this.layerMask.has(layer2)) this.layerMask.set(layer2, new Set());

    if (collide) {
      this.layerMask.get(layer1)!.add(layer2);
      this.layerMask.get(layer2)!.add(layer1);
    } else {
      this.layerMask.get(layer1)!.delete(layer2);
      this.layerMask.get(layer2)!.delete(layer1);
    }
  }

  /** Register collision callback */
  onCollision(callback: (collision: CollisionResult) => void): void {
    this.collisionCallbacks.push(callback);
  }

  /** Set gravity */
  setGravity(gravity: Vector2D): void {
    this.gravity = gravity;
  }

  /** Step the physics simulation */
  step(deltaTime: number): CollisionResult[] {
    this.accumulator += deltaTime;
    this.collisions = [];

    while (this.accumulator >= this.fixedDeltaTime) {
      this.fixedStep();
      this.accumulator -= this.fixedDeltaTime;
    }

    return this.collisions;
  }

  /** Get last frame collisions */
  getCollisions(): CollisionResult[] {
    return [...this.collisions];
  }

  /** Raycast against all bodies */
  raycast(origin: Vector2D, direction: Vector2D, maxDistance: number): { body: RigidBody; distance: number; point: Vector2D } | null {
    const normalizedDir = vecNormalize(direction);
    let closestHit: { body: RigidBody; distance: number; point: Vector2D } | null = null;

    for (const body of this.bodies.values()) {
      const hit = this.raycastBody(origin, normalizedDir, maxDistance, body);
      if (hit && (!closestHit || hit.distance < closestHit.distance)) {
        closestHit = hit;
      }
    }
    return closestHit;
  }

  /** Get interpolation alpha for rendering */
  getInterpolationAlpha(): number {
    return this.accumulator / this.fixedDeltaTime;
  }

  // -------------------------------------------------------------------------
  // Fixed timestep step
  // -------------------------------------------------------------------------

  private fixedStep(): void {
    // Apply forces (including gravity)
    for (const [id, body] of this.bodies.entries()) {
      if (body.isStatic) continue;

      // Gravity
      const gravityForce = vecScale(this.gravity, body.mass);
      body.acceleration = vecScale(gravityForce, body.inverseMass);

      // External forces
      const externalForces = this.forces.get(id) || [];
      for (const force of externalForces) {
        body.acceleration = vecAdd(body.acceleration, vecScale(force, body.inverseMass));
      }
      externalForces.length = 0;
    }

    // Integrate velocity and position (Semi-implicit Euler)
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;

      // Velocity integration
      body.velocity = vecAdd(body.velocity, vecScale(body.acceleration, this.fixedDeltaTime));

      // Apply damping
      body.velocity = vecScale(body.velocity, this.damping);

      // Clamp velocity
      const speed = vecLength(body.velocity);
      if (speed > this.maxVelocity) {
        body.velocity = vecScale(vecNormalize(body.velocity), this.maxVelocity);
      }

      // Position integration
      body.position = vecAdd(body.position, vecScale(body.velocity, this.fixedDeltaTime));

      // Angular velocity
      body.angularVelocity += body.torque * body.inverseMass * this.fixedDeltaTime;
      body.angularVelocity *= this.damping;
      body.torque = 0;
    }

    // Collision detection and resolution
    this.detectAndResolveCollisions();
  }

  private detectAndResolveCollisions(): void {
    // Build spatial hash
    this.spatialGrid.clear();
    for (const body of this.bodies.values()) {
      this.spatialGrid.insertBody(body);
    }

    // Broad phase + Narrow phase
    const checked = new Set<string>();

    for (const body of this.bodies.values()) {
      const candidates = this.spatialGrid.queryPotentialCollisions(body);

      for (const candidateId of candidates) {
        const pairKey = body.id < candidateId ? `${body.id}:${candidateId}` : `${candidateId}:${body.id}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const other = this.bodies.get(candidateId);
        if (!other) continue;

        // Layer check
        if (!this.canLayersCollide(body.layer, other.layer)) continue;

        // Skip if both are static
        if (body.isStatic && other.isStatic) continue;

        // Narrow phase collision detection
        const collision = this.narrowPhase(body, other);
        if (collision) {
          this.collisions.push(collision);

          // Notify callbacks
          for (const callback of this.collisionCallbacks) {
            callback(collision);
          }

          // Resolve unless one is a sensor
          if (!body.isSensor && !other.isSensor) {
            this.resolveCollision(collision);
          }
        }
      }
    }
  }

  private canLayersCollide(layer1: number, layer2: number): boolean {
    if (this.layerMask.size === 0) return true;
    const allowed = this.layerMask.get(layer1);
    if (!allowed) return true;
    return allowed.has(layer2);
  }

  private narrowPhase(bodyA: RigidBody, bodyB: RigidBody): CollisionResult | null {
    const colliderA = bodyA.collider;
    const colliderB = bodyB.collider;

    if (colliderA.type === 'aabb' && colliderB.type === 'aabb') {
      return this.aabbVsAabb(bodyA, colliderA, bodyB, colliderB);
    } else if (colliderA.type === 'circle' && colliderB.type === 'circle') {
      return this.circleVsCircle(bodyA, colliderA, bodyB, colliderB);
    } else if (colliderA.type === 'circle' && colliderB.type === 'aabb') {
      return this.circleVsAabb(bodyA, colliderA, bodyB, colliderB);
    } else if (colliderA.type === 'aabb' && colliderB.type === 'circle') {
      const result = this.circleVsAabb(bodyB, colliderB as CircleCollider, bodyA, colliderA as AABBCollider);
      if (result) {
        // Swap bodies and flip normal
        return {
          bodyA,
          bodyB,
          normal: vecScale(result.normal, -1),
          penetration: result.penetration,
          contactPoint: result.contactPoint,
          relativeVelocity: vecSub(bodyA.velocity, bodyB.velocity),
        };
      }
      return null;
    }
    return null;
  }

  private aabbVsAabb(bodyA: RigidBody, colA: AABBCollider, bodyB: RigidBody, colB: AABBCollider): CollisionResult | null {
    const posA = vecAdd(bodyA.position, colA.offset);
    const posB = vecAdd(bodyB.position, colB.offset);

    const halfWidthA = colA.width / 2;
    const halfHeightA = colA.height / 2;
    const halfWidthB = colB.width / 2;
    const halfHeightB = colB.height / 2;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;

    const overlapX = halfWidthA + halfWidthB - Math.abs(dx);
    if (overlapX <= 0) return null;

    const overlapY = halfHeightA + halfHeightB - Math.abs(dy);
    if (overlapY <= 0) return null;

    let normal: Vector2D;
    let penetration: number;

    if (overlapX < overlapY) {
      normal = { x: dx < 0 ? -1 : 1, y: 0 };
      penetration = overlapX;
    } else {
      normal = { x: 0, y: dy < 0 ? -1 : 1 };
      penetration = overlapY;
    }

    const contactPoint: Vector2D = {
      x: posA.x + normal.x * halfWidthA,
      y: posA.y + normal.y * halfHeightA,
    };

    return {
      bodyA,
      bodyB,
      normal,
      penetration,
      contactPoint,
      relativeVelocity: vecSub(bodyA.velocity, bodyB.velocity),
    };
  }

  private circleVsCircle(bodyA: RigidBody, colA: CircleCollider, bodyB: RigidBody, colB: CircleCollider): CollisionResult | null {
    const posA = vecAdd(bodyA.position, colA.offset);
    const posB = vecAdd(bodyB.position, colB.offset);

    const diff = vecSub(posB, posA);
    const dist = vecLength(diff);
    const minDist = colA.radius + colB.radius;

    if (dist >= minDist) return null;

    const normal = dist > 0 ? vecNormalize(diff) : { x: 1, y: 0 };
    const penetration = minDist - dist;
    const contactPoint = vecAdd(posA, vecScale(normal, colA.radius));

    return {
      bodyA,
      bodyB,
      normal,
      penetration,
      contactPoint,
      relativeVelocity: vecSub(bodyA.velocity, bodyB.velocity),
    };
  }

  private circleVsAabb(circleBody: RigidBody, circleCol: CircleCollider, aabbBody: RigidBody, aabbCol: AABBCollider): CollisionResult | null {
    const circlePos = vecAdd(circleBody.position, circleCol.offset);
    const aabbPos = vecAdd(aabbBody.position, aabbCol.offset);

    const halfW = aabbCol.width / 2;
    const halfH = aabbCol.height / 2;

    // Find closest point on AABB to circle center
    const closestX = Math.max(aabbPos.x - halfW, Math.min(circlePos.x, aabbPos.x + halfW));
    const closestY = Math.max(aabbPos.y - halfH, Math.min(circlePos.y, aabbPos.y + halfH));
    const closest: Vector2D = { x: closestX, y: closestY };

    const diff = vecSub(circlePos, closest);
    const dist = vecLength(diff);

    if (dist >= circleCol.radius) return null;

    const normal = dist > 0 ? vecNormalize(diff) : { x: 0, y: -1 };
    const penetration = circleCol.radius - dist;

    return {
      bodyA: circleBody,
      bodyB: aabbBody,
      normal,
      penetration,
      contactPoint: closest,
      relativeVelocity: vecSub(circleBody.velocity, aabbBody.velocity),
    };
  }

  private resolveCollision(collision: CollisionResult): void {
    const { bodyA, bodyB, normal, penetration } = collision;

    // Positional correction (prevent sinking)
    const percent = 0.8;
    const slop = 0.01;
    const totalInvMass = bodyA.inverseMass + bodyB.inverseMass;
    if (totalInvMass === 0) return;

    const correction = vecScale(
      normal,
      (Math.max(penetration - slop, 0) / totalInvMass) * percent
    );

    if (!bodyA.isStatic) {
      bodyA.position = vecSub(bodyA.position, vecScale(correction, bodyA.inverseMass));
    }
    if (!bodyB.isStatic) {
      bodyB.position = vecAdd(bodyB.position, vecScale(correction, bodyB.inverseMass));
    }

    // Impulse resolution
    const relativeVel = vecSub(bodyA.velocity, bodyB.velocity);
    const velAlongNormal = vecDot(relativeVel, normal);

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    // Calculate restitution (use minimum)
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);

    // Calculate impulse scalar
    let impulseScalar = -(1 + restitution) * velAlongNormal;
    impulseScalar /= totalInvMass;

    // Apply impulse
    const impulse = vecScale(normal, impulseScalar);

    if (!bodyA.isStatic) {
      bodyA.velocity = vecSub(bodyA.velocity, vecScale(impulse, bodyA.inverseMass));
    }
    if (!bodyB.isStatic) {
      bodyB.velocity = vecAdd(bodyB.velocity, vecScale(impulse, bodyB.inverseMass));
    }

    // Friction impulse (tangential)
    const tangent = vecSub(relativeVel, vecScale(normal, vecDot(relativeVel, normal)));
    const tangentLen = vecLength(tangent);
    if (tangentLen > 0.0001) {
      const tangentNorm = vecNormalize(tangent);
      const frictionCoeff = Math.sqrt(bodyA.friction * bodyB.friction);
      let frictionImpulse = -vecDot(relativeVel, tangentNorm);
      frictionImpulse /= totalInvMass;

      // Coulomb's law: clamp friction
      const maxFriction = Math.abs(impulseScalar) * frictionCoeff;
      frictionImpulse = Math.max(-maxFriction, Math.min(frictionImpulse, maxFriction));

      const frictionVec = vecScale(tangentNorm, frictionImpulse);
      if (!bodyA.isStatic) {
        bodyA.velocity = vecSub(bodyA.velocity, vecScale(frictionVec, bodyA.inverseMass));
      }
      if (!bodyB.isStatic) {
        bodyB.velocity = vecAdd(bodyB.velocity, vecScale(frictionVec, bodyB.inverseMass));
      }
    }
  }

  private raycastBody(origin: Vector2D, dir: Vector2D, maxDist: number, body: RigidBody): { body: RigidBody; distance: number; point: Vector2D } | null {
    const collider = body.collider;

    if (collider.type === 'circle') {
      return this.raycastCircle(origin, dir, maxDist, body, collider);
    } else {
      return this.raycastAABB(origin, dir, maxDist, body, collider);
    }
  }

  private raycastCircle(origin: Vector2D, dir: Vector2D, maxDist: number, body: RigidBody, col: CircleCollider): { body: RigidBody; distance: number; point: Vector2D } | null {
    const center = vecAdd(body.position, col.offset);
    const oc = vecSub(origin, center);
    const a = vecDot(dir, dir);
    const b = 2 * vecDot(oc, dir);
    const c = vecDot(oc, oc) - col.radius * col.radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0 || t > maxDist) return null;

    const point = vecAdd(origin, vecScale(dir, t));
    return { body, distance: t, point };
  }

  private raycastAABB(origin: Vector2D, dir: Vector2D, maxDist: number, body: RigidBody, col: AABBCollider): { body: RigidBody; distance: number; point: Vector2D } | null {
    const pos = vecAdd(body.position, col.offset);
    const hw = col.width / 2;
    const hh = col.height / 2;

    const minX = pos.x - hw;
    const maxX = pos.x + hw;
    const minY = pos.y - hh;
    const maxY = pos.y + hh;

    let tmin = 0;
    let tmax = maxDist;

    // X slab
    if (Math.abs(dir.x) < 0.0001) {
      if (origin.x < minX || origin.x > maxX) return null;
    } else {
      let t1 = (minX - origin.x) / dir.x;
      let t2 = (maxX - origin.x) / dir.x;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }

    // Y slab
    if (Math.abs(dir.y) < 0.0001) {
      if (origin.y < minY || origin.y > maxY) return null;
    } else {
      let t1 = (minY - origin.y) / dir.y;
      let t2 = (maxY - origin.y) / dir.y;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }

    const point = vecAdd(origin, vecScale(dir, tmin));
    return { body, distance: tmin, point };
  }
}
