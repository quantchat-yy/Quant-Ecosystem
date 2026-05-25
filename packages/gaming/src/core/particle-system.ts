// ============================================================================
// Gaming Package - Particle System
// ============================================================================

import {
  Particle,
  ParticleEmitter,
  ParticleForce,
  ParticleColor,
  Vector2D,
  EmitterShape,
  SubEmitterConfig,
} from '../types';

// ---------------------------------------------------------------------------
// Particle Pool
// ---------------------------------------------------------------------------

class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  acquire(): Particle {
    const particle = this.pool.pop();
    if (particle) {
      particle.alive = true;
      return particle;
    }
    return this.createParticle();
  }

  release(particle: Particle): void {
    particle.alive = false;
    if (this.pool.length < this.maxSize) {
      this.pool.push(particle);
    }
  }

  getSize(): number {
    return this.pool.length;
  }

  preAllocate(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.pool.length >= this.maxSize) break;
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      lifetime: 0,
      maxLifetime: 1,
      size: 1,
      startSize: 1,
      endSize: 0,
      rotation: 0,
      angularVelocity: 0,
      color: { r: 255, g: 255, b: 255, a: 1 },
      startColor: { r: 255, g: 255, b: 255, a: 1 },
      endColor: { r: 255, g: 255, b: 255, a: 0 },
      alpha: 1,
      alive: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Noise function for turbulence
// ---------------------------------------------------------------------------

function simplexNoise2D(x: number, y: number): number {
  // Simple hash-based noise approximation
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const hash = (a: number, b: number): number => {
    const h = (a * 374761393 + b * 668265263) & 0x7fffffff;
    return ((h ^ (h >> 13)) * 1274126177 & 0x7fffffff) / 0x7fffffff;
  };

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  // Bilinear interpolation with smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return (nx0 * (1 - sy) + nx1 * sy) * 2 - 1; // Range [-1, 1]
}

// ---------------------------------------------------------------------------
// Particle System
// ---------------------------------------------------------------------------

export class ParticleSystem {
  private emitters: Map<string, ParticleEmitter> = new Map();
  private particles: Map<string, Particle[]> = new Map();
  private forces: ParticleForce[] = [];
  private pool: ParticlePool;
  private emitAccumulators: Map<string, number> = new Map();
  private time: number = 0;
  private maxParticlesGlobal: number;
  private totalActiveParticles: number = 0;
  private subEmitterCallbacks: Map<string, (position: Vector2D, velocity: Vector2D) => void> = new Map();

  constructor(config?: { maxParticles?: number; poolSize?: number }) {
    this.maxParticlesGlobal = config?.maxParticles || 50000;
    this.pool = new ParticlePool(config?.poolSize || 10000);
  }

  /** Add a particle emitter */
  addEmitter(emitter: ParticleEmitter): void {
    this.emitters.set(emitter.id, emitter);
    this.particles.set(emitter.id, []);
    this.emitAccumulators.set(emitter.id, 0);
  }

  /** Remove an emitter and its particles */
  removeEmitter(emitterId: string): void {
    const particles = this.particles.get(emitterId);
    if (particles) {
      for (const p of particles) {
        this.pool.release(p);
      }
    }
    this.emitters.delete(emitterId);
    this.particles.delete(emitterId);
    this.emitAccumulators.delete(emitterId);
  }

  /** Get an emitter by ID */
  getEmitter(emitterId: string): ParticleEmitter | null {
    return this.emitters.get(emitterId) || null;
  }

  /** Trigger a burst of particles from an emitter */
  burst(emitterId: string, count?: number): void {
    const emitter = this.emitters.get(emitterId);
    if (!emitter) return;
    const burstCount = count || emitter.burstCount;
    this.emitParticles(emitter, burstCount);
  }

  /** Add a global force */
  addForce(force: ParticleForce): void {
    this.forces.push(force);
  }

  /** Remove all forces */
  clearForces(): void {
    this.forces = [];
  }

  /** Set emitter active state */
  setEmitterActive(emitterId: string, active: boolean): void {
    const emitter = this.emitters.get(emitterId);
    if (emitter) {
      emitter.active = active;
    }
  }

  /** Move emitter position */
  setEmitterPosition(emitterId: string, position: Vector2D): void {
    const emitter = this.emitters.get(emitterId);
    if (emitter) {
      emitter.position = { ...position };
    }
  }

