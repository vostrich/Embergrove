import Phaser from 'phaser';
import { SCENES, TILE_SIZE, EVENTS } from '@data/Constants';
import { SaveSystem } from '@systems/SaveSystem';
import { DayNightSystem } from '@systems/DayNightSystem';
import { CombatSystem } from '@systems/CombatSystem';
import { EnemySpawner } from '@systems/EnemySpawner';
import { LootSystem } from '@systems/LootSystem';
import { HitFeedbackSystem } from '@systems/HitFeedbackSystem';
import { Player } from '@entities/Player';
import { Enemy } from '@entities/Enemy';
import type { EnemyArchetype, PlayerTarget } from '@entities/Enemy';
import { VeilRat } from '@entities/enemies/VeilRat';
import { MistWraith } from '@entities/enemies/MistWraith';
import { EnemyHealthBar } from '@entities/EnemyHealthBar';
import { ItemPickup } from '@entities/ItemPickup';

/**
 * The starting playable area. Sprint 2 replaces the orange placeholder
 * rectangle with the real Player class and wires up combat, 3 enemy
 * types, loot, hit feedback, and XP. All Sprint 1 world-building
 * (tilemap, stenciled fog, SpriteGPULayer trees/rocks, day/night,
 * camera follow) is preserved.
 */
export class EmberCottageScene extends Phaser.Scene {
  public player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyI!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  private cottage!: Phaser.GameObjects.Sprite;
  private tintOverlay!: Phaser.GameObjects.Graphics;

  // Systems
  private spawner!: EnemySpawner;
  private lootSystem!: LootSystem;
  private hitFeedback!: HitFeedbackSystem;

  // Per-enemy bookkeeping
  private healthBars: Map<Enemy, EnemyHealthBar> = new Map();
  private pickups: ItemPickup[] = [];

  constructor() {
    super({ key: SCENES.EMBER_COTTAGE });
  }

  create(): void {
    // Initialize Day/Night system time from save
    DayNightSystem.getInstance().initFromSave();

    const mapWidth = 40;
    const mapHeight = 25;
    const pixelWidth = mapWidth * TILE_SIZE; // 40 * 32 = 1280
    const pixelHeight = mapHeight * TILE_SIZE; // 25 * 32 = 800

    // Set background color to dawn ambience
    this.cameras.main.setBackgroundColor(0xffd1a3);

    // ── Generate Tilemap Base Layer ──
    const mapData: number[][] = [];
    for (let y = 0; y < mapHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < mapWidth; x++) {
        row.push(0); // 0 corresponds to grass tile in tileset
      }
      mapData.push(row);
    }

    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('placeholder-grass-tile', 'placeholder-grass-tile');

    let _baseLayer;
    try {
      // 5th param is 'gpu' (boolean) for TilemapGPULayer in Phaser 4
      _baseLayer = map.createLayer(0, tileset!, 0, 0, true);
    } catch (err) {
      console.warn('TilemapGPULayer creation failed, falling back to standard layer:', err);
      _baseLayer = map.createLayer(0, tileset!, 0, 0);
    }

    // ── Create Player (replaces Sprint 1 placeholder rectangle) ──
    const startX = SaveSystem.activeSave?.player.x ?? 300;
    const startY = SaveSystem.activeSave?.player.y ?? 400;
    this.player = new Player(this, startX, startY);
    this.syncPlayerStatsFromSave();

    // Lantern light reacts to day/night phase.
    this.player.enableLantern();
    this.player.setLanternForPhase(DayNightSystem.getInstance().getCurrentPhase());
    this.events.on('TIME_CHANGED', (payload: { phase: 'dawn' | 'day' | 'dusk' | 'night' }) => {
      this.player.setLanternForPhase(payload.phase);
    });

    // ── Cottage Building ──
    this.cottage = this.add.sprite(200, 200, 'placeholder-cottage');
    this.cottage.setInteractive({ useHandCursor: true });

    // "HOME BASE" text above cottage
    this.add.text(200, 150, 'HOME BASE', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);

