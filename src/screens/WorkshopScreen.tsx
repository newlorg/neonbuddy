import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NeonCard } from "../components/NeonCard";
import { useApp } from "../store/AppContext";
import { colors, radius } from "../theme/tokens";
import { WorkshopLoadout } from "../types/models";

interface SectionProps {
  label: string;
  current: string;
  options: string[];
  onSelect: (value: string) => void;
}

function OptionSection({ label, current, options, onSelect }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <TouchableOpacity key={option} style={[styles.chip, current === option && styles.chipActive]} onPress={() => onSelect(option)}>
            <Text style={[styles.chipText, current === option && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function getTier(options: string[], selected: string): number {
  return Math.max(0, options.indexOf(selected));
}

function buildHighlightCard(
  loadout: WorkshopLoadout,
  isZh: boolean,
  context: { buddyName: string | null; styleGrade: string | null; allyScore: number | null; enemyScore: number | null }
): string {
  const scorePart =
    context.allyScore !== null && context.enemyScore !== null ? `${context.allyScore}:${context.enemyScore}` : isZh ? "未开局" : "No match yet";
  const gradePart = context.styleGrade ?? (isZh ? "待评定" : "Pending");
  const buddyPart = context.buddyName ?? (isZh ? "未组搭子" : "No buddy");

  if (isZh) {
    return `高光回放：${loadout.title} 用 ${loadout.emote} 触发关键拦截，配装 ${loadout.spray} + ${loadout.sticker}，搭子 ${buddyPart}，本局比分 ${scorePart}，风格评级 ${gradePart}。`;
  }
  return `Highlight: ${loadout.title} triggered a clutch ${loadout.emote} play with ${loadout.spray} + ${loadout.sticker}, buddy ${buddyPart}, final ${scorePart}, style grade ${gradePart}.`;
}

export function WorkshopScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";
  const [highlightText, setHighlightText] = useState("");

  const sprayTier = getTier(state.options.sprays, state.loadout.spray);
  const stickerTier = getTier(state.options.stickers, state.loadout.sticker);
  const emoteTier = getTier(state.options.emotes, state.loadout.emote);
  const titleTier = getTier(state.options.titles, state.loadout.title);

  const linkedBuff = useMemo(() => {
    const speedPct = Math.round((0.02 * sprayTier + 0.015 * titleTier) * 100);
    const tacklePct = Math.round((0.03 * stickerTier + 0.02 * emoteTier) * 100);
    const interceptRange = titleTier * 4 + emoteTier * 2;
    const passXp = 2 + titleTier + emoteTier;
    return { speedPct, tacklePct, interceptRange, passXp };
  }, [emoteTier, sprayTier, titleTier, stickerTier]);

  const currentBuddy = state.queuedBuddyId ? state.buddies.find((item) => item.id === state.queuedBuddyId) ?? null : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "潮流工坊（实战联动配置台）" : "Trend Workshop (Battle-linked Setup)"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "这里不只改外观：每个配装会影响实战手感、搭子推荐和赛季收益。"
            : "This is no longer cosmetic-only. Loadout now affects combat feel, buddy recommendation, and season gains."}
        </Text>
      </NeonCard>

      <NeonCard>
        <OptionSection
          label={isZh ? "喷涂风格" : "Spray"}
          current={state.loadout.spray}
          options={state.options.sprays}
          onSelect={(value) => dispatch({ type: "SET_LOADOUT", field: "spray", value })}
        />
        <OptionSection
          label={isZh ? "贴纸元素" : "Sticker"}
          current={state.loadout.sticker}
          options={state.options.stickers}
          onSelect={(value) => dispatch({ type: "SET_LOADOUT", field: "sticker", value })}
        />
        <OptionSection
          label={isZh ? "庆祝动作" : "Emote"}
          current={state.loadout.emote}
          options={state.options.emotes}
          onSelect={(value) => dispatch({ type: "SET_LOADOUT", field: "emote", value })}
        />
        <OptionSection
          label={isZh ? "主页称号" : "Title"}
          current={state.loadout.title}
          options={state.options.titles}
          onSelect={(value) => dispatch({ type: "SET_LOADOUT", field: "title", value })}
        />
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionLabel}>{isZh ? "实战联动加成" : "Combat Link Bonuses"}</Text>
        <View style={styles.linkGrid}>
          <View style={styles.linkItem}>
            <Text style={styles.linkLabel}>{isZh ? "移速加成" : "Move Speed"}</Text>
            <Text style={styles.linkValue}>+{linkedBuff.speedPct}%</Text>
          </View>
          <View style={styles.linkItem}>
            <Text style={styles.linkLabel}>{isZh ? "拦截范围" : "Intercept Range"}</Text>
            <Text style={styles.linkValue}>+{linkedBuff.interceptRange}</Text>
          </View>
          <View style={styles.linkItem}>
            <Text style={styles.linkLabel}>{isZh ? "拦截成功率" : "Tackle Chance"}</Text>
            <Text style={styles.linkValue}>+{linkedBuff.tacklePct}%</Text>
          </View>
          <View style={styles.linkItem}>
            <Text style={styles.linkLabel}>{isZh ? "赛季XP增益" : "Pass XP Boost"}</Text>
            <Text style={styles.linkValue}>+{linkedBuff.passXp}</Text>
          </View>
        </View>
      </NeonCard>

      <NeonCard>
        <Text style={styles.sectionLabel}>{isZh ? "个人套装预览" : "Loadout Preview"}</Text>
        <View style={styles.preview}>
          <Text style={styles.previewMain}>{state.loadout.title}</Text>
          <Text style={styles.previewSub}>{state.loadout.spray}</Text>
          <Text style={styles.previewSub}>{state.loadout.sticker}</Text>
          <Text style={styles.previewSub}>{state.loadout.emote}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setHighlightText(
              buildHighlightCard(state.loadout, isZh, {
                buddyName: currentBuddy?.name ?? null,
                styleGrade: state.lastMatch?.styleGrade ?? null,
                allyScore: state.lastMatch?.allyScore ?? null,
                enemyScore: state.lastMatch?.enemyScore ?? null
              })
            );
            dispatch({ type: "PUBLISH_HIGHLIGHT" });
          }}
        >
          <Text style={styles.primaryButtonText}>{isZh ? "发布高光回放文案（联动赛季收益）" : "Publish Highlight Copy (Season-linked reward)"}</Text>
        </TouchableOpacity>

        {highlightText ? (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>{highlightText}</Text>
            <Text style={styles.highlightMeta}>
              {isZh ? "累计已发布高光：" : "Total published highlights:"} {state.battleStats.styleHighlights}
            </Text>
          </View>
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
  section: {
    marginBottom: 12
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "800"
  },
  chips: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F2FFF8"
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  chipText: {
    fontSize: 12,
    color: colors.subText,
    fontWeight: "700"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  linkGrid: {
    marginTop: 9,
    gap: 8
  },
  linkItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#EDFFF8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  linkLabel: {
    color: colors.subText,
    fontSize: 12
  },
  linkValue: {
    color: colors.electric,
    fontSize: 13,
    fontWeight: "900"
  },
  preview: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: "#F0FFF7"
  },
  previewMain: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.text
  },
  previewSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.subText
  },
  primaryButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center"
  },
  highlightBox: {
    marginTop: 10,
    backgroundColor: "#E9F9FF",
    borderWidth: 1,
    borderColor: "#B7E9FF",
    borderRadius: radius.md,
    padding: 10
  },
  highlightText: {
    color: colors.text,
    lineHeight: 19,
    fontSize: 13
  },
  highlightMeta: {
    marginTop: 7,
    color: colors.electric,
    fontSize: 12,
    fontWeight: "800"
  }
});
