import type { LevelConfig, SeasonDefinition, SeasonId } from "./types";

export const SEASONS: Record<SeasonId, SeasonDefinition> = {
  spring: {
    id: "spring",
    label: "春季",
    shortLabel: "春",
    color: 0x51b86a,
    description: "花朵会把草地扩散到周围。",
  },
  summer: {
    id: "summer",
    label: "夏季",
    shortLabel: "夏",
    color: 0xffb23e,
    description: "爆炸和条纹特殊棋子的范围更强。",
  },
  autumn: {
    id: "autumn",
    label: "秋季",
    shortLabel: "秋",
    color: 0xd56f35,
    description: "连锁会获得额外分数。",
  },
  winter: {
    id: "winter",
    label: "冬季",
    shortLabel: "冬",
    color: 0x58a6d6,
    description: "冰层会吸收附近的消除。",
  },
};

export class SeasonSystem {
  private acceptedMoves = 0;

  constructor(
    private readonly order: SeasonId[],
    private readonly changeEvery: number,
  ) {}

  static fromLevel(level: LevelConfig): SeasonSystem {
    return new SeasonSystem(level.seasonOrder, level.seasonChangeEvery);
  }

  get current(): SeasonDefinition {
    const index = Math.floor(this.acceptedMoves / this.changeEvery) % this.order.length;
    return SEASONS[this.order[index]];
  }

  get movesUntilNextSeason(): number {
    return this.changeEvery - (this.acceptedMoves % this.changeEvery);
  }

  advanceMove(): void {
    this.acceptedMoves += 1;
  }
}

