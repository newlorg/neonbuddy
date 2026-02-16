import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

function rewardLabel(isZh: boolean, currency: "credit" | "ticket" | "diamond", amount: number): string {
  const zhNames = {
    credit: "信用点",
    ticket: "潮流券",
    diamond: "晶钻"
  };
  const enNames = {
    credit: "Credit",
    ticket: "Ticket",
    diamond: "Diamond"
  };
  const names = isZh ? zhNames : enNames;
  return `${names[currency]} +${amount}`;
}

export function SeasonScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";

  const duoWinRate =
    state.battleStats.buddyMatches === 0
      ? 0
      : Math.round((state.battleStats.buddyWins / state.battleStats.buddyMatches) * 100);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "赛季成长与商业化" : "Season Growth & Monetization"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "你在实战中的对抗行为，会直接驱动赛季经验、任务推进和货币收益。"
            : "Live match behavior now directly drives pass XP, mission progression, and currency rewards."}
        </Text>
        <View style={styles.walletRow}>
          <View style={styles.walletItem}>
            <Text style={styles.walletLabel}>{isZh ? "信用点" : "Credit"}</Text>
            <Text style={styles.walletValue}>{state.currencies.credit}</Text>
          </View>
          <View style={styles.walletItem}>
            <Text style={styles.walletLabel}>{isZh ? "潮流券" : "Ticket"}</Text>
            <Text style={styles.walletValue}>{state.currencies.ticket}</Text>
          </View>
          <View style={styles.walletItem}>
            <Text style={styles.walletLabel}>{isZh ? "晶钻" : "Diamond"}</Text>
            <Text style={styles.walletValue}>{state.currencies.diamond}</Text>
          </View>
        </View>
      </NeonCard>

      <NeonCard>
        <View style={styles.passRow}>
          <Text style={styles.sectionTitle}>
            {isZh ? "通行证等级" : "Pass Level"} Lv.{state.passLevel}
          </Text>
          <Text style={styles.passExp}>{state.passExp}/100 XP</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${state.passExp}%` }]} />
        </View>
        <Text style={styles.tip}>
          {isZh
            ? "高光发布、搭子双排和实战拦截都会给通行证加速。"
            : "Highlight publishing, buddy duo play, and intercept actions all accelerate your pass."}
        </Text>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "实战联动统计" : "Battle-linked Metrics"}</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "抢芯片" : "Pickups"}</Text>
            <Text style={styles.metricValue}>{state.battleStats.totalPickups}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "护送得分" : "Escort Scores"}</Text>
            <Text style={styles.metricValue}>{state.battleStats.totalScores}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "拦截成功" : "Intercepts"}</Text>
            <Text style={styles.metricValue}>{state.battleStats.totalIntercepts}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "冲刺次数" : "Dashes"}</Text>
            <Text style={styles.metricValue}>{state.battleStats.totalDashes}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "双排场次" : "Duo Matches"}</Text>
            <Text style={styles.metricValue}>
              {state.battleStats.buddyMatches} · WR {duoWinRate}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{isZh ? "最高风格分" : "Best Style Score"}</Text>
            <Text style={styles.metricValue}>{state.battleStats.bestStyleScore}</Text>
          </View>
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "最近一局结算拆解" : "Latest Match Reward Breakdown"}</Text>
        {state.lastMatch ? (
          <View style={styles.lastMatchBox}>
            <Text style={styles.lastMatchMain}>
              {isZh ? "结果" : "Result"}: {state.lastMatch.allyScore}:{state.lastMatch.enemyScore} ·{" "}
              {state.lastMatch.result === "win" ? (isZh ? "胜利" : "Win") : isZh ? "失利" : "Loss"}
            </Text>
            <Text style={styles.lastMatchMeta}>
              {isZh ? "风格评级" : "Style Grade"} {state.lastMatch.styleGrade} · {isZh ? "风格分" : "Style Score"}{" "}
              {state.lastMatch.styleScore}
            </Text>
            <Text style={styles.lastMatchMeta}>
              +{state.lastMatch.rewards.credit} {isZh ? "信用点" : "credit"} · +{state.lastMatch.rewards.ticket}{" "}
              {isZh ? "潮流券" : "ticket"} · +{state.lastMatch.rewards.passExp} XP
            </Text>
            <Text style={styles.lastMatchMeta}>
              {isZh ? "搭子亲密收益" : "Buddy Bond Gain"} +{state.lastMatch.rewards.buddyBondGain}
            </Text>
          </View>
        ) : (
          <Text style={styles.tip}>{isZh ? "还没有完整对局结算。先去打一局。" : "No full match settlement yet. Play one round first."}</Text>
        )}
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "赛季任务" : "Season Missions"}</Text>
        <View style={styles.missionList}>
          {state.missions.map((mission) => {
            const canClaim = mission.progress >= mission.target && !mission.claimed;
            return (
              <View key={mission.id} style={styles.missionItem}>
                <View style={styles.missionMain}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <Text style={styles.missionMeta}>
                    {mission.progress}/{mission.target} · {rewardLabel(isZh, mission.reward.currency, mission.reward.amount)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.claimBtn, canClaim && styles.claimBtnActive]}
                  disabled={!canClaim}
                  onPress={() => dispatch({ type: "CLAIM_MISSION", missionId: mission.id })}
                >
                  <Text style={[styles.claimText, canClaim && styles.claimTextActive]}>
                    {mission.claimed ? (isZh ? "已领取" : "Claimed") : isZh ? "领取" : "Claim"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "激励广告（非强制）" : "Optional Rewarded Ad"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "仅用于赛后额外奖励、任务加速和回流补给，不插入竞技主流程。"
            : "Used for extra post-match rewards and mission boosts, never inserted into core PvP flow."}
        </Text>
        <TouchableOpacity style={styles.adButton} onPress={() => dispatch({ type: "WATCH_AD_REWARD" })}>
          <Text style={styles.adButtonText}>{isZh ? "观看激励视频（模拟）" : "Watch Rewarded Video (Mock)"}</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "800"
  },
  desc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.subText
  },
  walletRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  walletItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#EEFFF6",
    padding: 10
  },
  walletLabel: {
    fontSize: 11,
    color: colors.subText,
    fontWeight: "700"
  },
  walletValue: {
    marginTop: 4,
    fontSize: 16,
    color: colors.text,
    fontWeight: "900"
  },
  passRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "800"
  },
  passExp: {
    color: colors.electric,
    fontWeight: "800"
  },
  track: {
    marginTop: 8,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: "#E5F8EE",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary
  },
  tip: {
    marginTop: 8,
    color: colors.subText,
    fontSize: 12
  },
  metricsGrid: {
    marginTop: 10,
    gap: 8
  },
  metricItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#F1FFF8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metricLabel: {
    color: colors.subText,
    fontSize: 12
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  lastMatchBox: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#F3FFF9",
    padding: 10,
    gap: 5
  },
  lastMatchMain: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  lastMatchMeta: {
    color: colors.subText,
    fontSize: 12
  },
  missionList: {
    marginTop: 10,
    gap: 8
  },
  missionItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "#F3FFF8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  missionMain: {
    flex: 1
  },
  missionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  missionMeta: {
    marginTop: 4,
    color: colors.subText,
    fontSize: 12
  },
  claimBtn: {
    minWidth: 68,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EEF5F2",
    alignItems: "center",
    justifyContent: "center"
  },
  claimBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  claimText: {
    color: colors.subText,
    fontWeight: "700",
    fontSize: 12
  },
  claimTextActive: {
    color: "#FFFFFF"
  },
  adButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.electric,
    alignItems: "center",
    justifyContent: "center"
  },
  adButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  }
});
