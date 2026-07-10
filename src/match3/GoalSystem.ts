import type { CountByTerrain, CountByTile, GoalConfig, GoalState, TerrainKind, TileKind } from "./types";

export class GoalSystem {
  private readonly progress: number[];

  constructor(private readonly goals: GoalConfig[]) {
    this.progress = goals.map(() => 0);
  }

  recordCollection(counts: CountByTile): void {
    this.goals.forEach((goal, index) => {
      if (goal.type !== "collect") {
        return;
      }

      this.progress[index] = Math.min(goal.count, this.progress[index] + (counts[goal.tile] ?? 0));
    });
  }

  recordTerrain(counts: CountByTerrain): void {
    this.goals.forEach((goal, index) => {
      if (goal.type !== "createTerrain") {
        return;
      }

      this.progress[index] = Math.min(goal.count, this.progress[index] + (counts[goal.terrain] ?? 0));
    });
  }

  get isComplete(): boolean {
    return this.goals.every((goal, index) => this.progress[index] >= goal.count);
  }

  states(): GoalState[] {
    return this.goals.map((goal, index) => ({
      label: this.labelFor(goal),
      current: this.progress[index],
      target: goal.count,
      complete: this.progress[index] >= goal.count,
    }));
  }

  private labelFor(goal: GoalConfig): string {
    if (goal.label) {
      return goal.label;
    }

    if (goal.type === "collect") {
      return tileLabels[goal.tile];
    }

    return terrainLabels[goal.terrain];
  }
}

const tileLabels: Record<TileKind, string> = {
  water: "水滴",
  sun: "阳光",
  leaf: "叶子",
  flower: "花朵",
  soil: "土壤",
  stardust: "星尘",
};

const terrainLabels: Record<TerrainKind, string> = {
  barren: "荒地",
  grass: "草地",
  flowerbed: "花圃",
};