    // ── Silhouettes ──
    const smithy = this.add.sprite(450, 350, 'placeholder-building');
    smithy.setTint(0x444444);
    smithy.setTintMode(Phaser.Display.TintModes.MULTIPLY);

    const apothecary = this.add.sprite(750, 350, 'placeholder-building');
    apothecary.setTint(0x444444);
    apothecary.setTintMode(Phaser.Display.TintModes.MULTIPLY);

    // ── Stenciled Fog (y > 500) ──
    const fogStencil = new Phaser.GameObjects.Stencil(this);
    this.add.existing(fogStencil);

    // Draw the mask area where fog is visible (south area)
    const stencilShape = this.add.graphics();
    stencilShape.fillStyle(0xffffff, 1.0);
    stencilShape.fillRect(0, 500, pixelWidth, pixelHeight - 500);
    fogStencil.add(stencilShape);

    // Fog overlay graphics
    const fogOverlay = this.add.graphics();
    fogOverlay.fillStyle(0x2c1a3d, 0.65); // Hollow Veil dark purple fog
    fogOverlay.fillRect(0, 500, pixelWidth, pixelHeight - 500);
    this.add.existing(fogOverlay);

    // Apply stencil mask
    fogOverlay.enableFilters();
    (fogOverlay as unknown as { filters: { internal: { addMask: (s: unknown) => void } } })
      .filters.internal.addMask(fogStencil);

    // ── Trees and Rocks around Borders ──
    const treeCoords = [
      { x: 80, y: 100 }, { x: 1200, y: 100 }, { x: 120, y: 700 }, { x: 1160, y: 700 },
      { x: 600, y: 80 }, { x: 80, y: 450 }, { x: 1220, y: 450 }, { x: 900, y: 120 },
    ];

    const rockCoords = [
      { x: 350, y: 90 }, { x: 1020, y: 110 }, { x: 160, y: 580 }, { x: 1100, y: 580 },
      { x: 80, y: 280 }, { x: 1200, y: 280 },
    ];

    // Render trees with SpriteGPULayer
    try {
      const treeLayer = this.add.spriteGPULayer('placeholder-tree', 8);
      const treeMember = { frame: 'placeholder-tree', x: 0, y: 0 };
      for (const coord of treeCoords) {
        treeMember.x = coord.x;
        treeMember.y = coord.y;
        treeLayer.addMember(treeMember);
      }
    } catch (err) {
      console.warn('SpriteGPULayer for trees failed, falling back to sprites:', err);
      for (const coord of treeCoords) {
        this.add.sprite(coord.x, coord.y, 'placeholder-tree');
      }
    }

    // Render rocks with SpriteGPULayer
    try {
      const rockLayer = this.add.spriteGPULayer('placeholder-rock', 6);
      const rockMember = { frame: 'placeholder-rock', x: 0, y: 0 };
      for (const coord of rockCoords) {
        rockMember.x = coord.x;
        rockMember.y = coord.y;
        rockLayer.addMember(rockMember);
      }
    } catch (err) {
      console.warn('SpriteGPULayer for rocks failed, falling back to sprites:', err);
      for (const coord of rockCoords) {
        this.add.sprite(coord.x, coord.y, 'placeholder-rock');
      }
    }

    // Create collidable physics zones at coordinates
    const obstacles = this.physics.add.staticGroup();

    for (const coord of treeCoords) {
      const zone = this.add.zone(coord.x, coord.y, 32, 32);
      this.physics.add.existing(zone, true);
      obstacles.add(zone);
    }

    for (const coord of rockCoords) {
      const zone = this.add.zone(coord.x, coord.y, 24, 24);
      this.physics.add.existing(zone, true);
      obstacles.add(zone);
    }

    this.physics.add.collider(this.player, obstacles);