  /** Update the particle system */
  update(deltaTime: number): void {
    this.time += deltaTime;

    // Emit new particles from active emitters
    for (const [id, emitter] of this.emitters.entries()) {
      if (!emitter.active) continue;

      const accumulator = (this.emitAccumulators.get(id) || 0) + deltaTime;
      const emitInterval = 1 / emitter.emissionRate;
      let remaining = accumulator;

      while (remaining >= emitInterval && this.totalActiveParticles < this.maxParticlesGlobal) {
        this.emitParticles(emitter, 1);
        remaining -= emitInterval;
      }

      this.emitAccumulators.set(id, remaining);
    }

    // Update all particles
    for (const [emitterId, emitterParticles] of this.particles.entries()) {
      const emitter = this.emitters.get(emitterId);
      let i = emitterParticles.length;

      while (i--) {
        const particle = emitterParticles[i];

        // Update lifetime
        particle.lifetime += deltaTime;
        if (particle.lifetime >= particle.maxLifetime) {
          // Handle sub-emitters on death
          if (emitter) {
            this.handleSubEmitters(emitter, particle, 'death');
          }
          this.pool.release(particle);
          emitterParticles.splice(i, 1);
          this.totalActiveParticles--;
          continue;
        }

        // Life progress [0, 1]
        const lifeProgress = particle.lifetime / particle.maxLifetime;

        // Apply forces
        particle.acceleration = { x: 0, y: 0 };
        for (const force of this.forces) {
          const forceVec = this.calculateForce(force, particle);
          particle.acceleration.x += forceVec.x;
          particle.acceleration.y += forceVec.y;
        }

        // Apply emitter gravity
        if (emitter) {
          particle.acceleration.x += emitter.gravity.x;
          particle.acceleration.y += emitter.gravity.y;
        }

        // Integrate velocity
        particle.velocity.x += particle.acceleration.x * deltaTime;
        particle.velocity.y += particle.acceleration.y * deltaTime;

        // Integrate position
        particle.position.x += particle.velocity.x * deltaTime;
        particle.position.y += particle.velocity.y * deltaTime;

        // Update rotation
        particle.rotation += particle.angularVelocity * deltaTime;

        // Interpolate size over lifetime
        particle.size = this.lerp(particle.startSize, particle.endSize, lifeProgress);

        // Interpolate color over lifetime
        particle.color = this.lerpColor(particle.startColor, particle.endColor, lifeProgress);

        // Interpolate alpha
        particle.alpha = particle.color.a;
      }
    }
  }

  /** Get all active particles for rendering */
  getParticles(emitterId?: string): Particle[] {
    if (emitterId) {
      return this.particles.get(emitterId) || [];
    }
    const all: Particle[] = [];
    for (const particles of this.particles.values()) {
      for (const p of particles) {
        all.push(p);
      }
    }
    return all;
  }

  /** Get total active particle count */
  getActiveCount(): number {
    return this.totalActiveParticles;
  }

  /** Get pool size */
  getPoolSize(): number {
    return this.pool.getSize();
  }

  /** Pre-allocate pool */
  preAllocate(count: number): void {
    this.pool.preAllocate(count);
  }

  /** Clear all particles */
  clearParticles(emitterId?: string): void {
    if (emitterId) {
      const particles = this.particles.get(emitterId);
      if (particles) {
        for (const p of particles) this.pool.release(p);
        particles.length = 0;
      }
    } else {
      for (const particles of this.particles.values()) {
        for (const p of particles) this.pool.release(p);
        particles.length = 0;
      }
      this.totalActiveParticles = 0;
    }
  }

