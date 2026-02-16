import React, { useState } from "react";
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
          <TouchableOpacity
            key={option}
            style={[styles.chip, current === option && styles.chipActive]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.chipText, current === option && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function buildHighlightCard(loadout: WorkshopLoadout): string {
  return `10秒高光：${loadout.title} 触发 ${loadout.emote}，配上 ${loadout.spray} + ${loadout.sticker}，完成终局翻盘。`;
}

export function WorkshopScreen() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";
  const [highlightText, setHighlightText] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NeonCard>
        <Text style={styles.title}>{isZh ? "潮流工坊（高表达系统）" : "Trend Workshop (Style Expression)"}</Text>
        <Text style={styles.desc}>
          {isZh
            ? "自由组合喷漆、贴纸、动作与称号，沉淀个人风格资产，用于主页和分享传播。"
            : "Combine spray, stickers, emotes and titles into a persistent identity for profile and sharing."}
        </Text>
      </NeonCard>

      <NeonCard>
        <OptionSection
          label={isZh ? "喷漆风格" : "Spray"}
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
        <Text style={styles.sectionLabel}>{isZh ? "个人套装预览" : "Loadout Preview"}</Text>
        <View style={styles.preview}>
          <Text style={styles.previewMain}>{state.loadout.title}</Text>
          <Text style={styles.previewSub}>{state.loadout.spray}</Text>
          <Text style={styles.previewSub}>{state.loadout.sticker}</Text>
          <Text style={styles.previewSub}>{state.loadout.emote}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setHighlightText(buildHighlightCard(state.loadout))}
        >
          <Text style={styles.primaryButtonText}>{isZh ? "生成高光回放卡文案" : "Generate Highlight Copy"}</Text>
        </TouchableOpacity>

        {highlightText ? (
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>{highlightText}</Text>
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
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14
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
  }
});
