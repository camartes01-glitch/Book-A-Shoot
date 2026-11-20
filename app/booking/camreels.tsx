/**
 * CamReels booking (signed-in only; app/booking/_layout redirects).
 * Three steps: Plan → When & where → Review.
 *  - Reels: ₹4,000 a reel or 3 for ₹10,000 (edited); ₹3,000 or 3 for ₹7,000 (raw).
 *  - CamReels Monthly: unlimited edited reels for 30 days, one flat price.
 * Prices are fixed; the backend re-computes them on every request.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Check, MapPin, X } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Button, Card, Field, Muted } from "@/src/components/ui";
import { Chip, ChipGroup } from "@/src/components/Chip";
import { Stepper } from "@/src/components/Stepper";
import { DateField, TimeField } from "@/src/components/DateField";
import { PlaceAutocompleteField } from "@/src/components/PlaceAutocompleteField";
import { useAppStore } from "@/src/state/AppProvider";
import { discardReelsDraft, fetchCamReelsPricing } from "@/src/services/reelsBookingApi";
import { sendReelsRequest } from "@/src/services/reelsBookingApi";
import { validateReelsInput, type ReelsBookingInput } from "@/src/domain/reelsRequest";
import { canonicalCityName, normalizeEventLocationCity } from "@/src/domain/cityResolution";
import {
  REELS_CONTENT_TYPES,
  REELS_DURATIONS,
  REELS_EDITING_OPTIONS,
  REELS_MAX_COUNT,
  REELS_MIN_COUNT,
  REELS_MONTHLY,
  REELS_PRICES,
  REELS_SETTINGS,
  contactReelsTeam,
  inr,
  reelsPrice,
  reelsPriceLine,
  type ReelsEditing,
  type ReelsPlanId,
  type ReelsPrices,
} from "@/src/constants/reels";
import { todayIso } from "@/src/utils/dateTime";
import { trackSeoEvent } from "@/src/components/seo/SeoBlocks";
import type { EventLocation } from "@/src/types/booking";
import { colors, spacing } from "@/src/constants/theme";

const STEPS = ["Plan", "When & where", "Review"] as const;

export default function CamReelsBookingScreen() {
  const { profile, refreshBookings } = useAppStore();
  const [step, setStep] = useState(0);
  const [prices, setPrices] = useState<ReelsPrices>(REELS_PRICES);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(REELS_MONTHLY.price);

  const [plan, setPlan] = useState<ReelsPlanId>("reels");
  const [contentType, setContentType] = useState<string>("");
  const [reelCount, setReelCount] = useState(3);
  const [editing, setEditing] = useState<ReelsEditing>("edited");
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(2);
  const [setting, setSetting] = useState<string>("");
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // Failed-attempt draft id: reused on retry with the same details (no duplicate requests).
  const draftRef = useRef<{ id: string; key: string } | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void fetchCamReelsPricing().then((p) => {
      if (!alive) return;
      setPrices(p.prices);
      setMonthlyPrice(p.monthlyPrice);
    });
    return () => {
      alive = false;
      const draft = draftRef.current;
      if (draft && !sentRef.current) void discardReelsDraft(draft.id);
    };
  }, []);

  const monthly = plan === "monthly";
  const total = monthly ? monthlyPrice : reelsPrice(reelCount, editing, prices);

  const input: Partial<ReelsBookingInput> = {
    plan,
    contentType,
    reelCount,
    editing: monthly ? "edited" : editing,
    setting,
    durationHours,
    notes,
    eventDate: eventDate ?? undefined,
    startTime: startTime ?? undefined,
    location: location ?? undefined,
  };

  const STEP_FIELDS: Array<Array<keyof ReelsBookingInput>> = [
    ["contentType", "reelCount"],
    ["eventDate", "startTime", "setting", "location"],
    [],
  ];

  const goNext = () => {
    const issues = validateReelsInput(input, todayIso()).filter((i) => STEP_FIELDS[step].includes(i.field));
    if (issues.length) {
      setErrors(Object.fromEntries(issues.map((i) => [i.field, i.message])));
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const onSend = async () => {
    if (sending || !profile) return;
    const issues = validateReelsInput(input, todayIso());
    if (issues.length) {
      setErrors(Object.fromEntries(issues.map((i) => [i.field, i.message])));
      const firstStep = STEP_FIELDS.findIndex((fields) => fields.includes(issues[0].field));
      if (firstStep >= 0) setStep(firstStep);
      return;
    }
    const full = input as ReelsBookingInput;
    const key = JSON.stringify(full);
    if (draftRef.current && draftRef.current.key !== key) {
      void discardReelsDraft(draftRef.current.id);
      draftRef.current = null;
    }
    setSending(true);
    setSendError("");
    trackSeoEvent("camreels_request_submit", { plan, editing: full.editing, reels: String(monthly ? 0 : reelCount) });
    try {
      const submitted = await sendReelsRequest(profile.customerId, full, draftRef.current?.id);
      sentRef.current = true;
      draftRef.current = null;
      void refreshBookings();
      router.replace(`/bookings/${submitted.bookingId}`);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Could not send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const contentLabel = REELS_CONTENT_TYPES.find((c) => c.id === contentType)?.label ?? "—";

  return (
    <ScreenContainer
      keyboardAvoiding
      footer={
        <View style={styles.footerBar}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel} numberOfLines={1}>
              {monthly ? "CamReels Monthly" : `${reelCount} ${editing === "edited" ? "edited" : "raw"} reel${reelCount > 1 ? "s" : ""}`}
            </Text>
            <Text style={styles.footerValue}>{inr(total)}</Text>
          </View>
          {step < STEPS.length - 1 ? (
            <Button label="Continue" onPress={goNext} style={styles.footerBtn} />
          ) : (
            <Button label={sending ? "Sending…" : "Send request"} onPress={onSend} loading={sending} disabled={sending} style={styles.footerBtn} />
          )}
        </View>
      }
    >
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>CamReels</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.progressRow}>
          {STEPS.map((label, i) => (
            <View key={label} style={styles.progressItem}>
              <View style={[styles.progressBar, i <= step && styles.progressBarOn]} />
              <Text style={[styles.progressLabel, i === step && styles.progressLabelOn]}>{label}</Text>
            </View>
          ))}
        </View>

        {step === 0 ? (
          <View style={styles.stepBody}>
            <View style={{ gap: spacing.sm }}>
              <SelectCard
                selected={!monthly}
                onPress={() => setPlan("reels")}
                title="Reels"
                price={reelsPriceLine("edited", prices)}
                body="One shoot, as many reels as you need."
              />
              <SelectCard
                selected={monthly}
                onPress={() => setPlan("monthly")}
                title={REELS_MONTHLY.name}
                price={`${inr(monthlyPrice)} · 30 days`}
                body="Unlimited edited reels, the same videographer all month."
                badge="Best value"
              />
            </View>

            {!monthly ? (
              <>
                <Section title="Edit" error={undefined}>
                  <View style={styles.row}>
                    {REELS_EDITING_OPTIONS.map((o) => (
                      <SelectCard
                        key={o.id}
                        flex
                        selected={editing === o.id}
                        onPress={() => setEditing(o.id)}
                        title={o.title}
                        price={reelsPriceLine(o.id, prices)}
                        body={o.body}
                      />
                    ))}
                  </View>
                </Section>
                <Section title="Number of reels" error={errors.reelCount}>
                  <Stepper value={reelCount} onChange={setReelCount} min={REELS_MIN_COUNT} max={REELS_MAX_COUNT} label="Reels" />
                  {reelCount % 3 !== 0 && reelCount < REELS_MAX_COUNT ? (
                    <Text style={styles.hint}>Tip: reels are cheaper in threes.</Text>
                  ) : null}
                </Section>
              </>
            ) : null}

            <Section title="What are the reels for?" error={errors.contentType}>
              <ChipGroup>
                {REELS_CONTENT_TYPES.map((c) => (
                  <Chip key={c.id} label={c.label} selected={contentType === c.id} onPress={() => setContentType(c.id)} />
                ))}
              </ChipGroup>
            </Section>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.stepBody}>
            <Section title={monthly ? "First shoot" : "When"} error={errors.eventDate || errors.startTime}>
              <DateField label="Date" value={eventDate} onChange={setEventDate} minimumDate={new Date()} />
              <TimeField label="Start time" value={startTime} placeholder="Select start time" onChange={setStartTime} />
              {monthly ? <Muted>Your 30 days start on this date. Plan the rest with your videographer.</Muted> : null}
            </Section>

            {!monthly ? (
              <Section title="Shoot length">
                <ChipGroup>
                  {REELS_DURATIONS.map((h) => (
                    <Chip key={h} label={`${h} hr`} selected={durationHours === h} onPress={() => setDurationHours(h)} />
                  ))}
                </ChipGroup>
              </Section>
            ) : null}

            <Section title="Setting" error={errors.setting}>
              <ChipGroup>
                {REELS_SETTINGS.map((s) => (
                  <Chip key={s.id} label={s.label} selected={setting === s.id} onPress={() => setSetting(s.id)} />
                ))}
              </ChipGroup>
            </Section>

            <Section title="Location" error={errors.location}>
              {location ? (
                <Card style={styles.locationCard}>
                  <MapPin size={18} color={colors.primaryDark} />
                  <Text style={[styles.body, { flex: 1, color: colors.text }]}>{location.formattedAddress}</Text>
                  <Pressable onPress={() => setLocation(null)} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.link}>Change</Text>
                  </Pressable>
                </Card>
              ) : (
                <PlaceAutocompleteField
                  label="Search the shoot location"
                  onSelect={(picked) => {
                    const normalized = normalizeEventLocationCity(picked);
                    setLocation({ ...normalized, city: canonicalCityName(normalized.city) || normalized.city });
                    setErrors((e) => ({ ...e, location: "" }));
                  }}
                />
              )}
            </Section>

            <Section title="Notes (optional)">
              <Field placeholder="References, outfits, mood or music" value={notes} onChangeText={setNotes} multiline maxLength={600} />
            </Section>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepBody}>
            <Card style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {monthly ? REELS_MONTHLY.name : `${reelCount} ${editing === "edited" ? "edited" : "raw"} reel${reelCount > 1 ? "s" : ""}`}
              </Text>
              {monthly ? (
                <View style={{ gap: 8 }}>
                  {REELS_MONTHLY.includes.map((line) => (
                    <View key={line} style={styles.includeRow}>
                      <Check size={16} color={colors.success} />
                      <Text style={[styles.body, { color: colors.text }]}>{line}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.divider} />
              <SummaryRow label="For" value={contentLabel} />
              <SummaryRow label={monthly ? "Starts" : "When"} value={`${eventDate ?? "—"}${monthly ? "" : ` · ${durationHours} hr`}`} />
              <SummaryRow label="Where" value={location?.city || "—"} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Price</Text>
                <Text style={styles.totalValue}>{inr(total)}</Text>
              </View>
            </Card>

            <Muted style={styles.small}>
              Shot on a DSLR with a gimbal. Sent to up to 6 verified videographers; you choose who to book. Nothing is charged now.
            </Muted>

            {sendError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{sendError}</Text>
                <Pressable onPress={contactReelsTeam} hitSlop={6}>
                  <Text style={styles.link}>Need help? Message us on WhatsApp</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

      </View>
    </ScreenContainer>
  );
}

function SelectCard(props: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  body: string;
  badge?: string;
  flex?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.card, props.flex && { flex: 1 }, props.selected && styles.cardOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.radio, props.selected && styles.radioOn]}>{props.selected ? <View style={styles.radioDot} /> : null}</View>
          <Text style={styles.cardTitle}>{props.title}</Text>
        </View>
        {props.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{props.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardPrice}>{props.price}</Text>
      <Text style={styles.body}>{props.body}</Text>
    </Pressable>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: "100%", maxWidth: 560, alignSelf: "center", gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  progressRow: { flexDirection: "row", gap: spacing.sm },
  progressItem: { flex: 1, gap: 6 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressBarOn: { backgroundColor: colors.primary },
  progressLabel: { fontSize: 12, color: colors.muted },
  progressLabelOn: { color: colors.text, fontWeight: "600" },
  stepBody: { gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  fieldError: { color: colors.danger, fontSize: 13 },
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    gap: 6,
  },
  cardOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.cream },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardPrice: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  body: { fontSize: 13, lineHeight: 19, color: colors.muted },
  badge: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  hint: { fontSize: 13, color: colors.primaryDark },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  locationCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  link: { color: colors.primaryDark, fontWeight: "600", fontSize: 14 },
  summary: { gap: spacing.sm },
  summaryTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  includeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  summaryLabel: { fontSize: 14, color: colors.muted },
  summaryValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  totalValue: { fontSize: 20, fontWeight: "600", color: colors.primaryDark },
  small: { fontSize: 12, lineHeight: 18 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  errorText: { color: colors.danger, fontSize: 14 },
  footerBar: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.md },
  footerTotal: { flex: 1, minWidth: 0 },
  footerLabel: { fontSize: 12, lineHeight: 16, color: colors.muted },
  footerValue: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: colors.text },
  footerBtn: { flex: 1.3 },
});
