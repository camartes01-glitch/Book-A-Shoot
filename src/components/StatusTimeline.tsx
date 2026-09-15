import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { Booking, BookingStatus } from "@/src/types/booking";
import { STATUS_LABEL } from "@/src/domain/statusLabels";
import { getEffectiveBookingStatus } from "@/src/domain/bookingFilters";
import { colors } from "@/src/constants/theme";

/** Linear status progression. Alternate/terminal states are shown separately. */
export const HAPPY_PATH: BookingStatus[] = [
  "SUBMITTED",
  "MATCHING",
  "VENDOR_SELECTED",
  "REQUEST_SENT",
  "VENDOR_ACCEPTED",
  "CUSTOMER_CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function StatusTimeline({ status, booking }: { status: BookingStatus; booking?: Booking }) {
  const effectiveStatus: BookingStatus = booking
    ? getEffectiveBookingStatus(booking)
    : status === "PAYMENT_PENDING" || status === "CONFIRMED"
      ? "CUSTOMER_CONFIRMED"
      : status;

  const activeIndex = HAPPY_PATH.indexOf(effectiveStatus);

  return (
    <View style={styles.wrap}>
      {HAPPY_PATH.map((s, i) => {
        const done = activeIndex >= 0 && i <= activeIndex;
        const isLast = i === HAPPY_PATH.length - 1;
        return (
          <View key={s} style={styles.row}>
            <View style={styles.markerCol}>
              <View style={[styles.dot, done && styles.dotDone]}>{done ? <Check size={11} color={colors.white} /> : null}</View>
              {!isLast ? <View style={[styles.line, activeIndex > i && styles.lineDone]} /> : null}
            </View>
            <Text style={[styles.label, done && styles.labelDone]}>{STATUS_LABEL[s]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  markerCol: { alignItems: "center", width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.primary },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.peach },
  lineDone: { backgroundColor: colors.primary },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", paddingBottom: 14, paddingTop: 2 },
  labelDone: { color: colors.ink, fontWeight: "800" },
});
