import Phaser from "phaser";
import { LEVELS } from "../data/levels";
import { Board } from "../match3/Board";
import { BoardResolver } from "../match3/BoardResolver";
import { GoalSystem } from "../match3/GoalSystem";
import { SeasonSystem } from "../match3/SeasonSystem";
import { TerrainSystem } from "../match3/TerrainSystem";
import type { LevelConfig, Position, SpecialKind, Tile } from "../match3/types";

interface LevelSceneData {
  levelIndex?: number;
}

export class LevelScene extends Phaser.Scene {
  private level!: LevelConfig;
  private board!: Board;
  private seasonSystem!: SeasonSystem;
  private terrainSystem!: TerrainSystem;
  private goalSystem!: GoalSystem;
  private resolver!: BoardResolver;
  private movesLeft = 0;
  private score = 0;
  private selected?: Position;
  private busy = false;
  private cellSize = 64;
  private boardOrigin = { x: 0, y: 0 };
  private boardLayer?: Phaser.GameObjects.Container;
  private uiLayer?: Phaser.GameObjects.Container;
  private resultLayer?: Phaser.GameObjects.Container;

  constructor() {
    super("LevelScene");
  }

  init(data: LevelSceneData): void {
    this.level = LEVELS[data.levelIndex ?? 0];
    this.board = new Board(this.level);
    this.seasonSystem = SeasonSystem.fromLevel(this.level);
    this.terrainSystem = new TerrainSystem();
    this.goalSystem = new GoalSystem(this.level.goals);
    this.resolver = new BoardResolver(this.board, this.terrainSystem);
    this.movesLeft = this.level.moves;
    this.score = 0;
    this.selected = undefined;
    this.busy = false;
  }

  create(): void {
    this.scale.on("resize", this.layout, this);
    this.layout();
  }

  private layout(): void {
    this.children.removeAll(true);
    this.drawBackground();
    this.renderUi();
    this.renderBoard();
  }

  private drawBackground(): void {
    const { width, height } = this.scale;
    const headerHeight = this.headerHeight();
    const graphics = this.add.graphics();
    graphics.fillStyle(0xeaf5f0, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0xcfe8f7, 1);
    graphics.fillRect(0, 0, width, headerHeight);
    graphics.fillStyle(0xeff7ea, 1);
    graphics.fillRect(0, height - 72, width, 72);
  }

  private renderUi(): void {
    this.uiLayer?.destroy(true);
    this.uiLayer = this.add.container(0, 0);
    const { width, height } = this.scale;
    const season = this.seasonSystem.current;
    const compact = width < 620;

    const title = this.add
      .text(18, 16, `${this.level.id}. ${this.level.name}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: compact ? "18px" : "20px",
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(0, 0);

    const scoreText = this.add
      .text(width - 18, 17, `${this.score}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "24px",
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(1, 0);

    const movesBadge = this.createBadge(18, 56, compact ? 96 : 104, 36, 0x24483d, `步数 ${this.movesLeft}`);
    const seasonBadge = this.createBadge(
      compact ? 124 : 132,
      56,
      compact ? 110 : 132,
      36,
      season.color,
      `${season.shortLabel}季 ${this.seasonSystem.movesUntilNextSeason}`,
    );

    const goalStates = this.goalSystem.states();
    const goalItems = goalStates.map((goal, index) => {
      const text = `${goal.label} ${goal.current}/${goal.target}`;
      const goalWidth = compact ? Math.floor((width - 46) / Math.max(goalStates.length, 1)) : 112;
      const x = compact ? 18 + index * (goalWidth + 10) : Math.min(278, width * 0.46) + index * 122;
      const y = compact ? 98 : 56;
      return this.createBadge(x, y, goalWidth, 36, goal.complete ? 0x5d9f5b : 0xffffff, text, goal.complete ? "#ffffff" : "#315247");
    });

    const resetButton = this.createSmallButton(width - 72, height - 42, "重来", () => this.scene.restart({ levelIndex: LEVELS.indexOf(this.level) }));
    const homeButton = this.createSmallButton(72, height - 42, "主页", () => this.scene.start("HomeScene"));

    this.uiLayer.add([title, scoreText, movesBadge, seasonBadge, ...goalItems, resetButton, homeButton]);
  }

  private createBadge(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    label: string,
    textColor = "#ffffff",
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    graphics.fillStyle(color, color === 0xffffff ? 0.92 : 1);
    graphics.fillRoundedRect(0, 0, width, height, 8);
    graphics.lineStyle(1, 0x1f3c33, color === 0xffffff ? 0.14 : 0.08);
    graphics.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, 8);

    const text = this.add
      .text(width / 2, height / 2, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "15px",
        color: textColor,
        fontStyle: "700",
      })
      .setOrigin(0.5);

