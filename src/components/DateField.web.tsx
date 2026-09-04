import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalendarDays, Clock } from "lucide-react-native";
import { colors } from "@/src/constants/theme";

/**
 * Web build of the date/time fields.
 *
 * `@react-native-community/datetimepicker` has no web implementation, so the
 * native version of this component would crash the screen as soon as the
 * picker is opened in a browser. Metro/Expo automatically prefer this
 * `.web.tsx` file over `DateField.tsx` when bundling for web, so native
 * builds are unaffected — this file renders plain HTML `<input type="date">`
 * / `<input type="time">` elements instead, which happen to use the exact
 * same `yyyy-MM-dd` / `HH:mm` string formats this app already stores.
 */

const fieldStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: `1px solid ${colors.peachBorder}`,
  backgroundColor: colors.cream,
  borderRadius: 12,
  padding: "12px",
};

const inputStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 15,
  fontWeight: 600,
  color: colors.text,
  fontFamily: "inherit",
  outline: "none",
  flex: 1,
  minWidth: 0,
};

function toIso(d: Date): string {
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
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={fieldStyle as object}>
        <CalendarDays size={16} color={colors.primaryDark} />
        {React.createElement("input", {
          type: "date",
          value: value ?? "",
          min: minimumDate ? toIso(minimumDate) : undefined,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) onChange(e.target.value);
          },
          style: inputStyle,
        })}
      </View>
    </View>
  );
}

export function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (hhmm: string) => void }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={fieldStyle as object}>
        <Clock size={16} color={colors.primaryDark} />
        {React.createElement("input", {
          type: "time",
          value: value ?? "",
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) onChange(e.target.value);
          },
          style: inputStyle,
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
