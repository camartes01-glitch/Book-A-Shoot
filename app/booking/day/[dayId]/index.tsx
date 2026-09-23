import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Briefcase, CalendarPlus, Camera, Check, ChevronDown, ChevronUp, Film, Flame, Lock, MapPin, Plane, Radio, Sparkles, Tv, Video } from "lucide-react-native";
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
import { DEFAULT_EVENT_CATEGORIES, EVENT_GROUP_LABEL, WEDDING_CATALOG_EVENT_IDS, getEventTagline } from "@/src/constants/eventCategories";
import { ADMIN_LIMITS, LED_WALL_SIZES, WEB_LIVE_QUALITIES } from "@/src/constants/limits";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  END_BEFORE_START_MESSAGE,
  OVERNIGHT_EVENT_MESSAGE,
  hasCoreService,
  isEventStepComplete,
  isServicesStepComplete,
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
import { normalizeRouteParam, safeBack } from "@/src/utils/routeParam";
import type { EventDay } from "@/src/types/booking";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";

const GROUPS = ["wedding", "pooja", "personal", "commercial"] as const;

export type DaySubStep = "event" | "photography" | "videography" | "addons";

const FEATURED_EVENT_IDS = [
  "wedding",
  "pre_wedding",
  "birthday",
  "baby_shoot",
  "maternity_shoot",
  "anniversary",
  "housewarming",
  "corporate_event",
  "satyanarayan_pooja",
  "product_shoot",
];

function mapRawStep(step?: string): DaySubStep {
  if (step === "photography" || step === "services") return "photography";
  if (step === "videography") return "videography";
  if (step === "addons") return "addons";
  return "event";
}