  /** Get emitter count */
  getEmitterCount(): number {
    return this.emitters.size;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private emitParticles(emitter: ParticleEmitter, count: number): void {
    const particles = this.particles.get(emitter.id);
    if (!particles) return;

    for (let i = 0; i < count; i++) {
      if (particles.length >= emitter.maxParticles) break;
      if (this.totalActiveParticles >= this.maxParticlesGlobal) break;

      const particle = this.pool.acquire();
      this.initializeParticle(particle, emitter);
      particles.push(particle);
      this.totalActiveParticles++;
    }
  }

  private initializeParticle(particle: Particle, emitter: ParticleEmitter): void {
    // Position based on emitter shape
    const spawnPos = this.getSpawnPosition(emitter);
    particle.position.x = emitter.worldSpace ? emitter.position.x + spawnPos.x : spawnPos.x;
    particle.position.y = emitter.worldSpace ? emitter.position.y + spawnPos.y : spawnPos.y;

    // Velocity based on angle and speed range
    const angle = this.randomRange(emitter.angle[0], emitter.angle[1]);
    const speed = this.randomRange(emitter.startSpeed[0], emitter.startSpeed[1]);
    particle.velocity.x = Math.cos(angle) * speed;
    particle.velocity.y = Math.sin(angle) * speed;

    // Lifetime
    particle.maxLifetime = this.randomRange(emitter.particleLifetime[0], emitter.particleLifetime[1]);
    particle.lifetime = 0;

    // Size
    particle.startSize = this.randomRange(emitter.startSize[0], emitter.startSize[1]);
    particle.endSize = this.randomRange(emitter.endSize[0], emitter.endSize[1]);
    particle.size = particle.startSize;

    // Color
    particle.startColor = { ...emitter.startColor };
    particle.endColor = { ...emitter.endColor };
    particle.color = { ...emitter.startColor };
    particle.alpha = emitter.startColor.a;

    // Rotation
    particle.rotation = 0;
    particle.angularVelocity = this.randomRange(emitter.angularVelocity[0], emitter.angularVelocity[1]);

    // Reset acceleration
    particle.acceleration = { x: 0, y: 0 };
  }

  private getSpawnPosition(emitter: ParticleEmitter): Vector2D {
    const params = emitter.shapeParams;

    switch (emitter.shape) {
      case 'point':
        return { x: 0, y: 0 };

      case 'line': {
        const length = params.length || 100;
        const t = Math.random();
        return { x: (t - 0.5) * length, y: 0 };
      }

      case 'circle': {
        const radius = params.radius || 50;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
      }

      case 'rect': {
        const width = params.width || 100;
        const height = params.height || 100;
        return {
          x: (Math.random() - 0.5) * width,
          y: (Math.random() - 0.5) * height,
        };
      }

      default:
        return { x: 0, y: 0 };
    }
  }

  private calculateForce(force: ParticleForce, particle: Particle): Vector2D {
    switch (force.type) {
      case 'gravity':
        return { x: force.direction.x * force.strength, y: force.direction.y * force.strength };

      case 'wind':
        return { x: force.direction.x * force.strength, y: force.direction.y * force.strength };

      case 'turbulence': {
        const scale = force.noiseScale || 0.01;
        const speed = force.noiseSpeed || 1;
        const nx = simplexNoise2D(
          particle.position.x * scale + this.time * speed,
          particle.position.y * scale
        );
        const ny = simplexNoise2D(
          particle.position.x * scale,
          particle.position.y * scale + this.time * speed
        );
        return { x: nx * force.strength, y: ny * force.strength };
      }

      case 'attract': {
        if (!force.position) return { x: 0, y: 0 };
        const dx = force.position.x - particle.position.x;
        const dy = force.position.y - particle.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0 || (force.radius && dist > force.radius)) return { x: 0, y: 0 };
        const factor = force.strength / (dist + 1);
        return { x: (dx / dist) * factor, y: (dy / dist) * factor };
      }

      case 'repel': {
        if (!force.position) return { x: 0, y: 0 };
        const dx = particle.position.x - force.position.x;
        const dy = particle.position.y - force.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0 || (force.radius && dist > force.radius)) return { x: 0, y: 0 };
        const factor = force.strength / (dist * dist + 1);
        return { x: (dx / dist) * factor, y: (dy / dist) * factor };
      }

      default:
        return { x: 0, y: 0 };
    }
  }

  private handleSubEmitters(emitter: ParticleEmitter, particle: Particle, trigger: 'death' | 'birth' | 'collision'): void {
    for (const subConfig of emitter.subEmitters) {
      if (subConfig.trigger !== trigger) continue;

      const callback = this.subEmitterCallbacks.get(subConfig.emitterId);
      if (callback) {
        callback(particle.position, {
          x: particle.velocity.x * subConfig.inheritVelocity,
          y: particle.velocity.y * subConfig.inheritVelocity,
        });
      }
    }
  }

  private lerpColor(a: ParticleColor, b: ParticleColor, t: number): ParticleColor {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
      a: a.a + (b.a - a.a) * t,
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
