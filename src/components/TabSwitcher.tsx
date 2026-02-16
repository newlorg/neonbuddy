import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTab, Locale } from "../types/models";
import { colors, radius } from "../theme/tokens";

interface Props {
  activeTab: AppTab;
  locale: Locale;
  onChange: (tab: AppTab) => void;
}

const tabOrder: AppTab[] = ["home", "buddy", "workshop", "season", "community"];

const labels: Record<Locale, Record<AppTab, string>> = {
  "zh-CN": {
    home: "对局",
    buddy: "搭子",
    workshop: "工坊",
    season: "赛季",
    community: "社区"
  },
  "en-US": {
    home: "Match",
    buddy: "Buddy",
    workshop: "Workshop",
    season: "Season",
    community: "Community"
  }
};

export function TabSwitcher({ activeTab, locale, onChange }: Props) {
  return (
    <View style={styles.container}>
      {tabOrder.map((tab) => {
        const selected = tab === activeTab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selected && styles.tabActive]}
            onPress={() => onChange(tab)}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{labels[locale][tab]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F0FBF5"
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabText: {
    color: colors.subText,
    fontSize: 12,
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#FFFFFF"
  }
});