    // ── Combat systems ──
    this.lootSystem = new LootSystem(this);
    this.hitFeedback = new HitFeedbackSystem(this);
    CombatSystem.setKnockbackExecutor({
      apply: (target, fromX, fromY, _force) => {
        this.tweens.add({
          targets: target,
          x: fromX, y: fromY,
          duration: CombatSystem.getKnockbackDurationMs(),
          ease: 'Quad.out',
        });
      },
    });

    // ── Enemy Spawner ──
    this.spawner = new EnemySpawner(this, {
      onAttackPlayer: (enemy, damage) => this.onEnemyAttackPlayer(enemy, damage),
      onDeath: (enemy) => this.onEnemyDeath(enemy),
    });

    // Spawn locations: 2 VeilRats in the south fog, 1 MistWraith at the deep south edge.
    // (HollowWolf is unlocked in Sprint 3 — archetype exists but no spawn point here.)
    const spawnPoints: { x: number; y: number; archetype: EnemyArchetype }[] = [
      { x: 500, y: 620, archetype: VeilRat.archetype },
      { x: 780, y: 680, archetype: VeilRat.archetype },
      { x: 1100, y: 720, archetype: MistWraith.archetype },
    ];
    this.spawner.setSpawnPoints(spawnPoints);
    this.spawner.spawnInitial(this.playerTarget());

    // ── Player → Enemy combat hooks ──
    this.player.setCombatHooks({
      onLightAttack: () => this.resolvePlayerAttack('light'),
      onHeavyAttack: () => this.resolvePlayerAttack('heavy'),
      onParry: () => { /* parry success resolved in onEnemyAttackPlayer */ },
    });

    // ── Camera setup ──
    this.cameras.main.setBounds(0, 0, pixelWidth, pixelHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 200);

