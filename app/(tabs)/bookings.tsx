import { useState, useCallback, useMemo, useEffect } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CalendarX2, CheckCircle2, Clock3, MapPin, Pencil, RotateCcw, Search, Trash2 } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Card, Muted, ScreenTitle, Title } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useAppStore } from "@/src/state/AppProvider";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { isLocalWizardBooking, getDraftResumeRoute } from "@/src/domain/bookingRequest";
import {
  canSearchAgain,
  isEnquiryBooking,
  isUpcomingBooking,
  isCompletedBooking,
  isDraftBooking,
  filterBookings,
  getBookingEventTitle,
  getEffectiveBookingStatus,
  type BookingFilterTab,
} from "@/src/domain/bookingFilters";
import { formatDateLong, formatInr } from "@/src/utils/format";
import { colors, radiusSm, spacing } from "@/src/constants/theme";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import type { Booking } from "@/src/types/booking";

interface TargetAction {
  booking: Booking;
  mode: "delete";
}

export default function BookingsScreen() {
  const { bookings, refreshBookings, loadDraft, deleteBooking, searchAgainBooking } = useAppStore();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const normalizedFilter = normalizeRouteParam(params.filter).toLowerCase();
  const initialFilter: BookingFilterTab =
    normalizedFilter === "enquiries" || normalizedFilter === "upcoming" || normalizedFilter === "completed" || normalizedFilter === "drafts"
      ? (normalizedFilter as BookingFilterTab)
      : "all";
  const [activeFilter, setActiveFilter] = useState<BookingFilterTab>(initialFilter);
  const [targetAction, setTargetAction] = useState<TargetAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const f = normalizeRouteParam(params.filter).toLowerCase();
    if (f === "enquiries" || f === "upcoming" || f === "completed" || f === "drafts") {
      setActiveFilter(f as BookingFilterTab);
    } else if (f === "all") {
      setActiveFilter("all");
    }
  }, [params.filter]);

  useFocusEffect(
    useCallback(() => {
      const f = normalizeRouteParam(params.filter).toLowerCase();
      if (f === "enquiries" || f === "upcoming" || f === "completed" || f === "drafts") {
        setActiveFilter(f as BookingFilterTab);
      }
      void refreshBookings();
    }, [params.filter, refreshBookings]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBookings();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBookings]);

  const enquiries = useMemo(() => bookings.filter(isEnquiryBooking), [bookings]);
  const upcoming = useMemo(() => bookings.filter(isUpcomingBooking), [bookings]);
  const completed = useMemo(() => bookings.filter(isCompletedBooking), [bookings]);
  const drafts = useMemo(() => bookings.filter(isDraftBooking), [bookings]);

  const filteredBookings = useMemo(() => {
    const raw = filterBookings(bookings, activeFilter);
    const seen = new Set<string>();
    return raw.filter((b) => {
      const key = b.bookingId || b.remoteBookingId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bookings, activeFilter]);

  const openBooking = async (bookingId: string, booking: Booking) => {
    if (isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT")) {
      const loaded = await loadDraft(bookingId);
      const target = getDraftResumeRoute(loaded ?? booking);
      router.push(target as any);
    } else {
      router.push(`/bookings/${bookingId}`);
    }
  };

  const handleEditBooking = async (booking: Booking) => {
    if (isCompletedBooking(booking)) {
      Alert.alert("Completed booking", "Completed bookings cannot be edited.");
      return;
    }
    try {
      const loaded = await loadDraft(booking.bookingId);
      const active = loaded ?? booking;
      const target = getDraftResumeRoute(active);
      router.push(target as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load booking for editing.";
      Alert.alert("Edit booking", msg);
    }
  };

  const handleSearchAgain = async (booking: Booking) => {
    try {
      await searchAgainBooking(booking);
      router.push("/booking/confirm");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not prepare booking for retry.";
      Alert.alert("Search again", msg);
    }
  };

  const handleConfirmAction = async () => {
    if (!targetAction || busy) return;
    if (isCompletedBooking(targetAction.booking)) {
      Alert.alert("Completed booking", "Completed bookings cannot be deleted.");
      setTargetAction(null);
      return;
    }
    setBusy(true);
    try {
      await deleteBooking(targetAction.booking.bookingId);
      setTargetAction(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete draft booking.";
      Alert.alert("Could not delete booking", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <ScreenTitle>My Bookings</ScreenTitle>

      <View style={styles.filterBar}>
        <Pressable
          style={[styles.filterChip, activeFilter === "all" && styles.filterChipActive]}
          onPress={() => setActiveFilter("all")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === "all" }}
        >
          <Text style={[styles.filterChipText, activeFilter === "all" && styles.filterChipTextActive]}>
            All ({bookings.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "enquiries" && styles.filterChipActive]}
          onPress={() => setActiveFilter("enquiries")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === "enquiries" }}
        >
          <Text style={[styles.filterChipText, activeFilter === "enquiries" && styles.filterChipTextActive]}>
            Enquiries ({enquiries.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "upcoming" && styles.filterChipActive]}
          onPress={() => setActiveFilter("upcoming")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === "upcoming" }}
        >
          <Text style={[styles.filterChipText, activeFilter === "upcoming" && styles.filterChipTextActive]}>
            Upcoming ({upcoming.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "completed" && styles.filterChipActive]}
          onPress={() => setActiveFilter("completed")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === "completed" }}
        >
          <Text style={[styles.filterChipText, activeFilter === "completed" && styles.filterChipTextActive]}>
            Completed ({completed.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterChip, activeFilter === "drafts" && styles.filterChipActive]}
          onPress={() => setActiveFilter("drafts")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === "drafts" }}
        >
          <Text style={[styles.filterChipText, activeFilter === "drafts" && styles.filterChipTextActive]}>
            Drafts ({drafts.length})
          </Text>
        </Pressable>
      </View>

      {!filteredBookings.length ? (
        activeFilter === "drafts" ? (
          <EmptyState
            icon={<Clock3 size={40} color={colors.primaryDark} />}
            title="No draft bookings"
            body="You don't have any in-progress or unsaved draft bookings. Pick up right where you left off whenever you start a booking."
            actionLabel="Start a new booking"
            onAction={() => router.push("/(tabs)")}
          />
        ) : activeFilter === "enquiries" ? (
          <EmptyState
            icon={<Search size={40} color={colors.primaryDark} />}
            title="No active enquiries"
            body="You don't have any pending shoot enquiries at the moment. Tell us your event details to receive matched quotes from verified photographers."
            actionLabel="Plan a new shoot"
            onAction={() => router.push("/(tabs)")}
          />
        ) : activeFilter === "upcoming" ? (
          <EmptyState
            icon={<Clock3 size={40} color={colors.primaryDark} />}
            title="No upcoming shoots scheduled"
            body="You have no confirmed shoots on your calendar. Book top-rated photographers and videographers for your upcoming celebrations."
            actionLabel="Book a shoot"
            onAction={() => router.push("/(tabs)")}
          />
        ) : activeFilter === "completed" ? (
          <EmptyState
            icon={<CheckCircle2 size={40} color={colors.primaryDark} />}
            title="No completed shoots yet"
            body="Your completed events, coverage history, and delivered photo galleries will be archived here once your celebrations wrap up."
            actionLabel="Explore services"
            onAction={() => router.push("/(tabs)")}
          />
        ) : (
          <EmptyState
            icon={<CalendarX2 size={40} color={colors.muted} />}
            title="No bookings yet"
            body="Create your first booking to get matched with photographers and videographers."
            actionLabel="Create a booking"
            onAction={() => router.push("/(tabs)")}
          />
        )
      ) : (
        filteredBookings.map((b, index) => {
          const finalEventDate = b.days.map((d) => d.eventDate).filter(Boolean).sort().pop();
          const isDraft = isLocalWizardBooking(b) || (!b.remoteBookingId && b.status === "DRAFT");
          const isCompleted = isCompletedBooking(b);
          const canEdit = !isCompleted;
          const canDelete = isDraft && !isCompleted;
          const showRetrySearch = !isDraft && canSearchAgain(b);

          return (
            <Card key={`${b.bookingId || b.remoteBookingId}-${index}`} style={styles.cardContainer}>
              <Pressable
                onPress={() => openBooking(b.bookingId, b)}
                accessibilityRole="button"
                accessibilityLabel={`Open booking ${getBookingEventTitle(b)}`}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
                testID={`booking-card-${b.bookingId}`}
              >
                {b.firms_status_message ? (
                  <View style={styles.firmsStatusPill}>
                    <Text style={styles.firmsStatusText}>
                      {b.firms_status_message}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Title style={styles.bookingTitle}>
                      {getBookingEventTitle(b)}
                    </Title>
                    <Muted style={styles.referenceText}>
                      {b.remoteBookingId ? `Ref: ${b.remoteBookingId}` : (b.bookingId.startsWith("draft") ? "Draft Booking" : `ID: ${b.bookingId}`)}
                    </Muted>
                  </View>
                  <Badge label={STATUS_LABEL[getEffectiveBookingStatus(b)]} tone={STATUS_TONE[getEffectiveBookingStatus(b)]} />
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color={colors.muted} />
                  <Muted>{b.days[0]?.location.city || "Location not set"}</Muted>
                </View>
                <Muted>
                  {b.days.length} event day{b.days.length === 1 ? "" : "s"}
                  {finalEventDate ? ` · ${formatDateLong(finalEventDate)}` : ""}
                </Muted>
                {b.estimatedAmount ? (
                  <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>{formatInr(b.estimatedAmount)}</Muted>
                ) : null}
              </Pressable>

              {canEdit || canDelete || showRetrySearch ? (
                <View style={styles.actionRow} testID={`booking-actions-${b.bookingId}`}>
                  {showRetrySearch ? (
                    <Pressable
                      style={({ pressed }) => [styles.searchAgainBtn, pressed && styles.actionPressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void handleSearchAgain(b);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Search again for ${getBookingEventTitle(b)}`}
                      testID={`search-again-btn-${b.bookingId}`}
                    >
                      <RotateCcw size={13} color={colors.primaryDark} />
                      <Text style={styles.searchAgainBtnText}>Search Again</Text>
                    </Pressable>
                  ) : null}

                  {canEdit ? (
                    <Pressable
                      style={({ pressed }) => [styles.editBtn, pressed && styles.actionPressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void handleEditBooking(b);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${getBookingEventTitle(b)}`}
                      testID={`edit-booking-btn-${b.bookingId}`}
                    >
                      <Pencil size={13} color={colors.primaryDark} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                  ) : null}

                  {canDelete ? (
                    <Pressable
                      style={({ pressed }) => [styles.deleteBtn, pressed && styles.actionPressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setTargetAction({ booking: b, mode: "delete" });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete draft"
                      testID={`delete-booking-btn-${b.bookingId}`}
                    >
                      <Trash2 size={13} color={colors.danger} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <ConfirmDialog
        visible={targetAction !== null}
        title="Delete draft booking?"
        message="This will remove the draft booking and all of its event days. This action cannot be undone."
        confirmLabel="Delete draft"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={busy}
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => {
          if (!busy) setTargetAction(null);
        }}
        testID="booking-confirm-dialog"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: 0,
    overflow: "hidden",
  },
  cardPressable: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  bookingTitle: {
    fontSize: 16,
    flexShrink: 1,
    fontWeight: "700",
    color: colors.ink,
  },
  referenceText: {
    fontSize: 12,
    color: colors.muted,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    marginVertical: spacing.xs,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
    gap: spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
    backgroundColor: colors.dangerBg,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  searchAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  searchAgainBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  actionPressed: {
    opacity: 0.65,
  },
  firmsStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 4,
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusIndigo: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusPurple: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  firmsStatusTextIndigo: {
    color: colors.primaryDark,
  },
  firmsStatusTextPurple: {
    color: colors.primaryDark,
  },
});
