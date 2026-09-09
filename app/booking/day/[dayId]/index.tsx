import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Camera, MapPin, Plane, Radio, Tv, Video } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Badge, Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { Chip, ChipGroup } from "@/src/components/Chip";
import { StyleRow } from "@/src/components/StyleRow";
import { Stepper } from "@/src/components/Stepper";
import { DateField, TimeField } from "@/src/components/DateField";
import { EventCategoryCard } from "@/src/components/EventCategoryCard";
import { ServiceSelectCard } from "@/src/components/ServiceSelectCard";
import { AddOnCard, ExpandRow } from "@/src/components/AddOnCard";
import { useAppStore } from "@/src/state/AppProvider";
import { DEFAULT_EVENT_CATEGORIES, EVENT_GROUP_LABEL } from "@/src/constants/eventCategories";
import { ADMIN_LIMITS, LED_WALL_SIZES, WEB_LIVE_QUALITIES } from "@/src/constants/limits";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  END_BEFORE_START_MESSAGE,
  OVERNIGHT_EVENT_MESSAGE,
  hasCoreService,
  shouldShowCoreServiceError,
  validateDay,
} from "@/src/engine/validation";
import {
  applyAerialGate,
  isAerialEnabled,
  isAerialSelectable,
  isPhotographySelected,
  isVideographySelected,
  setAerialEnabled,
  setPhotographySelected,
  setVideographySelected,
} from "@/src/domain/dayServices";
import { sanitizeEventDay, hydrateEditorDay } from "@/src/domain/defaults";
import * as bookingApi from "@/src/services/bookingApi";
import { durationMinutes, formatDuration, inferOvernight, isEndAfterStart } from "@/src/utils/dateTime";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import type { EventDay } from "@/src/types/booking";
import { colors, radius, spacing } from "@/src/constants/theme";

const GROUPS = ["wedding", "pooja", "personal", "commercial"] as const;

