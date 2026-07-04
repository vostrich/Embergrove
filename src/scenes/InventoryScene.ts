import Phaser from 'phaser';
import { SCENES, RARITY_COLORS, INVENTORY_COLS, INVENTORY_SLOTS, HOTBAR_SLOTS } from '@data/Constants';
import { ItemType } from '@data/types';
import type { EquipmentSlot, Item } from '@data/types';
import { SaveSystem } from '@systems/SaveSystem';
import { ItemRegistry } from '@systems/ItemRegistry';
import { InventorySystem } from '@systems/InventorySystem';
import { EquipmentSystem, equipSlotForType } from '@systems/EquipmentSystem';
import { InventoryTooltip } from '@ui/InventoryTooltip';

const PANEL_W = 600;
const PANEL_H = 500;
const SLOT = 48;
const EQ_SLOT = 72;

interface SlotView {
  index: number;
  zone: Phaser.GameObjects.Zone;
  border: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
}

interface EquipView {
  slot: EquipmentSlot;
  zone: Phaser.GameObjects.Zone;
  border: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
}

/**
 * Modal inventory overlay. Launched (sleeping gameplay) on `I` from the
 * cottage scene. Renders a 6×4 bag grid, a 4-slot equipment panel, a weight
 * indicator, gold counter, SORT/CLOSE buttons, a hover tooltip, and supports
 * left-drag move/swap, right-click use/equip, and 1–6 hotbar assignment.
 *
 * Interaction state is mutated via InventorySystem/EquipmentSystem (the source
 * of truth), then the view is re-rendered from save.
 */
