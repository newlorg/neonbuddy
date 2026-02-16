export type Locale = "zh-CN" | "en-US";
export type AppTab = "home" | "buddy" | "workshop" | "season" | "community";
export type MatchPhase = "OPENING" | "MID" | "ENDGAME" | "DONE";

export interface MatchState {
  isInMatch: boolean;
  secondsLeft: number;
  allyScore: number;
  enemyScore: number;
  catchUpBuff: number;
  phase: MatchPhase;
  roundsPlayed: number;
  wins: number;
}

export interface BuddyProfile {
  id: string;
  name: string;
  role: "突进" | "控场" | "支援" | "干扰";
  synergy: number;
  winRate: number;
  recentStreak: number;
  intimacy: number;
}

export interface WorkshopOptions {
  sprays: string[];
  stickers: string[];
  emotes: string[];
  titles: string[];
}

export interface WorkshopLoadout {
  spray: string;
  sticker: string;
  emote: string;
  title: string;
}

export interface MissionReward {
  currency: "credit" | "ticket" | "diamond";
  amount: number;
}

export interface SeasonMission {
  id: string;
  title: string;
  progress: number;
  target: number;
  reward: MissionReward;
  claimed: boolean;
}

export interface ChallengeMap {
  id: string;
  name: string;
  styleTag: string;
  likes: number;
  completionRate: number;
}

export interface StreetGroup {
  name: string;
  memberCount: number;
  weekCoopScore: number;
  rank: number;
}

export interface CurrencyWallet {
  credit: number;
  ticket: number;
  diamond: number;
}

export interface KpiGoal {
  d1: number;
  d7: number;
  d30: number;
  pairRate: number;
  payRate: number;
  passRate: number;
  eventRate: number;
}

export interface AppState {
  locale: Locale;
  activeTab: AppTab;
  match: MatchState;
  buddies: BuddyProfile[];
  queuedBuddyId: string | null;
  options: WorkshopOptions;
  loadout: WorkshopLoadout;
  missions: SeasonMission[];
  passLevel: number;
  passExp: number;
  currencies: CurrencyWallet;
  challengeMaps: ChallengeMap[];
  streetGroup: StreetGroup;
  liveOps: string[];
  kpi: KpiGoal;
}
