import { Board } from "./Board";
import type { MatchGroup, MatchPattern, MatchRun, Position, SpecialKind } from "./types";

export class MatchFinder {
  static findMatches(board: Board): MatchGroup[] {
    const runs = [...this.findHorizontalRuns(board), ...this.findVerticalRuns(board)];
    return this.mergeRuns(runs);
  }

  private static findHorizontalRuns(board: Board): MatchRun[] {
    const runs: MatchRun[] = [];

    for (let y = 0; y < board.height; y += 1) {
      let x = 0;
      while (x < board.width) {
        const start = x;
        const tile = board.tileAt({ x, y });
        if (!tile) {
          x += 1;
          continue;
        }

        while (x + 1 < board.width && board.tileAt({ x: x + 1, y })?.kind === tile.kind) {
          x += 1;
        }

        const length = x - start + 1;
        if (length >= 3) {
          runs.push({
            kind: tile.kind,
            direction: "horizontal",
            positions: Array.from({ length }, (_, offset) => ({ x: start + offset, y })),
          });
        }

        x += 1;
      }
    }

    return runs;
  }

  private static findVerticalRuns(board: Board): MatchRun[] {
    const runs: MatchRun[] = [];

    for (let x = 0; x < board.width; x += 1) {
      let y = 0;
      while (y < board.height) {
        const start = y;
        const tile = board.tileAt({ x, y });
        if (!tile) {
          y += 1;
          continue;
        }

        while (y + 1 < board.height && board.tileAt({ x, y: y + 1 })?.kind === tile.kind) {
          y += 1;
        }

        const length = y - start + 1;
        if (length >= 3) {
          runs.push({
            kind: tile.kind,
            direction: "vertical",
            positions: Array.from({ length }, (_, offset) => ({ x, y: start + offset })),
          });
        }

        y += 1;
      }
    }

    return runs;
  }

  private static mergeRuns(runs: MatchRun[]): MatchGroup[] {
    const groups: MatchGroup[] = [];
    const visited = new Set<number>();

    for (let index = 0; index < runs.length; index += 1) {
      if (visited.has(index)) {
        continue;
      }

      const queue = [index];
      const groupRuns: MatchRun[] = [];
      visited.add(index);

      while (queue.length > 0) {
        const currentIndex = queue.shift();
        if (currentIndex === undefined) {
          continue;
        }

        const run = runs[currentIndex];
        groupRuns.push(run);

        for (let candidateIndex = 0; candidateIndex < runs.length; candidateIndex += 1) {
          if (visited.has(candidateIndex)) {
            continue;
          }

          const candidate = runs[candidateIndex];
          if (candidate.kind === run.kind && this.intersects(run.positions, candidate.positions)) {
            visited.add(candidateIndex);
            queue.push(candidateIndex);
          }
        }
      }

      const positions = this.uniquePositions(groupRuns.flatMap((run) => run.positions));
      const pattern = this.patternFor(groupRuns, positions.length);

      groups.push({
        kind: groupRuns[0].kind,
        runs: groupRuns,
        positions,
        pattern,
        special: this.specialFor(pattern, groupRuns),
      });
    }

    return groups;
  }

  private static intersects(a: Position[], b: Position[]): boolean {
    const first = new Set(a.map((position) => `${position.x},${position.y}`));
    return b.some((position) => first.has(`${position.x},${position.y}`));
  }

  private static uniquePositions(positions: Position[]): Position[] {
    const seen = new Set<string>();
    const unique: Position[] = [];

    for (const position of positions) {
      const key = `${position.x},${position.y}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(position);
    }

    return unique;
  }

  private static patternFor(runs: MatchRun[], uniqueCount: number): MatchPattern {
    const hasHorizontal = runs.some((run) => run.direction === "horizontal");
    const hasVertical = runs.some((run) => run.direction === "vertical");
    const maxRunLength = Math.max(...runs.map((run) => run.positions.length));

    if (hasHorizontal && hasVertical) {
      return "shape";
    }

    if (maxRunLength >= 5 || uniqueCount >= 5) {
      return "line5";
    }

    if (maxRunLength === 4 || uniqueCount === 4) {
      return "line4";
    }

    return "line3";
  }

  private static specialFor(pattern: MatchPattern, runs: MatchRun[]): SpecialKind | undefined {
    if (pattern === "shape") {
      return "bomb";
    }

    if (pattern === "line5") {
      return "rainbow";
    }

    if (pattern === "line4") {
      return runs[0].direction === "horizontal" ? "row" : "column";
    }

    return undefined;
  }
}

