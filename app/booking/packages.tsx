import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Badge, Button, Card, Muted, Title } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import type { PackageTierId } from "@/src/types/booking";
import { formatInr } from "@/src/utils/format";
import { colors } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export default function PackagesScreen() {
  const { activeDraft, selectPackage } = useAppStore();
  const [selected, setSelected] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [loading, setLoading] = useState(false);
  const [openDetails, setOpenDetails] = useState<PackageTierId | null>(
    activeDraft?.packageOptions?.find((p) => p.recommended)?.id ?? null,
  );

  if (!activeDraft?.packageOptions) return null;

  const onContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await selectPackage(selected);
      router.push("/booking/matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen
      title="Choose what works"
      step="packages"
      footer={<Button label="Find providers" onPress={onContinue} disabled={!selected} loading={loading} flex={1} />}
    >
      <Muted>Compare packages generated from your requirements.</Muted>

      {activeDraft.packageOptions.map((pkg) => {
        const isSelected = selected === pkg.id;
        const highlights = pkg.bullets.slice(0, 3);
        const rest = pkg.bullets.slice(3);
        const expanded = openDetails === pkg.id;
        return (
          <Card key={pkg.id} accent={isSelected} style={pkg.recommended && !isSelected ? { borderColor: colors.peachBorder } : undefined}>
            <Pressable
              onPress={() => {
                void selectionFeedback();
                setSelected(pkg.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${pkg.label} package`}
            >
              <View style={styles.head}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <Title>{pkg.label}</Title>
                    {pkg.recommended ? <Badge label="Recommended" /> : null}
                    {isSelected ? <Badge label="Selected" tone="green" /> : null}
                  </View>
                  <Text style={styles.price}>
                    {formatInr(pkg.minPrice)} – {formatInr(pkg.maxPrice)}
                  </Text>
                  <Muted numberOfLines={expanded ? 4 : 2}>{pkg.headline}</Muted>
                </View>
              </View>
            </Pressable>
            <View style={{ gap: 6 }}>
              {highlights.map((b) => (
                <View key={b} style={styles.bullet}>
                  <CheckCircle2 size={14} color={colors.success} />
                  <Muted style={{ flex: 1 }}>{b}</Muted>
                </View>
              ))}
              {expanded
                ? rest.map((b) => (
                    <View key={b} style={styles.bullet}>
                      <CheckCircle2 size={14} color={colors.success} />
                      <Muted style={{ flex: 1 }}>{b}</Muted>
                    </View>
                  ))
                : null}
              {rest.length ? (
                <Pressable onPress={() => setOpenDetails(expanded ? null : pkg.id)} hitSlop={8}>
                  <Text style={styles.details}>{expanded ? "Hide details" : "View details"}</Text>
                </Pressable>
              ) : null}
            </View>
            <Button
              label={isSelected ? "Selected" : "Select package"}
              variant={isSelected ? "primary" : "outline"}
              onPress={() => {
                void selectionFeedback();
                setSelected(pkg.id);
              }}
            />
          </Card>
        );
      })}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  price: { fontSize: 20, fontWeight: "800", color: colors.primaryDark },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  details: { fontSize: 13, fontWeight: "800", color: colors.primaryDark, marginTop: 2 },
});
