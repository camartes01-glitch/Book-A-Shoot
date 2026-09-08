import { useMemo, useState } from "react";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Camera, Clock3, MapPin, Search, Video } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { EventCategoryCard } from "@/src/components/EventCategoryCard";
import { Badge, Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { DEFAULT_EVENT_CATEGORIES, HOME_QUICK_PICKS, getEnabledCategories } from "@/src/constants/eventCategories";
import { PORTFOLIO_STRIP, SEARCH_EXAMPLES, categoryImageFor } from "@/src/constants/homeMedia";
import { useAppStore } from "@/src/state/AppProvider";
import * as bookingApi from "@/src/services/bookingApi";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";
import { formatDateLong } from "@/src/utils/format";

const ACTIVE_STATUSES = new Set([
  "VENDOR_SELECTED",
  "REQUEST_SENT",
  "VENDOR_ACCEPTED",
  "CUSTOMER_CONFIRMED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
]);

export default function HomeScreen() {
  const { profile, bookings, activeDraft, startNewBooking, loadDraft } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const enquiries = bookings.filter((b) => b.status === "SUBMITTED" || b.status === "MATCHING").length;
  const upcoming = bookings.filter((b) => ACTIVE_STATUSES.has(b.status));
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const city = profile?.savedAddresses[0]?.city || upcoming[0]?.days[0]?.location.city || "";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const onCreateBooking = async () => {
    await startNewBooking();
    router.push("/booking/new");
  };

  const onQuickPick = async (categoryId: string) => {
    const booking = await startNewBooking();
    const firstDay = booking.days[0];
    if (firstDay) {
      await bookingApi.updateDay(booking.bookingId, firstDay.dayId, { eventTypeIds: [categoryId] });
      await loadDraft(booking.bookingId);
    }
    router.push(`/booking/day/${firstDay?.dayId}`);
  };

  const onContinueDraft = async () => {
    if (!activeDraft) return;
    await loadDraft(activeDraft.bookingId);
    router.push("/booking/new");
  };

  const firstName = (profile?.name || "there").split(" ")[0];

  return (
    <ScreenContainer contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <BookAShootLogo compact />
          <Text style={styles.hello} numberOfLines={1}>
            {greeting}, {firstName}
          </Text>
          {city ? (
            <View style={styles.locRow}>
              <MapPin size={12} color={colors.muted} />
              <Text style={styles.locText}>{city}</Text>
            </View>
          ) : (
            <Muted>Find photographers near you</Muted>
          )}
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarText}>{profile?.avatarInitials}</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.searchBar}
        onPress={() => setSearchOpen(true)}
        accessibilityRole="search"
        accessibilityLabel="What are you looking to shoot?"
      >
        <Search size={20} color={colors.primaryDark} />
        <Text style={styles.searchPlaceholder}>Search weddings, baby shoots, events…</Text>
      </Pressable>

      <View style={styles.body}>
        {activeDraft && activeDraft.status === "DRAFT" ? (
          <Pressable onPress={onContinueDraft}>
            <Card accent>
              <View style={styles.draftRow}>
                <View style={{ flex: 1 }}>
                  <SectionTitle>Continue your booking</SectionTitle>
                  <Muted>{activeDraft.draftCompletionPct}% complete · pick up where you left off</Muted>
                </View>
                <Badge label="Resume" tone="peach" />
              </View>
            </Card>
          </Pressable>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Popular events</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: spacing.lg }}>
            {HOME_QUICK_PICKS.map((id) => {
              const cat = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id);
              if (!cat) return null;
              return <EventCategoryCard key={id} category={cat} onPress={() => onQuickPick(id)} width={118} />;
            })}
            <Pressable onPress={onCreateBooking} style={styles.moreCard} accessibilityRole="button" accessibilityLabel="More event types">
              <Text style={styles.morePlus}>+</Text>
              <Text style={styles.moreLabel}>More</Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Book a Shoot</Text>
          <Text style={styles.ctaSub}>Tell us the event. We'll match real photographers and videographers.</Text>
          <Button label="Start booking" onPress={onCreateBooking} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Popular services</SectionTitle>
          <View style={styles.serviceRow}>
            <ServiceChip icon={<Camera size={16} color={colors.primaryDark} />} label="Photography" onPress={onCreateBooking} />
            <ServiceChip icon={<Video size={16} color={colors.primaryDark} />} label="Videography" onPress={onCreateBooking} />
          </View>
        </View>

        {upcoming[0] ? (
          <Pressable onPress={() => router.push(`/bookings/${upcoming[0].bookingId}`)}>
            <Card>
              <View style={styles.draftRow}>
                <Clock3 size={18} color={colors.primaryDark} />
                <View style={{ flex: 1 }}>
                  <SectionTitle>Upcoming shoot</SectionTitle>
                  <Muted>
                    {formatDateLong(upcoming[0].days[0]?.eventDate ?? null)}
                    {upcoming[0].days[0]?.location.city ? ` · ${upcoming[0].days[0].location.city}` : ""}
                  </Muted>
                </View>
                <Badge label="View" tone="peach" />
              </View>
            </Card>
          </Pressable>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Real celebrations</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {PORTFOLIO_STRIP.map((item) => (
              <Pressable key={item.id} onPress={onCreateBooking} style={styles.portfolioCard}>
                <Image source={item.image} style={styles.portfolioImage} resizeMode="cover" />
                <Text style={styles.portfolioLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable onPress={() => router.push("/(tabs)/bookings")} style={styles.summaryStrip}>
          <SummaryStat label="Enquiries" value={enquiries} />
          <SummaryStat label="Upcoming" value={upcoming.length} />
          <SummaryStat label="Completed" value={completed} />
        </Pressable>
      </View>

      <SearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} onPick={onQuickPick} onStart={onCreateBooking} />
    </ScreenContainer>
  );
}

function ServiceChip({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.serviceChip} onPress={onPress} accessibilityRole="button">
      {icon}
      <Text style={styles.serviceChipLabel}>{label}</Text>
    </Pressable>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SearchSheet({
  visible,
  onClose,
  onPick,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  onStart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = getEnabledCategories().filter(
    (c) => !q || c.label.toLowerCase().includes(q) || q.split(" ").some((part) => c.label.toLowerCase().includes(part)),
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.searchModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.searchHeader}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color={colors.muted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="What are you looking to shoot?"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
        {!q ? (
          <View style={{ gap: 8, marginBottom: spacing.md }}>
            <Muted>Popular searches</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SEARCH_EXAMPLES.map((ex) => (
                <Pressable key={ex} style={styles.exampleChip} onPress={() => setQuery(ex)}>
                  <Text style={styles.exampleText}>{ex}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled">
          {matches.slice(0, 12).map((c) => (
            <Pressable
              key={c.id}
              style={styles.resultRow}
              onPress={() => {
                onClose();
                void onPick(c.id);
              }}
            >
              <ImageBackground source={categoryImageFor(c.id)} style={styles.resultThumb} imageStyle={{ borderRadius: 8 }}>
                <View />
              </ImageBackground>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{c.label}</Text>
                <Muted>Start a booking</Muted>
              </View>
            </Pressable>
          ))}
          <Button
            label="Start booking"
            onPress={() => {
              onClose();
              void onStart();
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  hello: { fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: 4 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    ...elevation.raised,
  },
  searchPlaceholder: { color: colors.ink, fontSize: 15, fontWeight: "700", flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  draftRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  moreCard: {
    width: 118,
    height: 132,
    borderRadius: radius,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  morePlus: { fontSize: 28, color: colors.primaryDark, fontWeight: "600", lineHeight: 32 },
  moreLabel: { color: colors.primaryDark, fontWeight: "800", fontSize: 13 },
  cta: {
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  ctaTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  ctaSub: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  serviceRow: { flexDirection: "row", gap: spacing.sm },
  serviceChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceChipLabel: { fontWeight: "800", color: colors.ink, fontSize: 13 },
  portfolioCard: { width: 150, gap: 6 },
  portfolioImage: { width: 150, height: 110, borderRadius: radius, backgroundColor: colors.peach },
  portfolioLabel: { fontWeight: "700", color: colors.ink, fontSize: 12 },
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },
  searchModal: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  searchHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.md },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  cancel: { color: colors.primaryDark, fontWeight: "800" },
  exampleChip: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  resultThumb: { width: 44, height: 44, borderRadius: 8, overflow: "hidden", backgroundColor: colors.peach },
  resultTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
});
