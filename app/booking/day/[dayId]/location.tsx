import { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { PlaceAutocompleteField } from "@/src/components/PlaceAutocompleteField";
import { useAppStore } from "@/src/state/AppProvider";
import { normalizeRouteParam, safeBack } from "@/src/utils/routeParam";
import { getCurrentLocationDetails } from "@/src/services/placesApi";
import { canonicalCityName, normalizeEventLocationCity } from "@/src/domain/cityResolution";
import type { EventLocation } from "@/src/types/booking";
import { colors, radius, spacing } from "@/src/constants/theme";

export default function LocationPickerScreen() {
  const params = useLocalSearchParams<{ dayId: string | string[]; mode?: string }>();
  const isEditMode = params.mode === "edit";
  const dayId = normalizeRouteParam(params.dayId);
  const { activeDraft, updateDay } = useAppStore();
  const day =
    activeDraft?.days.find((d) => d.dayId === dayId) ??
    (activeDraft?.days.length === 1 ? activeDraft.days[0] : undefined);

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<EventLocation | null>(
    day?.location.formattedAddress || day?.location.city ? normalizeEventLocationCity(day.location) : null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  // Keyboard avoidance state: collapse top search box when typing address details
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        setIsEditingAddress(false);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (day?.location && !selected) {
      if (day.location.formattedAddress || day.location.city) {
        setSelected(normalizeEventLocationCity(day.location));
      }
    }
    // Only hydrate when the stored location itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.location]);

  const onUseCurrentLocation = async () => {
    Keyboard.dismiss();
    setLocating(true);
    try {
      const result = await getCurrentLocationDetails();
      if ("error" in result) {
        showLocationError(result.error);
        return;
      }
      setLocationError(null);
      setSelected(result.location);
    } catch (e: any) {
      showLocationError(e?.message || "Could not detect location. Please search for your venue or area.");
    } finally {
      setLocating(false);
    }
  };

  const showLocationError = (message: string) => {
    setSelected(null);
    setLocationError(message);
  };

  const leaveScreen = (persistId: string) => {
    if (isEditMode) {
      router.replace(`/booking/day/${persistId}?step=event&mode=edit`);
    } else {
      safeBack(`/booking/day/${persistId}`);
    }
  };

  const onConfirm = async () => {
    Keyboard.dismiss();
    if (saving) return;
    const persistId = day?.dayId || dayId;
    if (!selected?.formattedAddress?.trim() || !persistId) return;
    const city = canonicalCityName(selected.city);
    if (!city) {
      setLocationError("Please enter the city for this event — we use it to find photographers near you.");
      return;
    }

    setLocationError(null);
    setSaving(true);
    try {
      // Single atomic, serialized save (see bookingStore). If the stored copy
      // is missing it self-heals from the in-memory draft, so a valid address
      // can no longer be rejected.
      await updateDay(persistId, {
        location: { ...selected, formattedAddress: selected.formattedAddress.trim(), city },
      });
      leaveScreen(persistId);
    } catch (err) {
      console.error("[LocationPicker] save error:", err);
      setLocationError("We couldn't save this location. Please tap Confirm location again.");
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    Keyboard.dismiss();
    const persistId = day?.dayId || dayId;
    if (isEditMode && persistId) {
      router.replace(`/booking/day/${persistId}?step=event&mode=edit`);
    } else {
      safeBack(persistId ? `/booking/day/${persistId}` : "/(tabs)");
    }
  };

  // When keyboard is open and user is typing in address fields, hide the top search card
  // so the address fields smoothly slide to the top of the visible screen above keypad.
  const hideTopSearch = isKeyboardVisible && isEditingAddress && Boolean(selected?.formattedAddress);

  return (
    <WizardScreen
      title="Event location"
      step="event"
      onBack={onBack}
      footer={
        <Button
          label="Confirm location"
          onPress={onConfirm}
          loading={saving}
          disabled={!selected?.formattedAddress?.trim() || saving}
          flex={1}
        />
      }
    >
      {/* Top Search & Current Location Section */}
      {!hideTopSearch ? (
        <Card>
          <SectionTitle>Where is your event?</SectionTitle>
          <PlaceAutocompleteField
            onSelect={(location) => {
              setSelected(location);
              setLocationError(null);
            }}
          />
          <Button
            label="Use my current location"
            variant="outline"
            icon={<LocateFixed size={16} color={colors.primaryDark} />}
            onPress={onUseCurrentLocation}
            loading={locating}
          />
        </Card>
      ) : (
        /* Compact top bar when keyboard is open while editing address */
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setIsEditingAddress(false);
          }}
          style={styles.compactSearchRow}
          accessibilityRole="button"
          accessibilityLabel="Switch to location search"
        >
          <MapPin size={16} color={colors.primary} />
          <Text style={styles.compactSearchText} numberOfLines={1}>
            Editing address • Tap to search another area
          </Text>
          <ChevronDown size={16} color={colors.primary} />
        </Pressable>
      )}

      {locationError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Muted style={{ color: colors.danger }}>{locationError}</Muted>
        </Card>
      ) : null}

      {/* Address Confirmation & Manual Input Fields */}
      {selected?.formattedAddress ? (
        <Card>
          <View style={styles.addressHeaderRow}>
            <SectionTitle>Confirm & edit address</SectionTitle>
            {isKeyboardVisible && (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEditingAddress(false);
                }}
                style={styles.doneBtn}
                accessibilityRole="button"
                accessibilityLabel="Done typing"
              >
                <Check size={14} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            )}
          </View>

          {!hideTopSearch && (
            <View style={styles.mapPreview}>
              <MapPin size={26} color={colors.primary} />
              <Muted>Pinned location</Muted>
            </View>
          )}

          <Field
            label="Full address"
            value={selected.formattedAddress}
            onFocus={() => setIsEditingAddress(true)}
            onChangeText={(v) =>
              setSelected((prev) => (prev ? { ...prev, formattedAddress: v, manuallyEdited: true } : prev))
            }
            multiline
          />

          <View style={styles.row}>
            <Field
              label="City"
              value={selected.city}
              onFocus={() => setIsEditingAddress(true)}
              onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, city: v, manuallyEdited: true } : prev))}
            />
            <Field
              label="Pincode"
              value={selected.pincode}
              onFocus={() => setIsEditingAddress(true)}
              onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, pincode: v } : prev))}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.row}>
            <Field
              label="District"
              value={selected.district}
              onFocus={() => setIsEditingAddress(true)}
              onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, district: v, manuallyEdited: true } : prev))}
            />
            <Field
              label="State"
              value={selected.state}
              onFocus={() => setIsEditingAddress(true)}
              onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, state: v } : prev))}
            />
          </View>
        </Card>
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  compactSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF5EB",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  compactSearchText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  addressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  mapPreview: {
    height: 72,
    borderRadius: radius,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
