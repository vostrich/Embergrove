import Phaser from 'phaser';
import { Enemy } from '@entities/Enemy';
import type { EnemyArchetype, PlayerTarget } from '@entities/Enemy';
import { VeilRat } from '@entities/enemies/VeilRat';
import { HollowWolf } from '@entities/enemies/HollowWolf';
import { MistWraith } from '@entities/enemies/MistWraith';

/** A location + archetype to spawn. */
export interface SpawnPoint {
  x: number;
  y: number;
  archetype: EnemyArchetype;
}

export interface EnemyHooks {
  onAttackPlayer: (enemy: Enemy, damage: number) => void;
  onDeath: (enemy: Enemy) => void;
}

/**
 * Per-scene spawn manager. Holds a pool of spawn points, tracks live
 * enemies, respawns 60s after death, and scales spawn rate up 50% at
 * night (via DayNightSystem TIME_CHANGED event).
 *
 * Lifecycle is driven by the host scene's update() calling update().
 */
export class EnemySpawner {
  private scene: Phaser.Scene;
  private hooks: EnemyHooks;
  private spawnPoints: SpawnPoint[] = [];
  private liveEnemies: Enemy[] = [];

  // Per-spawn-point respawn timers (keyed by index).
  private nextSpawnAt: number[] = [];
  private readonly respawnMs = 60_000;

  private nightMultiplier = 1.0; // 1.0 day, 1.5 night

  constructor(scene: Phaser.Scene, hooks: EnemyHooks) {
    this.scene = scene;
    this.hooks = hooks;

    // Hook day/night phase changes for spawn-rate scaling.
    this.scene.events.on('TIME_CHANGED', this.onTimeChanged, this);
  }

  /** Register spawn locations for the scene. */
  setSpawnPoints(points: SpawnPoint[]): void {
    this.spawnPoints = points;
    this.nextSpawnAt = points.map(() => 0); // spawn immediately on first update
  }

  /** Spawn the initial wave (call once after setSpawnPoints). */
  spawnInitial(target: PlayerTarget): Enemy[] {
    const spawned: Enemy[] = [];
    for (let i = 0; i < this.spawnPoints.length; i++) {
      const sp = this.spawnPoints[i];
      const enemy = this.createEnemy(sp, target);
      if (enemy) {
        spawned.push(enemy);
        this.nextSpawnAt[i] = this.scene.time.now + this.respawnMs * 10; // don't respawn until dead
      }
    }
    return spawned;
  }

  /** Per-frame tick: respawn dead slots whose timer elapsed. */
  update(_delta: number, time: number, target: PlayerTarget): void {
    // Compact the live list (drop destroyed/dead enemies).
    this.liveEnemies = this.liveEnemies.filter(e => e.active && !e.isDead());

    for (let i = 0; i < this.spawnPoints.length; i++) {
      if (time < this.nextSpawnAt[i]) continue;

      // Respect night scaling: with multiplier > 1 we respawn sooner
      // (cooldown divided by multiplier).
      const enemy = this.createEnemy(this.spawnPoints[i], target);
      if (enemy) {
        this.nextSpawnAt[i] = time + this.respawnMs / this.nightMultiplier;
      }
    }
  }

  /** Schedule a respawn for a slot that just became vacant. */
  scheduleRespawn(index: number, time: number): void {
    this.nextSpawnAt[index] = time + this.respawnMs / this.nightMultiplier;
  }

  getLiveEnemies(): Enemy[] {
    return this.liveEnemies;
  }

  /** Clear and destroy all live enemies (e.g. on scene shutdown). */
  shutdown(): void {
    this.scene.events.off('TIME_CHANGED', this.onTimeChanged, this);
    for (const e of this.liveEnemies) {
      if (e.active) e.destroy();
    }
    this.liveEnemies = [];
  }

  private onTimeChanged(payload: { phase: string }): void {
    this.nightMultiplier = payload.phase === 'night' ? 1.5 : 1.0;
  }

  private createEnemy(sp: SpawnPoint, target: PlayerTarget): Enemy | null {
    let enemy: Enemy;
    switch (sp.archetype.id) {
      case 'veil-rat':
        enemy = new VeilRat(this.scene, sp.x, sp.y, this.hooks);
        break;
      case 'hollow-wolf':
        enemy = new HollowWolf(this.scene, sp.x, sp.y, this.hooks);
        break;
      case 'mist-wraith':
        enemy = new MistWraith(this.scene, sp.x, sp.y, this.hooks);
        break;
      default: {
        const Arch = sp.archetype;
        enemy = new (class extends Enemy {
          protected runAI(_d: number, _t: number, _p: PlayerTarget, _dist: number): void {
            this.setVelocity(0, 0);
          }
        })(this.scene, sp.x, sp.y, Arch, this.hooks);
      }
    }
    enemy.setTarget(target);
    this.liveEnemies.push(enemy);
    this.scene.events.emit('enemy:spawn', { id: sp.archetype.id, x: sp.x, y: sp.y });
    return enemy;
  }
}
