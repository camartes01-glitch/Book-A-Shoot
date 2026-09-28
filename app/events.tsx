import React, { useState, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Search, X, ChevronRight } from "lucide-react-native";
import { getEventIcon } from "@/src/components/EventCategoryIcon";
import { useAppStore } from "@/src/state/AppProvider";
import {
  DEFAULT_EVENT_CATEGORIES,
  HOME_QUICK_PICKS,
  REAL_CELEBRATION_ITEMS,
  EVENT_GROUP_LABEL,
  getEventTagline,
  POOJA_EVENT_TYPE_IDS,
} from "@/src/constants/eventCategories";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";
import * as bookingApi from "@/src/services/bookingApi";

type FilterTab = "all" | "popular" | "real_celebrations" | "wedding" | "personal" | "pooja" | "commercial";

interface CatalogItem {
  id: string;
  label: string;
  tagline: string;
  group: string;
  badgeLabel: string;
  isPopular?: boolean;
  isRealCelebration?: boolean;
  isCustom?: boolean;
}

const QUICK_SUGGESTIONS = [
  "Silver Jubilee",
  "College Fest",
  "Convocation",
  "Retirement Party",
  "Exhibition / Expo",
  "Sports Meet",
  "Award Night",
  "House Inauguration",
  "Dance Recital / Arangetram",
  "Fashion Showcase",
];

interface EventVisualConfig {
  icon: (props: { size?: number; color?: string }) => React.ReactElement;
  iconColor: string;
  bgColor: string;
}

function getEventVisualConfig(id: string, _group?: string): EventVisualConfig {
  return {
    icon: (p: { size?: number; color?: string }) =>
      getEventIcon(id, p.size ?? 20, p.color ?? colors.primary),
    iconColor: colors.primary,
    bgColor: "#FFF7ED",
  };
}