export class InventoryScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Container;
  private gridViews: SlotView[] = [];
  private equipViews: EquipView[] = [];
  private weightText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private tooltip!: InventoryTooltip;

  private dragItem: Item | null = null;
  private dragSlot: number | null = null;
  private dragGhost: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: SCENES.INVENTORY });
  }

  create(): void {
    InventorySystem.setEventEmitter(this.events);
    EquipmentSystem.setEventEmitter(this.events);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      InventorySystem.setEventEmitter(null);
      EquipmentSystem.setEventEmitter(null);
    });

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Dim overlay (blocks gameplay while open).
    this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6)
      .setDepth(900);

    // Panel frame (brown placeholder).
    const frame = this.add.graphics();
    frame.fillStyle(0x3b2310, 0.97);
    frame.lineStyle(3, 0x8b5a2b, 1);
    frame.fillRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 8);
    frame.strokeRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 8);
    this.panel = this.add.container(0, 0, [frame]).setDepth(1000);

    // Title.
    this.add.text(cx, cy - PANEL_H / 2 + 18, 'INVENTORY', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd1a3', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);

    this.buildGrid(cx - PANEL_W / 2 + 20, cy - PANEL_H / 2 + 50);
    this.buildEquipmentPanel(cx + PANEL_W / 2 - 120, cy - PANEL_H / 2 + 50);
    this.buildFooter(cx, cy + PANEL_H / 2 - 30);
    this.tooltip = new InventoryTooltip(this);

    // Controls: Esc closes; 1–6 assign hovered item to hotbar.
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.close());
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= HOTBAR_SLOTS) this.assignHotbar(n - 1);
    });

    this.refresh();
  }

  // ── Grid ─────────────────────────────────────────────────

  private buildGrid(originX: number, originY: number): void {
    const cols = INVENTORY_COLS;
    const rows = INVENTORY_SLOTS / cols;
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * (SLOT + 4);
      const y = originY + row * (SLOT + 4);

      const border = this.add.graphics().setDepth(1001);
      const icon = this.add.image(x + SLOT / 2, y + SLOT / 2, 'item-pickup')
        .setVisible(false).setDepth(1002);
      const count = this.add.text(x + SLOT - 4, y + SLOT - 4, '', {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(1, 1).setDepth(1003);

      const zone = this.add.zone(x + SLOT / 2, y + SLOT / 2, SLOT, SLOT)
        .setRectangleDropZone(SLOT, SLOT);
      zone.setInteractive({ useHandCursor: true });

      this.gridViews.push({ index: i, zone, border, icon, count });
    }
  }

  // ── Equipment panel ──────────────────────────────────────

  private buildEquipmentPanel(originX: number, originY: number): void {
    const labels: EquipmentSlot[] = ['weapon', 'armor', 'charm', 'lantern'];
    labels.forEach((slot, i) => {
      const x = originX;
      const y = originY + i * (EQ_SLOT + 16);

      const border = this.add.graphics().setDepth(1001);
      const icon = this.add.image(x + EQ_SLOT / 2, y + EQ_SLOT / 2, 'item-pickup')
        .setVisible(false).setDepth(1002);

      this.add.text(x, y - 12, slot.toUpperCase(), {
        fontSize: '10px', fontFamily: 'monospace', color: '#bbbbbb',
      }).setDepth(1001);

      const zone = this.add.zone(x + EQ_SLOT / 2, y + EQ_SLOT / 2, EQ_SLOT, EQ_SLOT)
        .setRectangleDropZone(EQ_SLOT, EQ_SLOT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        // Click an equipped slot to unequip.
        if (EquipmentSystem.getEquippedId(slot)) EquipmentSystem.unequip(slot);
        this.refresh();
      });

      this.equipViews.push({ slot, zone, border, icon });
    });
  }

  // ── Footer (weight / gold / buttons) ─────────────────────

  private buildFooter(cx: number, bottomY: number): void {
    this.weightText = this.add.text(cx - PANEL_W / 2 + 20, bottomY, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setDepth(1001);

    this.goldText = this.add.text(cx + PANEL_W / 2 - 20, bottomY, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(1, 0).setDepth(1001);

    const sortBtn = this.add.text(cx + 40, bottomY, '[SORT]', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd1a3',
    }).setInteractive({ useHandCursor: true }).setDepth(1001);
    sortBtn.on('pointerdown', () => { InventorySystem.sort(); this.refresh(); });

    const closeBtn = this.add.text(cx + 100, bottomY, '[CLOSE]', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).setDepth(1001);
    closeBtn.on('pointerdown', () => this.close());
  }

  // ── Refresh view from save ───────────────────────────────

  private refresh(): void {
    // Grid.
    for (const v of this.gridViews) {
      const item = InventorySystem.getSlot(v.index);
      v.border.clear();
      v.border.fillStyle(0x1a0d22, 0.8);
      v.border.lineStyle(2, item ? (RARITY_COLORS[item.rarity] ?? 0x555555) : 0x333333, 1);
      v.border.fillRect(0, 0, SLOT, SLOT);
      // Border is positioned relative to slot origin; redraw at zone pos.
      v.border.fillRect(v.zone.x - SLOT / 2, v.zone.y - SLOT / 2, SLOT, SLOT);
      v.border.strokeRect(v.zone.x - SLOT / 2, v.zone.y - SLOT / 2, SLOT, SLOT);
      if (item) {
        v.icon.setVisible(true);
        v.count.setText(item.quantity > 1 ? String(item.quantity) : '');
      } else {
        v.icon.setVisible(false);
        v.count.setText('');
      }
      this.wireSlot(v);
    }
    // Equipment.
    for (const ev of this.equipViews) {
      const item = EquipmentSystem.getEquippedItem(ev.slot);
      ev.border.clear();
      ev.border.fillStyle(0x1a0d22, 0.8);
      ev.border.lineStyle(2, item ? (RARITY_COLORS[item.rarity] ?? 0x555555) : 0x553366, 1);
      ev.border.fillRect(ev.zone.x - EQ_SLOT / 2, ev.zone.y - EQ_SLOT / 2, EQ_SLOT, EQ_SLOT);
      ev.border.strokeRect(ev.zone.x - EQ_SLOT / 2, ev.zone.y - EQ_SLOT / 2, EQ_SLOT, EQ_SLOT);
      ev.icon.setVisible(!!item);
    }
    // Footer.
    const weight = InventorySystem.getTotalWeight();
    const max = InventorySystem.getMaxCarryWeight();
    this.weightText.setText(`Weight: ${weight.toFixed(1)} / ${max.toFixed(1)} kg`);
    this.weightText.setColor(weight > max ? '#ff5555' : '#ffffff');
    const gold = SaveSystem.activeSave?.player.gold ?? 0;
    this.goldText.setText(`Gold: ${gold}`);
  }

  /** Wire hover/drag/drop/right-click for a bag slot (idempotent-safe rebind). */
  private wireSlot(v: SlotView): void {
    v.zone.removeAllListeners();
    v.zone.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      const item = InventorySystem.getSlot(v.index);
      if (item && !this.dragItem) this.tooltip.show(item, pointer.x, pointer.y);
    });
    v.zone.on('pointerout', () => this.tooltip.hide());
    v.zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.tooltip.container.visible) {
        this.tooltip.container.setPosition(pointer.x + 12, pointer.y + 12);
      }
    });
    v.zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.useSlot(v.index);
      } else {
        this.beginDrag(v.index);
      }
    });
    v.zone.on('drop', (pointer: Phaser.Input.Pointer, target: Phaser.GameObjects.Zone) => {
      this.handleDrop(target);
    });
  }

  // ── Drag/drop ────────────────────────────────────────────

  private beginDrag(slot: number): void {
    const item = InventorySystem.getSlot(slot);
    if (!item) return;
    this.dragItem = item;
    this.dragSlot = slot;
    const p = this.input.activePointer;
    this.dragGhost = this.add.image(p.x, p.y, 'item-pickup')
      .setTint(RARITY_COLORS[item.rarity] ?? 0xffffff)
      .setDepth(3000).setAlpha(0.8);
    this.input.on('pointermove', this.moveGhost, this);
    this.input.once('pointerup', this.endDrag, this);
  }

  private moveGhost(pointer: Phaser.Input.Pointer): void {
    if (this.dragGhost) this.dragGhost.setPosition(pointer.x, pointer.y);
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    this.input.off('pointermove', this.moveGhost, this);
    // Resolve drop target by checking each zone hit.
    const dropped = this.resolveDropAt(pointer.x, pointer.y);
    this.dragGhost?.destroy();
    this.dragGhost = null;
    this.dragItem = null;
    this.dragSlot = null;
    void dropped;
    this.refresh();
  }

  /** Resolve a drop onto a zone by hit-testing grid + equipment zones. */
  private resolveDropAt(x: number, y: number): void {
    if (this.dragSlot === null) return;
    for (const v of this.gridViews) {
      if (this.hits(v.zone, x, y)) {
        if (v.index !== this.dragSlot) InventorySystem.moveItem(this.dragSlot, v.index);
        return;
      }
    }
    for (const ev of this.equipViews) {
      if (this.hits(ev.zone, x, y)) {
        const item = InventorySystem.getSlot(this.dragSlot);
        if (item) EquipmentSystem.equip(ev.slot, item.id);
        return;
      }
    }
  }

  private handleDrop(_target: Phaser.GameObjects.Zone): void {
    // Phaser drop events are handled via resolveDropAt on pointerup for
    // reliability across zone shapes; kept here for completeness.
  }

  private hits(zone: Phaser.GameObjects.Zone, x: number, y: number): boolean {
    const hw = zone.input?.hitArea?.width ?? zone.width;
    const hh = zone.input?.hitArea?.height ?? zone.height;
    return (
      x >= zone.x - hw / 2 && x <= zone.x + hw / 2 &&
      y >= zone.y - hh / 2 && y <= zone.y + hh / 2
    );
  }

  // ── Right-click behaviour ────────────────────────────────

  private useSlot(slot: number): void {
    const item = InventorySystem.getSlot(slot);
    if (!item) return;
    const type = ItemRegistry.type(item.id);
    if (type === ItemType.Consumable) {
      // Apply effect (heal). Remove one after applying.
      this.applyConsumable(item);
      InventorySystem.removeItem(item.id, 1);
    } else if (type && equipSlotForType(type)) {
      EquipmentSystem.equip(equipSlotForType(type)!, item.id);
    } else if (type === ItemType.Material) {
      console.log(`[Inventory] Material "${item.id}" — no action.`);
    }
    this.refresh();
  }

  private applyConsumable(item: Item): void {
    if (!item.effect || !SaveSystem.activeSave) return;
    const stats = SaveSystem.activeSave.player.stats;
    if (item.effect.type === 'heal_hp') stats.hp = Math.min(stats.maxHp, stats.hp + item.effect.value);
    if (item.effect.type === 'heal_stamina') stats.stamina = Math.min(stats.maxStamina, stats.stamina + item.effect.value);
    if (item.effect.type === 'heal_mana') stats.mana = Math.min(stats.maxMana, stats.mana + item.effect.value);
  }

  private assignHotbar(hotbarIndex: number): void {
    // Assign whichever slot the pointer currently hovers.
    const pointer = this.input.activePointer;
    let hovered: number | null = null;
    for (const v of this.gridViews) {
      if (this.hits(v.zone, pointer.x, pointer.y)) { hovered = v.index; break; }
    }
    if (hovered !== null) InventorySystem.setHotbarSlot(hotbarIndex, hovered);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(SCENES.EMBER_COTTAGE);
  }
}
