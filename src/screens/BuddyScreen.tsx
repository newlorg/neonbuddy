import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

function intimacyLabel(value: number): string {
  if (value >= 90) {
    return "传说搭子";
  }
  if (value >= 75) {
    return "王牌搭子";
  }
  if (value >= 55) {
    return "稳定搭子";
  }
  return "新晋搭子";
}

export function BuddyScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";

  const topBuddies = useMemo(
    () => [...state.buddies].sort((a, b) => b.synergy - a.synergy),
    [state.buddies]
  );

  const currentBuddy = state.buddies.find((buddy) => buddy.id === state.queuedBuddyId) || null;
  const pairMission = state.missions.find((item) => item.id === "pair_2");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "搭子系统（自动推荐高默契队友）" : "Buddy System (Auto Synergy Match)"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "按开黑记录、角色互补与胜率自动推荐，降低组队成本，提高开黑渗透率。"
            : "Recommendations are based on co-op history, role complement, and win rate to reduce queue friction."}
        </Text>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "推荐搭子" : "Recommended Buddies"}</Text>
        <View style={styles.list}>
          {topBuddies.map((buddy) => (
            <View key={buddy.id} style={styles.buddyItem}>
              <View style={styles.buddyMain}>
                <Text style={styles.buddyName}>{buddy.name}</Text>
                <Text style={styles.buddyMeta}>
                  {buddy.role} · {isZh ? "默契" : "Synergy"} {buddy.synergy}% · WR {buddy.winRate}%
                </Text>
                <Text style={styles.buddyMeta}>
                  {isZh ? "连胜" : "Streak"} {buddy.recentStreak} · {isZh ? "亲密度" : "Intimacy"} {buddy.intimacy} (
                  {intimacyLabel(buddy.intimacy)})
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.queueBtn, state.queuedBuddyId === buddy.id && styles.queueBtnActive]}
                onPress={() => dispatch({ type: "QUEUE_WITH_BUDDY", buddyId: buddy.id })}
              >
                <Text style={[styles.queueText, state.queuedBuddyId === buddy.id && styles.queueTextActive]}>
                  {state.queuedBuddyId === buddy.id ? (isZh ? "已组队" : "Queued") : isZh ? "一键双排" : "Quick Duo"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "组队状态" : "Current Squad Status"}</Text>
        <Text style={styles.desc}>
          {currentBuddy
            ? isZh
              ? `当前与你组队：${currentBuddy.name}。继续保持连胜可解锁双人专属奖励。`
              : `Queued with ${currentBuddy.name}. Keep winning to unlock duo-exclusive rewards.`
            : isZh
            ? "暂未锁定搭子，建议优先选择默契度 80%+ 的推荐人选。"
            : "No buddy locked yet. Prioritize recommendations with 80%+ synergy."}
        </Text>
        {pairMission ? (
          <Text style={styles.progressText}>
            {isZh ? "赛季任务进度：" : "Season Mission Progress:"} {pairMission.progress}/{pairMission.target}
          </Text>
        ) : null}
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
  sectionTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "800"
  },
  list: {
    marginTop: 10,
    gap: 8
  },
  buddyItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#F4FFF8",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  buddyMain: {
    flex: 1
  },
  buddyName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14
  },
  buddyMeta: {
    marginTop: 4,
    color: colors.subText,
    fontSize: 12
  },
  queueBtn: {
    minWidth: 90,
    minHeight: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7FFF4"
  },
  queueBtnActive: {
    backgroundColor: colors.primary
  },
  queueText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12
  },
  queueTextActive: {
    color: "#FFFFFF"
  },
  progressText: {
    marginTop: 10,
    color: colors.electric,
    fontWeight: "800"
  }
});