export default function AllEventsScreen() {
  const { width: W } = useWindowDimensions();
  const { startNewBooking, loadDraft } = useAppStore();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>(
    (params.tab as FilterTab) || "all"
  );
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customEventName, setCustomEventName] = useState("");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

  const isWide = W >= 768;
  const isTablet = W >= 540 && W < 768;

  // Responsive layout width & column calculations
  const maxContentWidth = isWide ? 960 : 440;
  const contentWidth = Math.min(W, maxContentWidth);
  const numColumns = isWide ? 3 : isTablet ? 3 : 2;
  const gridGap = 10;
  const usableWidth = contentWidth - 32;
  const cardWidth = Math.floor((usableWidth - gridGap * (numColumns - 1)) / numColumns);

  // Build the unified catalog of all events with Pooja consolidated into one single card
  const fullCatalog: CatalogItem[] = useMemo(() => {
    const items: CatalogItem[] = [];

    // 1. Real Celebrations Showcase from app portfolio
    REAL_CELEBRATION_ITEMS.forEach((item) => {
      items.push({
        id: item.id,
        label: item.label,
        tagline: item.tagline,
        group: "real_celebrations",
        badgeLabel: "REAL CELEBRATION",
        isRealCelebration: true,
        isPopular: true,
      });
    });

    // 2. All Database Event Categories (Pooja entries combined into a single "Pooja" card)
    let poojaAdded = false;

    DEFAULT_EVENT_CATEGORIES.forEach((cat) => {
      if (cat.group === "pooja") {
        if (!poojaAdded) {
          poojaAdded = true;
          items.push({
            id: "pooja",
            label: "Pooja",
            tagline: "Vedic rituals, festive blessings, homams & housewarming poojas",
            group: "pooja",
            badgeLabel: "POOJA",
            isPopular: true,
            isRealCelebration: false,
          });
        }
        return;
      }

      const isPopular = HOME_QUICK_PICKS.includes(cat.id);
      items.push({
        id: cat.id,
        label: cat.label,
        tagline: getEventTagline(cat.id),
        group: cat.group,
        badgeLabel: isPopular ? "POPULAR" : (EVENT_GROUP_LABEL[cat.group] ?? cat.group).toUpperCase(),
        isPopular,
        isRealCelebration: false,
      });
    });

    return items;
  }, []);

  // Filter items based on active tab and search query
  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return fullCatalog.filter((item) => {
      // Tab matching
      if (activeTab === "popular" && !item.isPopular) return false;
      if (activeTab === "real_celebrations" && !item.isRealCelebration) return false;
      if (activeTab !== "all" && activeTab !== "popular" && activeTab !== "real_celebrations") {
        if (item.group !== activeTab) return false;
      }

      // Search matching
      if (!query) return true;
      const label = item.label.toLowerCase();
      const tagline = item.tagline.toLowerCase();
      const group = item.group.toLowerCase();
      const id = item.id.replace(/_/g, " ");

      if (label.includes(query) || tagline.includes(query) || group.includes(query) || id.includes(query)) {
        return true;
      }
      if (query.split(/\s+/).some((p) => p.length > 0 && (label.includes(p) || id.includes(p)))) {
        return true;
      }
      // Single Pooja search resolution covering all pooja subtypes
      if (item.group === "pooja") {
        const poojaSubnames = [
          "pooja",
          "puja",
          "ganesh",
          "satyanarayan",
          "gruha pravesh",
          "lakshmi",
          "saraswati",
          "navratri",
          "diwali",
          "durga",
          "varalakshmi",
          "vratham",
          "havan",
          "homam",
          "vastu",
        ];
        if (poojaSubnames.some((n) => query.includes(n) || n.includes(query))) {
          return true;
        }
      }
      return false;
    });
  }, [fullCatalog, activeTab, searchQuery]);

  // Extract popular events list for the horizontal popular row (NO "View all" button)
  const popularItems = useMemo(() => {
    const picks = ["wedding", "pre_wedding", "birthday", "baby_shoot", "pooja", "engagement", "haldi"];
    return picks
      .map((id) => fullCatalog.find((item) => item.id === id))
      .filter((item): item is CatalogItem => Boolean(item));
  }, [fullCatalog]);

  const openWizardDay = (dayId: string | undefined) => {
    if (!dayId) {
      router.push("/booking/new");
      return;
    }
    router.push("/booking/new");
    router.push(`/booking/day/${dayId}`);
  };

  // Select an event and initiate booking (Preserving all existing business logic)
  const handleSelectEvent = async (item: CatalogItem) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    void selectionFeedback();

    try {
      const booking = await startNewBooking();
      const firstDay = booking.days[0];

      if (firstDay) {
        if (item.id === "drone") {
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["corporate_event"],
            aerial: { drones: 1 },
          });
        } else if (item.id === "led_wall") {
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["corporate_event"],
            ledWall: { enabled: true, size: "12x8 ft", screenCount: 1 },
          });
        } else if (item.id === "mehndi") {
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["mehendi"],
          });
        } else {
          // Standard database event category (including consolidated "pooja")
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: [item.id],
          });
        }
        await loadDraft(booking.bookingId);
      }
      openWizardDay(firstDay?.dayId);
    } catch {
      Alert.alert("Unable to start booking", "Please check your network and try again.");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  // Submit custom event (Preserving all existing custom-event functionality)
  const handleStartCustomEvent = async (nameToUse?: string) => {
    const raw = (nameToUse ?? customEventName).trim();
    if (!raw) {
      Alert.alert("Event Name Required", "Please enter the name of your event or celebration.");
      return;
    }

    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setCustomModalVisible(false);
    void selectionFeedback();

    try {
      const booking = await startNewBooking();
      const firstDay = booking.days[0];

      if (firstDay) {
        await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
          eventTypeIds: [raw],
        });
        await loadDraft(booking.bookingId);
      }
      setCustomEventName("");
      openWizardDay(firstDay?.dayId);
    } catch {
      Alert.alert("Unable to start booking", "Please check your network and try again.");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: "all", label: `All (${fullCatalog.length})` },
    { id: "popular", label: "Popular" },
    { id: "real_celebrations", label: "Real Celebrations" },
    { id: "wedding", label: "Weddings" },
    { id: "personal", label: "Personal" },
    { id: "pooja", label: "Pooja" },
    { id: "commercial", label: "Commercial" },
  ];

  const handleBack = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      try {
        router.back();
        return;
      } catch {
        router.replace("/(tabs)");
        return;
      }
    }
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={[styles.mainContainer, isWide && styles.mainContainerWide]}>
        {/* ── 1. Compact Header Bar ──────────────────────────────────── */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.primary} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>All Celebrations & Events</Text>
            <Text style={styles.headerSubtitle}>
              Explore {fullCatalog.length}+ event types or plan a custom shoot
            </Text>
          </View>
        </View>

        {/* ── 2. Clean Search Input Bar ──────────────────────────────── */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.primary} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search weddings, birthdays, poojas, shoots..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                style={styles.clearSearchBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── 3. Category / Filter Chips (Horizontally Scrollable) ──── */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    void selectionFeedback();
                    setActiveTab(tab.id);
                  }}
                  style={[styles.tabChip, isSelected && styles.tabChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                >
                  <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Main Scrollable Body ───────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 4. Prominent Custom Event Card (Uses /public/customevent.png) ─ */}
          <Pressable
            style={styles.customBanner}
            onPress={() => {
              void selectionFeedback();
              setCustomModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Plan a custom event"
          >
            <ImageBackground
              source={require("@/public/customevent.png")}
              style={styles.customBannerBg}
              imageStyle={styles.customBannerImageRadius}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  "rgba(255, 247, 237, 0.96)",
                  "rgba(255, 247, 237, 0.88)",
                  "rgba(255, 247, 237, 0.45)",
                  "rgba(255, 247, 237, 0.05)",
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.82, y: 0.5 }}
                style={styles.customBannerOverlay}
              >
                <View style={styles.customBannerContent}>
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>SPECIAL</Text>
                  </View>
                  <Text style={styles.customBannerTitle}>
                    Plan a <Text style={styles.customBannerTitleOrange}>Custom Event</Text>
                  </Text>
                  <Text style={styles.customBannerDesc} numberOfLines={2}>
                    Planning a unique milestone, college fest, expo, or private celebration? Tell us what you're planning.
                  </Text>
                  <View style={styles.customBannerCtaBtn}>
                    <Text style={styles.customBannerCtaText}>Customize your event shoot →</Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          {/* ── 5. Popular Events Section (NO VIEW ALL BUTTON) ────────── */}
          {!searchQuery && activeTab === "all" ? (
            <View style={styles.popularSection}>
              <Text style={styles.sectionHeading}>Popular Events</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularScrollContent}
              >
                {popularItems.map((item) => {
                  const visual = getEventVisualConfig(item.id, item.group);
                  const IconComp = visual.icon;
                  return (
                    <Pressable
                      key={`popular-${item.id}`}
                      style={({ pressed }) => [styles.popularTile, pressed && styles.pressed]}
                      onPress={() => handleSelectEvent(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Book ${item.label}`}
                    >
                      <View style={[styles.popularIconWrap, { backgroundColor: visual.bgColor }]}>
                        <IconComp size={24} color={visual.iconColor} />
                      </View>
                      <Text style={styles.popularTileLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* ── 6. All Event Types (Compact Scannable Grid) ──────────── */}
          <View style={styles.catalogSection}>
            <View style={styles.catalogHeaderRow}>
              <Text style={styles.sectionHeading}>
                {activeTab === "all"
                  ? "All Event Types"
                  : activeTab === "popular"
                  ? "Popular Events"
                  : activeTab === "real_celebrations"
                  ? "Real Celebrations"
                  : `${EVENT_GROUP_LABEL[activeTab as keyof typeof EVENT_GROUP_LABEL] ?? activeTab} Events`}
              </Text>
              <Text style={styles.catalogCountText}>
                {filteredCatalog.length} available
              </Text>
            </View>

            {filteredCatalog.length > 0 ? (
              <View style={styles.grid}>
                {filteredCatalog.map((item) => {
                  const visual = getEventVisualConfig(item.id, item.group);
                  const IconComp = visual.icon;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleSelectEvent(item)}
                      style={({ pressed }) => [
                        styles.eventCard,
                        { width: cardWidth },
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      <View style={[styles.eventCardIconWrap, { backgroundColor: visual.bgColor }]}>
                        <IconComp size={18} color={visual.iconColor} />
                      </View>
                      <Text style={styles.eventCardLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <ChevronRight size={15} color={colors.primary} style={styles.eventCardChevron} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Empty Search State */
              <View style={styles.emptyState}>
                <Search size={32} color={colors.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No events matching "{searchQuery}"</Text>
                <Text style={styles.emptyDesc}>
                  You can easily book "{searchQuery}" as a custom event and get matched with top photographers.
                </Text>
                <Pressable
                  onPress={() => handleStartCustomEvent(searchQuery)}
                  style={styles.emptyActionButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Book ${searchQuery} as custom event`}
                >
                  <Text style={styles.emptyActionText}>
                    Book "{searchQuery}" as Custom Event →
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* ── Loading Overlay ────────────────────────────────────────── */}
      {starting ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Setting up your shoot...</Text>
          </View>
        </View>
      ) : null}

      {/* ── Interactive Custom Event Modal (Preserved Functionality) ── */}
      <Modal
        visible={customModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setCustomModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Plan a Custom Event</Text>
                <Text style={styles.modalSubtitle}>Tell us what you are celebrating</Text>
              </View>
              <Pressable
                onPress={() => setCustomModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <X size={20} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Event / Celebration Name</Text>
              <TextInput
                value={customEventName}
                onChangeText={setCustomEventName}
                placeholder="e.g. Silver Jubilee, College Fest, Convocation"
                placeholderTextColor={colors.muted}
                style={styles.customTextInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => handleStartCustomEvent()}
              />
            </View>

            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsLabel}>Popular Custom Occasions</Text>
              <View style={styles.suggestionsChipsRow}>
                {QUICK_SUGGESTIONS.map((suggestion) => {
                  const isSelected = customEventName === suggestion;
                  return (
                    <Pressable
                      key={suggestion}
                      onPress={() => {
                        void selectionFeedback();
                        setCustomEventName(suggestion);
                      }}
                      style={[
                        styles.suggestionChip,
                        isSelected && styles.suggestionChipSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={suggestion}
                    >
                      <Text
                        style={[
                          styles.suggestionChipText,
                          isSelected && styles.suggestionChipTextSelected,
                        ]}
                      >
                        {suggestion}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => handleStartCustomEvent()}
                style={[
                  styles.confirmBtn,
                  !customEventName.trim() && styles.confirmBtnDisabled,
                ]}
                disabled={!customEventName.trim() || starting}
                accessibilityRole="button"
                accessibilityLabel="Start booking this custom event"
              >
                <Text style={styles.confirmBtnText}>Continue with this Event →</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Production-Grade Compact & Scannable Stylesheet
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  mainContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: "#FFFDF9",
  },
  mainContainerWide: {
    maxWidth: 960,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  // ── Header Bar ─────────────────────────────────────────────────────────────
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDE8E1",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },

  // ── Search Bar ─────────────────────────────────────────────────────────────
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EDE8E1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    paddingVertical: 6,
  },
  clearSearchBtn: {
    padding: 6,
  },

  // ── Filter Chips ───────────────────────────────────────────────────────────
  tabsWrapper: {
    marginBottom: 6,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE8E1",
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // ── Scroll Content ─────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 60,
  },

  // ── Custom Event Banner (Uses customevent.png) ─────────────────────────────
  customBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.20)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: "#FCE7D6",
  },
  customBannerBg: {
    width: "100%",
    minHeight: 160,
  },
  customBannerImageRadius: {
    borderRadius: 18,
  },
  customBannerOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  customBannerContent: {
    maxWidth: "68%",
    gap: 5,
  },
  customBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  customBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  customBannerTitleOrange: {
    color: colors.primary,
  },
  customBannerDesc: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 15,
  },
  customBannerCtaBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    borderRadius: 999,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  customBannerCtaText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Popular Events (Horizontal Compact Tiles) ──────────────────────────────
  popularSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  popularScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  popularTile: {
    width: 96,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDE8E1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  popularIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  popularTileLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
  },

  // ── All Event Types (Scannable Grid) ───────────────────────────────────────
  catalogSection: {
    paddingHorizontal: 16,
  },
  catalogHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  catalogCountText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  eventCard: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#EDE8E1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  eventCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  eventCardLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  eventCardChevron: {
    marginLeft: 4,
  },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE8E1",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Loading Overlay ────────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.40)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  // ── Custom Event Modal ─────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.50)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  customTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EDE8E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  suggestionsSection: {
    marginBottom: 20,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  suggestionsChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EDE8E1",
  },
  suggestionChipSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: colors.primary,
  },
  suggestionChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  suggestionChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: 4,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