    // ── Controls setup ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Mouse attacks: LMB = light, RMB = heavy. Disable browser context menu.
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.player.tryLightAttack(this.time.now);
      else if (pointer.rightButtonDown()) this.player.tryHeavyAttack(this.time.now);
    });

    // Launch overlay HUD Parallel
    this.scene.launch(SCENES.UI);

    // ── Custom Camera Tint overlay workaround ──
    this.tintOverlay = this.add.graphics();
    this.tintOverlay.setScrollFactor(0);
    this.tintOverlay.setDepth(1000);

    (this.cameras.main as unknown as { setTint: (c: number, a: number) => void }).setTint = (color: number, alpha: number) => {
      this.tintOverlay.clear();
      if (alpha > 0) {
        this.tintOverlay.fillStyle(color, alpha);
        this.tintOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
      }
    };

    // Listen for XP gains → floating "+N XP" text.
    this.events.on(EVENTS.ENEMY_DEFEATED, (payload: { x: number; y: number; xp: number }) => {
      this.awardEnemyXp(payload.xp, payload.x, payload.y);
    });
  }

  update(time: number, delta: number): void {
    // Player input + update.
    const input = {
      up: this.cursors.up.isDown || this.keyW.isDown,
      down: this.cursors.down.isDown || this.keyS.isDown,
      left: this.cursors.left.isDown || this.keyA.isDown,
      right: this.cursors.right.isDown || this.keyD.isDown,
    };
    this.player.update(time, delta, input);

    // Discrete actions.
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.player.tryDodge(time);
    if (Phaser.Input.Keyboard.JustDown(this.keyShift)) this.player.tryParry(time);

    // Interactions / menus.
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cottage.x, this.cottage.y);
    if (dist < 80 && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.showPopup('Enter cottage — coming soon');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) {
      console.log('[Inventory] Sprint 3 placeholder', SaveSystem.activeSave?.player.inventory);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      console.log('[Journal] Sprint 4 placeholder', SaveSystem.activeSave?.quests);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.pause();
      this.scene.launch('PauseScene');
    }

    // Enemies + health bars.
    for (const enemy of this.spawner.getLiveEnemies()) {
      enemy.update(delta, time);
      let bar = this.healthBars.get(enemy);
      if (!bar) {
        bar = new EnemyHealthBar(this, enemy);
        this.healthBars.set(enemy, bar);
      }
      bar.update(time);
    }
    // Reap health bars for dead/destroyed enemies.
    this.reapHealthBars();

    // Pickups: magnet toward player, collect on overlap.
    this.updatePickups(time);

    // Respawn management.
    this.spawner.update(delta, time, this.playerTarget());

    // Sync player position to active save for HUD/debug.
    if (SaveSystem.activeSave) {
      SaveSystem.activeSave.player.x = this.player.x;
      SaveSystem.activeSave.player.y = this.player.y;
      SaveSystem.activeSave.player.direction = this.player.direction;
      SaveSystem.activeSave.player.stats.stamina = this.player.stamina;
    }

    // Update Day/Night System
    DayNightSystem.getInstance().update(delta, this.cameras.main, this);
  }

  // ── Combat resolution ────────────────────────────────────

  /**
   * Resolve a player attack: find enemies within attack range in front
   * of the player and apply CombatSystem.resolveAttack to each.
   */
  private resolvePlayerAttack(type: 'light' | 'heavy'): void {
    const origin = this.player.getAttackOrigin();
    const enemies = this.spawner.getLiveEnemies();
    let hitAny = false;

    for (const enemy of enemies) {
      if (enemy.isDead()) continue;
      const dist = Phaser.Math.Distance.Between(origin.x, origin.y, enemy.x, enemy.y);
      if (dist > 48) continue; // melee reach

      const result = CombatSystem.resolveAttack(
        this.player, enemy, type, this.player.weapon
      );
      const dealt = enemy.takeDamage(this.time.now, result.damage, result.isCrit);
      if (dealt > 0) {
        hitAny = true;
        const kind = result.isCrit ? 'critical' : type;
        this.hitFeedback.playHit({
          x: enemy.x, y: enemy.y, damage: dealt, kind, target: enemy,
        });
        CombatSystem.applyKnockback(enemy, this.player, type === 'heavy' ? 120 : 60);
      }
      this.events.emit(EVENTS.ATTACK_RESOLVED, { damage: dealt, isCrit: result.isCrit });
    }

    if (!hitAny) {
      // Whiff feedback (light swing sfx, no shake/particles).
      try { if (this.sound.get('sfx-swing')) this.sound.play('sfx-swing', { volume: 0.3 }); } catch { /* noop */ }
    }
  }

  /** An enemy attacked the player — resolve damage, parry, i-frames. */
  private onEnemyAttackPlayer(enemy: Enemy, damage: number): void {
    // Parry check: if the player is in their parry window, stun the enemy.
    if (this.player.state === 'Parrying') {
      enemy.stun(this.time.now);
      this.events.emit(EVENTS.PARRY_SUCCESS, { enemyId: enemy.config.id });
      this.hitFeedback.playHit({
        x: enemy.x, y: enemy.y, damage: 0, kind: 'light', target: enemy,
      });
      return;
    }

    const tookDamage = this.player.takeDamage(this.time.now, damage);
    if (!tookDamage) return; // i-frames / dodge

    if (SaveSystem.activeSave) {
      const stats = SaveSystem.activeSave.player.stats;
      stats.hp = Math.max(0, stats.hp - damage);
      if (stats.hp <= 0) {
        this.player.die();
      }
    }
    this.hitFeedback.playHit({
      x: this.player.x, y: this.player.y, damage, kind: 'player', target: this.player,
    });
    CombatSystem.applyKnockback(this.player, enemy, 100);
  }

  /** Enemy died: drop loot, death animation, reap health bar. */
  private onEnemyDeath(enemy: Enemy): void {
    // Spawn loot at the death position.
    const drops = this.lootSystem.dropLoot(enemy.x, enemy.y, enemy.lootTable);
    this.pickups.push(...drops);

    // Death animation: fade + dark particles.
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      duration: 500,
      onComplete: () => enemy.destroy(),
    });
    this.spawnDeathParticles(enemy.x, enemy.y);
  }

  private spawnDeathParticles(x: number, y: number): void {
    if (!this.textures.exists('ember-particle')) return;
    const darkKey = '__deathParticle';
    if (!this.textures.exists(darkKey)) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x2a1a3a, 1);
      gfx.fillRect(0, 0, 5, 5);
      gfx.generateTexture(darkKey, 5, 5);
      gfx.destroy();
    }
    const emitter = this.add.particles(x, y, darkKey, {
      speed: { min: 20, max: 60 },
      lifespan: 600,
      quantity: 3,
      scale: { start: 1.2, end: 0 },
      emitting: false,
    });
    emitter.explode(3, x, y);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  // ── XP ───────────────────────────────────────────────────

  private awardEnemyXp(amount: number, x: number, y: number): void {
    const before = SaveSystem.activeSave?.player.stats.level ?? 1;
    SaveSystem.awardXp(amount, (newLevel) => {
      this.events.emit(EVENTS.PLAYER_LEVEL_UP, { level: newLevel });
    });
    const after = SaveSystem.activeSave?.player.stats.level ?? 1;

    // Floating "+N XP" text above the kill point.
    const label = this.add.text(x, y - 20, `+${amount} XP`, {
      fontSize: '14px',
      color: '#66cc66',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: label, y: label.y - 30, alpha: 0, duration: 1000,
      onComplete: () => label.destroy(),
    });

    if (after > before) {
      this.showLevelUpPopup();
    }
  }

  private showLevelUpPopup(): void {
    const txt = this.add.text(this.player.x, this.player.y - 50, 'LEVEL UP!', {
      fontSize: '22px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 1400,
      onComplete: () => txt.destroy(),
    });
  }

  // ── Pickups ──────────────────────────────────────────────

  private updatePickups(_time: number): void {
    const remaining: ItemPickup[] = [];
    for (const p of this.pickups) {
      if (!p.active) continue;
      const collected = p.updateMagnet(this.player);
      if (collected) {
        this.collectPickup(p);
      } else {
        remaining.push(p);
      }
    }
    this.pickups = remaining;
  }

  private collectPickup(pickup: ItemPickup): void {
    if (!pickup.active) return;
    pickup.playPickupBurst();

    if (pickup.kind === 'gold') {
      if (SaveSystem.activeSave) SaveSystem.activeSave.player.gold += pickup.goldAmount;
      this.events.emit(EVENTS.GOLD_PICKUP, { amount: pickup.goldAmount });
    } else if (pickup.item) {
      SaveSystem.activeSave?.player.inventory.push(pickup.item);
      this.events.emit(EVENTS.ITEM_PICKUP, { itemId: pickup.item.id });
    }
    pickup.destroy();
  }

  // ── Health bar reaping ───────────────────────────────────

  private reapHealthBars(): void {
    for (const [enemy, bar] of this.healthBars) {
      if (!enemy.active || enemy.isDead()) {
        bar.destroy();
        this.healthBars.delete(enemy);
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private playerTarget(): PlayerTarget {
    return { x: this.player.x, y: this.player.y, isDead: this.player.isDead() };
  }

  private syncPlayerStatsFromSave(): void {
    const stats = SaveSystem.activeSave?.player.stats;
    if (!stats) return;
    this.player.setStats({
      attack: stats.attack,
      defense: stats.defense,
      luck: stats.luck,
      speed: stats.speed,
      stamina: stats.stamina,
      maxStamina: stats.maxStamina,
    });
  }

  private showPopup(message: string): void {
    const popup = this.add.text(this.player.x, this.player.y - 45, message, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#1a0d22',
      padding: { x: 10, y: 6 },
      fontFamily: 'monospace',
      fontWeight: 'bold',
      shadow: { color: '#ff8c42', fill: true, offsetX: 0, offsetY: 0, blur: 4 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: popup.y - 30,
      alpha: 0,
      duration: 1800,
      onComplete: () => popup.destroy(),
    });
  }

  shutdown(): void {
    this.spawner?.shutdown();
  }
}
