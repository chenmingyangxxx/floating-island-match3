export interface RepairStage {
  id: number;
  name: string;
  label: string;
  description: string;
}

export interface GameProgress {
  diamonds: number;
  stageProgress: number[];
  bestScores: Record<string, number>;
  wins: Record<string, number>;
}

export interface LevelWinReward {
  diamondsEarned: number;
  totalDiamonds: number;
  firstClear: boolean;
  overallPercent: number;
}

const STORAGE_KEY = "floating-island-match3-progress-v1";

export const REPAIR_STAGES: RepairStage[] = [
  { id: 1, name: "裂石地基", label: "破损", description: "浮岛仍有裂缝，需要重新稳固。" },
  { id: 2, name: "新绿草坪", label: "萌芽", description: "第一片草地开始覆盖荒地。" },
  { id: 3, name: "清泉水脉", label: "清泉", description: "水脉回流，岛屿恢复生机。" },
  { id: 4, name: "花圃小径", label: "花园", description: "花圃和小路让浮岛更有秩序。" },
  { id: 5, name: "树荫庭院", label: "庭院", description: "树荫撑起舒适的休憩空间。" },
  { id: 6, name: "星灯桥廊", label: "精致", description: "桥廊和星灯点亮夜色。" },
  { id: 7, name: "云上温室", label: "繁盛", description: "温室让四季花朵持续盛放。" },
  { id: 8, name: "豪华浮岛", label: "豪华", description: "浮岛完成华丽修复，充满节庆感。" },
];

const defaultProgress: GameProgress = {
  diamonds: 0,
  stageProgress: REPAIR_STAGES.map(() => 0),
  bestScores: {},
  wins: {},
};

export function loadProgress(): GameProgress {
  if (typeof window === "undefined") {
    return cloneProgress(defaultProgress);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneProgress(defaultProgress);
    }

    const parsed = JSON.parse(raw) as Partial<GameProgress>;
    return normalizeProgress(parsed);
  } catch {
    return cloneProgress(defaultProgress);
  }
}

export function saveProgress(progress: GameProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
}

export function recordLevelWin(levelId: number, score: number): LevelWinReward {
  const progress = loadProgress();
  const index = clamp(levelId - 1, 0, REPAIR_STAGES.length - 1);
  const previousStageProgress = progress.stageProgress[index] ?? 0;
  const firstClear = previousStageProgress < 100;
  const diamondsEarned = firstClear
    ? 18 + levelId * 4 + Math.min(10, Math.floor(score / 180))
    : 6 + Math.min(6, Math.floor(score / 260));

  progress.stageProgress[index] = 100;
  progress.diamonds += diamondsEarned;
  progress.bestScores[String(levelId)] = Math.max(progress.bestScores[String(levelId)] ?? 0, score);
  progress.wins[String(levelId)] = (progress.wins[String(levelId)] ?? 0) + 1;
  saveProgress(progress);

  return {
    diamondsEarned,
    totalDiamonds: progress.diamonds,
    firstClear,
    overallPercent: overallRepairPercent(progress),
  };
}

export function overallRepairPercent(progress = loadProgress()): number {
  const total = progress.stageProgress.reduce((sum, value) => sum + clamp(value, 0, 100), 0);
  return Math.round(total / REPAIR_STAGES.length);
}

export function completedStageCount(progress = loadProgress()): number {
  return progress.stageProgress.filter((value) => value >= 100).length;
}

export function currentRepairStageIndex(progress = loadProgress()): number {
  const nextStage = progress.stageProgress.findIndex((value) => value < 100);
  return nextStage === -1 ? REPAIR_STAGES.length - 1 : nextStage;
}

function normalizeProgress(progress: Partial<GameProgress>): GameProgress {
  return {
    diamonds: Math.max(0, Math.floor(progress.diamonds ?? 0)),
    stageProgress: REPAIR_STAGES.map((_, index) =>
      clamp(Math.floor(progress.stageProgress?.[index] ?? 0), 0, 100),
    ),
    bestScores: progress.bestScores ?? {},
    wins: progress.wins ?? {},
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneProgress(progress: GameProgress): GameProgress {
  return {
    diamonds: progress.diamonds,
    stageProgress: [...progress.stageProgress],
    bestScores: { ...progress.bestScores },
    wins: { ...progress.wins },
  };
}
