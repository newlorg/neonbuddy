import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

function intimacyLabel(value: number, isZh: boolean): string {
  if (isZh) {
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
  if (value >= 90) {
    return "Legend Duo";
  }
  if (value >= 75) {
    return "Core Duo";
  }
  if (value >= 55) {
    return "Stable Duo";
  }
  return "Rookie Duo";
}

export function BuddyScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";

  const loadoutFocusIndex = useMemo(() => {
    const sprayTier = Math.max(0, state.options.sprays.indexOf(state.loadout.spray));
    const titleTier = Math.max(0, state.options.titles.indexOf(state.loadout.title));
    return (sprayTier + titleTier) % Math.max(1, state.buddies.length);
  }, [state.buddies.length, state.loadout.spray, state.loadout.title, state.options.sprays, state.options.titles]);

  const topBuddies = useMemo(() => {
    return [...state.buddies].sort((a, b) => {
      const aIndex = state.buddies.findIndex((item) => item.id === a.id);
      const bIndex = state.buddies.findIndex((item) => item.id === b.id);
      const aScore =
        a.synergy +
        a.intimacy * 0.32 +
        (state.queuedBuddyId === a.id ? 8 : 0) +
        (state.lastMatch?.buddyId === a.id ? 5 : 0) +
        (aIndex === loadoutFocusIndex ? 7 : 0);
      const bScore =
        b.synergy +
        b.intimacy * 0.32 +
        (state.queuedBuddyId === b.id ? 8 : 0) +
        (state.lastMatch?.buddyId === b.id ? 5 : 0) +
        (bIndex === loadoutFocusIndex ? 7 : 0);
      return bScore - aScore;
    });
  }, [loadoutFocusIndex, state.buddies, state.lastMatch?.buddyId, state.queuedBuddyId]);

  const currentBuddy = state.buddies.find((buddy) => buddy.id === state.queuedBuddyId) || null;
  const pairMission = state.missions.find((item) => item.id === "pair_2");
  const loadoutFocusBuddy = state.buddies[loadoutFocusIndex] ?? null;
  const duoWinRate =
    state.battleStats.buddyMatches === 0
      ? 0
      : Math.round((state.battleStats.buddyWins / state.battleStats.buddyMatches) * 100);
  const lastBuddyReport =
    state.lastMatch?.buddyId && state.lastMatch.buddyId === currentBuddy?.id ? state.lastMatch : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "搭子系统（联动实战推荐）" : "Buddy System (Battle-linked Ranking)"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "推荐不仅看固定默契，还会读取你最近实战表现、当前配装风格与赛季收益。"
            : "Ranking now blends fixed synergy with recent match data, active loadout style, and season rewards."}
        </Text>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "推荐搭子" : "Recommended Buddies"}</Text>
        <Text style={styles.smartTip}>
          {isZh
            ? `工坊当前偏好搭子：${loadoutFocusBuddy ? loadoutFocusBuddy.name : "无"}。`
            : `Workshop focus buddy: ${loadoutFocusBuddy ? loadoutFocusBuddy.name : "None"}.`}
        </Text>
        <View style={styles.list}>
          {topBuddies.map((buddy) => {
            const buddyIndex = state.buddies.findIndex((item) => item.id === buddy.id);
            const hasWorkshopBoost = buddyIndex === loadoutFocusIndex;
            return (
              <View key={buddy.id} style={styles.buddyItem}>
                <View style={styles.buddyMain}>
                  <Text style={styles.buddyName}>{buddy.name}</Text>
                  <Text style={styles.buddyMeta}>
                    {buddy.role} · {isZh ? "默契" : "Synergy"} {buddy.synergy}% · WR {buddy.winRate}%
                  </Text>
                  <Text style={styles.buddyMeta}>
                    {isZh ? "连胜" : "Streak"} {buddy.recentStreak} · {isZh ? "亲密度" : "Intimacy"} {buddy.intimacy} (
                    {intimacyLabel(buddy.intimacy, isZh)})
                  </Text>
                  {hasWorkshopBoost ? (
                    <Text style={styles.boostText}>
                      {isZh
                        ? "工坊联动加成：本局配装和该搭子默契效率更高"
                        : "Workshop boost: this buddy syncs better with your current style setup"}
                    </Text>
                  ) : null}
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
            );
          })}
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "组队状态" : "Current Squad Status"}</Text>
        <Text style={styles.desc}>
          {currentBuddy
            ? isZh
              ? `当前与你组队：${currentBuddy.name}。继续实战可提升亲密度和季票收益。`
              : `Queued with ${currentBuddy.name}. Real matches now increase bond and season returns.`
            : isZh
              ? "暂未锁定搭子。建议优先选择联动提示较高的推荐对象。"
              : "No buddy locked yet. Prioritize recommendations with stronger linkage hints."}
        </Text>
        {pairMission ? (
          <Text style={styles.progressText}>
            {isZh ? "赛季任务进度：" : "Season Mission Progress:"} {pairMission.progress}/{pairMission.target}
          </Text>
        ) : null}
        <View style={styles.duoStats}>
          <Text style={styles.duoText}>
            {isZh ? "双排实战：" : "Duo Match Data:"} {state.battleStats.buddyMatches} {isZh ? "场" : "matches"} · WR {duoWinRate}%
          </Text>
          <Text style={styles.duoText}>
            {isZh ? "最近一局联动收益：" : "Last Linked Gain:"} +{lastBuddyReport?.rewards.buddyBondGain ?? 0}{" "}
            {isZh ? "亲密度" : "bond"}
          </Text>
        </View>
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
  smartTip: {
    marginTop: 7,
    color: colors.electric,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
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
  boostText: {
    marginTop: 4,
    color: colors.electric,
    fontSize: 11,
    fontWeight: "700"
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
  },
  duoStats: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#F0FFF7",
    padding: 10,
    gap: 5
  },
  duoText: {
    color: colors.subText,
    fontSize: 12
  }
});
