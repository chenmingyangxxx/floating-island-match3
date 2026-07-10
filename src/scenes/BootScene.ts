import Phaser from "phaser";
import type { TerrainKind, TileKind } from "../match3/types";

const tileColors: Record<TileKind, number> = {
  water: 0x3c91d6,
  sun: 0xffc247,
  leaf: 0x4caf69,
  flower: 0xf0649b,
  soil: 0x9b6b43,
  stardust: 0x7e68d6,
};

const terrainColors: Record<TerrainKind, number> = {
  barren: 0xd8c4a5,
  grass: 0xa8d976,
  flowerbed: 0xf0a7bf,
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.createCellTextures();
    this.createTileTextures();
    this.scene.start("HomeScene");
  }

  private createCellTextures(): void {
    const graphics = this.add.graphics();

    for (const [terrain, color] of Object.entries(terrainColors)) {
      graphics.clear();
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(0, 0, 80, 80, 8);
      graphics.lineStyle(2, 0xffffff, 0.45);
      graphics.strokeRoundedRect(2, 2, 76, 76, 8);
      graphics.generateTexture(`cell-${terrain}`, 80, 80);
    }

    graphics.clear();
    graphics.fillStyle(0xe7f6ff, 0.64);
    graphics.fillRoundedRect(0, 0, 80, 80, 8);
    graphics.lineStyle(3, 0x78bce7, 0.9);
    graphics.strokeRoundedRect(4, 4, 72, 72, 8);
    graphics.generateTexture("ice-overlay", 80, 80);
    graphics.destroy();
  }

  private createTileTextures(): void {
    const graphics = this.add.graphics();

    for (const [kind, color] of Object.entries(tileColors) as Array<[TileKind, number]>) {
      graphics.clear();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRoundedRect(5, 5, 70, 70, 8);
      graphics.lineStyle(2, 0x22313f, 0.08);
      graphics.strokeRoundedRect(6, 6, 68, 68, 8);
      graphics.fillStyle(color, 1);
      this.drawTileSymbol(graphics, kind);
      graphics.generateTexture(`tile-${kind}`, 80, 80);
    }

    graphics.destroy();
  }

  private drawTileSymbol(graphics: Phaser.GameObjects.Graphics, kind: TileKind): void {
    switch (kind) {
      case "water":
        graphics.fillTriangle(40, 14, 24, 43, 56, 43);
        graphics.fillCircle(40, 45, 18);
        graphics.fillStyle(0xffffff, 0.42);
        graphics.fillCircle(34, 39, 5);
        break;
      case "sun":
        for (let index = 0; index < 10; index += 1) {
          const angle = (Math.PI * 2 * index) / 10;
          const inner = new Phaser.Math.Vector2(40 + Math.cos(angle) * 19, 40 + Math.sin(angle) * 19);
          const outer = new Phaser.Math.Vector2(40 + Math.cos(angle) * 29, 40 + Math.sin(angle) * 29);
          graphics.lineStyle(4, 0xffc247, 1);
          graphics.lineBetween(inner.x, inner.y, outer.x, outer.y);
        }
        graphics.fillStyle(0xffc247, 1);
        graphics.fillCircle(40, 40, 18);
        break;
      case "leaf":
        graphics.fillEllipse(40, 40, 42, 28);
        graphics.lineStyle(3, 0xffffff, 0.5);
        graphics.lineBetween(25, 44, 55, 36);
        break;
      case "flower":
        graphics.fillCircle(40, 21, 11);
        graphics.fillCircle(58, 38, 11);
        graphics.fillCircle(49, 59, 11);
        graphics.fillCircle(31, 59, 11);
        graphics.fillCircle(22, 38, 11);
        graphics.fillStyle(0xffd76a, 1);
        graphics.fillCircle(40, 42, 10);
        break;
      case "soil":
        graphics.fillRoundedRect(24, 24, 32, 32, 7);
        graphics.fillStyle(0xc99a6b, 1);
        graphics.fillRoundedRect(28, 19, 24, 10, 5);
        graphics.fillRoundedRect(28, 51, 24, 10, 5);
        break;
      case "stardust":
        this.fillStar(graphics, 40, 40, 28, 12, 5);
        graphics.fillStyle(0xffffff, 0.4);
        graphics.fillCircle(50, 27, 4);
        break;
      default:
        break;
    }
  }

  private fillStar(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    outer: number,
    inner: number,
    points: number,
  ): void {
    const vertices: Array<{ x: number; y: number }> = [];

    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (Math.PI * index) / points;
      vertices.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    }

    graphics.beginPath();
    graphics.moveTo(vertices[0].x, vertices[0].y);

    for (const vertex of vertices.slice(1)) {
      graphics.lineTo(vertex.x, vertex.y);
    }

    graphics.closePath();
    graphics.fillPath();
  }
}