    container.add([graphics, text]);
    return container;
  }

  private createSmallButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 86;
    const height = 40;
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    graphics.lineStyle(1, 0x1f3c33, 0.16);
    graphics.strokeRoundedRect(-width / 2 + 0.5, -height / 2 + 0.5, width - 1, height - 1, 8);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "16px",
        color: "#315247",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    container.add([graphics, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerover", () => container.setScale(1.04));
    container.on("pointerout", () => container.setScale(1));
    container.on("pointerdown", onClick);
    return container;
  }

  private renderBoard(): void {
    this.boardLayer?.destroy(true);
    this.boardLayer = this.add.container(0, 0);

    const { width, height } = this.scale;
    const headerHeight = this.headerHeight();
    const footerHeight = 72;
    const maxBoardWidth = Math.min(width - 28, 620);
    const maxBoardHeight = Math.max(260, height - headerHeight - footerHeight - 26);
    this.cellSize = Math.floor(Math.min(maxBoardWidth / this.board.width, maxBoardHeight / this.board.height));
    this.boardOrigin = {
      x: Math.floor((width - this.cellSize * this.board.width) / 2),
      y: Math.floor(headerHeight + 12 + (maxBoardHeight - this.cellSize * this.board.height) / 2),
    };

    for (let y = 0; y < this.board.height; y += 1) {
      for (let x = 0; x < this.board.width; x += 1) {
        this.renderCell({ x, y });
      }
    }
  }

  private renderCell(position: Position): void {
    const cell = this.board.cellAt(position);
    const center = this.centerOf(position);
    const cellImage = this.add.image(center.x, center.y, `cell-${cell.terrain}`).setDisplaySize(this.cellSize - 3, this.cellSize - 3);
    this.boardLayer?.add(cellImage);

    if (cell.tile) {
      this.renderTile(position, cell.tile);
    }

    if (cell.obstacle?.type === "ice") {
      const ice = this.add.image(center.x, center.y, "ice-overlay").setDisplaySize(this.cellSize - 5, this.cellSize - 5);
      this.boardLayer?.add(ice);

      if (cell.obstacle.hp > 1) {
        const hp = this.add
          .text(center.x, center.y + this.cellSize * 0.24, `${cell.obstacle.hp}`, {
            fontFamily: "Arial, sans-serif",
            fontSize: `${Math.max(12, this.cellSize * 0.24)}px`,
            color: "#27617f",
            fontStyle: "700",
          })
          .setOrigin(0.5);
        this.boardLayer?.add(hp);
      }
    }

    if (this.selected?.x === position.x && this.selected.y === position.y) {
      const selected = this.add.graphics();
      selected.lineStyle(4, 0x1f7a5c, 1);
      selected.strokeRoundedRect(
        center.x - this.cellSize / 2 + 3,
        center.y - this.cellSize / 2 + 3,
        this.cellSize - 6,
        this.cellSize - 6,
        8,
      );
      this.boardLayer?.add(selected);
    }
  }

  private renderTile(position: Position, tile: Tile): void {
    const center = this.centerOf(position);
    const tileImage = this.add
      .image(center.x, center.y, `tile-${tile.kind}`)
      .setDisplaySize(this.cellSize * 0.82, this.cellSize * 0.82)
      .setInteractive({ useHandCursor: true });

    tileImage.on("pointerdown", () => this.handleTileClick(position));
    this.boardLayer?.add(tileImage);

    if (tile.special) {
      this.renderSpecialMark(center, tile.special);
    }
  }

  private renderSpecialMark(center: Position, special: SpecialKind): void {
    const graphics = this.add.graphics();
    const size = this.cellSize;
    graphics.lineStyle(Math.max(3, size * 0.06), 0x1f3c33, 0.8);

    if (special === "row") {
      graphics.lineBetween(center.x - size * 0.22, center.y, center.x + size * 0.22, center.y);
    }

    if (special === "column") {
      graphics.lineBetween(center.x, center.y - size * 0.22, center.x, center.y + size * 0.22);
    }

    if (special === "bomb") {
      graphics.strokeCircle(center.x, center.y, size * 0.22);
    }

    if (special === "rainbow") {
      graphics.lineStyle(Math.max(2, size * 0.045), 0xffffff, 0.95);
      graphics.strokeCircle(center.x, center.y, size * 0.24);
      graphics.lineStyle(Math.max(2, size * 0.045), 0x1f3c33, 0.75);
      graphics.strokeCircle(center.x, center.y, size * 0.31);
    }

    this.boardLayer?.add(graphics);
  }

  private handleTileClick(position: Position): void {
    if (this.busy || this.resultLayer) {
      return;
    }

    if (!this.selected) {
      this.selected = position;
      this.renderBoard();
      return;
    }

    if (this.selected.x === position.x && this.selected.y === position.y) {
      this.selected = undefined;
      this.renderBoard();
      return;
    }

    if (!this.board.areAdjacent(this.selected, position)) {
      this.selected = position;
      this.renderBoard();
      return;
    }

    this.resolveMove(this.selected, position);
  }

  private resolveMove(from: Position, to: Position): void {
    this.busy = true;
    const summary = this.resolver.trySwapAndResolve(from, to, this.seasonSystem.current);
    this.selected = undefined;

    if (!summary.accepted) {
      this.cameras.main.shake(100, 0.004);
      this.busy = false;
      this.renderBoard();
      return;
    }

    this.movesLeft -= 1;
    this.score += summary.scoreGained;
    this.goalSystem.recordCollection(summary.collected);
    this.goalSystem.recordTerrain(summary.terrainCreated);
    this.seasonSystem.advanceMove();

    this.time.delayedCall(120, () => {
      this.busy = false;
      this.renderUi();
      this.renderBoard();
      this.checkResult();
    });
  }

  private checkResult(): void {
    if (this.goalSystem.isComplete) {
      this.showResult(true);
      return;
    }

    if (this.movesLeft <= 0) {
      this.showResult(false);
    }
  }

  private showResult(won: boolean): void {
    const { width, height } = this.scale;
    this.resultLayer?.destroy(true);
    this.resultLayer = this.add.container(0, 0);

    const blocker = this.add.rectangle(0, 0, width, height, 0x17342d, 0.36).setOrigin(0, 0);
    const panelWidth = Math.min(width - 36, 360);
    const panelHeight = 220;
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.98);
    graphics.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    graphics.lineStyle(1, 0x1f3c33, 0.12);
    graphics.strokeRoundedRect(-panelWidth / 2 + 0.5, -panelHeight / 2 + 0.5, panelWidth - 1, panelHeight - 1, 8);

    const title = this.add
      .text(0, -68, won ? "浮岛复苏" : "还差一点", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "28px",
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    const score = this.add
      .text(0, -20, `得分 ${this.score}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "20px",
        color: "#4b6b5f",
      })
      .setOrigin(0.5);

    const action = this.createSmallButton(0, 48, won ? "再玩一关" : "重试", () => {
      const currentIndex = LEVELS.indexOf(this.level);
      const nextIndex = won ? (currentIndex + 1) % LEVELS.length : currentIndex;
      this.scene.restart({ levelIndex: nextIndex });
    });

    const panel = this.add.container(width / 2, height / 2, [graphics, title, score, action]);
    this.resultLayer.add([blocker, panel]);
  }

  private centerOf(position: Position): Position {
    return {
      x: this.boardOrigin.x + position.x * this.cellSize + this.cellSize / 2,
      y: this.boardOrigin.y + position.y * this.cellSize + this.cellSize / 2,
    };
  }

  private headerHeight(): number {
    return this.scale.width < 620 ? 146 : 112;
  }
}
