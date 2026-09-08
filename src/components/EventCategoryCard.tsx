import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import type { EventCategory } from "@/src/types/booking";
import { categoryImageFor } from "@/src/constants/homeMedia";
import { colors, radius } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function EventCategoryCard({
  category,
  selected,
  onPress,
  width,
  height = 132,
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
      style={[styles.card, { height }, width != null ? { width } : styles.flexCard, selected && styles.cardSelected]}
    >
      <ImageBackground
        source={categoryImageFor(category.id)}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        <LinearGradient colors={["rgba(17,10,4,0.05)", "rgba(17,10,4,0.78)"]} style={styles.gradient}>
          {selected ? (
            <View style={styles.check} accessibilityElementsHidden>
              <Check size={12} color={colors.white} />
            </View>
          ) : null}
          <Text style={styles.label} numberOfLines={2}>
            {category.label}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius, overflow: "hidden" },
  flexCard: { flexGrow: 1, flexBasis: "47%", maxWidth: "48.5%" },
  cardSelected: { borderWidth: 2, borderColor: colors.primary },
  image: { flex: 1 },
  imageRadius: { borderRadius: radius },
  gradient: { flex: 1, justifyContent: "flex-end", padding: 10 },
  label: { color: colors.white, fontWeight: "800", fontSize: 12, lineHeight: 15 },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
