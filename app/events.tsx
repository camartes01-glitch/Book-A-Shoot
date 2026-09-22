import React, { useState, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Plus,
  Search,
  Video,
  X,
} from "lucide-react-native";
import { useAppStore } from "@/src/state/AppProvider";
import {
  DEFAULT_EVENT_CATEGORIES,
  HOME_QUICK_PICKS,
  REAL_CELEBRATION_ITEMS,
  EVENT_TAGLINES,
  EVENT_GROUP_LABEL,
  getEventTagline,
} from "@/src/constants/eventCategories";
import { categoryImageFor } from "@/src/constants/homeMedia";
import { colors, elevation, radius, radiusSm, spacing } from "@/src/constants/theme";
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

export default function AllEventsScreen() {
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

  // Build the unified catalog of all events mentioned in the app + database
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

    // 2. All Database Event Categories
    DEFAULT_EVENT_CATEGORIES.forEach((cat) => {
      const isPopular = HOME_QUICK_PICKS.includes(cat.id);
      items.push({
        id: cat.id,
        label: cat.label,
        tagline: getEventTagline(cat.id),
        group: cat.group,
        badgeLabel: isPopular ? "POPULAR" : EVENT_GROUP_LABEL[cat.group].toUpperCase(),
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
      if (item.group === "pooja" && (query.includes("pooja") || query.includes("puja"))) {
        return true;
      }
      return false;
    });
  }, [fullCatalog, activeTab, searchQuery]);

  const openWizardDay = (dayId: string | undefined) => {
    if (!dayId) {
      router.push("/booking/new");
      return;
    }
    router.push("/booking/new");
    router.push(`/booking/day/${dayId}`);
  };

  // Select an event and initiate booking
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
          // Aerial drone specialty coverage
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["corporate_event"],
            aerial: { drones: 1 },
          });
        } else if (item.id === "led_wall") {
          // Live stage LED wall specialty
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["corporate_event"],
            ledWall: { enabled: true, size: "12x8 ft", screenCount: 1 },
          });
        } else if (item.id === "mehndi") {
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: ["mehendi"],
          });
        } else {
          // Standard database event category
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
            eventTypeIds: [item.id],
          });
        }
        await loadDraft(booking.bookingId);
      }
      openWizardDay(firstDay?.dayId);
    } catch (err) {
      Alert.alert("Unable to start booking", "Please check your network and try again.");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  // Submit custom event
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
        // Save custom event title in day's eventTypeIds and booking.eventName
        await bookingApi.updateDay(booking.bookingId, firstDay.dayId, {
          eventTypeIds: [raw],
        });
        await loadDraft(booking.bookingId);
      }
      setCustomEventName("");
      openWizardDay(firstDay?.dayId);
    } catch (err) {
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
    { id: "pooja", label: "Poojas" },
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
      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Celebrations & Events</Text>
          <Text style={styles.headerSubtitle}>Explore {fullCatalog.length}+ event types or plan a custom shoot</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search weddings, birthdays, poojas, shoots..."
            placeholderTextColor={colors.muted}
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
              <X size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs Horizontal Scroll */}
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

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent Custom Event Banner */}
        <Pressable
          style={styles.customBanner}
          onPress={() => {
            void selectionFeedback();
            setCustomModalVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Plan a custom event"
        >
          <LinearGradient
            colors={["#FFF7ED", "#FFEDD5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.customBannerGradient}
          >
            <View style={styles.customBannerContent}>
              <View style={styles.customBannerHeaderRow}>
                <Text style={styles.customBannerTitle}>Plan a Custom Event</Text>
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>SPECIAL</Text>
                </View>
              </View>
              <Text style={styles.customBannerDesc}>
                Planning a unique milestone, college fest, expo, or private celebration? Tell us what you're planning.
              </Text>
              <View style={styles.customBannerActionRow}>
                <Text style={styles.customBannerActionText}>Customize your event shoot</Text>
                <ChevronRight size={16} color={colors.primaryDark} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.catalogHeading}>
            {activeTab === "all"
              ? "All Event Types"
              : activeTab === "popular"
              ? "Popular Events"
              : activeTab === "real_celebrations"
              ? "Real Celebrations & Portfolio"
              : `${EVENT_GROUP_LABEL[activeTab as keyof typeof EVENT_GROUP_LABEL] ?? activeTab} Events`}
          </Text>
          <Text style={styles.catalogCount}>
            {filteredCatalog.length} available
          </Text>
        </View>

        {/* 2-Column Events Grid */}
        {filteredCatalog.length > 0 ? (
          <View style={styles.grid}>
            {/* Custom Event Card also placed directly inside the grid for discoverability */}
            <Pressable
              onPress={() => {
                void selectionFeedback();
                setCustomModalVisible(true);
              }}
              style={[styles.eventCard, styles.customEventGridCard]}
              accessibilityRole="button"
              accessibilityLabel="Add custom event"
            >
              <LinearGradient
                colors={["#FF6B35", "#EA580C"]}
                style={styles.customGridGradient}
              >
                <View style={styles.customGridIconCircle}>
                  <Plus size={24} color={colors.white} />
                </View>
                <View>
                  <Text style={styles.customGridCardTitle}>Custom Event</Text>
                  <Text style={styles.customGridCardDesc}>
                    Can't find your event? Type any celebration name
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            {/* All Catalog Event Cards */}
            {filteredCatalog.map((item) => {
              const imageSource = categoryImageFor(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectEvent(item)}
                  style={styles.eventCard}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} - ${item.tagline}`}
                >
                  <ImageBackground
                    source={imageSource}
                    style={styles.eventCardImage}
                    imageStyle={styles.eventCardImageRadius}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={["rgba(17,10,4,0.15)", "rgba(17,10,4,0.45)", "rgba(17,10,4,0.92)"]}
                      style={styles.eventCardGradient}
                    >
                      {/* Top Badge */}
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>{item.badgeLabel}</Text>
                      </View>

                      {/* Bottom Info */}
                      <View style={styles.cardBottomInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={styles.cardTagline} numberOfLines={2}>
                          {item.tagline}
                        </Text>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </View>
        ) : (
          /* Empty Search State */
          <View style={styles.emptyState}>
            <Search size={36} color={colors.muted} style={{ marginBottom: 12 }} />
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
                Book "{searchQuery}" as Custom Event
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {starting ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Setting up your shoot...</Text>
          </View>
        </View>
      ) : null}

      {/* Interactive Custom Event Modal */}
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

            {/* Modal Header */}
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
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Custom Event Name Input */}
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

            {/* Quick Suggestions */}
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

            {/* Action Buttons */}
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

const screenWidth = Dimensions.get("window").width;
const cardWidth = (screenWidth - spacing.lg * 2 - 12) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  tabsWrapper: {
    marginVertical: spacing.xs,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  tabChipTextActive: {
    color: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  customBanner: {
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    overflow: "hidden",
    ...elevation.card,
  },
  customBannerGradient: {
    padding: spacing.md,
  },
  customBannerContent: {
    gap: 4,
  },
  customBannerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  customBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  customBannerDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  customBannerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 2,
  },
  customBannerActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  catalogHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  catalogCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  eventCard: {
    width: cardWidth,
    height: 154,
    borderRadius: radius,
    overflow: "hidden",
    ...elevation.card,
  },
  eventCardImage: {
    flex: 1,
  },
  eventCardImageRadius: {
    borderRadius: radius,
  },
  eventCardGradient: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  cardBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardBottomInfo: {
    gap: 2,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    ...Platform.select({
      web: {
        textShadow: "0px 1px 3px rgba(0, 0, 0, 0.6)",
      } as any,
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  cardTagline: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
  },
  customEventGridCard: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  customGridGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  customGridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  customGridCardTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  customGridCardDesc: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radiusSm,
  },
  emptyActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    ...elevation.raised,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 40 : spacing.xl,
    gap: spacing.lg,
    ...elevation.raised,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  customTextInput: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },
  suggestionsSection: {
    gap: spacing.xs,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionsChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipSelected: {
    backgroundColor: colors.peach,
    borderColor: colors.primary,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  suggestionChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: spacing.xs,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radiusSm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
