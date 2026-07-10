export type TileKind = "water" | "sun" | "leaf" | "flower" | "soil" | "stardust";
export type SpecialKind = "row" | "column" | "bomb" | "rainbow";
export type TerrainKind = "barren" | "grass" | "flowerbed";
export type SeasonId = "spring" | "summer" | "autumn" | "winter";
export type ObstacleType = "ice" | "stone" | "vine";
export type Direction = "horizontal" | "vertical";
export type MatchPattern = "line3" | "line4" | "line5" | "shape";

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  id: number;
  kind: TileKind;
  special?: SpecialKind;
}

export interface CellObstacle {
  type: ObstacleType;
  hp: number;
  maxHp: number;
}

export interface Cell {
  terrain: TerrainKind;
  tile: Tile | null;
  obstacle?: CellObstacle;
}

export interface ObstacleConfig {
  type: ObstacleType;
  hp: number;
  positions: Array<[number, number]>;
}

export interface CollectGoalConfig {
  type: "collect";
  tile: TileKind;
  count: number;
  label?: string;
}

export interface TerrainGoalConfig {
  type: "createTerrain";
  terrain: TerrainKind;
  count: number;
  label?: string;
}

export type GoalConfig = CollectGoalConfig | TerrainGoalConfig;

export interface LevelConfig {
  id: number;
  name: string;
  boardWidth: number;
  boardHeight: number;
  moves: number;
  seasonOrder: SeasonId[];
  seasonChangeEvery: number;
  availableTiles: TileKind[];
  goals: GoalConfig[];
  obstacles?: ObstacleConfig[];
}

export interface MatchRun {
  kind: TileKind;
  direction: Direction;
  positions: Position[];
}

export interface MatchGroup {
  kind: TileKind;
  positions: Position[];
  runs: MatchRun[];
  pattern: MatchPattern;
  special?: SpecialKind;
}

export interface ClearedTile {
  position: Position;
  tile: Tile;
}

export type CountByTile = Partial<Record<TileKind, number>>;
export type CountByTerrain = Partial<Record<TerrainKind, number>>;

export interface GoalState {
  label: string;
  current: number;
  target: number;
  complete: boolean;
}

export interface SeasonDefinition {
  id: SeasonId;
  label: string;
  shortLabel: string;
  color: number;
  description: string;
}

