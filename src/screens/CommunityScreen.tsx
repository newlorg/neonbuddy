import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";

export function CommunityScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "社区挑战图（每周新鲜供给）" : "Community Challenge Maps"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "官方精选 + 玩家创意双轨更新，降低内容更新压力并保持新鲜感。"
            : "Dual-track supply from official picks and player creativity keeps content fresh with lower dev pressure."}
        </Text>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "本周精选地图" : "Weekly Featured Maps"}</Text>
        <View style={styles.mapList}>
          {state.challengeMaps.map((map) => (
            <View key={map.id} style={styles.mapItem}>
              <View style={styles.mapMain}>
                <Text style={styles.mapName}>{map.name}</Text>
                <Text style={styles.mapMeta}>
                  #{map.styleTag} · {isZh ? "通关率" : "Clear Rate"} {map.completionRate}%
                </Text>
                <Text style={styles.mapMeta}>
                  {isZh ? "点赞" : "Likes"} {map.likes.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.likeBtn} onPress={() => dispatch({ type: "LIKE_MAP", mapId: map.id })}>
                <Text style={styles.likeText}>{isZh ? "点赞" : "Like"}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "街区团（30人协作社群）" : "Street Group (30-player Squad)"}</Text>
        <Text style={styles.groupText}>
          {state.streetGroup.name} · {isZh ? "成员" : "Members"} {state.streetGroup.memberCount}/30 ·{" "}
          {isZh ? "周协作分" : "Weekly Co-op"} {state.streetGroup.weekCoopScore} · {isZh ? "排名" : "Rank"} #
          {state.streetGroup.rank}
        </Text>
        <Text style={styles.desc}>
          {isZh
            ? "排行榜偏协作指标，不只看击杀；默认开启文明聊天过滤与举报闭环。"
            : "Ranking favors collaborative metrics beyond kills, with default civility filter and report loop."}
        </Text>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionTitle}>{isZh ? "LiveOps 节奏" : "LiveOps Rhythm"}</Text>
        <View style={styles.schedule}>
          {state.liveOps.map((item) => (
            <Text key={item} style={styles.scheduleItem}>
              {item}
            </Text>
          ))}
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
  mapList: {
    marginTop: 10,
    gap: 8
  },
  mapItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#F2FFF8",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  mapMain: {
    flex: 1
  },
  mapName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14
  },
  mapMeta: {
    marginTop: 3,
    color: colors.subText,
    fontSize: 12
  },
  likeBtn: {
    minWidth: 68,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.electric,
    backgroundColor: "#E8F8FF",
    alignItems: "center",
    justifyContent: "center"
  },
  likeText: {
    color: colors.electric,
    fontWeight: "800",
    fontSize: 12
  },
  groupText: {
    marginTop: 8,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  schedule: {
    marginTop: 8,
    gap: 6
  },
  scheduleItem: {
    fontSize: 13,
    color: colors.subText,
    lineHeight: 20
  }
});
