import Phaser from 'phaser';
import type { Item } from '@data/types';
import { RARITY_COLORS } from '@data/Constants';

/**
 * Hover tooltip for an inventory item. A 200×150 panel near the pointer
 * showing the item name (rarity-coloured), type + rarity, an italic
 * description, a green stat block, and the gold value.
 *
 * Extracted from InventoryScene to keep that file under the 400 LOC limit.
 */
export class InventoryTooltip {
  readonly container: Phaser.GameObjects.Container;

  private nameText: Phaser.GameObjects.Text;
  private typeText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;

  private static readonly WIDTH = 200;
  private static readonly HEIGHT = 150;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2000);
    this.container.setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x110a18, 0.95);
    bg.lineStyle(2, 0x553366, 1);
    bg.fillRoundedRect(0, 0, InventoryTooltip.WIDTH, InventoryTooltip.HEIGHT, 6);
    bg.strokeRoundedRect(0, 0, InventoryTooltip.WIDTH, InventoryTooltip.HEIGHT, 6);
    this.container.add(bg);

    this.nameText = scene.add.text(8, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.typeText = scene.add.text(8, 24, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa',
    });
    this.descText = scene.add.text(8, 40, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#cccccc',
      fontStyle: 'italic', wordWrap: { width: InventoryTooltip.WIDTH - 16 },
    });
    this.statsText = scene.add.text(8, 80, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#66cc66',
    });
    this.valueText = scene.add.text(8, InventoryTooltip.HEIGHT - 18, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
    });

    this.container.add([
      this.nameText, this.typeText, this.descText, this.statsText, this.valueText,
    ]);
  }

  /** Show the tooltip for `item` near (x, y) (pointer world/screen coords). */
  show(item: Item, x: number, y: number): void {
    const colorHex = '#' + (RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common).toString(16).padStart(6, '0');
    this.nameText.setText(item.name);
    this.nameText.setColor(colorHex);
    this.typeText.setText(`${item.type} · ${item.rarity}`);
    this.descText.setText(item.description || '');
    this.statsText.setText(InventoryTooltip.formatStats(item));
    this.valueText.setText(`Value: ${item.value}g`);

    this.container.setPosition(x + 12, y + 12);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  private static formatStats(item: Item): string {
    const lines: string[] = [];
    for (const [key, val] of Object.entries(item.stats)) {
      if (typeof val === 'number' && val !== 0) {
        lines.push(`+${val} ${key}`);
      }
    }
    for (const affix of item.affixes) {
      lines.push(`+${affix.value} ${affix.name}`);
    }
    if (item.effect) {
      lines.push(`Restores ${item.effect.value} ${item.effect.type.replace('heal_', '')}`);
    }
    return lines.join('\n');
  }
}
