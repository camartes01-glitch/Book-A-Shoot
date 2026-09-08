import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Award, Lock, MapPin, ShieldCheck } from "lucide-react-native";
import { ProgressHeader } from "@/src/components/ProgressHeader";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { RatingStars } from "@/src/components/RatingStars";
import { useAppStore } from "@/src/state/AppProvider";
import { getVendorProfile } from "@/src/services/bookingApi";
import type { CustomerVendor } from "@/src/types/vendor";
import { formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VendorProfileScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const { activeDraft, selectVendor } = useAppStore();
  const [vendor, setVendor] = useState<CustomerVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setVendor(await getVendorProfile(vendorId));
      } catch (e) {
        setVendor(null);
        setError(e instanceof Error ? e.message : "Could not load this provider from Camartes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  const match = activeDraft?.matches?.find((m) => m.vendorId === vendorId);

  const onSelect = async () => {
    try {
      await selectVendor(vendorId);
      router.push("/booking/confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select this provider.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
      <ProgressHeader title="Provider profile" step="providers" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error || !vendor ? (
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md, justifyContent: "center" }}>
          <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error || "This provider could not be loaded."}</Muted>
          <Button label="Back to matches" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}>
            <Card>
            <ScreenTitle>{vendor.studioName}</ScreenTitle>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin size={14} color={colors.muted} />
              <Muted>{vendor.city}</Muted>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <RatingStars rating={vendor.rating} />
              <Muted>{vendor.completedBookings} completed bookings</Muted>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Award size={14} color={colors.muted} />
              <Muted>{vendor.experienceYears} years experience</Muted>
            </View>
            {vendor.kycVerified ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} color={colors.success} />
                <Muted style={{ color: colors.success, fontWeight: "700" }}>KYC verified on Camartes</Muted>
              </View>
            ) : null}
            {!vendor.liveSource ? <Badge label="Cached listing — live refresh unavailable" tone="amber" /> : null}
          </Card>

          <Card>
            <SectionTitle>About</SectionTitle>
            <Muted>{vendor.about}</Muted>
          </Card>

          <Card>
            <SectionTitle>Services</SectionTitle>
            {vendor.photography.traditional || vendor.photography.candid ? (
              <Muted>Photography: {[vendor.photography.traditional && "Traditional", vendor.photography.candid && "Candid"].filter(Boolean).join(" · ")}</Muted>
            ) : null}
            {vendor.videography.traditional || vendor.videography.candid ? (
              <Muted>Videography: {[vendor.videography.traditional && "Traditional", vendor.videography.candid && "Candid"].filter(Boolean).join(" · ")}</Muted>
            ) : null}
            {vendor.aerial.photography || vendor.aerial.videography ? (
              <Muted>Aerial: {[vendor.aerial.photography && "Photography", vendor.aerial.videography && "Videography"].filter(Boolean).join(" · ")}</Muted>
            ) : null}
            <Muted>LED Wall: {vendor.ledWall.available ? "Available" : "Not offered"}</Muted>
            <Muted>Web Live: {vendor.webLive.available ? vendor.webLive.qualities.join(" / ") : "Not offered"}</Muted>
          </Card>

          {vendor.portfolioImages.length ? (
            <Card>
              <SectionTitle>Portfolio</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {vendor.portfolioImages.map((uri) => (
                    <Image key={uri} source={{ uri }} style={{ width: 140, height: 100, borderRadius: 12, backgroundColor: colors.peach }} resizeMode="cover" />
                  ))}
                </View>
              </ScrollView>
            </Card>
          ) : null}

          <Card>
            <SectionTitle>Service areas</SectionTitle>
            <Muted>{vendor.serviceAreas.length ? vendor.serviceAreas.join(", ") : vendor.city}</Muted>
          </Card>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Lock size={14} color={colors.muted} />
              <SectionTitle>Contact</SectionTitle>
            </View>
            <Muted>Direct contact details stay on Camartes and unlock automatically once this vendor accepts your booking request.</Muted>
          </Card>

          <Card>
            <SectionTitle>Package estimate</SectionTitle>
            <Muted style={{ fontSize: 20, fontWeight: "800", color: colors.primaryDark }}>
              {match?.estimatedPrice ? formatInr(match.estimatedPrice) : vendor.basePricePerDay > 0 ? formatInr(vendor.basePricePerDay) : "Price from catalog not listed"}
            </Muted>
            <Badge label={match?.available ? "Available in the live catalog" : "Availability not confirmed for these dates"} tone={match?.available ? "green" : "amber"} />
          </Card>
          </ScrollView>
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
            <Button label="Select this provider" onPress={onSelect} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
