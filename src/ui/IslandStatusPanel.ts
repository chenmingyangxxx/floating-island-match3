import Phaser from "phaser";
import {
  REPAIR_STAGES,
  completedStageCount,
  currentRepairStageIndex,
  loadProgress,
} from "../core/ProgressStore";

interface IslandStatusPanelOptions {
  runtimeStageIndex?: number;
  runtimeStagePercent?: number;
  title?: string;
  onClose?: () => void;
}

export function showIslandStatusPanel(
  scene: Phaser.Scene,
  options: IslandStatusPanelOptions = {},
): Phaser.GameObjects.Container {
  const progress = loadProgress();
  const stageProgress = [...progress.stageProgress];
  if (options.runtimeStageIndex !== undefined && options.runtimeStagePercent !== undefined) {
    const index = Phaser.Math.Clamp(options.runtimeStageIndex, 0, REPAIR_STAGES.length - 1);
    stageProgress[index] = Math.max(stageProgress[index] ?? 0, Phaser.Math.Clamp(options.runtimeStagePercent, 0, 99));
  }

  const totalPercent = Math.round(stageProgress.reduce((sum, value) => sum + value, 0) / REPAIR_STAGES.length);
  const completed = completedStageCount({ ...progress, stageProgress });
  const stageIndex = Math.max(currentRepairStageIndex({ ...progress, stageProgress }), completed - 1, 0);
  const { width, height } = scene.scale;
  const layer = scene.add.container(0, 0).setDepth(90);
  const blocker = scene.add.rectangle(0, 0, width, height, 0x17342d, 0.58).setOrigin(0, 0);
  blocker.setInteractive();

  const panelWidth = Math.min(width - 24, 390);
  const panelHeight = Math.min(height - 34, 650);
  const centerX = width / 2;
  const centerY = height / 2;
  const panel = scene.add.container(centerX, centerY);
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(0xfffffb, 0.99);
  panelBg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
  panelBg.lineStyle(2, 0x1f7a5c, 0.18);
  panelBg.strokeRoundedRect(-panelWidth / 2 + 1, -panelHeight / 2 + 1, panelWidth - 2, panelHeight - 2, 8);

  const title = scene.add
    .text(0, -panelHeight / 2 + 28, options.title ?? "当前浮岛状态", {
      fontFamily: "Microsoft YaHei, sans-serif",
      fontSize: "24px",
      color: "#1f3c33",
      fontStyle: "700",
    })
    .setOrigin(0.5);

  const summary = scene.add
    .text(0, -panelHeight / 2 + 58, `进度 ${completed}/8 · ${totalPercent}%    钻石 ${progress.diamonds}`, {
      fontFamily: "Microsoft YaHei, sans-serif",
      fontSize: "15px",
      color: "#4b6b5f",
      fontStyle: "700",
    })
    .setOrigin(0.5);

  const visual = scene.add.container(0, -panelHeight / 2 + 138);
  drawIsland(scene, visual, stageIndex, totalPercent, Math.min(panelWidth * 0.72, 250));

  const overallTrack = scene.add.rectangle(-panelWidth / 2 + 30, -panelHeight / 2 + 220, panelWidth - 60, 10, 0xdbe7df, 1)
    .setOrigin(0, 0.5);
  const overallFill = scene.add.rectangle(-panelWidth / 2 + 30, -panelHeight / 2 + 220, panelWidth - 60, 10, 0x5d9f5b, 1)
    .setOrigin(0, 0.5);
  overallFill.scaleX = totalPercent / 100;

  const listTop = -panelHeight / 2 + 250;
  const rowGap = Math.min(38, Math.max(30, (panelHeight - 318) / REPAIR_STAGES.length));
  const rows: Phaser.GameObjects.GameObject[] = [];
  REPAIR_STAGES.forEach((stage, index) => {
    const y = listTop + index * rowGap;
    const value = stageProgress[index] ?? 0;
    const active = index === stageIndex && value < 100;
    const label = scene.add
      .text(-panelWidth / 2 + 28, y, `${stage.id}. ${stage.name}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "13px",
        color: active ? "#1f7a5c" : "#315247",
        fontStyle: active ? "700" : "600",
      })
      .setOrigin(0, 0.5);
    const percent = scene.add
      .text(panelWidth / 2 - 28, y, `${Math.round(value)}%`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: value >= 100 ? "#1f7a5c" : "#6a8177",
        fontStyle: "700",
      })
      .setOrigin(1, 0.5);
    const trackWidth = panelWidth - 172;
    const track = scene.add.rectangle(-panelWidth / 2 + 106, y + 13, trackWidth, 6, 0xe5eee7, 1).setOrigin(0, 0.5);
    const fill = scene.add.rectangle(-panelWidth / 2 + 106, y + 13, trackWidth, 6, value >= 100 ? 0x5d9f5b : 0xffc247, 1)
      .setOrigin(0, 0.5);
    fill.scaleX = value / 100;
    rows.push(label, percent, track, fill);
  });

  const closeButton = createPanelButton(scene, 0, panelHeight / 2 - 34, "关闭", () => {
    layer.destroy(true);
    options.onClose?.();
  });

  panel.add([panelBg, title, summary, visual, overallTrack, overallFill, ...rows, closeButton]);
  panel.setScale(0.94);
  layer.add([blocker, panel]);
  scene.tweens.add({
    targets: panel,
    scaleX: 1,
    scaleY: 1,
    duration: 180,
    ease: "Back.easeOut",
  });

  return layer;
}

function drawIsland(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  stageIndex: number,
  totalPercent: number,
  islandWidth: number,
): void {
  const graphics = scene.add.graphics();
  const stage = Phaser.Math.Clamp(stageIndex, 0, REPAIR_STAGES.length - 1);
  const landColor = stage < 1 ? 0xb8956d : stage < 4 ? 0x97c96d : 0x76be72;
  const shadowAlpha = 0.18 + totalPercent / 900;

  graphics.fillStyle(0x17342d, shadowAlpha);
  graphics.fillEllipse(0, 72, islandWidth * 0.72, 24);
  graphics.fillStyle(0x8d7557, 1);
  graphics.fillTriangle(-islandWidth * 0.32, 30, islandWidth * 0.32, 30, 0, 100);
  graphics.fillStyle(stage < 1 ? 0x7c6650 : 0xa27f5d, 1);
  graphics.fillTriangle(-islandWidth * 0.18, 38, islandWidth * 0.15, 38, -10, 86);
  graphics.fillStyle(landColor, 1);
  graphics.fillEllipse(0, 22, islandWidth, 92);

  if (stage <= 1) {
    graphics.lineStyle(3, 0x6b4f3e, 0.55);
    graphics.lineBetween(-islandWidth * 0.18, 3, -islandWidth * 0.08, 28);
    graphics.lineBetween(islandWidth * 0.08, -5, islandWidth * 0.18, 23);
  }

  if (stage >= 1) {
    graphics.fillStyle(0x5d9f5b, 1);
    graphics.fillEllipse(-islandWidth * 0.18, 10, islandWidth * 0.24, 34);
  }

  if (stage >= 2) {
    graphics.fillStyle(0x8fd5f7, 1);
    graphics.fillEllipse(islandWidth * 0.22, 22, islandWidth * 0.24, 26);
    graphics.fillStyle(0xffffff, 0.38);
    graphics.fillEllipse(islandWidth * 0.16, 17, islandWidth * 0.09, 8);
  }

  if (stage >= 3) {
    [0, 1, 2, 3].forEach((index) => {
      const x = -islandWidth * 0.28 + index * islandWidth * 0.12;
      graphics.fillStyle(0xf0649b, 1);
      graphics.fillCircle(x, -6 + (index % 2) * 10, 6);
      graphics.fillStyle(0xffd76a, 1);
      graphics.fillCircle(x, -6 + (index % 2) * 10, 2);
    });
  }

  if (stage >= 4) {
    drawTree(graphics, -islandWidth * 0.06, -16);
    drawTree(graphics, islandWidth * 0.05, 4);
  }

  if (stage >= 5) {
    graphics.lineStyle(5, 0xffd76a, 0.9);
    graphics.lineBetween(-islandWidth * 0.3, 28, islandWidth * 0.02, 42);
    graphics.fillStyle(0xfff0a6, 1);
    graphics.fillCircle(islandWidth * 0.34, -2, 5);
    graphics.fillCircle(-islandWidth * 0.34, 16, 4);
  }

  if (stage >= 6) {
    graphics.fillStyle(0xd9edf7, 1);
    graphics.fillRoundedRect(islandWidth * 0.02, -32, islandWidth * 0.2, 38, 7);
    graphics.fillStyle(0x8a72f0, 1);
    graphics.fillTriangle(islandWidth * 0.02, -32, islandWidth * 0.22, -32, islandWidth * 0.12, -50);
  }

  if (stage >= 7) {
    graphics.fillStyle(0xffffff, 0.92);
    graphics.fillRoundedRect(-islandWidth * 0.12, -38, islandWidth * 0.26, 46, 8);
    graphics.fillStyle(0xffc247, 1);
    graphics.fillTriangle(-islandWidth * 0.14, -38, islandWidth * 0.16, -38, islandWidth * 0.01, -64);
    graphics.fillStyle(0xf0649b, 1);
    graphics.fillCircle(0, -20, 5);
  }

  container.add(graphics);
}

function drawTree(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
  graphics.fillStyle(0x8d7557, 1);
  graphics.fillRoundedRect(x - 3, y + 8, 6, 22, 3);
  graphics.fillStyle(0x4caf69, 1);
  graphics.fillCircle(x, y, 16);
  graphics.fillStyle(0x76c36d, 1);
  graphics.fillCircle(x - 7, y - 5, 9);
}

function createPanelButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const width = 112;
  const height = 40;
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(0x1f7a5c, 1);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
  bg.lineStyle(2, 0xffffff, 0.26);
  bg.strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 8);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "Microsoft YaHei, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "700",
    })
    .setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  container.on("pointerover", () => container.setScale(1.04));
  container.on("pointerout", () => container.setScale(1));
  container.on("pointerdown", onClick);
  return container;
}
