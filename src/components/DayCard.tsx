import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Copy, MapPin, Trash2 } from "lucide-react-native";
import type { EventDay } from "@/src/types/booking";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { isDayComplete } from "@/src/engine/validation";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";

function categoryLabel(id: string): string {
  return DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function DayCard({
  day,
  onPress,
  onDuplicate,
  onDelete,
  deletable,
  onMoveUp,
  onMoveDown,
}: {
  day: EventDay;
  onPress: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  deletable: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const complete = isDayComplete(day);
  const typeLabel = day.eventTypeIds.length ? day.eventTypeIds.map(categoryLabel).join(" + ") : "Event type not set";

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>Day {day.order}</Text>
        </View>
        {complete ? <CheckCircle2 size={18} color={colors.success} /> : <Circle size={18} color={colors.muted} />}
      </View>
      <Text style={styles.title}>{typeLabel}</Text>
      <Text style={styles.meta}>
        {formatDateLong(day.eventDate)} · {formatTime12h(day.startTime)} – {formatTime12h(day.endTime)}
        {day.overnight ? " (+1 day)" : ""}
      </Text>
      {day.location.formattedAddress ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color={colors.muted} />
          <Text style={styles.meta} numberOfLines={1}>
            {day.location.formattedAddress}
          </Text>
        </View>
      ) : null}
      <View style={styles.actionsRow}>
        <Pressable onPress={onDuplicate} style={styles.actionBtn} hitSlop={8}>
          <Copy size={14} color={colors.primaryDark} />
          <Text style={styles.actionText}>Duplicate</Text>
        </Pressable>
        {deletable ? (
          <Pressable onPress={onDelete} style={styles.actionBtn} hitSlop={8}>
            <Trash2 size={14} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {onMoveUp ? (
          <Pressable onPress={onMoveUp} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Move day up">
            <ChevronUp size={16} color={colors.ink} />
          </Pressable>
        ) : null}
        {onMoveDown ? (
          <Pressable onPress={onMoveDown} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Move day down">
            <ChevronDown size={16} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    padding: spacing.md,
    gap: 6,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayBadge: { backgroundColor: colors.peach, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  dayBadgeText: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
});