export default function DayEditorScreen() {
  const params = useLocalSearchParams<{
    dayId: string | string[];
    step?: string;
    back?: string;
    mode?: string;
    fromWedding?: string;
  }>();
  const isEditMode = params.mode === "edit";
  const dayId = normalizeRouteParam(params.dayId);
  const rawStep = Array.isArray(params.step) ? params.step[0] : params.step;
  const [screenStep, setScreenStep] = useState<DaySubStep>(mapRawStep(rawStep));
  const { activeDraft, updateDay, loadDraft, addDay } = useAppStore();
  const [day, setDay] = useState<EventDay | null>(null);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [selectedNextOption, setSelectedNextOption] = useState<"another_day" | "post_production">("post_production");
  const [isWeddingMode, setIsWeddingMode] = useState<boolean>(true);
  const [customEventInput, setCustomEventInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [dropdownY, setDropdownY] = useState(0);
  const [dateTimeLocationY, setDateTimeLocationY] = useState(0);

  const scrollToElementId = useCallback((elementId: string, fallbackY?: number) => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (fallbackY != null && fallbackY > 0) {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, fallbackY - 20), animated: true });
        }
      }, 70);
    } else {
      if (fallbackY != null && fallbackY > 0) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, fallbackY - 20), animated: true });
      }
    }
  }, []);

  useEffect(() => {
    if (params.fromWedding === "1") {
      setIsWeddingMode(true);
      setDropdownOpen(true);
      scrollToElementId("wedding-dropdown-section");
    } else if (params.fromWedding === "0") {
      setIsWeddingMode(false);
    }
  }, [params.fromWedding, scrollToElementId]);

  useEffect(() => {
    if (day?.eventTypeIds.length) {
      const hasWedding = day.eventTypeIds.some((id) => WEDDING_CATALOG_EVENT_IDS.includes(id));
      setIsWeddingMode(hasWedding);
    }
  }, [day?.eventTypeIds]);

  useEffect(() => {
    if (rawStep) {
      setScreenStep(mapRawStep(rawStep));
    }
  }, [rawStep]);

  useEffect(() => {
    if (params.back === "1") {
      userNavigatedBackRef.current = true;
    }
  }, [params.back]);

  const activeDraftRef = useRef(activeDraft);
  const updateDayRef = useRef(updateDay);
  const dayRef = useRef<EventDay | null>(null);
  const persistChainRef = useRef(Promise.resolve());

  const userNavigatedBackRef = useRef(false);
  const eventTransitionLockRef = useRef(false);
  const servicesTransitionLockRef = useRef(false);

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

  useEffect(() => {
    syncFromStore();
  }, [activeDraft, dayId, syncFromStore]);

  useFocusEffect(
    useCallback(() => {
      servicesTransitionLockRef.current = false;
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

  const alreadySelectedEventMap = useMemo(() => {
    const map: Record<string, number> = {};
    (activeDraft?.days || []).forEach((d) => {
      if (d.dayId !== dayId) {
        (d.eventTypeIds || []).forEach((id) => {
          map[id] = d.order || 1;
        });
      }
    });
    return map;
  }, [activeDraft?.days, dayId]);

  const weddingCatalogEvents = useMemo(() => {
    return WEDDING_CATALOG_EVENT_IDS.map(
      (id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id) ?? { id, group: "wedding" as const, label: id, enabled: true, order: 1 }
    );
  }, []);

  if (!dayId) return null;
  if (!day) {
    return (
      <WizardScreen title="What are you planning?" step="event">
        <Muted>Loading this event day…</Muted>
      </WizardScreen>
    );
  }

  const applyDay = (updater: (prev: EventDay) => EventDay, stepContext?: DaySubStep | "services") => {
    const prev = dayRef.current;
    if (!prev) return;
    const next = sanitizeEventDay({ ...updater(prev), dayId: prev.dayId, order: prev.order, dayRevision: (prev.dayRevision ?? 0) + 1 });
    dayRef.current = next;
    setDay(next);
    persistDay(next);

    const context = stepContext ?? screenStep;
    if (context === "event" && !isEditMode) {
      userNavigatedBackRef.current = false;
    }
  };
  const patch = (p: Partial<EventDay>) => applyDay((prev) => ({ ...prev, ...p }));

  const toggleEventType = (id: string) => {
    applyDay((prev) => ({
      ...prev,
      eventTypeIds: prev.eventTypeIds.includes(id)
        ? prev.eventTypeIds.filter((t) => t !== id)
        : [...prev.eventTypeIds, id],
    }), "event");
  };

  const onDateChange = (iso: string) => {
    applyDay((prev) => ({ ...prev, eventDate: iso }), "event");
  };

  const onStartTimeChange = (t: string) => {
    applyDay((prev) => ({ ...prev, startTime: t, overnight: inferOvernight(t, prev.endTime) }), "event");
  };

  const onEndTimeChange = (t: string) => {
    applyDay((prev) => ({ ...prev, endTime: t, overnight: inferOvernight(prev.startTime, t) }), "event");
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

  const onSelectWeddingCard = () => {
    setIsWeddingMode(true);
    setDropdownOpen(true);
    if (!day?.eventTypeIds.some((id) => WEDDING_CATALOG_EVENT_IDS.includes(id))) {
      applyDay((prev) => ({ ...prev, eventTypeIds: ["wedding"] }), "event");
    }
    scrollToElementId("wedding-dropdown-section", dropdownY);
  };

  const onSelectOtherEventCard = (catId: string) => {
    setIsWeddingMode(false);
    applyDay((prev) => ({ ...prev, eventTypeIds: [catId] }), "event");
    scrollToElementId("date-time-section", dateTimeLocationY);
  };

  const onSelectWeddingDropdownEvent = (catId: string) => {
    applyDay((prev) => ({ ...prev, eventTypeIds: [catId] }), "event");
    scrollToElementId("date-time-section", dateTimeLocationY);
  };

  const onApplyCustomEvent = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsWeddingMode(false);
    applyDay((prev) => ({ ...prev, eventTypeIds: [trimmed] }), "event");
    scrollToElementId("date-time-section", dateTimeLocationY);
  };

  const onAddAnotherDay = async () => {
    setSaveAttempted(true);
    const currentDay = dayRef.current ?? day;
    if (!currentDay || !hasCoreService(currentDay)) {
      Alert.alert("Service required", CORE_SERVICE_REQUIRED_MESSAGE);
      return;
    }
    if (servicesTransitionLockRef.current) return;
    servicesTransitionLockRef.current = true;
    try {
      await flushPersist();
      const isCurrentWedding =
        isWeddingMode ||
        currentDay.eventTypeIds.some((id) => WEDDING_CATALOG_EVENT_IDS.includes(id)) ||
        (activeDraft?.days || []).some((d) => d.eventTypeIds.some((id) => WEDDING_CATALOG_EVENT_IDS.includes(id)));

      const updated = await addDay();
      const newDay = updated?.days[updated.days.length - 1];
      if (newDay) {
        router.push({
          pathname: "/booking/day/[dayId]",
          params: { dayId: newDay.dayId, step: "event", fromWedding: isCurrentWedding ? "1" : "0" },
        } as any);
      }
    } finally {
      servicesTransitionLockRef.current = false;
    }
  };

  const onMoveToPostProduction = async () => {
    setSaveAttempted(true);
    const currentDay = dayRef.current ?? day;
    if (!currentDay || !hasCoreService(currentDay)) {
      Alert.alert("Service required", CORE_SERVICE_REQUIRED_MESSAGE);
      return;
    }
    if (servicesTransitionLockRef.current) return;
    servicesTransitionLockRef.current = true;
    await flushPersist();
    router.push("/booking/deliverables");
  };

  const videoSummary = [
    day.videography.traditional ? `Traditional ×${day.videography.traditionalCount}` : null,
    day.videography.candid ? `Candid ×${day.videography.candidCount}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const featured = FEATURED_EVENT_IDS
    .map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id && c.enabled))
    .filter(Boolean) as typeof DEFAULT_EVENT_CATEGORIES;
  const poojaTypes = DEFAULT_EVENT_CATEGORIES.filter((c) => c.enabled && c.group === "pooja");
  const extraTypes = DEFAULT_EVENT_CATEGORIES.filter(
    (c) => c.enabled && c.group !== "pooja" && !featured.some((f) => f.id === c.id),
  );

  const canContinueToServices = isEventStepComplete(day);

  const onSaveAndReturn = async () => {
    setSaveAttempted(true);
    const currentDay = dayRef.current ?? day;
    if (!currentDay || !hasCoreService(currentDay)) {
      Alert.alert("Service required", CORE_SERVICE_REQUIRED_MESSAGE);
      return;
    }
    if (servicesTransitionLockRef.current) return;
    servicesTransitionLockRef.current = true;
    try {
      await flushPersist();
      router.replace("/booking/confirm");
    } finally {
      servicesTransitionLockRef.current = false;
    }
  };

  const onContinueToPhotography = () => {
    setSaveAttempted(true);
    if (!canContinueToServices) {
      if (!day.eventTypeIds.length) {
        Alert.alert("Event needed", "Please select an event from the dropdown catalog.");
      } else if (!day.eventDate) {
        Alert.alert("Date needed", "Please choose the event date.");
      } else if (!day.startTime || !day.endTime) {
        Alert.alert("Time needed", "Please choose start and end times.");
      } else if (!day.location?.formattedAddress) {
        Alert.alert("Location needed", "Please select the event location.");
      } else {
        Alert.alert("Invalid times", END_BEFORE_START_MESSAGE);
      }
      return;
    }
    userNavigatedBackRef.current = false;
    setScreenStep("photography");
    router.setParams({ step: "photography", mode: isEditMode ? "edit" : undefined });
  };

  const onContinueToVideography = () => {
    userNavigatedBackRef.current = false;
    setScreenStep("videography");
    router.setParams({ step: "videography", mode: isEditMode ? "edit" : undefined });
  };

  const onContinueToAddons = () => {
    userNavigatedBackRef.current = false;
    setScreenStep("addons");
    router.setParams({ step: "addons", mode: isEditMode ? "edit" : undefined });
  };

  const togglePhotography = () => applyDay((prev) => setPhotographySelected(prev, !isPhotographySelected(prev)), "photography");
  const toggleVideography = () => applyDay((prev) => setVideographySelected(prev, !isVideographySelected(prev)), "videography");

  const onGoHome = async () => {
    await flushPersist();
    router.replace("/(tabs)");
  };

  const renderEditTabs = () => {
    if (!isEditMode) return null;
    const tabs: { key: DaySubStep; label: string }[] = [
      { key: "event", label: "Details" },
      { key: "photography", label: "Photo" },
      { key: "videography", label: "Video" },
      { key: "addons", label: "Add-ons" },
    ];
    return (
      <View style={styles.editTabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.editTabChip, screenStep === tab.key && styles.editTabChipActive]}
            onPress={() => {
              setScreenStep(tab.key);
              router.setParams({ step: tab.key, mode: "edit" });
            }}
          >
            <Text style={[styles.editTabText, screenStep === tab.key && styles.editTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  if (screenStep === "event") {
    const selectedCatObj = DEFAULT_EVENT_CATEGORIES.find((c) => day.eventTypeIds.includes(c.id));
    const selectedCatLabel = selectedCatObj?.label || (day.eventTypeIds.length ? day.eventTypeIds[0] : "");

    return (
      <WizardScreen
        title={isEditMode ? `Edit Event Details (Day ${day.order})` : `Configure Event (Day ${day.order})`}
        step="event"
        scrollViewRef={scrollViewRef}
        onBack={() => {
          if (isEditMode) {
            void flushPersist().then(() => router.replace("/booking/confirm"));
          } else {
            safeBack("/(tabs)");
          }
        }}
        onHome={onGoHome}
        footer={
          isEditMode ? (
            <Button
              label="Save & Return to Review"
              onPress={onSaveAndReturn}
              disabled={!canContinueToServices}
              flex={1}
            />
          ) : (
            <Button
              label="Continue to photography"
              onPress={onContinueToPhotography}
              disabled={!canContinueToServices}
              flex={1}
            />
          )
        }
      >
        {renderEditTabs()}
        <View style={{ gap: 4 }}>
          <SectionTitle>What are you planning for Day {day.order}?</SectionTitle>
          <Muted>Select an event type below. Choose Wedding to see ceremony events, or select any celebration.</Muted>
        </View>

        {/* Displayed Event Cards with Pictures */}
        <View style={styles.grid}>
          {featured.map((c) => {
            const isWedding = c.id === "wedding";
            const isSelected = isWedding
              ? isWeddingMode && day.eventTypeIds.some((id) => WEDDING_CATALOG_EVENT_IDS.includes(id))
              : day.eventTypeIds.includes(c.id);

            return (
              <EventCategoryCard
                key={c.id}
                category={c}
                selected={isSelected}
                onPress={() => {
                  if (isWedding) {
                    onSelectWeddingCard();
                  } else {
                    onSelectOtherEventCard(c.id);
                  }
                }}
                height={110}
              />
            );
          })}
        </View>
        {issueOf("EVENT_TYPE_REQUIRED") ? (
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("EVENT_TYPE_REQUIRED")}</Muted>
        ) : null}

        {/* Custom Celebration Input Card */}
        <View style={styles.customEventBox}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={colors.primaryDark} />
            <Text style={styles.customEventBoxTitle}>Planning a different celebration?</Text>
          </View>
          <View style={styles.customEventInputRow}>
            <TextInput
              style={styles.customEventInput}
              placeholder="e.g. Sangeet, Housewarming, Naming ceremony..."
              placeholderTextColor="#94A3B8"
              value={customEventInput}
              onChangeText={setCustomEventInput}
              onSubmitEditing={() => onApplyCustomEvent(customEventInput)}
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [
                styles.customEventSubmitBtn,
                !customEventInput.trim() && styles.customEventSubmitBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              disabled={!customEventInput.trim()}
              onPress={() => onApplyCustomEvent(customEventInput)}
            >
              <Text style={styles.customEventSubmitText}>Select</Text>
            </Pressable>
          </View>
        </View>

        {/* Custom Dropdown Selector Card (Visible in Wedding Mode) */}
        {isWeddingMode ? (
          <View
            nativeID="wedding-dropdown-section"
            {...(Platform.OS === "web" ? { id: "wedding-dropdown-section" } : {})}
            onLayout={(e) => {
              setDropdownY(e.nativeEvent.layout.y);
            }}
          >
            <Card style={styles.dropdownCard}>
              <Pressable
                style={styles.dropdownHeader}
                onPress={() => setDropdownOpen((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Choose wedding event from dropdown"
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.dropdownHeaderSub}>Choose Wedding Event from Dropdown</Text>
                  <Text style={styles.dropdownHeaderTitle}>
                    {selectedCatLabel ? selectedCatLabel : "Tap to select an event from catalog..."}
                  </Text>
                </View>
                {dropdownOpen ? <ChevronUp size={22} color={colors.primaryDark} /> : <ChevronDown size={22} color={colors.primaryDark} />}
              </Pressable>

              {dropdownOpen ? (
                <View style={styles.dropdownOptionsContainer}>
                  {weddingCatalogEvents.map((c) => {
                    const isSelected = day.eventTypeIds.includes(c.id);
                    const bookedDayOrder = alreadySelectedEventMap[c.id];
                    const isDisabled = Boolean(bookedDayOrder);

                    return (
                      <Pressable
                        key={c.id}
                        disabled={isDisabled}
                        style={({ pressed }) => [
                          styles.dropdownOptionItem,
                          isSelected && styles.dropdownOptionSelected,
                          isDisabled && styles.dropdownOptionDisabled,
                          pressed && !isDisabled && styles.dropdownOptionPressed,
                        ]}
                        onPress={() => onSelectWeddingDropdownEvent(c.id)}
                      >
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={styles.dropdownOptionTitleRow}>
                            <Text
                              style={[
                                styles.dropdownOptionLabel,
                                isSelected && styles.dropdownOptionLabelSelected,
                                isDisabled && styles.dropdownOptionLabelDisabled,
                              ]}
                            >
                              {c.label}
                            </Text>
                            {isSelected && (
                              <View style={styles.activeBadge}>
                                <Sparkles size={11} color="#EA580C" />
                                <Text style={styles.activeBadgeText}>Selected</Text>
                              </View>
                            )}
                            {isDisabled && (
                              <View style={styles.disabledBadge}>
                                <Lock size={10} color="#64748B" />
                                <Text style={styles.disabledBadgeText}>Added for Day {bookedDayOrder}</Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.dropdownOptionTagline,
                              isDisabled && styles.dropdownOptionTaglineDisabled,
                            ]}
                            numberOfLines={1}
                          >
                            {getEventTagline(c.id)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        <ExpandRow
          open={showMoreTypes}
          onPress={() => setShowMoreTypes((v) => !v)}
          label={showMoreTypes ? "Show other event categories" : "Other event categories"}
        />
        {showMoreTypes ? (
          <View style={styles.otherCategoriesContainer}>
            {GROUPS.filter((g) => g !== "wedding").map((group) => {
              const cats =
                group === "pooja"
                  ? poojaTypes
                  : extraTypes.filter((c) => c.group === group);
              if (!cats.length) return null;
              const groupTitle = EVENT_GROUP_LABEL[group];
              const GroupIcon = group === "pooja" ? Flame : group === "personal" ? Sparkles : Briefcase;

              return (
                <Card key={group} style={styles.otherGroupCard}>
                  <View style={styles.otherGroupHeader}>
                    <GroupIcon size={16} color="#EA580C" />
                    <Text style={styles.otherGroupTitle}>{groupTitle}</Text>
                  </View>

                  <View style={styles.otherGroupItemsGrid}>
                    {cats.map((c) => {
                      const isSelected = day.eventTypeIds.includes(c.id);
                      return (
                        <Pressable
                          key={c.id}
                          style={({ pressed }) => [
                            styles.otherCategoryTile,
                            isSelected && styles.otherCategoryTileSelected,
                            pressed && styles.otherCategoryTilePressed,
                          ]}
                          onPress={() => {
                            applyDay((prev) => ({ ...prev, eventTypeIds: [c.id] }), "event");
                          }}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.otherCategoryLabel, isSelected && styles.otherCategoryLabelSelected]}>
                              {c.label}
                            </Text>
                            <Text style={styles.otherCategoryTagline} numberOfLines={1}>
                              {getEventTagline(c.id)}
                            </Text>
                          </View>
                          {isSelected && <Check size={14} color="#EA580C" strokeWidth={3} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        <View
          nativeID="date-time-section"
          {...(Platform.OS === "web" ? { id: "date-time-section" } : {})}
          onLayout={(e) => {
            setDateTimeLocationY(e.nativeEvent.layout.y);
          }}
        >
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
                  {day.location.formattedAddress || day.location.city || "Search area, city or venue"}
                </Text>
              </View>
            </Pressable>
            {issueOf("LOCATION_REQUIRED") ? (
              <Muted style={{ color: colors.danger, fontWeight: "600" }}>{issueOf("LOCATION_REQUIRED")}</Muted>
            ) : null}
          </Card>
        </View>
      </WizardScreen>
    );
  }

  if (screenStep === "photography") {
    return (
      <WizardScreen
        title={isEditMode ? `Edit Photo Coverage (Day ${day.order})` : "Photography coverage"}
        step="photography"
        onBack={() => {
          if (isEditMode) {
            void flushPersist().then(() => router.replace("/booking/confirm"));
          } else {
            userNavigatedBackRef.current = true;
            setScreenStep("event");
            router.setParams({ step: "event" });
          }
        }}
        onHome={onGoHome}
        footer={
          isEditMode ? (
            <Button
              label="Save & Return to Review"
              onPress={onSaveAndReturn}
              disabled={!hasCoreService(day)}
              flex={1}
            />
          ) : (
            <Button
              label="Continue to videography"
              onPress={onContinueToVideography}
              flex={1}
            />
          )
        }
      >
        {renderEditTabs()}
        <View style={{ gap: 4 }}>
          <SectionTitle>Photography coverage</SectionTitle>
          <Muted>Select traditional posed coverage, candid photography, or both. You can customize the photographer team count below.</Muted>
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
                applyDay(
                  (prev) => applyAerialGate({ ...prev, photography: { ...prev.photography, traditional: v } }),
                  "photography",
                )
              }
              onCountChange={(n) => applyDay((prev) => ({ ...prev, photography: { ...prev.photography, traditionalCount: n } }), "photography")}
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
                applyDay(
                  (prev) => applyAerialGate({ ...prev, photography: { ...prev.photography, candid: v } }),
                  "photography",
                )
              }
              onCountChange={(n) => applyDay((prev) => ({ ...prev, photography: { ...prev.photography, candidCount: n } }), "photography")}
            />
          </>
        </ServiceSelectCard>

        <Muted style={{ marginTop: 8 }}>
          Next step: Videography coverage. You can select either service or both.
        </Muted>
      </WizardScreen>
    );
  }

  if (screenStep === "videography") {
    return (
      <WizardScreen
        title={isEditMode ? `Edit Video Coverage (Day ${day.order})` : "Videography coverage"}
        step="videography"
        onBack={() => {
          if (isEditMode) {
            void flushPersist().then(() => router.replace("/booking/confirm"));
          } else {
            userNavigatedBackRef.current = true;
            setScreenStep("photography");
            router.setParams({ step: "photography" });
          }
        }}
        onHome={onGoHome}
        footer={
          isEditMode ? (
            <Button
              label="Save & Return to Review"
              onPress={onSaveAndReturn}
              disabled={!hasCoreService(day)}
              flex={1}
            />
          ) : (
            <Button
              label="Continue to add-ons"
              onPress={onContinueToAddons}
              flex={1}
            />
          )
        }
      >
        {renderEditTabs()}
        <View style={{ gap: 4 }}>
          <SectionTitle>Videography coverage</SectionTitle>
          <Muted>Select traditional ceremony filming, cinematic storytelling, or both. You can customize the videographer team count below.</Muted>
        </View>

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
                applyDay(
                  (prev) => applyAerialGate({ ...prev, videography: { ...prev.videography, traditional: v } }),
                  "videography",
                )
              }
              onCountChange={(n) => applyDay((prev) => ({ ...prev, videography: { ...prev.videography, traditionalCount: n } }), "videography")}
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
                applyDay(
                  (prev) => applyAerialGate({ ...prev, videography: { ...prev.videography, candid: v } }),
                  "videography",
                )
              }
              onCountChange={(n) => applyDay((prev) => ({ ...prev, videography: { ...prev.videography, candidCount: n } }), "videography")}
            />
          </>
        </ServiceSelectCard>

        {!hasCoreService(day) ? (
          <Muted style={{ marginTop: 8, color: colors.muted }}>
            Note: You haven't selected photography or videography yet. At least one core service is required to proceed.
          </Muted>
        ) : null}
      </WizardScreen>
    );
  }

  return (
    <WizardScreen
      title={isEditMode ? `Edit Add-ons (Day ${day.order})` : "Optional add-ons & Next Steps"}
      step="addons"
      onBack={() => {
        if (isEditMode) {
          void flushPersist().then(() => router.replace("/booking/confirm"));
        } else {
          userNavigatedBackRef.current = true;
          setScreenStep("videography");
          router.setParams({ step: "videography" });
        }
      }}
      onHome={onGoHome}
      footer={
        isEditMode ? (
          <Button
            label="Save & Return to Review"
            onPress={onSaveAndReturn}
            disabled={!hasCoreService(day)}
            flex={1}
          />
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.sm, flex: 1 }}>
            <Button
              label="+ Add Another Day"
              variant="outline"
              onPress={onAddAnotherDay}
              disabled={!hasCoreService(day)}
            />
            <Button
              label="Continue to Deliverables"
              onPress={onMoveToPostProduction}
              disabled={!hasCoreService(day)}
              flex={1}
            />
          </View>
        )
      }
    >
      {renderEditTabs()}
      <View style={{ gap: 4 }}>
        <SectionTitle>Optional add-ons</SectionTitle>
        <Muted>Add drone coverage, LED walls, or live web streaming to complete your shoot requirements.</Muted>
      </View>

      {!hasCoreService(day) || showCoreError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Badge label="Action needed" tone="red" />
          <Muted style={{ color: colors.danger, fontWeight: "600" }}>{CORE_SERVICE_REQUIRED_MESSAGE}</Muted>
        </Card>
      ) : null}

      <AddOnCard
        title="Drone / Aerial"
        subtitle={aerialSelectable ? "Optional aerial photography or videography" : "Select photography or videography first."}
        icon={<Plane size={18} color={colors.primaryDark} />}
        enabled={aerialOn}
        disabled={!aerialSelectable}
        disabledReason="Select photography or videography first."
        summary={day.aerial.drones ? `${day.aerial.drones} drone(s)` : ""}
        onToggle={(v) => applyDay((prev) => setAerialEnabled(prev, v), "addons")}
      >
        <Stepper
          label="Drones"
          value={day.aerial.drones}
          min={0}
          max={ADMIN_LIMITS.maxDronesPerType}
          onChange={(n) => applyDay((prev) => ({ ...prev, aerial: { ...prev.aerial, drones: n } }), "addons")}
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
          }), "addons")
        }
      >
        <Muted style={{ fontWeight: "700", color: colors.ink }}>Size</Muted>
        <ChipGroup>
          {LED_WALL_SIZES.map((size) => (
            <Chip key={size} label={size} selected={day.ledWall.size === size} onPress={() => applyDay((prev) => ({ ...prev, ledWall: { ...prev.ledWall, size } }), "addons")} />
          ))}
        </ChipGroup>
        <Stepper
          label="Number of screens"
          value={day.ledWall.screenCount}
          min={1}
          max={ADMIN_LIMITS.maxLedScreens}
          onChange={(n) => applyDay((prev) => ({ ...prev, ledWall: { ...prev.ledWall, screenCount: n } }), "addons")}
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
          }), "addons")
        }
      >
        <Muted style={{ fontWeight: "700", color: colors.ink }}>Quality</Muted>
        <ChipGroup>
          {WEB_LIVE_QUALITIES.map((q) => (
            <Chip key={q} label={q} selected={day.webLive.quality === q} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, quality: q } }), "addons")} />
          ))}
        </ChipGroup>
        <Stepper
          label="Number of cameras"
          value={day.webLive.cameraCount}
          min={1}
          max={6}
          onChange={(n) => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, cameraCount: n } }), "addons")}
        />
        <ChipGroup>
          <Chip label="Private link" selected={day.webLive.accessType === "private"} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, accessType: "private" } }), "addons")} />
          <Chip label="Public link" selected={day.webLive.accessType === "public"} onPress={() => applyDay((prev) => ({ ...prev, webLive: { ...prev.webLive, accessType: "public" } }), "addons")} />
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

  // Dropdown Styles
  dropdownCard: {
    padding: 0,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    backgroundColor: colors.white,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
  },
  dropdownHeaderSub: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dropdownHeaderTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
  },
  dropdownOptionsContainer: {
    padding: 8,
    gap: 6,
    backgroundColor: colors.white,
  },
  dropdownOptionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dropdownOptionSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: "#FFF7ED",
  },
  dropdownOptionDisabled: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    opacity: 0.7,
  },
  dropdownOptionPressed: {
    backgroundColor: "#FFF7ED",
  },
  dropdownOptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dropdownOptionLabel: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
  },
  dropdownOptionLabelSelected: {
    color: colors.primaryDark,
  },
  dropdownOptionLabelDisabled: {
    color: "#64748B",
  },
  dropdownOptionTagline: {
    fontSize: 12,
    color: colors.muted,
  },
  dropdownOptionTaglineDisabled: {
    color: "#94A3B8",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  disabledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  disabledBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
  },

  // Action Options Styles
  nextStepCard: {
    marginTop: 12,
    gap: 12,
  },
  optionsStack: {
    gap: 10,
    marginTop: 4,
  },
  actionOptionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: 6,
  },
  actionOptionCardSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: "#FFF7ED",
  },
  actionOptionCardPressed: {
    backgroundColor: "#FFEDD5",
  },
  actionOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionOptionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    flex: 1,
  },
  actionOptionDesc: {
    fontSize: 12.5,
    color: colors.muted,
    paddingLeft: 30,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  radioCircleActive: {
    borderColor: colors.primaryDark,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryDark,
  },
  otherCategoriesContainer: {
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  otherGroupCard: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    gap: 10,
  },
  otherGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  otherGroupTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  otherGroupItemsGrid: {
    gap: 8,
  },
  otherCategoryTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  otherCategoryTileSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  otherCategoryTilePressed: {
    backgroundColor: "#FFEDD5",
  },
  otherCategoryLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  otherCategoryLabelSelected: {
    color: "#EA580C",
    fontWeight: "800",
  },
  otherCategoryTagline: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  // Edit Mode Sub-Step Tabs
  editTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: radius,
    padding: 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  editTabChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius - 2,
  },
  editTabChipActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  editTabTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  addDayOptionBox: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: "#FED7AA",
    borderRadius: radius,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addDayOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addDayIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  addDayOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  addDayOptionSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  addDayActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radiusSm,
    alignSelf: "flex-start",
  },
  addDayActionButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  customEventBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: radius,
    padding: spacing.md,
    gap: 10,
    marginTop: 4,
  },
  customEventBoxTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  customEventInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customEventInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radiusSm,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: colors.ink,
    fontWeight: "600",
  },
  customEventSubmitBtn: {
    height: 44,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    borderRadius: radiusSm,
    alignItems: "center",
    justifyContent: "center",
  },
  customEventSubmitBtnDisabled: {
    backgroundColor: "#CBD5E1",
    opacity: 0.7,
  },
  customEventSubmitText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  cardPressed: {
    opacity: 0.92,
  },
});
