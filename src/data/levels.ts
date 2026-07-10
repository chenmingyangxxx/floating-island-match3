import type { LevelConfig } from "../match3/types";

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "经典三消",
    boardWidth: 5,
    boardHeight: 5,
    moves: 16,
    seasonOrder: ["spring"],
    seasonChangeEvery: 99,
    availableTiles: ["water", "sun", "leaf", "flower", "soil"],
    goals: [
      {
        type: "collect",
        tile: "water",
        count: 6,
        label: "水滴",
      },
      {
        type: "collect",
        tile: "flower",
        count: 6,
        label: "花朵",
      },
    ],
  },
  {
    id: 2,
    name: "经典三消 2",
    boardWidth: 5,
    boardHeight: 5,
    moves: 18,
    seasonOrder: ["spring"],
    seasonChangeEvery: 99,
    availableTiles: ["water", "sun", "leaf", "flower", "soil"],
    goals: [
      {
        type: "collect",
        tile: "sun",
        count: 7,
        label: "阳光",
      },
      {
        type: "collect",
        tile: "leaf",
        count: 7,
        label: "叶子",
      },
    ],
  },
];
