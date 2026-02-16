import React, { createContext, useContext, useMemo, useReducer } from "react";
import { buddies, challengeMaps, liveOpsSchedule, missions, streetGroup, workshopOptions } from "../data/mockData";
import {
  AppState,
  AppTab,
  BattleStats,
  MatchPhase,
  MatchTelemetry,
  SeasonMission,
  StyleGrade,
  WorkshopLoadout
} from "../types/models";

type Action =
  | { type: "SET_TAB"; tab: AppTab }
  | { type: "TOGGLE_LOCALE" }
  | { type: "START_MATCH" }
  | { type: "TICK_MATCH" }
  | { type: "SCORE"; side: "ally" | "enemy"; value: number }
  | {
      type: "TRACK_MATCH_EVENT";
      event:
        | "ALLY_PICKUP"
        | "ENEMY_PICKUP"
        | "ALLY_SCORE"
        | "ENEMY_SCORE"
        | "ALLY_TACKLE"
        | "ENEMY_TACKLE"
        | "PLAYER_DASH"
        | "PLAYER_INTERCEPT_ATTEMPT"
        | "PLAYER_INTERCEPT_SUCCESS";
    }
  | { type: "QUEUE_WITH_BUDDY"; buddyId: string }
  | { type: "SET_LOADOUT"; field: keyof WorkshopLoadout; value: string }
  | { type: "PUBLISH_HIGHLIGHT" }
  | { type: "CLAIM_MISSION"; missionId: string }
  | { type: "LIKE_MAP"; mapId: string }
  | { type: "WATCH_AD_REWARD" };

const initialLoadout: WorkshopLoadout = {
  spray: workshopOptions.sprays[0],
  sticker: workshopOptions.stickers[0],
  emote: workshopOptions.emotes[0],
  title: workshopOptions.titles[0]
};

const initialMatchTelemetry: MatchTelemetry = {
  allyPickups: 0,
  enemyPickups: 0,
  allyScores: 0,
  enemyScores: 0,
  allyTackles: 0,
  enemyTackles: 0,
  playerDashes: 0,
  playerInterceptAttempts: 0,
  playerInterceptSuccess: 0
};

const initialBattleStats: BattleStats = {
  totalPickups: 0,
  totalScores: 0,
  totalTackles: 0,
  totalDashes: 0,
  totalIntercepts: 0,
  buddyMatches: 0,
  buddyWins: 0,
  styleMatches: 0,
  styleHighlights: 0,
  bestStyleScore: 0
};

const initialState: AppState = {
  locale: "zh-CN",
  activeTab: "home",
  match: {
    isInMatch: false,
    secondsLeft: 240,
    allyScore: 0,
    enemyScore: 0,
    catchUpBuff: 0,
    phase: "OPENING",
    roundsPlayed: 0,
    wins: 0
  },
  matchTelemetry: initialMatchTelemetry,
  battleStats: initialBattleStats,
  lastMatch: null,
  buddies,
  queuedBuddyId: null,
  options: workshopOptions,
  loadout: initialLoadout,
  missions,
  passLevel: 1,
  passExp: 10,
  currencies: {
    credit: 1200,
    ticket: 260,
    diamond: 45
  },
  challengeMaps,
  streetGroup,
  liveOps: liveOpsSchedule,
  kpi: {
    d1: 48,
    d7: 26,
    d30: 11,
    pairRate: 45,
    payRate: 3.5,
    passRate: 10,
    eventRate: 65
  }
};

function getPhaseBySeconds(secondsLeft: number): MatchPhase {
  if (secondsLeft === 0) {
    return "DONE";
  }
  if (secondsLeft > 210) {
    return "OPENING";
  }
  if (secondsLeft > 90) {
    return "MID";
  }
  return "ENDGAME";
}

function progressMission(missionsList: SeasonMission[], missionId: string, step = 1): SeasonMission[] {
  if (step <= 0) {
    return missionsList;
  }
  return missionsList.map((mission) => {
    if (mission.id !== missionId || mission.claimed) {
      return mission;
    }
    return {
      ...mission,
      progress: Math.min(mission.target, mission.progress + step)
    };
  });
}

