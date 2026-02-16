import React, { createContext, useContext, useMemo, useReducer } from "react";
import { buddies, challengeMaps, liveOpsSchedule, missions, streetGroup, workshopOptions } from "../data/mockData";
import { AppState, AppTab, MatchPhase, SeasonMission, WorkshopLoadout } from "../types/models";

type Action =
  | { type: "SET_TAB"; tab: AppTab }
  | { type: "TOGGLE_LOCALE" }
  | { type: "START_MATCH" }
  | { type: "TICK_MATCH" }
  | { type: "SCORE"; side: "ally" | "enemy"; value: number }
  | { type: "QUEUE_WITH_BUDDY"; buddyId: string }
  | { type: "SET_LOADOUT"; field: keyof WorkshopLoadout; value: string }
  | { type: "CLAIM_MISSION"; missionId: string }
  | { type: "LIKE_MAP"; mapId: string }
  | { type: "WATCH_AD_REWARD" };

const initialLoadout: WorkshopLoadout = {
  spray: workshopOptions.sprays[0],
  sticker: workshopOptions.stickers[0],
  emote: workshopOptions.emotes[0],
  title: workshopOptions.titles[0]
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
        }
      };

    case "SCORE":
      if (!state.match.isInMatch) {
        return state;
      }
      return {
        ...state,
        match: {
          ...state.match,
          allyScore: action.side === "ally" ? Math.max(0, state.match.allyScore + action.value) : state.match.allyScore,
          enemyScore: action.side === "enemy" ? Math.max(0, state.match.enemyScore + action.value) : state.match.enemyScore
        }
      };

    case "TICK_MATCH": {
      if (!state.match.isInMatch) {
        return state;
      }

      const nextSeconds = Math.max(0, state.match.secondsLeft - 1);
      let allyScore = state.match.allyScore;
      let enemyScore = state.match.enemyScore;

      if (nextSeconds > 0 && nextSeconds % 12 === 0) {
        const scoreGap = enemyScore - allyScore;
        const allyChipChance = scoreGap > 0 ? 0.66 : 0.47;
        if (Math.random() < allyChipChance) {
          allyScore += 1;
        } else {
          enemyScore += 1;
        }
      }

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
      let nextMissions = progressMission(state.missions, "play_3");
      if (isWin) {
        nextMissions = progressMission(nextMissions, "win_1");
      }

      const passResult = gainPass(state.passLevel, state.passExp, 24);

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
        missions: nextMissions,
        passLevel: passResult.level,
        passExp: passResult.exp,
        currencies: {
          ...state.currencies,
          credit: state.currencies.credit + 120
        }
      };
    }

    case "QUEUE_WITH_BUDDY": {
      const passResult = gainPass(state.passLevel, state.passExp, 8);
      return {
        ...state,
        queuedBuddyId: action.buddyId,
        buddies: state.buddies.map((buddy) => {
          if (buddy.id !== action.buddyId) {
            return buddy;
          }
          return { ...buddy, intimacy: Math.min(100, buddy.intimacy + 2) };
        }),
        missions: progressMission(state.missions, "pair_2"),
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
