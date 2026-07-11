import Phaser from "phaser";
import { audioDirector } from "../core/AudioDirector";

export class HomeScene extends Phaser.Scene {
  private floatingTiles: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("HomeScene");
  }

  create(): void {
    audioDirector.startAmbience("home");
    this.scale.on("resize", this.layout, this);
    this.layout();
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.children.removeAll(true);
    this.floatingTiles = [];

    const background = this.add.graphics();
    background.fillGradientStyle(0xeaf5f0, 0xeaf5f0, 0xd8ecff, 0xf8efd9, 1);
    background.fillRect(0, 0, width, height);

    this.drawIsland(width, height);
    this.drawFloatingTiles(width, height);

    this.add
      .text(width / 2, height * 0.2, "浮岛花园", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: `${Math.max(36, Math.min(58, width * 0.09))}px`,
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.2 + 62, "四季三消", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: `${Math.max(18, Math.min(26, width * 0.04))}px`,
        color: "#4b6b5f",
      })
      .setOrigin(0.5);

    this.createStartButton(width / 2, Math.min(height * 0.75, height - 95));
  }

  private drawIsland(width: number, height: number): void {
    const graphics = this.add.graphics();
    const centerX = width / 2;
    const centerY = height * 0.52;
    const islandWidth = Math.min(width * 0.78, 480);

    graphics.fillStyle(0x8d7557, 1);
    graphics.fillTriangle(centerX - islandWidth * 0.35, centerY, centerX + islandWidth * 0.35, centerY, centerX, centerY + 90);
    graphics.fillStyle(0x95cf72, 1);
    graphics.fillEllipse(centerX, centerY, islandWidth, 130);
    graphics.fillStyle(0x68b86d, 1);
    graphics.fillEllipse(centerX - 70, centerY - 15, islandWidth * 0.28, 52);
    graphics.fillStyle(0x9ad4f4, 1);
    graphics.fillEllipse(centerX + 88, centerY + 4, islandWidth * 0.22, 34);
    graphics.fillStyle(0xf3a6c4, 1);
    graphics.fillCircle(centerX - 20, centerY - 34, 11);
    graphics.fillCircle(centerX + 7, centerY - 42, 8);
    graphics.fillCircle(centerX + 28, centerY - 27, 10);
  }

  private drawFloatingTiles(width: number, height: number): void {
    const kinds = ["water", "sun", "leaf", "flower", "soil", "stardust"];
    const positions = [
      [0.15, 0.22],
      [0.8, 0.25],
      [0.2, 0.68],
      [0.78, 0.66],
      [0.34, 0.38],
      [0.66, 0.42],
    ];

    positions.forEach(([x, y], index) => {
      const image = this.add.image(width * x, height * y, `tile-${kinds[index]}`).setScale(0.62);
      image.setAlpha(0.9);
      this.tweens.add({
        targets: image,
        y: image.y + 10,
        duration: 1600 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.floatingTiles.push(image);
    });
  }

  private createStartButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 220;
    const height = 56;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1f7a5c, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    graphics.lineStyle(2, 0xffffff, 0.35);
    graphics.strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 8);

    const label = this.add
      .text(0, 0, "开始修复浮岛", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    container.add([graphics, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerover", () => container.setScale(1.03));
    container.on("pointerout", () => container.setScale(1));
    container.on("pointerdown", () => {
      audioDirector.unlock();
      audioDirector.play("ui");
      this.scene.start("LevelScene", { levelIndex: 0 });
    });

    return container;
  }
}
