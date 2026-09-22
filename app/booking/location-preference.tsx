import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check, Compass, MapPin, Navigation } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { PlaceAutocompleteField } from "@/src/components/PlaceAutocompleteField";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, radius, spacing } from "@/src/constants/theme";
import type { ProviderLocationPreference } from "@/src/types/booking";

export default function ProviderLocationPreferenceScreen() {
  const { activeDraft, setProviderLocationPreference } = useAppStore();
  const firstDay = activeDraft?.days?.[0];
  const defaultCity = firstDay?.location.city || "Hyderabad";
  const defaultAddress = firstDay?.location.formattedAddress || "";

  const [mode, setMode] = useState<ProviderLocationPreference["mode"]>(
    activeDraft?.providerLocationPreference?.mode ?? "event_location",
  );
  const [customCity, setCustomCity] = useState(
    activeDraft?.providerLocationPreference?.mode === "preferred_area"
      ? activeDraft.providerLocationPreference.city ?? ""
      : "",
  );
  const [anotherCity, setAnotherCity] = useState<{ city: string; formattedAddress: string } | null>(
    activeDraft?.providerLocationPreference?.mode === "another_area" && activeDraft.providerLocationPreference.city
      ? {
          city: activeDraft.providerLocationPreference.city,
          formattedAddress: activeDraft.providerLocationPreference.formattedAddress || activeDraft.providerLocationPreference.city,
        }
      : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pref = activeDraft?.providerLocationPreference;
    if (!pref) return;
    setMode(pref.mode);
    if (pref.mode === "preferred_area" && pref.city) {
      setCustomCity(pref.city);
    }
    if (pref.mode === "another_area" && pref.city) {
      setAnotherCity({ city: pref.city, formattedAddress: pref.formattedAddress || pref.city });
    }
  }, [activeDraft?.providerLocationPreference]);

  const onContinue = async () => {
    setLoading(true);
    try {
      const pref: ProviderLocationPreference =
        mode === "event_location"
          ? { mode, city: firstDay?.location.city || defaultCity, formattedAddress: defaultAddress }
          : mode === "another_area"
            ? {
                mode,
                city: anotherCity?.city || defaultCity,
                formattedAddress: anotherCity?.formattedAddress || anotherCity?.city || "",
              }
            : { mode, city: customCity.trim() || defaultCity, formattedAddress: customCity.trim() };
      await setProviderLocationPreference(pref);
      router.push("/booking/matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen
      title="Provider location"
      step="location"
      onBack={() => router.push("/booking/packages")}
      footer={
        <Button
          label="Find providers"
          onPress={onContinue}
          loading={loading}
          flex={1}
        />
      }
    >
      <View style={{ gap: 4 }}>
        <SectionTitle>Where should your provider be located?</SectionTitle>
        <Muted>
          We match you with verified professionals based in or operating near your preferred location.
        </Muted>
      </View>

      <Pressable
        style={[styles.optionCard, mode === "event_location" && styles.optionCardSelected]}
        onPress={() => setMode("event_location")}
      >
        <View style={styles.optionHeader}>
          <View style={styles.iconCircle}>
            <MapPin size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.optionTitle}>Near my event location</Text>
            <Text style={styles.optionSubtitle}>
              {defaultAddress ? defaultAddress : defaultCity}
            </Text>
          </View>
          {mode === "event_location" ? (
            <View style={styles.checkCircle}>
              <Check size={16} color={colors.white} />
            </View>
          ) : (
            <View style={styles.uncheckCircle} />
          )}
        </View>
      </Pressable>

      <Pressable
        style={[styles.optionCard, mode === "preferred_area" && styles.optionCardSelected]}
        onPress={() => setMode("preferred_area")}
      >
        <View style={styles.optionHeader}>
          <View style={styles.iconCircle}>
            <Navigation size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.optionTitle}>Specific neighborhood or area</Text>
            <Text style={styles.optionSubtitle}>
              Find providers studio-based in a specific locality
            </Text>
          </View>
          {mode === "preferred_area" ? (
            <View style={styles.checkCircle}>
              <Check size={16} color={colors.white} />
            </View>
          ) : (
            <View style={styles.uncheckCircle} />
          )}
        </View>

        {mode === "preferred_area" ? (
          <View style={{ marginTop: spacing.sm }}>
            <Field
              label="Area or locality name"
              value={customCity}
              placeholder="e.g. Banjara Hills, Jubilee Hills, Gachibowli"
              onChangeText={setCustomCity}
            />
          </View>
        ) : null}
      </Pressable>

      <Pressable
        style={[styles.optionCard, mode === "another_area" && styles.optionCardSelected]}
        onPress={() => setMode("another_area")}
      >
        <View style={styles.optionHeader}>
          <View style={styles.iconCircle}>
            <Compass size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.optionTitle}>Another city</Text>
            <Text style={styles.optionSubtitle}>
              Hire traveling professionals or teams from another city
            </Text>
          </View>
          {mode === "another_area" ? (
            <View style={styles.checkCircle}>
              <Check size={16} color={colors.white} />
            </View>
          ) : (
            <View style={styles.uncheckCircle} />
          )}
        </View>

        {mode === "another_area" ? (
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            <PlaceAutocompleteField
              label="City name"
              placeholder="e.g. Mumbai, Bengaluru, Delhi"
              restrictToCities
              clearQueryOnSelect={false}
              onSelect={(location) =>
                setAnotherCity({
                  city: location.city || location.formattedAddress,
                  formattedAddress: location.formattedAddress,
                })
              }
            />
            {anotherCity ? <Muted>Selected: {anotherCity.formattedAddress || anotherCity.city}</Muted> : null}
          </View>
        ) : null}
      </Pressable>
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.peach,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  uncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
