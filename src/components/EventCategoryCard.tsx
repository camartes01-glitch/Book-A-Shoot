import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { EventCategory } from "@/src/types/booking";
import { colors } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";
import { getEventIcon } from "@/src/components/EventCategoryIcon";

export function EventCategoryCard({
  category,
  selected,
  onPress,
  width,
  height = 48,
}: {
  category: EventCategory;
  selected?: boolean;
  onPress: () => void;
  width?: number;
  height?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        void selectionFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={category.label}
      style={[
        styles.card,
        { minHeight: height },
        width != null ? { width } : styles.flexCard,
        selected && styles.cardSelected,
      ]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        {getEventIcon(category.id, 17, colors.primary)}
      </View>

      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {category.label}
      </Text>

      {selected ? (
        <View style={styles.check} accessibilityElementsHidden>
          <Check size={11} color={colors.white} strokeWidth={2.8} />
        </View>
      ) : (
        <View style={styles.unselectedIndicator} accessibilityElementsHidden />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EDE8E1",
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  flexCard: {
    flexGrow: 1,
    flexBasis: "47%",
    maxWidth: "48.5%",
  },
  cardSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  iconWrapSelected: {
    backgroundColor: "#FFEDD5",
  },
  label: {
    flex: 1,
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.2,
  },
  labelSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  check: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  unselectedIndicator: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginLeft: 4,
  },
});


