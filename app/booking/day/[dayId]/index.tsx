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
  validateDay,
} from "@/src/engine/validation";
import { durationMinutes, formatDuration, inferOvernight, isEndAfterStart } from "@/src/utils/dateTime";
import type { EventDay } from "@/src/types/booking";
import { colors, radius, spacing } from "@/src/constants/theme";

const GROUPS = ["wedding", "personal", "commercial"] as const;

export default function DayEditorScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { activeDraft, updateDay } = useAppStore();
  const [day, setDay] = useState<EventDay | null>(null);
  const [aerialOpen, setAerialOpen] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

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
    if (found) {
      if (found.aerial.photographyDrones > 0 || found.aerial.videographyDrones > 0) setAerialOpen(true);
      if (found.photography.traditional || found.photography.candid) setPhotoOpen(true);
      if (found.videography.traditional || found.videography.candid) setVideoOpen(true);
    }
  }, [dayId]);

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

  const issues = validateDay(day);
  const issueOf = (code: string) => issues.find((i) => i.code === code)?.message;
  const coreOn = hasCoreService(day);
  const bothTimesSelected = Boolean(day.startTime && day.endTime);
  const wouldBeOvernight = Boolean(day.startTime && day.endTime && !isEndAfterStart(day.startTime, day.endTime, false));
  const duration = bothTimesSelected ? durationMinutes(day.startTime!, day.endTime!, day.overnight) : null;

  const photoOn = day.photography.traditional || day.photography.candid;
  const videoOn = day.videography.traditional || day.videography.candid;

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
  const extraTypes = DEFAULT_EVENT_CATEGORIES.filter((c) => c.enabled && !featured.some((f) => f.id === c.id));

  const onDone = () => {
    if (issues.length) {
      Alert.alert("Almost there", issues[0].message);
      return;
    }
    void updateDay(day.dayId, day);
    router.back();
  };

  const togglePhotography = () => {
    if (photoOn) {
      setPhotoOpen(false);
      const nextPhoto = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
      if (!videoOn) {
        setAerialOpen(false);
        patch({ photography: nextPhoto, aerial: { photographyDrones: 0, videographyDrones: 0 } });
      } else {
        patch({ photography: nextPhoto });
      }
    } else {
      setPhotoOpen(true);
      patch({ photography: { ...day.photography, traditional: true, traditionalCount: Math.max(1, day.photography.traditionalCount) } });
    }
  };

  const toggleVideography = () => {
    if (videoOn) {
      setVideoOpen(false);
      const nextVideo = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
      if (!photoOn) {
        setAerialOpen(false);
        patch({ videography: nextVideo, aerial: { photographyDrones: 0, videographyDrones: 0 } });
      } else {
        patch({ videography: nextVideo });
      }
    } else {
      setVideoOpen(true);
      patch({ videography: { ...day.videography, traditional: true, traditionalCount: Math.max(1, day.videography.traditionalCount) } });
    }
  };

  return (
    <WizardScreen title={`Day ${day.order}`} step="event" footer={<Button label="Save" onPress={onDone} flex={1} />}>
      <View style={{ gap: 4 }}>
        <SectionTitle>What are you planning?</SectionTitle>
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
            const cats = extraTypes.filter((c) => c.group === group);
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
        <SectionTitle>Tell us about your event</SectionTitle>
        <DateField label="When is your event?" value={day.eventDate} onChange={(iso) => patch({ eventDate: iso })} minimumDate={new Date()} />
        {issueOf("EVENT_DATE_REQUIRED") || issueOf("EVENT_DATE_PAST") ? (
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("EVENT_DATE_PAST") ?? issueOf("EVENT_DATE_REQUIRED")}</Muted>
        ) : null}

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TimeField
            label="Start time"
            value={day.startTime}
            placeholder="Select start time"
            onChange={(t) => patch({ startTime: t, overnight: inferOvernight(t, day.endTime) })}
          />
          <TimeField
            label="End time"
            value={day.endTime}
            placeholder="Select end time"
            onChange={(t) => patch({ endTime: t, overnight: inferOvernight(day.startTime, t) })}
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
          onPress={() => router.push(`/booking/day/${day.dayId}/location`)}
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

      <View style={{ gap: 4 }}>
        <SectionTitle>What do you need?</SectionTitle>
        <Muted>Photography or videography is required.</Muted>
      </View>

      <ServiceSelectCard
        title="Photography"
        subtitle="Traditional and candid coverage"
        icon={<Camera size={20} color={colors.primaryDark} />}
        selected={photoOn}
        summary={photoSummary}
        onPress={togglePhotography}
      >
        {photoOpen ? (
          <>
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
          </>
        ) : null}
      </ServiceSelectCard>

      <ServiceSelectCard
        title="Videography"
        subtitle="Ceremony films and cinematic stories"
        icon={<Video size={20} color={colors.primaryDark} />}
        selected={videoOn}
        summary={videoSummary}
        onPress={toggleVideography}
      >
        {videoOpen ? (
          <>
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
          </>
        ) : null}
      </ServiceSelectCard>

      {issueOf("CORE_SERVICE_REQUIRED") ? (
        <Card style={{ borderColor: colors.danger }}>
          <Badge label="Action needed" tone="red" />
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{CORE_SERVICE_REQUIRED_MESSAGE}</Muted>
        </Card>
      ) : null}

      <SectionTitle style={{ marginTop: 4 }}>Add-ons</SectionTitle>

      <AddOnCard
        title="Drone / Aerial"
        subtitle="Aerial photography and videography"
        icon={<Plane size={18} color={colors.primaryDark} />}
        enabled={aerialOpen && coreOn}
        disabled={!coreOn}
        disabledReason="Select photography or videography first."
        summary={[
          day.aerial.photographyDrones ? `${day.aerial.photographyDrones} photo drone(s)` : null,
          day.aerial.videographyDrones ? `${day.aerial.videographyDrones} video drone(s)` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        onToggle={(v) => {
          if (!coreOn) return;
          setAerialOpen(v);
          if (!v) patch({ aerial: { photographyDrones: 0, videographyDrones: 0 } });
        }}
      >
        <Stepper
          label="Photo drones"
          value={day.aerial.photographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => patch({ aerial: { ...day.aerial, photographyDrones: n } })}
        />
        <Stepper
          label="Video drones"
          value={day.aerial.videographyDrones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => patch({ aerial: { ...day.aerial, videographyDrones: n } })}
        />
      </AddOnCard>

      <AddOnCard
        title="LED Wall"
        subtitle="Off unless you need LED screens"
        icon={<Tv size={18} color={colors.primaryDark} />}
        enabled={day.ledWall.enabled === true}
        summary={day.ledWall.enabled ? `${day.ledWall.size} · ${day.ledWall.screenCount} screen(s)` : undefined}
        onToggle={(v) =>
          patch({
            ledWall: v ? { ...day.ledWall, enabled: true } : { enabled: false, size: "8 x 12", screenCount: 1 },
          })
        }
      >
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
      </AddOnCard>

      <AddOnCard
        title="Web Live"
        subtitle="Off unless you need a live stream"
        icon={<Radio size={18} color={colors.primaryDark} />}
        enabled={day.webLive.enabled === true}
        summary={day.webLive.enabled ? `${day.webLive.quality} · ${day.webLive.accessType} link` : undefined}
        onToggle={(v) =>
          patch({
            webLive: v
              ? { ...day.webLive, enabled: true }
              : { enabled: false, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
          })
        }
      >
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
        <ChipGroup>
          <Chip label="Private link" selected={day.webLive.accessType === "private"} onPress={() => patch({ webLive: { ...day.webLive, accessType: "private" } })} />
          <Chip label="Public link" selected={day.webLive.accessType === "public"} onPress={() => patch({ webLive: { ...day.webLive, accessType: "public" } })} />
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
