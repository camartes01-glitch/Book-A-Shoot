import { StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "@/src/constants/theme";

export function RatingStars({ rating, showValue = true }: { rating: number; showValue?: boolean }) {
  return (
    <View style={styles.row}>
      <Star size={14} color={colors.warning} fill={colors.warning} />
      {showValue ? <Text style={styles.text}>{rating.toFixed(1)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  text: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
