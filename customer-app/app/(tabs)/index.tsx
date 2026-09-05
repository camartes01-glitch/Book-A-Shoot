import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Calendar, CheckCircle2, ClipboardList, Heart, Plus, Sparkles } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { DEFAULT_EVENT_CATEGORIES, HOME_QUICK_PICKS } from "@/src/constants/eventCategories";
import { CATEGORY_IMAGES, HOME_HERO_IMAGE, PORTFOLIO_STRIP } from "@/src/constants/homeMedia";
import { useAppStore } from "@/src/state/AppProvider";
import * as bookingApi from "@/src/services/bookingApi";
import { colors, radius, spacing } from "@/src/constants/theme";

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

  const enquiries = bookings.filter((b) => b.status === "SUBMITTED" || b.status === "MATCHING").length;
  const upcoming = bookings.filter((b) => ACTIVE_STATUSES.has(b.status)).length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;

  const onCreateBooking = async () => {
    const booking = activeDraft ?? (await startNewBooking());
    router.push("/booking/new");
    void booking;
  };

  const onQuickPick = async (categoryId: string) => {
    const booking = activeDraft ?? (await startNewBooking());
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

  return (
    <ScreenContainer contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <View style={styles.headerRow}>
        <View>
          <Muted>Welcome back</Muted>
          <ScreenTitle>{profile?.name || "Guest"}</ScreenTitle>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.avatarInitials}</Text>
        </View>
      </View>

      <ImageBackground source={HOME_HERO_IMAGE} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={["rgba(31,17,7,0)", "rgba(31,17,7,0.55)", "rgba(31,17,7,0.85)"]} style={styles.heroGradient}>
          <View style={styles.heroBadge}>
            <Sparkles size={12} color={colors.white} />
            <Text style={styles.heroBadgeText}>Trusted photographers & videographers</Text>
          </View>
          <Text style={styles.heroTitle}>Every celebration deserves a story worth keeping</Text>
          <Text style={styles.heroSubtitle}>Weddings, birthdays, baby shoots & more — matched in minutes.</Text>
          <View style={{ alignSelf: "flex-start" }}>
            <Button label="+ Create New Booking" onPress={onCreateBooking} icon={<Plus size={16} color={colors.white} />} />
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.body}>
        {activeDraft && activeDraft.status === "DRAFT" ? (
          <Pressable onPress={onContinueDraft}>
            <Card accent>
              <View style={styles.draftRow}>
                <View style={{ flex: 1 }}>
                  <SectionTitle>Continue your booking</SectionTitle>
                  <Muted>{activeDraft.draftCompletionPct}% completed</Muted>
                </View>
                <Badge label="Resume" tone="peach" />
              </View>
            </Card>
          </Pressable>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle>What are you planning?</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {HOME_QUICK_PICKS.map((id) => {
              const cat = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id);
              if (!cat) return null;
              const image = CATEGORY_IMAGES[id];
              return (
                <Pressable key={id} onPress={() => onQuickPick(id)} style={styles.categoryCard}>
                  <ImageBackground source={image} style={styles.categoryImage} imageStyle={styles.categoryImageRadius}>
                    <LinearGradient colors={["rgba(17,10,4,0)", "rgba(17,10,4,0.75)"]} style={styles.categoryGradient}>
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              );
            })}
            <Pressable onPress={onCreateBooking} style={[styles.categoryCard, styles.categoryOther]}>
              <Plus size={22} color={colors.primaryDark} />
              <Text style={styles.categoryOtherLabel}>Other</Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.grid}>
          <DashboardCard
            icon={<ClipboardList size={20} color={colors.primaryDark} />}
            label="My Enquiries"
            value={enquiries}
            onPress={() => router.push("/(tabs)/bookings")}
          />
          <DashboardCard
            icon={<Calendar size={20} color={colors.primaryDark} />}
            label="Upcoming Bookings"
            value={upcoming}
            onPress={() => router.push("/(tabs)/bookings")}
          />
          <DashboardCard
            icon={<CheckCircle2 size={20} color={colors.primaryDark} />}
            label="Completed Bookings"
            value={completed}
            onPress={() => router.push("/(tabs)/bookings")}
          />
          <DashboardCard
            icon={<Heart size={20} color={colors.primaryDark} />}
            label="Saved Vendors"
            value={0}
            onPress={() => router.push("/(tabs)/bookings")}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionTitle>Real celebrations on Camartes</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {PORTFOLIO_STRIP.map((item) => (
              <View key={item.id} style={styles.portfolioCard}>
                <Image source={item.image} style={styles.portfolioImage} />
                <Muted style={styles.portfolioLabel}>{item.label}</Muted>
              </View>
            ))}
          </ScrollView>
        </View>

        <Card>
          <View style={styles.tipRow}>
            <Bookmark size={18} color={colors.primaryDark} />
            <Muted style={{ flex: 1 }}>
              Photography or videography is required for every booking. LED Wall, Web Live and Aerial coverage are available
              only as add-ons.
            </Muted>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

function DashboardCard({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value: number; onPress: () => void }) {
  return (
    <Pressable style={styles.gridItem} onPress={onPress}>
      <Card>
        {icon}
        <Text style={styles.gridValue}>{value}</Text>
        <Muted>{label}</Muted>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },

  hero: { width: "100%", height: 230, marginTop: spacing.xs },
  heroImage: {},
  heroGradient: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: 8 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,53,0.9)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  heroTitle: { color: colors.white, fontSize: 21, fontWeight: "800", lineHeight: 27 },
  heroSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginBottom: 4 },

  draftRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridItem: { width: "47%" },
  gridValue: { fontSize: 22, fontWeight: "800", color: colors.ink },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },

  categoryCard: { width: 130, height: 150, borderRadius: radius, overflow: "hidden" },
  categoryImage: { flex: 1 },
  categoryImageRadius: { borderRadius: radius },
  categoryGradient: { flex: 1, justifyContent: "flex-end", padding: 10 },
  categoryLabel: { color: colors.white, fontWeight: "800", fontSize: 13 },
  categoryOther: {
    backgroundColor: colors.peach,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  categoryOtherLabel: { color: colors.primaryDark, fontWeight: "800", fontSize: 13 },

  portfolioCard: { width: 150, gap: 6 },
  portfolioImage: { width: 150, height: 150, borderRadius: radius },
  portfolioLabel: { fontWeight: "700", color: colors.ink },
});