export default function DayEditorScreen() {
  const params = useLocalSearchParams<{ dayId: string | string[]; step?: string }>();
  const dayId = normalizeRouteParam(params.dayId);
  const rawStep = Array.isArray(params.step) ? params.step[0] : params.step;
  const [screenStep, setScreenStep] = useState<"event" | "services">(rawStep === "services" ? "services" : "event");
  const { activeDraft, updateDay, loadDraft } = useAppStore();
  const [day, setDay] = useState<EventDay | null>(null);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const activeDraftRef = useRef(activeDraft);
  const updateDayRef = useRef(updateDay);
  const dayRef = useRef<EventDay | null>(null);
  const persistChainRef = useRef(Promise.resolve());

  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);
  useEffect(() => {
    updateDayRef.current = updateDay;
  }, [updateDay]);

  const loadDraftRef = useRef(loadDraft);
  useEffect(() => {
    loadDraftRef.current = loadDraft;
  }, [loadDraft]);

  useEffect(() => {
    if (!dayId) router.replace("/booking/new");
  }, [dayId]);

  const persistDay = useCallback((next: EventDay) => {
    persistChainRef.current = persistChainRef.current.then(
      () => updateDayRef.current(next.dayId, next),
      () => updateDayRef.current(next.dayId, next),
    ).catch(() => undefined);
  }, []);

  const flushPersist = useCallback(async () => {
    const snapshot = dayRef.current;
    if (!snapshot) return;
    persistDay(snapshot);
    await persistChainRef.current;
  }, [persistDay]);

  const applyFoundDay = useCallback(
    (found: EventDay) => {
      const local = dayRef.current?.dayId === found.dayId ? dayRef.current : null;
      const next = hydrateEditorDay(found, local);
      setDay(next);
      dayRef.current = next;
      const storedIncomplete =
        (!found.eventTypeIds.length && next.eventTypeIds.length > 0) ||
        (!found.eventDate && !!next.eventDate) ||
        (!found.startTime && !!next.startTime) ||
        (!found.endTime && !!next.endTime) ||
        (!found.location.formattedAddress && !!next.location.formattedAddress);
      if (storedIncomplete) persistDay(next);
    },
    [persistDay],
  );

  const syncFromStore = useCallback(() => {
    const found = activeDraftRef.current?.days.find((d) => d.dayId === dayId) ?? null;
    if (found) {
      applyFoundDay(found);
      return;
    }
    void bookingApi.getBookingContainingDay(dayId).then(async (booking) => {
      if (!booking) return;
      await loadDraftRef.current(booking.bookingId);
      const day = booking.days.find((d) => d.dayId === dayId);
      if (day) applyFoundDay(day);
    });
  }, [applyFoundDay, dayId]);

  useFocusEffect(
    useCallback(() => {
      syncFromStore();
      return () => {
        const snapshot = dayRef.current;
        if (!snapshot || snapshot.dayId !== dayId) return;
        persistChainRef.current = persistChainRef.current.then(
          () => updateDayRef.current(snapshot.dayId, snapshot),
          () => updateDayRef.current(snapshot.dayId, snapshot),
        ).catch(() => undefined);
      };
    }, [dayId, syncFromStore]),
  );

  if (!dayId) return null;
  if (!day) {
    return (
      <WizardScreen title="What are you planning?" step="event">
        <Muted>Loading this event day…</Muted>
      </WizardScreen>
    );
  }

  const applyDay = (updater: (prev: EventDay) => EventDay) => {
    const prev = dayRef.current;
    if (!prev) return;
    const next = sanitizeEventDay({ ...updater(prev), dayId: prev.dayId, order: prev.order, dayRevision: (prev.dayRevision ?? 0) + 1 });
    dayRef.current = next;
    setDay(next);
    persistDay(next);
  };
  const patch = (p: Partial<EventDay>) => applyDay((prev) => ({ ...prev, ...p }));

  const toggleEventType = (id: string) => {
    applyDay((prev) => ({
      ...prev,
      eventTypeIds: prev.eventTypeIds.includes(id)
        ? prev.eventTypeIds.filter((t) => t !== id)
        : [...prev.eventTypeIds, id],
    }));
    const current = dayRef.current;
    if (
      current &&
      current.eventDate &&
      current.startTime &&
      current.endTime &&
      (current.overnight || isEndAfterStart(current.startTime, current.endTime, false))
    ) {
      setTimeout(() => {
        setScreenStep("services");
      }, 100);
    }
  };

  const onDateChange = (iso: string) => {
    applyDay((prev) => {
      const next = { ...prev, eventDate: iso };
      if (
        next.eventTypeIds.length > 0 &&
        next.eventDate &&
        next.startTime &&
        next.endTime &&
        (next.overnight || isEndAfterStart(next.startTime, next.endTime, false))
      ) {
        setTimeout(() => setScreenStep("services"), 150);
      }
      return next;
    });
  };

  const onStartTimeChange = (t: string) => {
    applyDay((prev) => {
      const next = { ...prev, startTime: t, overnight: inferOvernight(t, prev.endTime) };
      if (
        next.eventTypeIds.length > 0 &&
        next.eventDate &&
        next.startTime &&
        next.endTime &&
        (next.overnight || isEndAfterStart(next.startTime, next.endTime, false))
      ) {
        setTimeout(() => setScreenStep("services"), 150);
      }
      return next;
    });
  };

  const onEndTimeChange = (t: string) => {
    applyDay((prev) => {
      const next = { ...prev, endTime: t, overnight: inferOvernight(prev.startTime, t) };
      if (
        next.eventTypeIds.length > 0 &&
        next.eventDate &&
        next.startTime &&
        next.endTime &&
        (next.overnight || isEndAfterStart(next.startTime, next.endTime, false))
      ) {
        setTimeout(() => setScreenStep("services"), 150);
      }
      return next;
    });
  };

  const issues = validateDay(day);
  const issueOf = (code: string) => issues.find((i) => i.code === code)?.message;
  const showCoreError = shouldShowCoreServiceError(day, saveAttempted);
  const aerialSelectable = isAerialSelectable(day);
  const aerialOn = isAerialEnabled(day);
  const bothTimesSelected = Boolean(day.startTime && day.endTime);
  const wouldBeOvernight = Boolean(day.startTime && day.endTime && !isEndAfterStart(day.startTime, day.endTime, false));
  const duration = bothTimesSelected ? durationMinutes(day.startTime!, day.endTime!, day.overnight) : null;

  const photoOn = isPhotographySelected(day);
  const videoOn = isVideographySelected(day);

  const photoSummary = [
    day.photography.traditional ? `Traditional ×${day.photography.traditionalCount}` : null,
    day.photography.candid ? `Candid ×${day.photography.candidCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const videoSummary = [
    day.videography.traditional ? `Traditional ×${day.videography.traditionalCount}` : null,
    day.videography.candid ? `Candid ×${day.videography.candidCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const featured = ["wedding", "pre_wedding", "birthday", "baby_shoot", "maternity_shoot", "corporate_event"]
    .map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id && c.enabled))
    .filter(Boolean) as typeof DEFAULT_EVENT_CATEGORIES;
  const poojaTypes = DEFAULT_EVENT_CATEGORIES.filter((c) => c.enabled && c.group === "pooja");
  const extraTypes = DEFAULT_EVENT_CATEGORIES.filter(
    (c) => c.enabled && c.group !== "pooja" && !featured.some((f) => f.id === c.id),
  );

  const canContinueToServices = Boolean(
    day.eventTypeIds.length > 0 &&
      day.eventDate &&
      day.startTime &&
      day.endTime &&
      (day.overnight || isEndAfterStart(day.startTime, day.endTime, false)),
  );

  const onContinueToServices = () => {
    setSaveAttempted(true);
    if (!canContinueToServices) {
      if (!day.eventTypeIds.length) {
        Alert.alert("Event needed", "Please select what you are planning.");
      } else if (!day.eventDate) {
        Alert.alert("Date needed", "Please choose the event date.");
      } else if (!day.startTime || !day.endTime) {
        Alert.alert("Time needed", "Please choose start and end times.");
      } else {
        Alert.alert("Invalid times", END_BEFORE_START_MESSAGE);
      }
      return;
    }
    setScreenStep("services");
  };

  const onContinueToBudget = async () => {
    setSaveAttempted(true);
    if (!hasCoreService(day)) {
      Alert.alert("Service required", CORE_SERVICE_REQUIRED_MESSAGE);
      return;
    }
    await flushPersist();
    router.push("/booking/budget");
  };

  const togglePhotography = () => applyDay((prev) => setPhotographySelected(prev, !isPhotographySelected(prev)));
  const toggleVideography = () => applyDay((prev) => setVideographySelected(prev, !isVideographySelected(prev)));

  if (screenStep === "event") {
    return (
      <WizardScreen
        title="What are you planning?"
        step="event"
        onBack={() => router.back()}
        footer={
          <Button
            label="Continue to services"
            onPress={onContinueToServices}
            disabled={!canContinueToServices}
            flex={1}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <SectionTitle>What are you planning?</SectionTitle>
          <Muted>Select one event type to get started. Tapping an option advances automatically once your date and time are set.</Muted>
        </View>

        <View style={styles.grid}>
          {featured.map((c) => (
            <EventCategoryCard
              key={c.id}
              category={c}
              selected={day.eventTypeIds.includes(c.id)}
              onPress={() => toggleEventType(c.id)}
              height={100}
            />
          ))}
        </View>
        {issueOf("EVENT_TYPE_REQUIRED") ? (
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("EVENT_TYPE_REQUIRED")}</Muted>
        ) : null}

        <ExpandRow
          open={showMoreTypes}
          onPress={() => setShowMoreTypes((v) => !v)}
          label={showMoreTypes ? "Show fewer event types" : "More event types"}
        />
        {showMoreTypes
          ? GROUPS.map((group) => {
              const cats =
                group === "pooja"
                  ? poojaTypes
                  : extraTypes.filter((c) => c.group === group);
              if (!cats.length) return null;
              return (
                <View key={group} style={{ gap: 6 }}>
                  <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{EVENT_GROUP_LABEL[group]}</Muted>
                  <ChipGroup>
                    {cats.map((c) => (
                      <Chip key={c.id} label={c.label} selected={day.eventTypeIds.includes(c.id)} onPress={() => toggleEventType(c.id)} />
                    ))}
                  </ChipGroup>
                </View>
              );
            })
          : null}

        <Card>
          <SectionTitle>When & where is your event?</SectionTitle>
          <DateField label="When is your event?" value={day.eventDate} onChange={onDateChange} minimumDate={new Date()} />
          {issueOf("EVENT_DATE_REQUIRED") || issueOf("EVENT_DATE_PAST") ? (
            <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("EVENT_DATE_PAST") ?? issueOf("EVENT_DATE_REQUIRED")}</Muted>
          ) : null}

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TimeField
              label="Start time"
              value={day.startTime}
              placeholder="Select start time"
              onChange={onStartTimeChange}
            />
            <TimeField
              label="End time"
              value={day.endTime}
              placeholder="Select end time"
              onChange={onEndTimeChange}
            />
          </View>
          {issueOf("START_TIME_REQUIRED") ? (
            <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("START_TIME_REQUIRED")}</Muted>
          ) : null}
          {issueOf("END_TIME_REQUIRED") ? (
            <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("END_TIME_REQUIRED")}</Muted>
          ) : null}
          {issueOf("END_BEFORE_START") ? (
            <Muted style={{ color: colors.danger, fontWeight: "600" }}>{END_BEFORE_START_MESSAGE}</Muted>
          ) : null}
          {day.overnight && bothTimesSelected ? (
            <View style={styles.overnightBadge}>
              <Badge label="Ends the next day" tone="peach" />
              <Muted style={{ fontWeight: "700", color: colors.primaryDark, flex: 1 }}>{OVERNIGHT_EVENT_MESSAGE}</Muted>
            </View>
          ) : null}
          {wouldBeOvernight && !day.overnight ? (
            <Muted>Overnight is inferred for times like 8:00 PM to 2:00 AM.</Muted>
          ) : null}
          {duration != null && (day.overnight || isEndAfterStart(day.startTime!, day.endTime!, false)) ? (
            <Muted>Duration: {formatDuration(duration)}</Muted>
          ) : null}

          <Pressable
            style={styles.locationField}
            onPress={() => {
              void flushPersist().then(() => router.push(`/booking/day/${day.dayId}/location`));
            }}
            accessibilityRole="button"
            accessibilityLabel="Event location"
          >
            <MapPin size={18} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Where is your event?</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {day.location.formattedAddress || "Search area, city or venue"}
              </Text>
            </View>
          </Pressable>
          {issueOf("LOCATION_REQUIRED") ? (
            <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("LOCATION_REQUIRED")}</Muted>
          ) : null}
        </Card>
      </WizardScreen>
    );
  }

  return (
    <WizardScreen
      title="What services do you need?"
      step="services"
      onBack={() => setScreenStep("event")}
      footer={
        <Button
          label="Continue to budget"
          onPress={onContinueToBudget}
          disabled={!hasCoreService(day)}
          flex={1}
        />
      }
    >
      <View style={{ gap: 4 }}>
        <SectionTitle>What services do you need?</SectionTitle>
        <Muted>Photography or videography is required. You can choose both, then customize your team size and add-ons.</Muted>
      </View>

      <ServiceSelectCard
        title="Photography"
        subtitle="Traditional and candid coverage"
        icon={<Camera size={20} color={colors.primaryDark} />}
        selected={photoOn}
        summary={photoSummary}
        onPress={togglePhotography}
      >
        <>
          <StyleRow
            label="Traditional"
            description="Classic, posed coverage"
            enabled={day.photography.traditional}
            count={day.photography.traditionalCount}
            min={ADMIN_LIMITS.minPhotographers}
            max={ADMIN_LIMITS.maxPhotographersPerType}
            countLabel="Photographers"
            onToggle={(v) =>
              applyDay((prev) =>
                applyAerialGate({ ...prev, photography: { ...prev.photography, traditional: v } }),
              )
            }
            onCountChange={(n) => applyDay((prev) => ({ ...prev, photography: { ...prev.photography, traditionalCount: n } }))}
          />
          <StyleRow
            label="Candid"
            description="Natural, unposed moments"
            enabled={day.photography.candid}
            count={day.photography.candidCount}
            min={ADMIN_LIMITS.minPhotographers}
            max={ADMIN_LIMITS.maxPhotographersPerType}
            countLabel="Photographers"
            onToggle={(v) =>
              applyDay((prev) => applyAerialGate({ ...prev, photography: { ...prev.photography, candid: v } }))
            }
            onCountChange={(n) => applyDay((prev) => ({ ...prev, photography: { ...prev.photography, candidCount: n } }))}
          />
        </>
      </ServiceSelectCard>

      <ServiceSelectCard
        title="Videography"
        subtitle="Ceremony films and cinematic stories"
        icon={<Video size={20} color={colors.primaryDark} />}
        selected={videoOn}
        summary={videoSummary}
        onPress={toggleVideography}
      >
        <>
          <StyleRow
            label="Traditional"
            description="Classic ceremony filming"
            enabled={day.videography.traditional}
            count={day.videography.traditionalCount}
            min={ADMIN_LIMITS.minVideographers}
            max={ADMIN_LIMITS.maxVideographersPerType}
            countLabel="Videographers"
            onToggle={(v) =>
              applyDay((prev) =>
                applyAerialGate({ ...prev, videography: { ...prev.videography, traditional: v } }),
              )
            }
            onCountChange={(n) => applyDay((prev) => ({ ...prev, videography: { ...prev.videography, traditionalCount: n } }))}
          />
          <StyleRow
            label="Candid"
            description="Cinematic storytelling"
            enabled={day.videography.candid}
            count={day.videography.candidCount}
            min={ADMIN_LIMITS.minVideographers}
            max={ADMIN_LIMITS.maxVideographersPerType}
            countLabel="Videographers"
            onToggle={(v) =>
              applyDay((prev) => applyAerialGate({ ...prev, videography: { ...prev.videography, candid: v } }))
            }
            onCountChange={(n) => applyDay((prev) => ({ ...prev, videography: { ...prev.videography, candidCount: n } }))}
          />
        </>
      </ServiceSelectCard>

      {showCoreError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Badge label="Action needed" tone="red" />
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{CORE_SERVICE_REQUIRED_MESSAGE}</Muted>
        </Card>
      ) : null}

      <SectionTitle style={{ marginTop: 4 }}>Add-ons</SectionTitle>

      <AddOnCard
        title="Drone / Aerial"
        subtitle={aerialSelectable ? "Optional aerial photography or videography" : "Select photography or videography first."}
        icon={<Plane size={18} color={colors.primaryDark} />}
        enabled={aerialOn}
        disabled={!aerialSelectable}
        disabledReason="Select photography or videography first."
        summary={[
          day.aerial.photographyDrones ? `${day.aerial.photographyDrones} photo drone(s)` : null,
          day.aerial.videographyDrones ? `${day.aerial.videographyDrones} video drone(s)` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        onToggle={(v) => applyDay((prev) => setAerialEnabled(prev, v))}
      >
        <Stepper
          label="Photo drones"
          value={day.aerial.photographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => applyDay((prev) => ({ ...prev, aerial: { ...prev.aerial, photographyDrones: n } }))}
        />
        <Stepper
          label="Video drones"
          value={day.aerial.videographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => applyDay((prev) => ({ ...prev, aerial: { ...prev.aerial, videographyDrones: n } }))}
        />
      </AddOnCard>

      <AddOnCard
        title="LED Wall"
        subtitle="Off unless you need LED screens"
        icon={<Tv size={18} color={colors.primaryDark} />}
        enabled={day.ledWall.enabled === true}
        summary={day.ledWall.enabled ? `${day.ledWall.size} · ${day.ledWall.screenCount} screen(s)` : undefined}
        onToggle={(v) =>
          applyDay((prev) => ({
            ...prev,
            ledWall: v ? { ...prev.ledWall, enabled: true } : { enabled: false, size: "8 x 12", screenCount: 1 },
          }))
        }
      >
        <Muted style={{ fontWeight: "700", color: colors.ink }}>Size</Muted>
        <ChipGroup>
          {LED_WALL_SIZES.map((size) => (
            <Chip key={size} label={size} selected={day.ledWall.size === size} onPress={() => applyDay((prev) => ({ ...prev, ledWall: { ...prev.ledWall, size } }))} />
          ))}
        </ChipGroup>
        <Stepper
          label="Number of screens"
          value={day.ledWall.screenCount}
          min={1}
          max={ADMIN_LIMITS.maxLedScreens}
          onChange={(n) => applyDay((prev) => ({ ...prev, ledWall: { ...prev.ledWall, screenCount: n } }))}
        />
      </AddOnCard>

      <AddOnCard
        title="Web Live"
        subtitle="Off unless you need a live stream"
        icon={<Radio size={18} color={colors.primaryDark} />}
        enabled={day.webLive.enabled === true}
        summary={day.webLive.enabled ? `${day.webLive.quality} · ${day.webLive.accessType} link` : undefined}
        onToggle={(v) =>
          applyDay((prev) => ({
            ...prev,
            webLive: v
              ? { ...prev.webLive, enabled: true }
              : { enabled: false, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
          }))
        }
      >
        <Muted style={{ fontWeight: "700", color: colors.ink }}>Quality</Muted>
        <ChipGroup>
          {WEB_LIVE_QUALITIES.map((q) => (
            <Chip key={q} label={q} selected={day.webLive.quality === q} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, quality: q } }))} />
          ))}
        </ChipGroup>
        <Stepper
          label="Number of cameras"
          value={day.webLive.cameraCount}
          min={1}
          max={6}
          onChange={(n) => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, cameraCount: n } }))}
        />
        <ChipGroup>
          <Chip label="Private link" selected={day.webLive.accessType === "private"} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, accessType: "private" } }))} />
          <Chip label="Public link" selected={day.webLive.accessType === "public"} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, accessType: "public" } }))} />
        </ChipGroup>
      </AddOnCard>
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  overnightBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  locationLabel: { fontSize: 12, fontWeight: "700", color: colors.muted },
  locationText: { fontSize: 14, fontWeight: "700", color: colors.text },
});
