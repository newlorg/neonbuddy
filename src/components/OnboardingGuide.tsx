import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, shadow } from "../theme/tokens";
import { Locale } from "../types/models";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  tips: string[];
}

interface Props {
  locale: Locale;
  visible: boolean;
  onClose: () => void;
}

function getGuideSteps(locale: Locale): GuideStep[] {
  if (locale === "zh-CN") {
    return [
      {
        id: "intent",
        title: "1. 这款游戏的设计初衷",
        description: "把一局控制在 3-5 分钟，让你在碎片时间也能体验高质量组队竞技。",
        tips: [
          "强调社交协作，和搭子一起玩收益更高",
          "强调表达感，用工坊搭建你的风格标签",
          "强调公平，不出售破坏对局公平的数值"
        ]
      },
      {
        id: "goal",
        title: "2. 核心目标是什么",
        description: "在 4v4 能量争夺战中，运送能量芯片回己方核心站点，分数更高的一方获胜。",
        tips: [
          "开局 0:00-0:30：抢中立芯片",
          "中盘 0:30-2:30：拉扯、拦截、护送",
          "终局 2:30-4:00：高价值芯片决定翻盘"
        ]
      },
      {
        id: "strategy",
        title: "3. 推荐策略",
        description: "新手优先做到“控图 + 团队节奏一致”，胜率会比单纯拼操作更稳定。",
        tips: [
          "双排时优先选互补定位（突进 + 支援 / 控场 + 干扰）",
          "落后时主动利用追击机制，找拦截机会",
          "赛后优先点击“继续组队”，累积搭子亲密度"
        ]
      },
      {
        id: "controls",
        title: "4. 这版 Demo 如何操作",
        description: "先熟悉核心循环，再进入真实联机版本。",
        tips: [
          "在“对局中枢”点击“开始 4v4 对局”",
          "对局中可点“我方运送 +1 / 敌方偷运 +1”理解得分变化",
          "底部切换“搭子/工坊/赛季/社区”体验完整系统"
        ]
      }
    ];
  }

  return [
    {
      id: "intent",
      title: "1. Design Intent",
      description: "Each round lasts 3-5 minutes so players can enjoy full team competition in short sessions.",
      tips: [
        "Social-first: squad play should feel better than solo grind",
        "Expression-first: workshop identity is a long-term asset",
        "Fair-first: no pay-to-win combat power"
      ]
    },
    {
      id: "goal",
      title: "2. Core Objective",
      description: "In 4v4 Energy Heist, escort energy chips to your core station and finish with a higher score.",
      tips: [
        "0:00-0:30 Opening: contest neutral chips",
        "0:30-2:30 Mid game: rotate, intercept, escort",
        "2:30-4:00 Endgame: high-value chips enable comeback"
      ]
    },
    {
      id: "strategy",
      title: "3. Recommended Strategy",
      description: "Prioritize map control and team rhythm before advanced mechanics for more consistent wins.",
      tips: [
        "Use complementary roles in duo queue",
        "When behind, force intercept plays with catch-up timing",
        "Keep the same partner to build intimacy and rewards"
      ]
    },
    {
      id: "controls",
      title: "4. How To Play This Demo",
      description: "Learn the core loop first, then move to full online multiplayer later.",
      tips: [
        "Tap 'Start 4v4 Match' in Match Center",
        "Use score buttons to simulate escort and steal outcomes",
        "Switch tabs at bottom: Buddy, Workshop, Season, Community"
      ]
    }
  ];
}

export function OnboardingGuide({ locale, visible, onClose }: Props) {
  const steps = useMemo(() => getGuideSteps(locale), [locale]);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const closeGuide = () => {
    setStepIndex(0);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{locale === "zh-CN" ? "新手引导" : "Starter Guide"}</Text>
            <TouchableOpacity onPress={closeGuide}>
              <Text style={styles.skip}>{locale === "zh-CN" ? "跳过" : "Skip"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressRow}>
            {steps.map((step, index) => (
              <View key={step.id} style={[styles.dot, index <= stepIndex && styles.dotActive]} />
            ))}
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.description}>{currentStep.description}</Text>
            <View style={styles.tipList}>
              {currentStep.tips.map((tip) => (
                <Text key={tip} style={styles.tipItem}>
                  • {tip}
                </Text>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.secondaryBtn, stepIndex === 0 && styles.secondaryBtnDisabled]}
              disabled={stepIndex === 0}
              onPress={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            >
              <Text style={styles.secondaryBtnText}>{locale === "zh-CN" ? "上一步" : "Back"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => (isLastStep ? closeGuide() : setStepIndex((prev) => prev + 1))}
            >
              <Text style={styles.primaryBtnText}>
                {isLastStep ? (locale === "zh-CN" ? "开始体验" : "Start Playing") : locale === "zh-CN" ? "下一步" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 20, 16, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14
  },
  panel: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "90%",
    backgroundColor: "#FCFFFD",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: "900"
  },
  skip: {
    color: colors.subText,
    fontWeight: "700"
  },
  progressRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 6
  },
  dot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#D5EDE1"
  },
  dotActive: {
    backgroundColor: colors.primary
  },
  content: {
    marginTop: 12
  },
  contentInner: {
    gap: 8
  },
  title: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "900"
  },
  description: {
    color: colors.subText,
    fontSize: 13,
    lineHeight: 20
  },
  tipList: {
    marginTop: 4,
    gap: 6
  },
  tipItem: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#EEF8F2",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryBtnDisabled: {
    opacity: 0.45
  },
  secondaryBtnText: {
    color: colors.subText,
    fontWeight: "800"
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "900"
  }
});
