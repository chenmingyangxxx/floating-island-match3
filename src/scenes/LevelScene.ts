import Phaser from "phaser";
import { LEVELS } from "../data/levels";
import { Board } from "../match3/Board";
import { BoardResolver, type ResolveSummary, type ResolveStep } from "../match3/BoardResolver";
import { GoalSystem } from "../match3/GoalSystem";
import { SeasonSystem } from "../match3/SeasonSystem";
import { TerrainSystem } from "../match3/TerrainSystem";
import type {
  CountByTile,
  LevelConfig,
  Position,
  SpecialKind,
  Tile,
  TileKind,
} from "../match3/types";

interface LevelSceneData {
  levelIndex?: number;
}

interface DragCandidate {
  position: Position;
  x: number;
  y: number;
}

const tileFeedbackColors: Record<TileKind, number> = {
  water: 0x43a6e8,
  sun: 0xffc247,
  leaf: 0x4caf69,
  flower: 0xf0649b,
  soil: 0xad7a52,
  stardust: 0x8a72f0,
};

const tileLabels: Record<TileKind, string> = {
  water: "水滴",
  sun: "阳光",
  leaf: "叶子",
  flower: "花朵",
  soil: "土壤",
  stardust: "星尘",
};

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
  private feedbackLayer?: Phaser.GameObjects.Container;
  private resultLayer?: Phaser.GameObjects.Container;
  private tileViews = new Map<string, Phaser.GameObjects.Container>();
  private goalBadges: Phaser.GameObjects.Container[] = [];
  private movesBadge?: Phaser.GameObjects.Container;
  private scoreText?: Phaser.GameObjects.Text;
  private settleNextBoardRender = false;
  private dragCandidate?: DragCandidate;

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
    this.dragCandidate = undefined;
    this.tileViews.clear();
    this.goalBadges = [];
  }

  create(): void {
    this.scale.on("resize", this.layout, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.layout();
  }

  private layout(): void {
    this.children.removeAll(true);
    this.tileViews.clear();
    this.drawBackground();
    this.renderBoard();
    this.renderUi();
    this.feedbackLayer = this.add.container(0, 0).setDepth(40);
  }

  private drawBackground(): void {
    const { width, height } = this.scale;
    const headerHeight = this.headerHeight();
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0xeaf5f0, 0xeaf5f0, 0xd9edf7, 0xf5f0dc, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0xcfe8f7, 1);
    graphics.fillRect(0, 0, width, headerHeight);
    graphics.fillStyle(0xffffff, 0.26);
    graphics.fillEllipse(width * 0.78, headerHeight - 18, Math.min(360, width * 0.7), 86);
    graphics.fillStyle(0xeff7ea, 1);
    graphics.fillRect(0, height - 72, width, 72);
  }

  private renderUi(): void {
    this.uiLayer?.destroy(true);
    this.uiLayer = this.add.container(0, 0).setDepth(30);
    this.goalBadges = [];
    const { width, height } = this.scale;
    const compact = width < 620;
    const movesWidth = compact ? 96 : 110;

    const title = this.add
      .text(18, 16, `${this.level.id}. ${this.level.name}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: compact ? "18px" : "20px",
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(0, 0);

    this.scoreText = this.add
      .text(width - 18, 17, `得分 ${this.score}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: compact ? "20px" : "24px",
        color: "#1f3c33",
        fontStyle: "700",
      })
      .setOrigin(1, 0);

    this.movesBadge = this.createBadge(18, 56, movesWidth, 40, 0x24483d, `步数 ${this.movesLeft}`);

    const goalStates = this.goalSystem.states();
    const goalItems = goalStates.map((goal, index) => {
      const text = `${goal.label} ${goal.current}/${goal.target}`;
      const goalGap = compact ? 8 : 10;
      const goalWidth = compact
        ? Math.floor((width - 36 - movesWidth - goalGap * goalStates.length) / Math.max(goalStates.length, 1))
        : 120;
      const x = compact
        ? 18 + movesWidth + goalGap + index * (goalWidth + goalGap)
        : 144 + index * (goalWidth + goalGap);
      const y = 56;
      const badge = this.createBadge(
        x,
        y,
        goalWidth,
        40,
        goal.complete ? 0x5d9f5b : 0xffffff,
        text,
        goal.complete ? "#ffffff" : "#315247",
      );
      this.goalBadges.push(badge);
      return badge;
    });

    const resetButton = this.createSmallButton(width - 72, height - 42, "重来", () =>
      this.scene.restart({ levelIndex: LEVELS.indexOf(this.level) }),
    );
    const homeButton = this.createSmallButton(72, height - 42, "主页", () => this.scene.start("HomeScene"));

    this.uiLayer.add([
      title,
      this.scoreText,
      this.movesBadge,
      ...goalItems,
      resetButton,
      homeButton,
    ]);
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
    graphics.fillStyle(color, color === 0xffffff ? 0.94 : 1);
    graphics.fillRoundedRect(0, 0, width, height, 8);
    graphics.lineStyle(1, 0x1f3c33, color === 0xffffff ? 0.14 : 0.08);
    graphics.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, 8);

    const fontSize = label.length > 9 && width < 112 ? 13 : 15;
    const text = this.add
      .text(width / 2, height / 2, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: `${fontSize}px`,
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
    graphics.fillStyle(0xffffff, 0.92);
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
    this.boardLayer = this.add.container(0, 0).setDepth(10);
    this.tileViews.clear();

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

    this.renderBoardFrame();

    for (let y = 0; y < this.board.height; y += 1) {
      for (let x = 0; x < this.board.width; x += 1) {
        this.renderCell({ x, y });
      }
    }

    this.settleNextBoardRender = false;
  }

  private renderBoardFrame(): void {
    const graphics = this.add.graphics();
    const width = this.cellSize * this.board.width;
    const height = this.cellSize * this.board.height;
    graphics.fillStyle(0x17342d, 0.08);
    graphics.fillRoundedRect(this.boardOrigin.x - 8, this.boardOrigin.y - 4, width + 16, height + 18, 8);
    graphics.fillStyle(0xffffff, 0.28);
    graphics.fillRoundedRect(this.boardOrigin.x - 6, this.boardOrigin.y - 8, width + 12, height + 12, 8);
    this.boardLayer?.add(graphics);
  }

  private renderCell(position: Position): void {
    const cell = this.board.cellAt(position);
    const center = this.centerOf(position);
    const cellImage = this.add
      .image(center.x, center.y, `cell-${cell.terrain}`)
      .setDisplaySize(this.cellSize - 3, this.cellSize - 3);
    this.boardLayer?.add(cellImage);

    if (cell.tile) {
      this.renderTile(position, cell.tile);
    }

    if (cell.obstacle?.type === "ice") {
      const ice = this.add
        .image(center.x, center.y, "ice-overlay")
        .setDisplaySize(this.cellSize - 5, this.cellSize - 5);
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
      this.tweens.add({
        targets: selected,
        alpha: 0.35,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private renderTile(position: Position, tile: Tile): void {
    const center = this.centerOf(position);
    const container = this.add.container(center.x, center.y);
    const tileSize = this.cellSize * 0.82;
    const shadow = this.add.rectangle(2, 4, tileSize * 0.86, tileSize * 0.86, 0x17342d, 0.14);
    shadow.setOrigin(0.5);

    const tileImage = this.add.image(0, 0, `tile-${tile.kind}`).setDisplaySize(tileSize, tileSize);
    container.add([shadow, tileImage]);

    if (tile.special) {
      container.add(this.createSpecialMark(tile.special));
    }

    container.setSize(this.cellSize, this.cellSize);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleTilePointerDown(position, pointer));
    container.on("pointerover", () => {
      if (!this.busy) {
        container.setScale(1.04);
      }
    });
    container.on("pointerout", () => {
      if (!this.busy) {
        container.setScale(1);
      }
    });

    if (this.settleNextBoardRender) {
      container.setAlpha(0);
      container.setScale(0.9);
      container.y -= this.cellSize * 0.2;
      this.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: center.y,
        duration: 170,
        delay: position.y * 18,
        ease: "Back.easeOut",
      });
    }

    this.boardLayer?.add(container);
    this.tileViews.set(this.board.keyOf(position), container);
  }

  private handleTilePointerDown(position: Position, pointer: Phaser.Input.Pointer): void {
    if (this.busy || this.resultLayer) {
      return;
    }

    this.dragCandidate = {
      position,
      x: pointer.x,
      y: pointer.y,
    };
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const candidate = this.dragCandidate;
    this.dragCandidate = undefined;

    if (!candidate || this.busy || this.resultLayer) {
      return;
    }

    const deltaX = pointer.x - candidate.x;
    const deltaY = pointer.y - candidate.y;
    const threshold = Math.max(18, this.cellSize * 0.26);

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) {
      this.handleTileClick(candidate.position);
      return;
    }

    const target =
      Math.abs(deltaX) > Math.abs(deltaY)
        ? { x: candidate.position.x + Math.sign(deltaX), y: candidate.position.y }
        : { x: candidate.position.x, y: candidate.position.y + Math.sign(deltaY) };

    if (!this.board.inBounds(target) || !this.board.tileAt(target)) {
      this.selected = undefined;
      this.flashCells([candidate.position], 0xd65050);
      this.showPenaltyToast();
      return;
    }

    this.selected = undefined;
    void this.resolveMove(candidate.position, target);
  }

  private createSpecialMark(special: SpecialKind): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    const size = this.cellSize;
    graphics.lineStyle(Math.max(3, size * 0.06), 0x1f3c33, 0.8);

    if (special === "row") {
      graphics.lineBetween(-size * 0.22, 0, size * 0.22, 0);
    }

    if (special === "column") {
      graphics.lineBetween(0, -size * 0.22, 0, size * 0.22);
    }

    if (special === "bomb") {
      graphics.strokeCircle(0, 0, size * 0.22);
    }

    if (special === "rainbow") {
      graphics.lineStyle(Math.max(2, size * 0.045), 0xffffff, 0.95);
      graphics.strokeCircle(0, 0, size * 0.24);
      graphics.lineStyle(Math.max(2, size * 0.045), 0x1f3c33, 0.75);
      graphics.strokeCircle(0, 0, size * 0.31);
    }

    return graphics;
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

    void this.resolveMove(this.selected, position);
  }

  private async resolveMove(from: Position, to: Position): Promise<void> {
    this.busy = true;
    this.selected = undefined;
    const summary = this.resolver.trySwapAndResolve(from, to, this.seasonSystem.current);

    if (!summary.accepted) {
      await this.animateRejectedSwap(from, to);
      this.busy = false;
      this.renderBoard();
      return;
    }

    await this.animateAcceptedSwap(from, to);
    await this.playResolutionFeedback(summary);

    this.movesLeft -= 1;
    this.score += summary.scoreGained;
    this.goalSystem.recordCollection(summary.collected);
    this.goalSystem.recordTerrain(summary.terrainCreated);

    this.settleNextBoardRender = true;
    this.renderBoard();
    this.renderUi();
    this.pulseProgress(summary);
    this.showRewardToast(summary);

    if (this.movesLeft <= 5 && !this.goalSystem.isComplete) {
      this.showFloatingText(this.scale.width / 2, this.headerHeight() + 16, "步数告急", 0xd76d33);
    }

    this.time.delayedCall(260, () => {
      this.busy = false;
      this.checkResult();
    });
  }

  private async animateAcceptedSwap(from: Position, to: Position): Promise<void> {
    const fromView = this.tileViews.get(this.board.keyOf(from));
    const toView = this.tileViews.get(this.board.keyOf(to));
    const fromCenter = this.centerOf(from);
    const toCenter = this.centerOf(to);

    if (!fromView || !toView) {
      return;
    }

    fromView.setDepth(6);
    toView.setDepth(6);
    await Promise.all([
      this.tweenTo(fromView, {
        x: toCenter.x,
        y: toCenter.y,
        duration: 145,
        ease: "Cubic.easeOut",
      }),
      this.tweenTo(toView, {
        x: fromCenter.x,
        y: fromCenter.y,
        duration: 145,
        ease: "Cubic.easeOut",
      }),
    ]);

    this.tileViews.set(this.board.keyOf(from), toView);
    this.tileViews.set(this.board.keyOf(to), fromView);
  }

  private async animateRejectedSwap(from: Position, to: Position): Promise<void> {
    const fromView = this.tileViews.get(this.board.keyOf(from));
    const toView = this.tileViews.get(this.board.keyOf(to));
    const fromCenter = this.centerOf(from);
    const toCenter = this.centerOf(to);
    const midpoint = {
      x: (fromCenter.x + toCenter.x) / 2,
      y: (fromCenter.y + toCenter.y) / 2,
    };

    if (fromView && toView) {
      await Promise.all([
        this.tweenTo(fromView, {
          x: toCenter.x,
          y: toCenter.y,
          duration: 95,
          ease: "Cubic.easeOut",
        }),
        this.tweenTo(toView, {
          x: fromCenter.x,
          y: fromCenter.y,
          duration: 95,
          ease: "Cubic.easeOut",
        }),
      ]);
      await Promise.all([
        this.tweenTo(fromView, {
          x: fromCenter.x,
          y: fromCenter.y,
          duration: 135,
          ease: "Back.easeOut",
        }),
        this.tweenTo(toView, {
          x: toCenter.x,
          y: toCenter.y,
          duration: 135,
          ease: "Back.easeOut",
        }),
      ]);
    }

    this.cameras.main.shake(120, 0.004);
    this.flashCells([from, to], 0xd65050);
    this.showPenaltyToast();
    this.showFloatingText(midpoint.x, midpoint.y - this.cellSize * 0.45, "不扣步数", 0xd65050);
    await this.delay(180);
  }

  private async playResolutionFeedback(summary: ResolveSummary): Promise<void> {
    const firstStep = summary.steps[0];
    if (!firstStep) {
      return;
    }

    this.flashCells(firstStep.clearedTiles.map((cleared) => cleared.position), 0xfff0a6);
    await this.animateSpecialEffects(firstStep);
    await this.animateClearedTiles(firstStep);

    if (summary.chains > 1) {
      this.showComboBanner(`连锁 x${summary.chains}`, 0xd56f35);
      this.cameras.main.shake(140, 0.0025);
      await this.delay(180);
    }

    if (summary.specialsCreated > 0) {
      this.showComboBanner(`特殊棋子 +${summary.specialsCreated}`, 0x7e68d6);
      await this.delay(120);
    }
  }

  private async animateSpecialEffects(step: ResolveStep): Promise<void> {
    const triggeredSpecials = step.clearedTiles.filter((cleared) => cleared.tile.special);
    if (triggeredSpecials.length === 0 && step.specialPlacements.length === 0) {
      return;
    }

    for (const cleared of triggeredSpecials) {
      this.renderSpecialEffect(cleared.position, cleared.tile.special);
    }

    for (const placement of step.specialPlacements) {
      const center = this.centerOf(placement.position);
      this.showFloatingText(center.x, center.y - this.cellSize * 0.5, "合成!", 0x7e68d6);
    }

    await this.delay(160);
  }

  private renderSpecialEffect(position: Position, special?: SpecialKind): void {
    if (!special) {
      return;
    }

    const layer = this.ensureFeedbackLayer();
    const center = this.centerOf(position);
    const boardWidth = this.cellSize * this.board.width;
    const boardHeight = this.cellSize * this.board.height;

    if (special === "row" || special === "column") {
      const beam = this.add.rectangle(
        special === "row" ? this.boardOrigin.x + boardWidth / 2 : center.x,
        special === "row" ? center.y : this.boardOrigin.y + boardHeight / 2,
        special === "row" ? boardWidth : Math.max(12, this.cellSize * 0.18),
        special === "row" ? Math.max(12, this.cellSize * 0.18) : boardHeight,
        0xffffff,
        0.74,
      );
      layer.add(beam);
      this.tweens.add({
        targets: beam,
        alpha: 0,
        scaleX: special === "row" ? 1.04 : 1.7,
        scaleY: special === "row" ? 1.7 : 1.04,
        duration: 240,
        ease: "Cubic.easeOut",
        onComplete: () => beam.destroy(),
      });
    }

    if (special === "bomb") {
      const blast = this.add.circle(center.x, center.y, this.cellSize * 0.3, 0xffe07d, 0.45);
      layer.add(blast);
      this.tweens.add({
        targets: blast,
        radius: this.cellSize * 1.9,
        alpha: 0,
        duration: 280,
        ease: "Cubic.easeOut",
        onComplete: () => blast.destroy(),
      });
    }

    if (special === "rainbow") {
      const flash = this.add.rectangle(
        this.boardOrigin.x + boardWidth / 2,
        this.boardOrigin.y + boardHeight / 2,
        boardWidth,
        boardHeight,
        0xffffff,
        0.3,
      );
      layer.add(flash);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 320,
        ease: "Sine.easeOut",
        onComplete: () => flash.destroy(),
      });
      this.showComboBanner("全屏共鸣", 0x7e68d6);
    }
  }

  private async animateClearedTiles(step: ResolveStep): Promise<void> {
    const layer = this.ensureFeedbackLayer();
    const positions = this.uniquePositions(step.clearedTiles.map((cleared) => cleared.position));
    const center = this.averageCenter(positions);

    for (const cleared of step.clearedTiles) {
      const position = cleared.position;
      const view = this.tileViews.get(this.board.keyOf(position));
      const cellCenter = this.centerOf(position);
      const color = tileFeedbackColors[cleared.tile.kind];
      this.burstParticles(cellCenter, color);

      const ring = this.add.graphics();
      ring.setPosition(cellCenter.x, cellCenter.y);
      ring.lineStyle(4, color, 0.95);
      ring.strokeRoundedRect(
        -this.cellSize / 2 + 5,
        -this.cellSize / 2 + 5,
        this.cellSize - 10,
        this.cellSize - 10,
        8,
      );
      layer.add(ring);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.22,
        scaleY: 1.22,
        duration: 260,
        ease: "Cubic.easeOut",
        onComplete: () => ring.destroy(),
      });

      if (view) {
        view.disableInteractive();
        this.tweens.add({
          targets: view,
          alpha: 0,
          scaleX: 1.22,
          scaleY: 1.22,
          angle: Phaser.Math.Between(-5, 5),
          duration: 230,
          ease: "Back.easeIn",
        });
      }
    }

    this.showFloatingText(center.x, center.y - this.cellSize * 0.35, `+${step.scoreGained}`, 0x1f7a5c);
    await this.delay(270);
  }

  private flashCells(positions: Position[], color: number): void {
    const layer = this.ensureFeedbackLayer();
    for (const position of this.uniquePositions(positions)) {
      const center = this.centerOf(position);
      const flash = this.add.graphics();
      flash.setPosition(center.x, center.y);
      flash.fillStyle(color, 0.24);
      flash.fillRoundedRect(
        -this.cellSize / 2 + 4,
        -this.cellSize / 2 + 4,
        this.cellSize - 8,
        this.cellSize - 8,
        8,
      );
      layer.add(flash);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => flash.destroy(),
      });
    }
  }

  private burstParticles(center: Position, color: number): void {
    const layer = this.ensureFeedbackLayer();
    const count = 7;

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.3;
      const distance = this.cellSize * Phaser.Math.FloatBetween(0.28, 0.58);
      const dot = this.add.circle(center.x, center.y, Math.max(2, this.cellSize * 0.045), color, 0.92);
      layer.add(dot);
      this.tweens.add({
        targets: dot,
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: 330,
        ease: "Cubic.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private showRewardToast(summary: ResolveSummary): void {
    const chips = [`+${summary.scoreGained} 分`];
    chips.push(...this.formatTileCounts(summary.collected));

    if (summary.chains > 1) {
      chips.push(`连消 x${summary.chains}`);
    }

    if (summary.specialsCreated > 0) {
      chips.push(`特殊棋子 +${summary.specialsCreated}`);
    }

    const layer = this.ensureFeedbackLayer();
    const width = Math.min(this.scale.width - 32, 360);
    const height = 42 + Math.max(0, Math.ceil((chips.length - 1) / 2)) * 24;
    const x = this.scale.width / 2;
    const y = Math.max(this.headerHeight() + 10, this.boardOrigin.y - 40);
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x17342d, 0.82);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(1, 0xffffff, 0.22);
    bg.strokeRoundedRect(-width / 2 + 0.5, -height / 2 + 0.5, width - 1, height - 1, 8);
    container.add(bg);

    chips.slice(0, 5).forEach((chip, index) => {
      const row = Math.floor(index / 2);
      const column = index % 2;
      const chipX = index === 0 ? 0 : (column === 0 ? -width * 0.24 : width * 0.24);
      const chipY = index === 0 ? -height / 2 + 18 : -height / 2 + 42 + row * 22;
      const text = this.add
        .text(chipX, chipY, chip, {
          fontFamily: "Microsoft YaHei, sans-serif",
          fontSize: index === 0 ? "18px" : "14px",
          color: index === 0 ? "#fff0a6" : "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5);
      container.add(text);
    });

    container.setScale(0.92);
    layer.add(container);
    this.tweens.add({
      targets: container,
      y: y - 18,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      delay: 1000,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => container.destroy(),
    });
  }

  private showPenaltyToast(): void {
    const layer = this.ensureFeedbackLayer();
    const width = Math.min(this.scale.width - 32, 300);
    const height = 54;
    const x = this.scale.width / 2;
    const y = Math.max(this.headerHeight() + 16, this.boardOrigin.y - 28);
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0xd65050, 0.92);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, 0xffffff, 0.32);
    bg.strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2, 8);
    const title = this.add
      .text(0, -9, "无效交换", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    const detail = this.add
      .text(0, 13, "没有形成三连，不消耗步数", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "13px",
        color: "#fff7f4",
      })
      .setOrigin(0.5);

    container.add([bg, title, detail]);
    container.setScale(0.94);
    layer.add(container);
    this.tweens.add({
      targets: container,
      y: y - 12,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      delay: 1600,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => container.destroy(),
    });
  }

  private showComboBanner(label: string, color: number): void {
    const layer = this.ensureFeedbackLayer();
    const x = this.scale.width / 2;
    const y = this.boardOrigin.y + this.cellSize * this.board.height * 0.18;
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-92, -24, 184, 48, 8);
    bg.lineStyle(2, 0xffffff, 0.36);
    bg.strokeRoundedRect(-91, -23, 182, 46, 8);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setScale(0.78);
    layer.add(container);
    this.tweens.add({
      targets: container,
      scaleX: 1.04,
      scaleY: 1.04,
      y: y - 18,
      alpha: 0,
      delay: 500,
      duration: 900,
      ease: "Back.easeOut",
      onComplete: () => container.destroy(),
    });
  }

  private showFloatingText(x: number, y: number, label: string, color: number): void {
    const layer = this.ensureFeedbackLayer();
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "20px",
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        fontStyle: "700",
        stroke: "#ffffff",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    layer.add(text);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      delay: 350,
      duration: 1100,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  private pulseProgress(summary: ResolveSummary): void {
    this.pulse(this.scoreText);
    this.pulse(this.movesBadge);

    if (Object.keys(summary.collected).length > 0 || Object.keys(summary.terrainCreated).length > 0) {
      for (const badge of this.goalBadges) {
        this.pulse(badge);
      }
    }
  }

  private pulse(target?: Phaser.GameObjects.GameObject): void {
    if (!target) {
      return;
    }

    this.tweens.add({
      targets: target,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
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
    this.resultLayer = this.add.container(0, 0).setDepth(50);

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

  private formatTileCounts(counts: CountByTile): string[] {
    return Object.entries(counts)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([kind, count]) => `${tileLabels[kind as TileKind]} +${count}`);
  }

  private uniquePositions(positions: Position[]): Position[] {
    const seen = new Set<string>();
    const unique: Position[] = [];

    for (const position of positions) {
      const key = this.board.keyOf(position);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(position);
    }

    return unique;
  }

  private averageCenter(positions: Position[]): Position {
    if (positions.length === 0) {
      return {
        x: this.boardOrigin.x + (this.cellSize * this.board.width) / 2,
        y: this.boardOrigin.y + (this.cellSize * this.board.height) / 2,
      };
    }

    const centers = positions.map((position) => this.centerOf(position));
    return {
      x: centers.reduce((sum, center) => sum + center.x, 0) / centers.length,
      y: centers.reduce((sum, center) => sum + center.y, 0) / centers.length,
    };
  }

  private centerOf(position: Position): Position {
    return {
      x: this.boardOrigin.x + position.x * this.cellSize + this.cellSize / 2,
      y: this.boardOrigin.y + position.y * this.cellSize + this.cellSize / 2,
    };
  }

  private headerHeight(): number {
    return 112;
  }

  private ensureFeedbackLayer(): Phaser.GameObjects.Container {
    if (!this.feedbackLayer || !this.feedbackLayer.active) {
      this.feedbackLayer = this.add.container(0, 0).setDepth(40);
    }

    return this.feedbackLayer;
  }

  private tweenTo(
    target: Phaser.GameObjects.GameObject,
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets" | "onComplete">,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        ...config,
        targets: target,
        onComplete: () => resolve(),
      });
    });
  }

  private delay(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(duration, () => resolve());
    });
  }
}
