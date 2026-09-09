import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, MapPin, Pencil, Trash2 } from "lucide-react-native";
import type { EventDay } from "@/src/types/booking";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { dayMissingLabels, isDayComplete } from "@/src/engine/validation";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";

function categoryLabel(id: string): string {
  return DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function DayCard({
  day,
  onPress,
  onEdit,
  onDelete,
  onDisabledDelete,
  deletable,
  onMoveUp,
  onMoveDown,
}: {
  day: EventDay;
  onPress: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onDisabledDelete?: () => void;
  deletable: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const complete = isDayComplete(day);
  const typeLabel = day.eventTypeIds.length ? day.eventTypeIds.map(categoryLabel).join(" + ") : "Event type not set";
  const missing = complete ? [] : dayMissingLabels(day);

  const handleDelete = () => {
    if (!deletable) {
      if (onDisabledDelete) onDisabledDelete();
      else onDelete();
      return;
    }
    onDelete();
  };

  return (
    <View style={[styles.card, complete && styles.cardComplete]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Day ${day.order}, ${complete ? "complete" : "incomplete"}`}>
        <View style={styles.headerRow}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>Day {day.order}</Text>
          </View>
          {complete ? (
            <View style={styles.statusRow}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={styles.completeText}>Complete</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Circle size={16} color={colors.warning} />
              <Text style={styles.incompleteText}>Incomplete</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{typeLabel}</Text>
        <Text style={styles.meta}>
          {formatDateLong(day.eventDate)} · {formatTime12h(day.startTime)} – {formatTime12h(day.endTime)}
          {day.overnight ? " · Ends the next day" : ""}
        </Text>
        {day.location.formattedAddress ? (
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>
              {day.location.formattedAddress}
            </Text>
          </View>
        ) : null}
        {!complete && missing.length ? (
          <Text style={styles.missing} numberOfLines={2}>
            Add {missing.join(" · ")}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onEdit ?? onPress}
          style={styles.actionBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit day ${day.order}`}
          testID={`day-edit-btn-${day.dayId}`}
        >
          <Pencil size={14} color={colors.primaryDark} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={[styles.actionBtn, !deletable && { opacity: 0.4 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            deletable
              ? `Delete day ${day.order}`
              : `Cannot delete day ${day.order}, minimum one event day required`
          }
          testID={`day-delete-btn-${day.dayId}`}
        >
          <Trash2 size={14} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {onMoveUp ? (
          <Pressable onPress={onMoveUp} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move day up">
            <ChevronUp size={16} color={colors.ink} />
          </Pressable>
        ) : null}
        {onMoveDown ? (
          <Pressable onPress={onMoveDown} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Move day down">
            <ChevronDown size={16} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  cardComplete: { borderColor: colors.success, backgroundColor: "#F0FDF8" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayBadge: { backgroundColor: colors.peach, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  dayBadgeText: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  completeText: { fontSize: 11, fontWeight: "800", color: colors.success },
  incompleteText: { fontSize: 11, fontWeight: "800", color: colors.warning },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  missing: { fontSize: 12, fontWeight: "700", color: colors.warning, marginTop: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  actionText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
});
