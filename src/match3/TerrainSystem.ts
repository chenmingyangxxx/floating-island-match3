import { Board } from "./Board";
import type { ClearedTile, CountByTerrain, Position, SeasonDefinition, TerrainKind, TileKind } from "./types";

export class TerrainSystem {
  applyClears(board: Board, clearedTiles: ClearedTile[], season: SeasonDefinition): CountByTerrain {
    const created: CountByTerrain = {};

    for (const cleared of clearedTiles) {
      this.promoteCell(board, cleared.position, cleared.tile.kind, created);
      this.damageNearbyIce(board, cleared.position, season);

      if (season.id === "spring" && cleared.tile.kind === "flower") {
        for (const neighbor of board.neighborsOf(cleared.position)) {
          this.promoteToGrass(board, neighbor, created);
        }
      }

      if (cleared.tile.kind === "water") {
        for (const neighbor of board.neighborsOf(cleared.position)) {
          if (Math.random() < 0.35) {
            this.promoteToGrass(board, neighbor, created);
          }
        }
      }
    }

    return created;
  }

  private promoteCell(
    board: Board,
    position: Position,
    tileKind: TileKind,
    created: CountByTerrain,
  ): void {
    const cell = board.cellAt(position);

    if (cell.terrain === "barren") {
      cell.terrain = "grass";
      this.increment(created, "grass");
      return;
    }

    if (cell.terrain === "grass" && tileKind === "flower") {
      cell.terrain = "flowerbed";
      this.increment(created, "flowerbed");
    }
  }

  private promoteToGrass(board: Board, position: Position, created: CountByTerrain): void {
    const cell = board.cellAt(position);
    if (cell.terrain !== "barren") {
      return;
    }

    cell.terrain = "grass";
    this.increment(created, "grass");
  }

  private damageNearbyIce(board: Board, position: Position, season: SeasonDefinition): void {
    const affectedPositions = season.id === "winter" ? [position] : [position, ...board.neighborsOf(position)];

    for (const affected of affectedPositions) {
      const obstacle = board.cellAt(affected).obstacle;
      if (obstacle?.type !== "ice") {
        continue;
      }

      obstacle.hp -= 1;
      if (obstacle.hp <= 0) {
        board.cellAt(affected).obstacle = undefined;
      }
    }
  }

  private increment(counts: CountByTerrain, terrain: TerrainKind): void {
    counts[terrain] = (counts[terrain] ?? 0) + 1;
  }
}

