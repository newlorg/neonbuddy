import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { StatBadge } from "../components/StatBadge";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function HomeScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";
  const { match } = state;

  useEffect(() => {
    if (!match.isInMatch) {
      return;
    }
    const timer = setInterval(() => {
      dispatch({ type: "TICK_MATCH" });
    }, 1000);
    return () => clearInterval(timer);
  }, [dispatch, match.isInMatch]);

  const phaseLabel = useMemo(() => {
    if (isZh) {
      return {
        OPENING: "开局抢芯片（0:00-0:30）",
        MID: "中盘拉扯（0:30-2:30）",
        ENDGAME: "终局高价值芯片（2:30-4:00）",
        DONE: "对局已结束"
      }[match.phase];
    }
    return {
      OPENING: "Opening Resource Fight (0:00-0:30)",
      MID: "Mid Rotation & Teamfight (0:30-2:30)",
      ENDGAME: "High-value Endgame Chip (2:30-4:00)",
      DONE: "Match Ended"
    }[match.phase];
  }, [isZh, match.phase]);

  const winRate = match.roundsPlayed === 0 ? 0 : Math.round((match.wins / match.roundsPlayed) * 100);
  const progressPercent = ((240 - match.secondsLeft) / 240) * 100;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.cardTitle}>{isZh ? "核心模式：能量争夺战（4v4 / 4分钟）" : "Core Mode: Energy Heist (4v4 / 4 mins)"}</Text>
        <Text style={styles.cardText}>
          {isZh
            ? "单局保持 3-5 分钟快节奏，核心是抢芯片、护送回站、拦截反打，匹配通勤和课间场景。"
            : "Fast 3-5 minute rounds built for commute and breaks: grab chips, escort, intercept, counterplay."}
        </Text>
        <View style={styles.badgeRow}>
          <StatBadge label={isZh ? "局数" : "Rounds"} value={`${match.roundsPlayed}`} />
          <StatBadge label={isZh ? "胜场" : "Wins"} value={`${match.wins}`} />
          <StatBadge label={isZh ? "胜率" : "Win Rate"} value={`${winRate}%`} />
        </View>
      </NeonCard>

      <NeonCard>
        <View style={styles.matchTop}>
          <View>
            <Text style={styles.timer}>{formatSeconds(match.secondsLeft)}</Text>
            <Text style={styles.phase}>{phaseLabel}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{match.allyScore}</Text>
            <Text style={styles.scoreSep}>:</Text>
            <Text style={[styles.scoreText, styles.enemyScore]}>{match.enemyScore}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
        </View>
        <Text style={styles.catchup}>
          {isZh ? "追击机制增益：" : "Catch-up Buff:"}{" "}
          <Text style={styles.catchupValue}>{`${match.catchUpBuff}%`}</Text>
        </Text>
        <View style={styles.matchActions}>
          {!match.isInMatch ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => dispatch({ type: "START_MATCH" })}>
              <Text style={styles.primaryButtonText}>{isZh ? "开始 4v4 对局" : "Start 4v4 Match"}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => dispatch({ type: "SCORE", side: "ally", value: 1 })}
              >
                <Text style={styles.secondaryButtonText}>{isZh ? "我方运送 +1" : "Ally Escort +1"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => dispatch({ type: "SCORE", side: "enemy", value: 1 })}
              >
                <Text style={styles.secondaryButtonText}>{isZh ? "敌方偷运 +1" : "Enemy Steal +1"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.cardTitle}>{isZh ? "爆款扩展方向（已预埋）" : "Built-in Growth Hooks"}</Text>
        <Text style={styles.cardText}>
          {isZh
            ? "1. 轻量上手但有操作上限  2. 社交收益高于单排  3. 赛季与社区双线供给  4. 不售卖破坏公平的战斗数值。"
            : "1. Easy onboarding with skill ceiling  2. Squad incentives > solo grind  3. Season + UGC content pipeline  4. Fair-play monetization."}
        </Text>
      </NeonCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 18
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text
  },
  cardText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.subText
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap"
  },
  matchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  timer: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.text
  },
  phase: {
    marginTop: 2,
    fontSize: 12,
    color: colors.subText,
    fontWeight: "600"
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6
  },
  scoreText: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.primary
  },
  enemyScore: {
    color: colors.accent
  },
  scoreSep: {
    fontSize: 26,
    color: colors.subText,
    fontWeight: "700"
  },
  progressTrack: {
    marginTop: 10,
    height: 9,
    borderRadius: radius.sm,
    backgroundColor: "#E3F6EB",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.electric
  },
  catchup: {
    marginTop: 10,
    fontSize: 13,
    color: colors.subText
  },
  catchupValue: {
    color: colors.warning,
    fontWeight: "800"
  },
  matchActions: {
    marginTop: 12,
    gap: 8
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EDFDF6",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700"
  }
});
