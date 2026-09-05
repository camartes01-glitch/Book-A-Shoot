import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock } from "lucide-react-native";
import { colors } from "@/src/constants/theme";
import { formatDateLong, formatTime12h } from "@/src/utils/format";

function toDate(iso: string | null): Date {
  if (!iso) return new Date();
  return new Date(`${iso}T00:00:00`);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setShow(Platform.OS === "ios");
    if (event.type === "dismissed") {
      setShow(false);
      return;
    }
    if (date) onChange(toIsoDate(date));
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)} accessibilityRole="button">
        <CalendarDays size={16} color={colors.primaryDark} />
        <Text style={styles.value}>{value ? formatDateLong(value) : "Select a date"}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={minimumDate}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

function toTimeDate(hhmm: string | null): Date {
  const d = new Date();
  if (hhmm) {
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(18, 0, 0, 0);
  }
  return d;
}

function toHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (hhmm: string) => void }) {
  const [show, setShow] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setShow(Platform.OS === "ios");
    if (event.type === "dismissed") {
      setShow(false);
      return;
    }
    if (date) onChange(toHhmm(date));
  };

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)} accessibilityRole="button">
        <Clock size={16} color={colors.primaryDark} />
        <Text style={styles.value}>{value ? formatTime12h(value) : "Select time"}</Text>
      </Pressable>
      {show ? <DateTimePicker value={toTimeDate(value)} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onPickerChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  value: { fontSize: 15, fontWeight: "600", color: colors.text },
});
