import { Board } from "./Board";
import { MatchFinder } from "./MatchFinder";
import { TerrainSystem } from "./TerrainSystem";
import type {
  ClearedTile,
  CountByTerrain,
  CountByTile,
  MatchGroup,
  Position,
  SeasonDefinition,
  SpecialKind,
  Tile,
} from "./types";

export interface SpecialPlacement {
  position: Position;
  kind: Tile["kind"];
  special: SpecialKind;
}

export interface ResolveStep {
  chain: number;
  clearedTiles: ClearedTile[];
  specialPlacements: SpecialPlacement[];
  collected: CountByTile;
  terrainCreated: CountByTerrain;
  scoreGained: number;
}

export interface ResolveSummary {
  accepted: boolean;
  chains: number;
  scoreGained: number;
  collected: CountByTile;
  terrainCreated: CountByTerrain;
  specialsCreated: number;
  steps: ResolveStep[];
}

export class BoardResolver {
  constructor(
    private readonly board: Board,
    private readonly terrainSystem: TerrainSystem,
  ) {}

  trySwapAndResolve(a: Position, b: Position, season: SeasonDefinition): ResolveSummary {
    if (!this.board.areAdjacent(a, b)) {
      return this.emptySummary(false);
    }

    this.board.swap(a, b);
    const matches = MatchFinder.findMatches(this.board);
    if (matches.length === 0) {
      this.board.swap(a, b);
      return this.emptySummary(false);
    }

    return this.resolve(matches, [a, b], season);
  }

  private resolve(
    initialMatches: MatchGroup[],
    preferredSpecialPositions: Position[],
    season: SeasonDefinition,
  ): ResolveSummary {
    const summary = this.emptySummary(true);
    let matches = initialMatches;
    let chain = 0;

    while (matches.length > 0 && chain < 12) {
      chain += 1;
      summary.chains = chain;

      const specialPlacements = this.pickSpecialPlacements(matches, preferredSpecialPositions);
      const clearMap = this.buildClearMap(matches, specialPlacements, season);
      const clearedTiles = [...clearMap.values()];
      const stepCollected: CountByTile = {};
      const stepTerrainCreated = this.terrainSystem.applyClears(this.board, clearedTiles, season);
      const stepScore =
        this.scoreFor(clearedTiles.length, chain, season) + specialPlacements.length * 120;

      this.addCollected(stepCollected, clearedTiles);
      this.addCollected(summary.collected, clearedTiles);
      this.addTerrain(summary.terrainCreated, stepTerrainCreated);
      summary.specialsCreated += specialPlacements.length;
      summary.scoreGained += stepScore;
      summary.steps.push({
        chain,
        clearedTiles,
        specialPlacements,
        collected: stepCollected,
        terrainCreated: stepTerrainCreated,
        scoreGained: stepScore,
      });

      this.board.clearPositions(clearedTiles.map((cleared) => cleared.position));

      for (const placement of specialPlacements) {
        this.board.setTile(
          placement.position,
          this.board.createTile(placement.kind, placement.special),
        );
      }

      this.board.refillColumns();
      matches = MatchFinder.findMatches(this.board);
      preferredSpecialPositions.length = 0;
    }

    return summary;
  }

  private pickSpecialPlacements(
    matches: MatchGroup[],
    preferredPositions: Position[],
  ): Array<{ position: Position; kind: Tile["kind"]; special: SpecialKind }> {
    const placements: Array<{ position: Position; kind: Tile["kind"]; special: SpecialKind }> = [];
    const occupied = new Set<string>();

    for (const group of matches) {
      if (!group.special) {
        continue;
      }

      const preferred = preferredPositions.find((position) =>
        group.positions.some((candidate) => candidate.x === position.x && candidate.y === position.y),
      );
      const position = preferred ?? group.positions[Math.floor(group.positions.length / 2)];
      const key = this.board.keyOf(position);

      if (occupied.has(key)) {
        continue;
      }

      occupied.add(key);
      placements.push({
        position,
        kind: group.kind,
        special: group.special,
      });
    }

    return placements;
  }

