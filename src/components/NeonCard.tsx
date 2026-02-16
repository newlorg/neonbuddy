import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { colors, radius, shadow } from "../theme/tokens";

export function NeonCard(props: ViewProps) {
  return <View {...props} style={[styles.card, props.style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow
  }
});