function gainPass(level: number, exp: number, addExp: number): { level: number; exp: number } {
  const total = exp + addExp;
  return {
    level: level + Math.floor(total / 100),
    exp: total % 100
  };
}

function safeIndex(list: string[], value: string): number {
  const index = list.indexOf(value);
  return index >= 0 ? index : 0;
}

function computeLoadoutLinkage(state: AppState): {
  styleScoreBase: number;
  passBonus: number;
  creditBonus: number;
  ticketBonus: number;
} {
  const sprayTier = safeIndex(state.options.sprays, state.loadout.spray);
  const stickerTier = safeIndex(state.options.stickers, state.loadout.sticker);
  const emoteTier = safeIndex(state.options.emotes, state.loadout.emote);
  const titleTier = safeIndex(state.options.titles, state.loadout.title);

  const styleScoreBase = (sprayTier + stickerTier + emoteTier + titleTier) * 2;
  const passBonus = 2 + titleTier + emoteTier;
  const creditBonus = 10 + sprayTier * 10 + stickerTier * 8;
  const ticketBonus = emoteTier >= 2 ? 12 : 6;

  return {
    styleScoreBase,
    passBonus,
    creditBonus,
    ticketBonus
  };
}

function styleGradeByScore(score: number): StyleGrade {
  if (score >= 30) {
    return "S";
  }
  if (score >= 24) {
    return "A";
  }
  if (score >= 16) {
    return "B";
  }
  return "C";
}

function smoothWinRate(current: number, isWin: boolean): number {
  const next = (current * 9 + (isWin ? 100 : 0)) / 10;
  return Math.max(0, Math.min(100, Math.round(next)));
}

type MatchEventKey =
  | "ALLY_PICKUP"
  | "ENEMY_PICKUP"
  | "ALLY_SCORE"
  | "ENEMY_SCORE"
  | "ALLY_TACKLE"
  | "ENEMY_TACKLE"
  | "PLAYER_DASH"
  | "PLAYER_INTERCEPT_ATTEMPT"
  | "PLAYER_INTERCEPT_SUCCESS";