  private buildClearMap(
    matches: MatchGroup[],
    specialPlacements: Array<{ position: Position; kind: Tile["kind"]; special: SpecialKind }>,
    season: SeasonDefinition,
  ): Map<string, ClearedTile> {
    const protectedKeys = new Set(specialPlacements.map((placement) => this.board.keyOf(placement.position)));
    const clearMap = new Map<string, ClearedTile>();
    const queue: Position[] = [];

    for (const group of matches) {
      for (const position of group.positions) {
        if (protectedKeys.has(this.board.keyOf(position))) {
          continue;
        }

        this.queueClear(position, clearMap, queue);
      }
    }

    while (queue.length > 0) {
      const position = queue.shift();
      if (!position) {
        continue;
      }

      const tile = this.board.tileAt(position);
      if (!tile?.special) {
        continue;
      }

      for (const effectPosition of this.effectPositions(position, tile, season)) {
        if (protectedKeys.has(this.board.keyOf(effectPosition))) {
          continue;
        }

        this.queueClear(effectPosition, clearMap, queue);
      }
    }

    return clearMap;
  }

  private queueClear(position: Position, clearMap: Map<string, ClearedTile>, queue: Position[]): void {
    if (!this.board.inBounds(position)) {
      return;
    }

    const tile = this.board.tileAt(position);
    if (!tile) {
      return;
    }

    const key = this.board.keyOf(position);
    if (clearMap.has(key)) {
      return;
    }

    clearMap.set(key, {
      position,
      tile,
    });
    queue.push(position);
  }

  private effectPositions(position: Position, tile: Tile, season: SeasonDefinition): Position[] {
    switch (tile.special) {
      case "row":
        return this.rowPositions(position.y);
      case "column":
        return this.columnPositions(position.x);
      case "bomb":
        return this.squarePositions(position, season.id === "summer" ? 2 : 1);
      case "rainbow":
        return this.allOfKind(tile.kind);
      default:
        return [];
    }
  }

  private rowPositions(y: number): Position[] {
    return Array.from({ length: this.board.width }, (_, x) => ({ x, y }));
  }

  private columnPositions(x: number): Position[] {
    return Array.from({ length: this.board.height }, (_, y) => ({ x, y }));
  }

  private squarePositions(center: Position, radius: number): Position[] {
    const positions: Position[] = [];

    for (let y = center.y - radius; y <= center.y + radius; y += 1) {
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        const position = { x, y };
        if (this.board.inBounds(position)) {
          positions.push(position);
        }
      }
    }

    return positions;
  }

  private allOfKind(kind: Tile["kind"]): Position[] {
    const positions: Position[] = [];

    for (let y = 0; y < this.board.height; y += 1) {
      for (let x = 0; x < this.board.width; x += 1) {
        const position = { x, y };
        if (this.board.tileAt(position)?.kind === kind) {
          positions.push(position);
        }
      }
    }

    return positions;
  }

  private scoreFor(clearedCount: number, chain: number, season: SeasonDefinition): number {
    const seasonBonus = season.id === "autumn" && chain > 1 ? 1.35 : 1;
    return Math.round(clearedCount * 20 * chain * seasonBonus);
  }

  private addCollected(target: CountByTile, clearedTiles: ClearedTile[]): void {
    for (const cleared of clearedTiles) {
      target[cleared.tile.kind] = (target[cleared.tile.kind] ?? 0) + 1;
    }
  }

  private addTerrain(target: CountByTerrain, added: CountByTerrain): void {
    for (const [terrain, count] of Object.entries(added)) {
      target[terrain as keyof CountByTerrain] = (target[terrain as keyof CountByTerrain] ?? 0) + count;
    }
  }

  private emptySummary(accepted: boolean): ResolveSummary {
    return {
      accepted,
      chains: 0,
      scoreGained: 0,
      collected: {},
      terrainCreated: {},
      specialsCreated: 0,
      steps: [],
    };
  }
}
