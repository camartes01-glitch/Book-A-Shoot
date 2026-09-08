import { createElement, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, touchTarget } from "@/src/constants/theme";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { normalizeHtmlDateValue, normalizeHtmlTimeValue, usesHtmlDateTimeInputs } from "@/src/utils/dateTime";
import { Button } from "@/src/components/ui";

const webInputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 15,
  fontWeight: 700,
  color: colors.text,
  minHeight: touchTarget,
  width: "100%",
} as const;

function toDate(iso: string | null): Date {
  if (!iso) return new Date();
  return new Date(`${iso}T00:00:00`);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function PickerSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss picker" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
          <Button label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
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
  const [draft, setDraft] = useState(() => toDate(value));

  const open = () => {
    setDraft(toDate(value));
    setShow(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (event.type === "dismissed") return;
    if (date) onChange(toIsoDate(date));
  };

  const confirmIos = () => {
    onChange(toIsoDate(draft));
    setShow(false);
  };

  if (usesHtmlDateTimeInputs(Platform.OS)) {
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.field}>
          <CalendarDays size={18} color={colors.primaryDark} />
          {createElement("input", {
            type: "date",
            "aria-label": label,
            value: value ?? "",
            min: minimumDate ? toIsoDate(minimumDate) : undefined,
            onChange: (event: { target: { value: string } }) => {
              const next = normalizeHtmlDateValue(event.target.value);
              if (next) onChange(next);
            },
            style: webInputStyle,
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={open} accessibilityRole="button" accessibilityLabel={label}>
        <CalendarDays size={18} color={colors.primaryDark} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatDateLong(value) : "Select date"}</Text>
      </Pressable>
      {Platform.OS === "android" && show ? (
        <DateTimePicker value={toDate(value)} mode="date" display="default" minimumDate={minimumDate} onChange={onAndroidChange} />
      ) : null}
      {Platform.OS === "ios" ? (
        <PickerSheet visible={show} title={label} onClose={confirmIos}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            onChange={(_e, date) => {
              if (date) setDraft(date);
            }}
          />
        </PickerSheet>
      ) : null}
    </View>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (hhmm: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => toTimeDate(value));

  const open = () => {
    setDraft(toTimeDate(value));
    setShow(true);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShow(false);
    if (event.type === "dismissed") return;
    if (date) onChange(toHhmm(date));
  };

  const confirmIos = () => {
    onChange(toHhmm(draft));
    setShow(false);
  };

  if (usesHtmlDateTimeInputs(Platform.OS)) {
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.field}>
          <Clock size={18} color={colors.primaryDark} />
          {createElement("input", {
            type: "time",
            "aria-label": label,
            value: value ?? "",
            onChange: (event: { target: { value: string } }) => {
              const next = normalizeHtmlTimeValue(event.target.value);
              if (next) onChange(next);
            },
            style: webInputStyle,
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={open} accessibilityRole="button" accessibilityLabel={label}>
        <Clock size={18} color={colors.primaryDark} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatTime12h(value) : placeholder ?? "Select time"}</Text>
      </Pressable>
      {Platform.OS === "android" && show ? (
        <DateTimePicker value={toTimeDate(value)} mode="time" display="default" onChange={onAndroidChange} />
      ) : null}
      {Platform.OS === "ios" ? (
        <PickerSheet visible={show} title={label} onClose={confirmIos}>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            onChange={(_e, date) => {
              if (date) setDraft(date);
            }}
          />
        </PickerSheet>
      ) : null}
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
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius,
    paddingHorizontal: 14,
    minHeight: touchTarget + 4,
  },
  value: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  placeholder: { color: colors.muted, fontWeight: "600" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(17,24,39,0.35)" },
  sheet: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: spacing.md,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, textAlign: "center" },
});
