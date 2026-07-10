import type { LevelConfig } from "../match3/types";

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "苏醒的花园",
    boardWidth: 8,
    boardHeight: 8,
    moves: 25,
    seasonOrder: ["spring", "summer", "autumn", "winter"],
    seasonChangeEvery: 6,
    availableTiles: ["water", "sun", "leaf", "flower", "soil"],
    goals: [
      {
        type: "collect",
        tile: "water",
        count: 18,
        label: "水滴",
      },
      {
        type: "createTerrain",
        terrain: "grass",
        count: 14,
        label: "草地",
      },
    ],
    obstacles: [
      {
        type: "ice",
        hp: 2,
        positions: [
          [2, 3],
          [2, 4],
          [3, 3],
          [3, 4],
          [5, 2],
          [5, 5],
        ],
      },
    ],
  },
  {
    id: 2,
    name: "露水溪谷",
    boardWidth: 8,
    boardHeight: 8,
    moves: 27,
    seasonOrder: ["spring", "summer", "autumn", "winter"],
    seasonChangeEvery: 5,
    availableTiles: ["water", "sun", "leaf", "flower", "soil", "stardust"],
    goals: [
      {
        type: "collect",
        tile: "flower",
        count: 22,
        label: "花朵",
      },
      {
        type: "createTerrain",
        terrain: "flowerbed",
        count: 7,
        label: "花圃",
      },
    ],
    obstacles: [
      {
        type: "ice",
        hp: 2,
        positions: [
          [1, 1],
          [1, 6],
          [6, 1],
          [6, 6],
        ],
      },
    ],
  },
];

