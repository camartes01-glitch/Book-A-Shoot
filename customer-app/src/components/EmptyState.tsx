import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/src/constants/theme";
import { Button } from "@/src/components/ui";

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm, alignSelf: "stretch" }}>
          <Button label={actionLabel} onPress={onAction} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink, textAlign: "center" },
  body: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
});
