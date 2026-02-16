import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { OnboardingGuide } from "./src/components/OnboardingGuide";
import { TabSwitcher } from "./src/components/TabSwitcher";
import { BuddyScreen } from "./src/screens/BuddyScreen";
import { CommunityScreen } from "./src/screens/CommunityScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SeasonScreen } from "./src/screens/SeasonScreen";
import { WorkshopScreen } from "./src/screens/WorkshopScreen";
import { AppProvider, useApp } from "./src/store/AppContext";
import { colors } from "./src/theme/tokens";

function MainShell() {
  const { state, dispatch } = useApp();
  const isZh = state.locale === "zh-CN";
  const [guideVisible, setGuideVisible] = useState(true);

  const titleMap = {
    "zh-CN": {
      home: "对局中枢",
      buddy: "搭子系统",
      workshop: "潮流工坊",
      season: "赛季与商城",
      community: "社区与LiveOps"
    },
    "en-US": {
      home: "Match Center",
      buddy: "Buddy System",
      workshop: "Style Workshop",
      season: "Season & Economy",
      community: "Community & LiveOps"
    }
  };

  const screen = (() => {
    switch (state.activeTab) {
      case "home":
        return <HomeScreen />;
      case "buddy":
        return <BuddyScreen />;
      case "workshop":
        return <WorkshopScreen />;
      case "season":
        return <SeasonScreen />;
      case "community":
        return <CommunityScreen />;
      default:
        return <HomeScreen />;
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>霓虹搭子：RushLab</Text>
          <Text style={styles.subtitle}>
            {isZh ? "3-5分钟快节奏 · 社交先于数值 · 公平竞技" : "3-5 min pace · Social-first · Fair PvP"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.helpBtn} onPress={() => setGuideVisible(true)}>
            <Text style={styles.helpText}>{isZh ? "教程" : "Guide"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.localeBtn} onPress={() => dispatch({ type: "TOGGLE_LOCALE" })}>
            <Text style={styles.localeText}>{isZh ? "EN" : "中文"}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.titleBar}>
        <Text style={styles.title}>{titleMap[state.locale][state.activeTab]}</Text>
      </View>
      <View style={styles.content}>{screen}</View>
      <TabSwitcher
        activeTab={state.activeTab}
        locale={state.locale}
        onChange={(tab) => dispatch({ type: "SET_TAB", tab })}
      />
      <OnboardingGuide locale={state.locale} visible={guideVisible} onClose={() => setGuideVisible(false)} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  brand: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900"
  },
  subtitle: {
    marginTop: 3,
    color: colors.subText,
    fontSize: 12
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  helpBtn: {
    minWidth: 56,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F0F8FF",
    alignItems: "center",
    justifyContent: "center"
  },
  helpText: {
    color: colors.electric,
    fontWeight: "800"
  },
  localeBtn: {
    minWidth: 52,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EDFFF6",
    alignItems: "center",
    justifyContent: "center"
  },
  localeText: {
    color: colors.text,
    fontWeight: "800"
  },
  titleBar: {
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  title: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900"
  },
  content: {
    flex: 1
  }
});
