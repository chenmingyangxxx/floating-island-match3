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

    this.fillPlayableTiles();
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

  hasAvailableMove(): boolean {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const position = { x, y };
        if (!this.tileAt(position)) {
          continue;
        }

        const candidates = [
          { x: x + 1, y },
          { x, y: y + 1 },
        ];

        for (const candidate of candidates) {
          if (!this.inBounds(candidate) || !this.tileAt(candidate)) {
            continue;
          }

          this.swap(position, candidate);
          const hasMatch = this.hasAnyMatch();
          this.swap(position, candidate);

          if (hasMatch) {
            return true;
          }
        }
      }
    }

    return false;
  }

  ensurePlayableBoard(): void {
    let attempts = 0;

    while (!this.hasAvailableMove() && attempts < 20) {
      attempts += 1;
      this.clearAllTiles();
      this.fillInitialTiles();
    }
  }

  stabilizeMatches(): void {
    let attempts = 0;

    while (this.hasAnyMatch() && attempts < 30) {
      attempts += 1;

      for (const position of this.matchPositions()) {
        this.setTile(position, this.createTile(this.pickStableKind(position)));
      }
    }

    if (this.hasAnyMatch()) {
      this.clearAllTiles();
      this.fillInitialTiles();
    }

    this.ensurePlayableBoard();
  }

  private fillPlayableTiles(): void {
    this.fillInitialTiles();
    this.ensurePlayableBoard();
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

  private clearAllTiles(): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.setTile({ x, y }, null);
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

  private pickStableKind(position: Position): TileKind {
    const shuffled = [...this.availableTiles].sort(() => Math.random() - 0.5);
    return (
      shuffled.find((kind) => !this.wouldCreateMatchAt(position, kind)) ??
      this.availableTiles[Math.floor(Math.random() * this.availableTiles.length)]
    );
  }

  private wouldCreateMatchAt(position: Position, kind: TileKind): boolean {
    const horizontal =
      1 +
      this.countSameDirection(position, -1, 0, kind) +
      this.countSameDirection(position, 1, 0, kind);
    const vertical =
      1 +
      this.countSameDirection(position, 0, -1, kind) +
      this.countSameDirection(position, 0, 1, kind);

    return horizontal >= 3 || vertical >= 3;
  }

  private countSameDirection(position: Position, deltaX: number, deltaY: number, kind: TileKind): number {
    let count = 0;
    let x = position.x + deltaX;
    let y = position.y + deltaY;

    while (this.inBounds({ x, y }) && this.tileAt({ x, y })?.kind === kind) {
      count += 1;
      x += deltaX;
      y += deltaY;
    }

    return count;
  }

  private matchPositions(): Position[] {
    const seen = new Set<string>();
    const positions: Position[] = [];
    const add = (position: Position) => {
      const key = this.keyOf(position);
      if (!seen.has(key)) {
        seen.add(key);
        positions.push(position);
      }
    };

    for (let y = 0; y < this.height; y += 1) {
      let x = 0;
      while (x < this.width) {
        const start = x;
        const kind = this.tileAt({ x, y })?.kind;
        if (!kind) {
          x += 1;
          continue;
        }

        while (x + 1 < this.width && this.tileAt({ x: x + 1, y })?.kind === kind) {
          x += 1;
        }

        if (x - start + 1 >= 3) {
          for (let matchX = start; matchX <= x; matchX += 1) {
            add({ x: matchX, y });
          }
        }

        x += 1;
      }
    }

    for (let x = 0; x < this.width; x += 1) {
      let y = 0;
      while (y < this.height) {
        const start = y;
        const kind = this.tileAt({ x, y })?.kind;
        if (!kind) {
          y += 1;
          continue;
        }

        while (y + 1 < this.height && this.tileAt({ x, y: y + 1 })?.kind === kind) {
          y += 1;
        }

        if (y - start + 1 >= 3) {
          for (let matchY = start; matchY <= y; matchY += 1) {
            add({ x, y: matchY });
          }
        }

        y += 1;
      }
    }

    return positions;
  }

  private hasAnyMatch(): boolean {
    for (let y = 0; y < this.height; y += 1) {
      let runKind: TileKind | undefined;
      let runLength = 0;

      for (let x = 0; x < this.width; x += 1) {
        const kind = this.tileAt({ x, y })?.kind;
        if (kind && kind === runKind) {
          runLength += 1;
        } else {
          runKind = kind;
          runLength = kind ? 1 : 0;
        }

        if (runLength >= 3) {
          return true;
        }
      }
    }

    for (let x = 0; x < this.width; x += 1) {
      let runKind: TileKind | undefined;
      let runLength = 0;

      for (let y = 0; y < this.height; y += 1) {
        const kind = this.tileAt({ x, y })?.kind;
        if (kind && kind === runKind) {
          runLength += 1;
        } else {
          runKind = kind;
          runLength = kind ? 1 : 0;
        }

        if (runLength >= 3) {
          return true;
        }
      }
    }

    return false;
  }
}
