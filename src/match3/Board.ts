import type { Cell, LevelConfig, Position, Tile, TileKind } from "./types";

const directions: Position[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export class Board {
  readonly width: number;
  readonly height: number;
  readonly cells: Cell[];
  readonly availableTiles: TileKind[];
  private nextTileId = 1;

  constructor(level: LevelConfig) {
    this.width = level.boardWidth;
    this.height = level.boardHeight;
    this.availableTiles = level.availableTiles;
    this.cells = Array.from({ length: this.width * this.height }, () => ({
      terrain: "barren",
      tile: null,
    }));

    for (const obstacle of level.obstacles ?? []) {
      for (const [x, y] of obstacle.positions) {
        if (!this.inBounds({ x, y })) {
          continue;
        }

        this.cellAt({ x, y }).obstacle = {
          type: obstacle.type,
          hp: obstacle.hp,
          maxHp: obstacle.hp,
        };
      }
    }

    this.fillInitialTiles();
  }

  inBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height
    );
  }

  keyOf(position: Position): string {
    return `${position.x},${position.y}`;
  }

  positionFromKey(key: string): Position {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  }

  cellAt(position: Position): Cell {
    return this.cells[position.y * this.width + position.x];
  }

  tileAt(position: Position): Tile | null {
    if (!this.inBounds(position)) {
      return null;
    }

    return this.cellAt(position).tile;
  }

  setTile(position: Position, tile: Tile | null): void {
    this.cellAt(position).tile = tile;
  }

  areAdjacent(a: Position, b: Position): boolean {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  neighborsOf(position: Position): Position[] {
    return directions
      .map((direction) => ({
        x: position.x + direction.x,
        y: position.y + direction.y,
      }))
      .filter((candidate) => this.inBounds(candidate));
  }

  swap(a: Position, b: Position): void {
    const first = this.tileAt(a);
    const second = this.tileAt(b);
    this.setTile(a, second);
    this.setTile(b, first);
  }

  createTile(kind: TileKind, special?: Tile["special"]): Tile {
    return {
      id: this.nextTileId++,
      kind,
      special,
    };
  }

  createRandomTile(): Tile {
    const index = Math.floor(Math.random() * this.availableTiles.length);
    return this.createTile(this.availableTiles[index]);
  }

  refillColumns(): void {
    for (let x = 0; x < this.width; x += 1) {
      const existing: Tile[] = [];

      for (let y = this.height - 1; y >= 0; y -= 1) {
        const position = { x, y };
        const cell = this.cellAt(position);
        if (cell.obstacle?.type === "stone") {
          continue;
        }

        if (cell.tile) {
          existing.push(cell.tile);
          cell.tile = null;
        }
      }

      for (let y = this.height - 1; y >= 0; y -= 1) {
        const position = { x, y };
        const cell = this.cellAt(position);
        if (cell.obstacle?.type === "stone") {
          continue;
        }

        cell.tile = existing.shift() ?? this.createRandomTile();
      }
    }
  }

  clearPositions(positions: Position[]): void {
    for (const position of positions) {
      if (this.inBounds(position)) {
        this.setTile(position, null);
      }
    }
  }

  private fillInitialTiles(): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const position = { x, y };
        if (this.cellAt(position).obstacle?.type === "stone") {
          continue;
        }

        this.setTile(position, this.createTile(this.pickInitialKind(position)));
      }
    }
  }

  private pickInitialKind(position: Position): TileKind {
    const shuffled = [...this.availableTiles].sort(() => Math.random() - 0.5);
    return (
      shuffled.find((kind) => !this.wouldCreateInitialMatch(position, kind)) ??
      this.availableTiles[0]
    );
  }

  private wouldCreateInitialMatch(position: Position, kind: TileKind): boolean {
    const leftOne = this.tileAt({ x: position.x - 1, y: position.y });
    const leftTwo = this.tileAt({ x: position.x - 2, y: position.y });
    const upOne = this.tileAt({ x: position.x, y: position.y - 1 });
    const upTwo = this.tileAt({ x: position.x, y: position.y - 2 });

    return (
      (leftOne?.kind === kind && leftTwo?.kind === kind) ||
      (upOne?.kind === kind && upTwo?.kind === kind)
    );
  }
}