function telemetryAfterEvent(telemetry: MatchTelemetry, event: MatchEventKey): MatchTelemetry {
  switch (event) {
    case "ALLY_PICKUP":
      return { ...telemetry, allyPickups: telemetry.allyPickups + 1 };
    case "ENEMY_PICKUP":
      return { ...telemetry, enemyPickups: telemetry.enemyPickups + 1 };
    case "ALLY_SCORE":
      return { ...telemetry, allyScores: telemetry.allyScores + 1 };
    case "ENEMY_SCORE":
      return { ...telemetry, enemyScores: telemetry.enemyScores + 1 };
    case "ALLY_TACKLE":
      return { ...telemetry, allyTackles: telemetry.allyTackles + 1 };
    case "ENEMY_TACKLE":
      return { ...telemetry, enemyTackles: telemetry.enemyTackles + 1 };
    case "PLAYER_DASH":
      return { ...telemetry, playerDashes: telemetry.playerDashes + 1 };
    case "PLAYER_INTERCEPT_ATTEMPT":
      return { ...telemetry, playerInterceptAttempts: telemetry.playerInterceptAttempts + 1 };
    case "PLAYER_INTERCEPT_SUCCESS":
      return { ...telemetry, playerInterceptSuccess: telemetry.playerInterceptSuccess + 1 };
    default:
      return telemetry;
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };

    case "TOGGLE_LOCALE":
      return { ...state, locale: state.locale === "zh-CN" ? "en-US" : "zh-CN" };

    case "START_MATCH":
      return {
        ...state,
        match: {
          ...state.match,
          isInMatch: true,
          secondsLeft: 240,
          allyScore: 0,
          enemyScore: 0,
          catchUpBuff: 0,
          phase: "OPENING"
        },
        matchTelemetry: initialMatchTelemetry
      };

    case "SCORE":
      if (!state.match.isInMatch) {
        return state;
      }
      const nextAllyScore =
        action.side === "ally" ? Math.max(0, state.match.allyScore + action.value) : state.match.allyScore;
      const nextEnemyScore =
        action.side === "enemy" ? Math.max(0, state.match.enemyScore + action.value) : state.match.enemyScore;
      const nextCatchUpBuff = nextEnemyScore > nextAllyScore ? Math.min(40, (nextEnemyScore - nextAllyScore) * 12) : 0;
      return {
        ...state,
        match: {
          ...state.match,
          allyScore: nextAllyScore,
          enemyScore: nextEnemyScore,
          catchUpBuff: nextCatchUpBuff
        }
      };

    case "TRACK_MATCH_EVENT":
      if (!state.match.isInMatch) {
        return state;
      }
      return {
        ...state,
        matchTelemetry: telemetryAfterEvent(state.matchTelemetry, action.event)
      };

    case "TICK_MATCH": {
      if (!state.match.isInMatch) {
        return state;
      }

      const nextSeconds = Math.max(0, state.match.secondsLeft - 1);
      const allyScore = state.match.allyScore;
      const enemyScore = state.match.enemyScore;
      const catchUpBuff = enemyScore > allyScore ? Math.min(40, (enemyScore - allyScore) * 12) : 0;
      const phase = getPhaseBySeconds(nextSeconds);

      if (nextSeconds > 0) {
        return {
          ...state,
          match: {
            ...state.match,
            secondsLeft: nextSeconds,
            allyScore,
            enemyScore,
            catchUpBuff,
            phase
          }
        };
      }

      const isWin = allyScore >= enemyScore;
      const telemetry = state.matchTelemetry;
      const linkage = computeLoadoutLinkage(state);
      const buddyInMatch = state.queuedBuddyId ? state.buddies.find((item) => item.id === state.queuedBuddyId) ?? null : null;

      const styleScore =
        linkage.styleScoreBase +
        telemetry.allyScores * 4 +
        telemetry.allyPickups * 2 +
        telemetry.playerDashes +
        telemetry.playerInterceptSuccess * 5 +
        (isWin ? 6 : 0);
      const styleGrade = styleGradeByScore(styleScore);

      const buddyBondGain = buddyInMatch ? (isWin ? 4 : 2) + Math.min(3, telemetry.allyScores) : 0;
      const creditGain = 120 + linkage.creditBonus + telemetry.allyScores * 18 + telemetry.allyPickups * 8;
      const ticketGain = (buddyInMatch ? 12 : 0) + (isWin ? linkage.ticketBonus : 0);
      const passGain =
        22 +
        linkage.passBonus +
        telemetry.playerInterceptSuccess * 4 +
        telemetry.allyScores * 2 +
        (buddyInMatch ? 2 : 0) +
        (styleGrade === "S" ? 6 : styleGrade === "A" ? 3 : 0);
      const passResult = gainPass(state.passLevel, state.passExp, passGain);

      let nextMissions = progressMission(state.missions, "play_3");
      if (isWin) {
        nextMissions = progressMission(nextMissions, "win_1");
      }
      if (buddyInMatch) {
        nextMissions = progressMission(nextMissions, "pair_2");
      }
      if (styleGrade === "S") {
        nextMissions = progressMission(nextMissions, "play_3");
      }

      const updatedBuddies = state.buddies.map((buddy) => {
        if (!buddyInMatch || buddy.id !== buddyInMatch.id) {
          return buddy;
        }
        return {
          ...buddy,
          intimacy: Math.min(100, buddy.intimacy + buddyBondGain),
          synergy: Math.min(100, buddy.synergy + (isWin ? 2 : 1) + (styleGrade === "S" ? 1 : 0)),
          recentStreak: isWin ? buddy.recentStreak + 1 : 0,
          winRate: smoothWinRate(buddy.winRate, isWin)
        };
      });

      return {
        ...state,
        match: {
          ...state.match,
          isInMatch: false,
          secondsLeft: 240,
          allyScore,
          enemyScore,
          catchUpBuff,
          phase: "DONE",
          roundsPlayed: state.match.roundsPlayed + 1,
          wins: state.match.wins + (isWin ? 1 : 0)
        },
        matchTelemetry: initialMatchTelemetry,
        battleStats: {
          ...state.battleStats,
          totalPickups: state.battleStats.totalPickups + telemetry.allyPickups + telemetry.enemyPickups,
          totalScores: state.battleStats.totalScores + telemetry.allyScores + telemetry.enemyScores,
          totalTackles: state.battleStats.totalTackles + telemetry.allyTackles + telemetry.enemyTackles,
          totalDashes: state.battleStats.totalDashes + telemetry.playerDashes,
          totalIntercepts: state.battleStats.totalIntercepts + telemetry.playerInterceptSuccess,
          buddyMatches: state.battleStats.buddyMatches + (buddyInMatch ? 1 : 0),
          buddyWins: state.battleStats.buddyWins + (buddyInMatch && isWin ? 1 : 0),
          styleMatches: state.battleStats.styleMatches + 1,
          bestStyleScore: Math.max(state.battleStats.bestStyleScore, styleScore)
        },
        lastMatch: {
          playedAt: Date.now(),
          result: isWin ? "win" : "loss",
          allyScore,
          enemyScore,
          buddyId: buddyInMatch ? buddyInMatch.id : null,
          loadout: { ...state.loadout },
          styleScore,
          styleGrade,
          telemetry: { ...telemetry },
          rewards: {
            credit: creditGain,
            ticket: ticketGain,
            passExp: passGain,
            buddyBondGain
          }
        },
        buddies: updatedBuddies,
        missions: nextMissions,
        passLevel: passResult.level,
        passExp: passResult.exp,
        currencies: {
          ...state.currencies,
          credit: state.currencies.credit + creditGain,
          ticket: state.currencies.ticket + ticketGain
        }
      };
    }

    case "QUEUE_WITH_BUDDY": {
      const passResult = gainPass(state.passLevel, state.passExp, 4);
      return {
        ...state,
        queuedBuddyId: action.buddyId,
        buddies: state.buddies.map((buddy) => {
          if (buddy.id !== action.buddyId) {
            return buddy;
          }
          return { ...buddy, intimacy: Math.min(100, buddy.intimacy + 2) };
        }),
        passLevel: passResult.level,
        passExp: passResult.exp
      };
    }

    case "SET_LOADOUT":
      return {
        ...state,
        loadout: {
          ...state.loadout,
          [action.field]: action.value
        }
      };

    case "PUBLISH_HIGHLIGHT": {
      const linkage = computeLoadoutLinkage(state);
      const passGain = 10 + linkage.passBonus;
      const passResult = gainPass(state.passLevel, state.passExp, passGain);
      return {
        ...state,
        passLevel: passResult.level,
        passExp: passResult.exp,
        battleStats: {
          ...state.battleStats,
          styleHighlights: state.battleStats.styleHighlights + 1
        },
        currencies: {
          ...state.currencies,
          credit: state.currencies.credit + 60 + linkage.creditBonus,
          ticket: state.currencies.ticket + 8
        }
      };
    }

    case "CLAIM_MISSION": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission || mission.claimed || mission.progress < mission.target) {
        return state;
      }

      const updatedMissions = state.missions.map((item) =>
        item.id === action.missionId ? { ...item, claimed: true } : item
      );
      const updatedCurrencies = { ...state.currencies };
      updatedCurrencies[mission.reward.currency] += mission.reward.amount;

      return {
        ...state,
        missions: updatedMissions,
        currencies: updatedCurrencies
      };
    }

    case "LIKE_MAP": {
      const passResult = gainPass(state.passLevel, state.passExp, 4);
      return {
        ...state,
        challengeMaps: state.challengeMaps.map((map) =>
          map.id === action.mapId ? { ...map, likes: map.likes + 1 } : map
        ),
        missions: progressMission(state.missions, "like_2"),
        passLevel: passResult.level,
        passExp: passResult.exp
      };
    }

    case "WATCH_AD_REWARD": {
      const passResult = gainPass(state.passLevel, state.passExp, 6);
      return {
        ...state,
        passLevel: passResult.level,
        passExp: passResult.exp,
        currencies: {
          ...state.currencies,
          credit: state.currencies.credit + 150,
          ticket: state.currencies.ticket + 20
        }
      };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
