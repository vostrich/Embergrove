import Phaser from 'phaser';
import { SaveSystem } from '@systems/SaveSystem';
import { DAY_LENGTH_MS } from '@data/Constants';

export class DayNightSystem {
  private static instance: DayNightSystem;
  private worldTime: number = 0; // In milliseconds
  private currentPhase: 'dawn' | 'day' | 'dusk' | 'night' = 'day';

  private constructor() {}

  static getInstance(): DayNightSystem {
    if (!DayNightSystem.instance) {
      DayNightSystem.instance = new DayNightSystem();
    }
    return DayNightSystem.instance;
  }

  initFromSave(): void {
    if (SaveSystem.activeSave) {
      this.worldTime = SaveSystem.activeSave.world.timeOfDay * DAY_LENGTH_MS;
      this.updatePhaseOnly();
    } else {
      this.worldTime = 0.5 * DAY_LENGTH_MS; // Default to midday
      this.currentPhase = 'day';
    }
  }

  update(deltaMs: number, camera: Phaser.Cameras.Scene2D.Camera, scene: Phaser.Scene): void {
    this.worldTime += deltaMs;
    if (this.worldTime >= DAY_LENGTH_MS) {
      this.worldTime -= DAY_LENGTH_MS;
      if (SaveSystem.activeSave) {
        SaveSystem.activeSave.world.currentDay++;
      }
    }

    if (SaveSystem.activeSave) {
      SaveSystem.activeSave.world.timeOfDay = this.worldTime / DAY_LENGTH_MS;
    }

    const t = this.worldTime / DAY_LENGTH_MS;

    // Calculate color, alpha, and phase
    let color = 0xffffff;
    let alpha = 0;
    let phase: 'dawn' | 'day' | 'dusk' | 'night' = 'day';

    if (t < 0.15) {
      phase = 'dawn';
      // Dawn is 0 to 0.15
      // 0 to 0.075: Night to Dawn
      // 0.075 to 0.15: Dawn to Day
      if (t < 0.075) {
        const factor = t / 0.075;
        color = this.lerpColor(0x1a1a3e, 0xffd166, factor);
        alpha = 0.6 + (0.4 - 0.6) * factor;
      } else {
        const factor = (t - 0.075) / 0.075;
        color = this.lerpColor(0xffd166, 0xffffff, factor);
        alpha = 0.4 * (1 - factor);
      }
    } else if (t < 0.65) {
      phase = 'day';
      color = 0xffffff;
      alpha = 0;
    } else if (t < 0.80) {
      phase = 'dusk';
      // Dusk is 0.65 to 0.80
      // 0.65 to 0.725: Day to Dusk
      // 0.725 to 0.80: Dusk to Night
      if (t < 0.725) {
        const factor = (t - 0.65) / 0.075;
        color = this.lerpColor(0xffffff, 0xff8c42, factor);
        alpha = 0.4 * factor;
      } else {
        const factor = (t - 0.725) / 0.075;
        color = this.lerpColor(0xff8c42, 0x1a1a3e, factor);
        alpha = 0.4 + (0.6 - 0.4) * factor;
      }
    } else {
      phase = 'night';
      color = 0x1a1a3e;
      alpha = 0.6;
    }

    // Check for phase shift
    if (phase !== this.currentPhase) {
      const oldPhase = this.currentPhase;
      this.currentPhase = phase;
      scene.events.emit('TIME_CHANGED', { phase, oldPhase });
      scene.events.emit('world:timeChange', { phase, oldPhase });
    }

    // Apply camera tint
    if ((camera as any).setTint) {
      (camera as any).setTint(color, alpha);
    }
  }

  getCurrentPhase(): 'dawn' | 'day' | 'dusk' | 'night' {
    return this.currentPhase;
  }

  getCurrentTimeProgress(): number {
    return this.worldTime / DAY_LENGTH_MS;
  }

  private updatePhaseOnly(): void {
    const t = this.worldTime / DAY_LENGTH_MS;
    if (t < 0.15) {
      this.currentPhase = 'dawn';
    } else if (t < 0.65) {
      this.currentPhase = 'day';
    } else if (t < 0.80) {
      this.currentPhase = 'dusk';
    } else {
      this.currentPhase = 'night';
    }
  }

  private lerpColor(color1: number, color2: number, factor: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return (r << 16) | (g << 8) | b;
  }
}
