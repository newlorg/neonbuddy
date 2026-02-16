import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme/tokens";

interface Props {
  label: string;
  value: string;
}

export function StatBadge({ label, value }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 94,
    backgroundColor: "#E8FFF4",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  label: {
    fontSize: 10,
    color: colors.subText,
    fontWeight: "600"
  },
  value: {
    marginTop: 3,
    fontSize: 16,
    color: colors.text,
    fontWeight: "800"
  }
});
