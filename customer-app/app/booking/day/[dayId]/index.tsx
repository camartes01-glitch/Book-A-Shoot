import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { MapPin, Plane, Radio, Camera, Video, Tv } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Badge, Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { Chip, ChipGroup } from "@/src/components/Chip";
import { ToggleRow } from "@/src/components/ToggleRow";
import { StyleRow } from "@/src/components/StyleRow";
import { Stepper } from "@/src/components/Stepper";
import { DateField, TimeField } from "@/src/components/DateField";
import { useAppStore } from "@/src/state/AppProvider";
import { DEFAULT_EVENT_CATEGORIES, EVENT_GROUP_LABEL } from "@/src/constants/eventCategories";
import { ADMIN_LIMITS, LED_WALL_SIZES, WEB_LIVE_QUALITIES } from "@/src/constants/limits";
import { validateCoreServiceRule, validateDay, CORE_SERVICE_REQUIRED_MESSAGE } from "@/src/engine/validation";
import { durationMinutes, formatDuration } from "@/src/utils/dateTime";
import type { EventDay } from "@/src/types/booking";
import { colors, spacing } from "@/src/constants/theme";

const GROUPS = ["wedding", "personal", "commercial"] as const;

export default function DayEditorScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { activeDraft, updateDay } = useAppStore();
  const [day, setDay] = useState<EventDay | null>(null);

  // `useFocusEffect`'s callback below is only re-created when `dayId`
  // changes (see the comment further down for why). That means it closes
  // over whatever `activeDraft`/`updateDay` looked like at that time — if we
  // read those directly, every later focus/blur would silently use a
  // months-old snapshot instead of the latest booking state. Refs sidestep
  // that: they're mutable, so `.current` is always fresh no matter how old
  // the closure reading it is.
  const activeDraftRef = useRef(activeDraft);
  const updateDayRef = useRef(updateDay);
  const dayRef = useRef<EventDay | null>(null);

  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);
  useEffect(() => {
    updateDayRef.current = updateDay;
  }, [updateDay]);
  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  const syncFromStore = useCallback(() => {
    const found = activeDraftRef.current?.days.find((d) => d.dayId === dayId) ?? null;
    setDay(found);
    dayRef.current = found;
  }, [dayId]);

  // Save on blur/unmount only (e.g. when navigating to the location picker,
  // or pressing back) instead of a timer-based debounce. A debounce here
  // previously raced with the location picker: if its timer fired *after*
  // the location screen had already saved a fresh address, it overwrote
  // that address with this screen's stale copy. A debounce that never fires
  // before unmount also silently dropped last-second edits (e.g. tapping
  // back right after picking an event type). Flushing exactly once, when
  // this screen loses focus, avoids both failure modes.
  //
  // Deliberately depending only on `[dayId, syncFromStore]` (both stable for
  // the lifetime of this screen) keeps this callback's identity fixed, so it
  // is registered with the navigator exactly once instead of being torn
  // down and rebuilt (and its cleanup re-run) on every unrelated store
  // update while the screen is still focused.
  useFocusEffect(
    useCallback(() => {
      syncFromStore();
      return () => {
        if (dayRef.current) void updateDayRef.current(dayRef.current.dayId, dayRef.current);
      };
    }, [dayId, syncFromStore]),
  );

  if (!day) return null;

  const patch = (p: Partial<EventDay>) => setDay((prev) => (prev ? { ...prev, ...p } : prev));
  const toggleEventType = (id: string) => {
    patch({ eventTypeIds: day.eventTypeIds.includes(id) ? day.eventTypeIds.filter((t) => t !== id) : [...day.eventTypeIds, id] });
  };

  const coreServiceIssues = validateCoreServiceRule(day);
  const duration = day.startTime && day.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;

  const onDone = () => {
    const issues = validateDay(day);
    if (issues.length) {
      Alert.alert("Almost there", issues[0].message);
      return;
    }
    void updateDay(day.dayId, day);
    router.back();
  };

  return (
    <WizardScreen
      title={`Day ${day.order}`}
      step="event"
      footer={<Button label="Save & Continue" onPress={onDone} flex={1} />}
    >
      <Card>
        <SectionTitle>Event information</SectionTitle>
        <DateField label="Event date" value={day.eventDate} onChange={(iso) => patch({ eventDate: iso })} minimumDate={new Date()} />

        <View style={{ gap: spacing.sm }}>
          <Muted style={{ fontWeight: "700", color: colors.ink }}>Event type</Muted>
          {GROUPS.map((group) => (
            <View key={group} style={{ gap: 6 }}>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{EVENT_GROUP_LABEL[group]}</Muted>
              <ChipGroup>
                {DEFAULT_EVENT_CATEGORIES.filter((c) => c.group === group && c.enabled).map((c) => (
                  <Chip key={c.id} label={c.label} selected={day.eventTypeIds.includes(c.id)} onPress={() => toggleEventType(c.id)} />
                ))}
              </ChipGroup>
            </View>
          ))}
        </View>

        <Pressable style={styles.locationField} onPress={() => router.push(`/booking/day/${day.dayId}/location`)}>
          <MapPin size={16} color={colors.primaryDark} />
          <Text style={styles.locationText} numberOfLines={2}>
            {day.location.formattedAddress || "Select event location"}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TimeField label="Start time" value={day.startTime} onChange={(t) => patch({ startTime: t })} />
          <TimeField label="End time" value={day.endTime} onChange={(t) => patch({ endTime: t })} />
        </View>
        <ToggleRow
          label="Ends the next day"
          description="For overnight events, e.g. 8:00 PM to 2:00 AM"
          value={day.overnight}
          onValueChange={(v) => patch({ overnight: v })}
        />
        {duration != null ? <Muted>Duration: {formatDuration(duration)}</Muted> : null}
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Camera size={18} color={colors.primaryDark} />
          <SectionTitle>Photography</SectionTitle>
        </View>
        <StyleRow
          label="Traditional"
          description="Classic, posed coverage"
          enabled={day.photography.traditional}
          count={day.photography.traditionalCount}
          min={ADMIN_LIMITS.minPhotographers}
          max={ADMIN_LIMITS.maxPhotographersPerType}
          countLabel="Photographers"
          onToggle={(v) => patch({ photography: { ...day.photography, traditional: v } })}
          onCountChange={(n) => patch({ photography: { ...day.photography, traditionalCount: n } })}
        />
        <StyleRow
          label="Candid"
          description="Natural, unposed moments"
          enabled={day.photography.candid}
          count={day.photography.candidCount}
          min={ADMIN_LIMITS.minPhotographers}
          max={ADMIN_LIMITS.maxPhotographersPerType}
          countLabel="Photographers"
          onToggle={(v) => patch({ photography: { ...day.photography, candid: v } })}
          onCountChange={(n) => patch({ photography: { ...day.photography, candidCount: n } })}
        />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Video size={18} color={colors.primaryDark} />
          <SectionTitle>Videography</SectionTitle>
        </View>
        <StyleRow
          label="Traditional"
          description="Classic ceremony filming"
          enabled={day.videography.traditional}
          count={day.videography.traditionalCount}
          min={ADMIN_LIMITS.minVideographers}
          max={ADMIN_LIMITS.maxVideographersPerType}
          countLabel="Videographers"
          onToggle={(v) => patch({ videography: { ...day.videography, traditional: v } })}
          onCountChange={(n) => patch({ videography: { ...day.videography, traditionalCount: n } })}
        />
        <StyleRow
          label="Candid"
          description="Cinematic storytelling"
          enabled={day.videography.candid}
          count={day.videography.candidCount}
          min={ADMIN_LIMITS.minVideographers}
          max={ADMIN_LIMITS.maxVideographersPerType}
          countLabel="Videographers"
          onToggle={(v) => patch({ videography: { ...day.videography, candid: v } })}
          onCountChange={(n) => patch({ videography: { ...day.videography, candidCount: n } })}
        />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Plane size={18} color={colors.primaryDark} />
          <SectionTitle>Aerial (add-on)</SectionTitle>
        </View>
        <Stepper
          label="Aerial photography — drones"
          value={day.aerial.photographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => patch({ aerial: { ...day.aerial, photographyDrones: n } })}
        />
        <Stepper
          label="Aerial videography — drones"
          value={day.aerial.videographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => patch({ aerial: { ...day.aerial, videographyDrones: n } })}
        />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Tv size={18} color={colors.primaryDark} />
          <SectionTitle>LED Wall (add-on)</SectionTitle>
        </View>
        <ToggleRow label="Enable LED Wall" value={day.ledWall.enabled} onValueChange={(v) => patch({ ledWall: { ...day.ledWall, enabled: v } })} />
        {day.ledWall.enabled ? (
          <View style={{ gap: spacing.sm }}>
            <Muted style={{ fontWeight: "700", color: colors.ink }}>Size</Muted>
            <ChipGroup>
              {LED_WALL_SIZES.map((size) => (
                <Chip key={size} label={size} selected={day.ledWall.size === size} onPress={() => patch({ ledWall: { ...day.ledWall, size } })} />
              ))}
            </ChipGroup>
            <Stepper
              label="Number of screens"
              value={day.ledWall.screenCount}
              min={1}
              max={ADMIN_LIMITS.maxLedScreens}
              onChange={(n) => patch({ ledWall: { ...day.ledWall, screenCount: n } })}
            />
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Radio size={18} color={colors.primaryDark} />
          <SectionTitle>Web Live (add-on)</SectionTitle>
        </View>
        <ToggleRow label="Enable Web Live" value={day.webLive.enabled} onValueChange={(v) => patch({ webLive: { ...day.webLive, enabled: v } })} />
        {day.webLive.enabled ? (
          <View style={{ gap: spacing.sm }}>
            <Muted style={{ fontWeight: "700", color: colors.ink }}>Quality</Muted>
            <ChipGroup>
              {WEB_LIVE_QUALITIES.map((q) => (
                <Chip key={q} label={q} selected={day.webLive.quality === q} onPress={() => patch({ webLive: { ...day.webLive, quality: q } })} />
              ))}
            </ChipGroup>
            <Stepper
              label="Number of cameras"
              value={day.webLive.cameraCount}
              min={1}
              max={6}
              onChange={(n) => patch({ webLive: { ...day.webLive, cameraCount: n } })}
            />
            <Muted style={{ fontWeight: "700", color: colors.ink }}>Access</Muted>
            <ChipGroup>
              <Chip label="Private link" selected={day.webLive.accessType === "private"} onPress={() => patch({ webLive: { ...day.webLive, accessType: "private" } })} />
              <Chip label="Public link" selected={day.webLive.accessType === "public"} onPress={() => patch({ webLive: { ...day.webLive, accessType: "public" } })} />
            </ChipGroup>
          </View>
        ) : null}
      </Card>

      {coreServiceIssues.length ? (
        <Card style={{ borderColor: colors.danger }}>
          <Badge label="Action needed" tone="red" />
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{CORE_SERVICE_REQUIRED_MESSAGE}</Muted>
        </Card>
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationField: {
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
  locationText: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
});
