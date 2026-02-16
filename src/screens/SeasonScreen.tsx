import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

function rewardLabel(currency: "credit" | "ticket" | "diamond", amount: number): string {
  const names = {
    credit: "信用点",
    ticket: "潮流券",
    diamond: "晶钻"
  };
  return `${names[currency]} +${amount}`;
}

export function SeasonScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "赛季成长与商业化" : "Season Growth & Monetization"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "主收入走通行证和外观，不出售破坏公平的战斗数值，保证竞技环境稳定。"
            : "Revenue centers on pass + cosmetics, while keeping combat balance untouched."}
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
            ? "对局、双排、社区互动都会累积通行证经验。"
            : "Match completion, duo queue, and community interactions all grant pass XP."}
        </Text>
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
                    {mission.progress}/{mission.target} · {rewardLabel(mission.reward.currency, mission.reward.amount)}
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
            : "Used only for extra post-match rewards and mission boost, not inside core PvP flow."}
        </Text>
        <TouchableOpacity style={styles.adButton} onPress={() => dispatch({ type: "WATCH_AD_REWARD" })}>
          <Text style={styles.adButtonText}>{isZh ? "观看激励视频（模拟）" : "Watch Rewarded Video (Mock)"}</Text>
        </TouchableOpacity>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "首发 90 天 KPI 目标" : "Launch 90-Day KPI Targets"}</Text>
        <Text style={styles.kpiText}>
          D1 {state.kpi.d1}% · D7 {state.kpi.d7}% · D30 {state.kpi.d30}% ·{" "}
          {isZh ? "开黑渗透" : "Squad Penetration"} {state.kpi.pairRate}% · {isZh ? "付费转化" : "Pay Conversion"}{" "}
          {state.kpi.payRate}% · {isZh ? "通行证购买率" : "Pass Buy Rate"} {state.kpi.passRate}% ·{" "}
          {isZh ? "赛季活动参与率" : "Season Participation"} {state.kpi.eventRate}%
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
  },
  kpiText: {
    marginTop: 8,
    color: colors.subText,
    fontSize: 12,
    lineHeight: 18
  }
});
