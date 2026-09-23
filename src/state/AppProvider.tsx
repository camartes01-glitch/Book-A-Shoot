import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppNotification, Booking, EventDay, PackageTierId, ProviderLocationPreference } from "@/src/types/booking";
import type { CustomerProfile } from "@/src/types/booking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "@/src/services/authApi";
import * as bookingApi from "@/src/services/bookingApi";
import { addNotification, getNotifications, markAllRead, subscribeNotifications } from "@/src/services/notificationsStore";
import { runEngineTick, runReplacementTick } from "@/src/services/notificationEngine";
import { resolveNotificationRoute } from "@/src/domain/notificationRouting";
import { buildNotificationContent, categoryForType } from "@/src/domain/notificationContent";
import { isLocalWizardBooking, selectActiveWizardDraft } from "@/src/domain/bookingRequest";
import { isCompletedBooking } from "@/src/domain/bookingFilters";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";
import { router } from "expo-router";
import { InAppNotificationToast } from "@/src/components/InAppNotificationToast";
import { pushNotificationService } from "@/src/services/pushNotificationService";
import { markNotificationRead } from "@/src/services/notificationsStore";
import { selectionFeedback } from "@/src/utils/haptics";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import { makeId } from "@/src/utils/id";

const WELCOME_SHOWN_KEY_PREFIX = "camartes-customer:welcome_shown:";

async function maybeSendWelcomeNotification(profile: CustomerProfile): Promise<void> {
  const key = `${WELCOME_SHOWN_KEY_PREFIX}${profile.customerId}`;
  try {
    const already = await AsyncStorage.getItem(key);
    if (already) return;
    await AsyncStorage.setItem(key, "1");
  } catch {
    return;
  }
  const { title, body } = buildNotificationContent("welcome", { customerName: profile.name });
  await addNotification({
    id: makeId("ntf"),
    title,
    body,
    type: "welcome",
    category: categoryForType("welcome"),
    createdAt: new Date().toISOString(),
    read: false,
  });
}

type AppContextValue = {
  ready: boolean;
  profile: CustomerProfile | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  signup: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  loginWithGoogle: (
    idTokenOrUserInfo: string | { google_id: string; email: string; name: string; picture?: string | null },
  ) => Promise<CustomerProfile>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<CustomerProfile>) => Promise<void>;

  bookings: Booking[];
  refreshBookings: () => Promise<void>;

  activeDraft: Booking | null;
  startNewBooking: () => Promise<Booking>;
  loadDraft: (bookingId: string) => Promise<Booking | null>;
  clearActiveDraft: () => void;
  addDay: () => Promise<Booking>;
  duplicateLastDay: () => Promise<void>;
  duplicateEventDay: (dayId: string) => Promise<void>;
  updateDay: (dayId: string | string[], patch: Partial<EventDay>) => Promise<void>;
  deleteDay: (dayId: string) => Promise<void>;
  reorderDays: (orderedDayIds: string[]) => Promise<void>;
  updateDeliverables: (patch: Partial<Booking["deliverables"]>) => Promise<void>;
  updateExpectedDelivery: (date: string) => Promise<void>;
  submitBudget: (budget: number) => Promise<BudgetFeasibilityResult>;
  selectPackage: (tier: PackageTierId) => Promise<void>;
  setProviderLocationPreference: (pref: ProviderLocationPreference) => Promise<void>;
  loadVendorMatches: () => Promise<void>;
  selectVendor: (vendorId: string) => Promise<void>;
  submitVendorRequest: () => Promise<Booking>;
  respondToCounterOffer: (action: "accept" | "decline") => Promise<void>;
  confirmBooking: () => Promise<void>;
  confirmPhotographer: (bookingId: string, providerId: string) => Promise<Booking>;
  markPaymentComplete: () => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  deleteDraft: (bookingId: string) => Promise<void>;
  reopenForMatching: (bookingId: string) => Promise<void>;
  searchAgainBooking: (booking: Booking) => Promise<Booking>;

  notifications: AppNotification[];
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
};

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeDraft, setActiveDraft] = useState<Booking | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToastNotification, setActiveToastNotification] = useState<AppNotification | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const activeDraftRef = useRef<Booking | null>(null);
  const bookingsRef = useRef<Booking[]>(bookings);
  const profileRef = useRef<CustomerProfile | null>(profile);
  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const upsertLocalBooking = useCallback((updated: Booking) => {
    setActiveDraft((prev) => {
      if (!prev || prev.bookingId === updated.bookingId) return updated;
      return prev;
    });
    setBookings((list) => {
      const idx = list.findIndex((b) => b.bookingId === updated.bookingId);
      if (idx === -1) return [updated, ...list];
      const next = [...list];
      next[idx] = updated;
      return next;
    });
  }, []);

  const refreshBookings = useCallback(async () => {
    const current = await authApi.getStoredProfile();
    if (!current) return;
    const list = await bookingApi.listBookings(current.customerId);
    setBookings(list);
    setActiveDraft((prev) => {
      if (prev) {
        const updated = list.find(
          (b) => b.bookingId === prev.bookingId || (prev.remoteBookingId != null && b.remoteBookingId === prev.remoteBookingId),
        );
        if (updated) {
          if (prev.updatedAt > updated.updatedAt) return prev;
          return updated;
        }
        if (isLocalWizardBooking(prev) && !prev.remoteBookingId) return prev;
      }
      return selectActiveWizardDraft(list);
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    setNotifications(await getNotifications());
  }, []);

  const adoptAuthenticatedBookings = useCallback(async (customerId: string) => {
    try {
      const list = await bookingApi.listBookings(customerId);
      setBookings(list);
      setActiveDraft((prev) => {
        if (prev && isLocalWizardBooking(prev) && !prev.remoteBookingId) {
          return list.find((b) => b.bookingId === prev.bookingId) ?? prev;
        }
        if (prev) {
          const updated = list.find(
            (b) => b.bookingId === prev.bookingId || (prev.remoteBookingId != null && b.remoteBookingId === prev.remoteBookingId),
          );
          if (updated) {
            if (prev.updatedAt > updated.updatedAt) return prev;
            return updated;
          }
          if (isLocalWizardBooking(prev) && !prev.remoteBookingId) return prev;
        }
        return selectActiveWizardDraft(list);
      });
    } catch {
      /* Auth already succeeded. Booking list/KYC errors must not unwind the session. */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1500);

    (async () => {
      try {
        const stored = await Promise.race([
          authApi.restoreSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);
        if (cancelled) return;
        setProfile(stored);
        if (stored) {
          await adoptAuthenticatedBookings(stored.customerId);
        }
        if (!cancelled) setNotifications(await getNotifications());
      } catch {
        /* Ignore network startup errors so app boots cleanly */
      } finally {
        clearTimeout(fallbackTimer);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [adoptAuthenticatedBookings]);

  useEffect(() => subscribeNotifications(() => void refreshNotifications()), [refreshNotifications]);

  // Push notifications initialization
  useEffect(() => {
    pushNotificationService.init(profile?.customerId).catch(() => {});
  }, [profile?.customerId]);

  // Periodic polling for notifications every 12 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        if (profileRef.current) {
          await refreshBookings();
          await runEngineTick(bookingsRef.current, profileRef.current);
        }

        const fresh = await getNotifications();
        setNotifications(fresh);

        if (!initialLoadDoneRef.current) {
          fresh.forEach((n) => seenNotifIdsRef.current.add(n.id));
          initialLoadDoneRef.current = true;
          return;
        }

        const brandNew = fresh.filter((n) => !n.read && !seenNotifIdsRef.current.has(n.id));
        if (brandNew.length > 0) {
          const newest = brandNew[0];
          brandNew.forEach((n) => seenNotifIdsRef.current.add(n.id));
          setActiveToastNotification(newest);
          selectionFeedback().catch(() => {});

          if (typeof document !== "undefined" && document.hidden) {
            pushNotificationService.showWebNotification(newest.title, newest.body, {
              sender_id: newest.userId || newest.firmId,
              sender_name: newest.firmName,
              booking_id: newest.bookingId,
            });
          }
        }
      } catch {
        // Ignore network poll errors
      }
    };

    const timer = setInterval(() => void poll(), 12000);
    return () => clearInterval(timer);
  }, []);

  // Separate, slower-cadence tick for automatic firm-replacement dispatch —
  // it makes its own per-booking network calls (wave-aware refresh + vendor
  // matching), so it runs far less often than the lightweight notification
  // poll above to avoid unnecessary calls.
  useEffect(() => {
    const tick = async () => {
      if (!profileRef.current) return;
      try {
        await runReplacementTick(bookingsRef.current, profileRef.current);
      } catch {
        // Non-fatal — retried next cycle.
      }
    };
    const timer = setInterval(() => void tick(), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleToastPress = useCallback((notif: AppNotification) => {
    setActiveToastNotification(null);
    if (notif.id) {
      void markNotificationRead(notif.id);
    }
    const route = resolveNotificationRoute(notif, bookingsRef.current);
    router.push(route.params ? { pathname: route.pathname as any, params: route.params } : (route.pathname as any));
  }, []);

  const login = useCallback(
    async (emailOrPhone: string, password: string) => {
      const result = await authApi.login(emailOrPhone, password);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
      void maybeSendWelcomeNotification(result);
    },
    [adoptAuthenticatedBookings],
  );

  const signup = useCallback(
    async (input: { name: string; email: string; phone: string; password: string }) => {
      const result = await authApi.signup(input);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
      void maybeSendWelcomeNotification(result);
    },
    [adoptAuthenticatedBookings],
  );

  const loginWithGoogle = useCallback(
    async (idTokenOrUserInfo: string | { google_id: string; email: string; name: string; picture?: string | null }) => {
      const result = await authApi.loginWithGoogle(idTokenOrUserInfo);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
      void maybeSendWelcomeNotification(result);
      return result;
    },
    [adoptAuthenticatedBookings],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setProfile(null);
    setBookings([]);
    setActiveDraft(null);
  }, []);

  const updateProfileFn = useCallback(async (patch: Partial<CustomerProfile>) => {
    const next = await authApi.updateProfile(patch);
    setProfile(next);
  }, []);

  const startNewBooking = useCallback(async () => {
    if (!profile) throw new Error("Sign in first.");
    const booking = await bookingApi.startFreshBooking(profile.customerId);
    setActiveDraft(booking);
    setBookings((list) => {
      const idx = list.findIndex((b) => b.bookingId === booking.bookingId);
      if (idx === -1) return [booking, ...list];
      const next = [...list];
      next[idx] = booking;
      return next;
    });
    return booking;
  }, [profile]);

  const loadDraft = useCallback(async (bookingId: string) => {
    let booking = await bookingApi.getBooking(bookingId);
    if (!booking) {
      booking = bookingsRef.current.find((b) => b.bookingId === bookingId || b.remoteBookingId === bookingId) ?? null;
      if (booking) {
        await bookingApi.saveBooking(booking);
      }
    }
    if (booking) {
      activeDraftRef.current = booking;
      setActiveDraft(booking);
      return booking;
    }
    // If not found, do not wipe an existing active draft with the same id
    if (activeDraftRef.current?.bookingId === bookingId || activeDraftRef.current?.remoteBookingId === bookingId) {
      return activeDraftRef.current;
    }
    setActiveDraft(null);
    return null;
  }, []);

  const clearActiveDraft = useCallback(() => setActiveDraft(null), []);

  const withDraft = useCallback(
    async (fn: (bookingId: string) => Promise<Booking>) => {
      const current = activeDraftRef.current;
      if (!current) throw new Error("No active booking draft.");
      const updated = await fn(current.bookingId);
      // Guard against race conditions where the draft was deleted while fn was processing
      if (activeDraftRef.current?.bookingId !== current.bookingId) {
        return updated;
      }
      upsertLocalBooking(updated);
      return updated;
    },
    [upsertLocalBooking],
  );

  const addDay = useCallback(async () => {
    return withDraft((id) => bookingApi.addDay(id));
  }, [withDraft]);

  const duplicateLastDay = useCallback(async () => {
    await withDraft((id) => bookingApi.duplicateLastDay(id));
  }, [withDraft]);

  const duplicateEventDay = useCallback(
    async (dayId: string) => {
      await withDraft((id) => bookingApi.duplicateExistingDay(id, dayId));
    },
    [withDraft],
  );

  const updateDay = useCallback(
    async (dayId: string | string[], patch: Partial<EventDay>) => {
      const resolved = normalizeRouteParam(dayId);
      const { dayId: _ignoredId, order: _ignoredOrder, ...safePatch } = patch;
      const owner = resolved ? await bookingApi.getBookingContainingDay(resolved) : null;
      const bookingId = owner?.bookingId ?? activeDraftRef.current?.bookingId;
      if (!bookingId) return;
      const updated = await bookingApi.updateDay(bookingId, resolved, safePatch);
      upsertLocalBooking(updated);
    },
    [upsertLocalBooking],
  );

  const deleteDay = useCallback(
    async (dayId: string) => {
      await withDraft((id) => bookingApi.deleteDay(id, dayId));
    },
    [withDraft],
  );

  const reorderDays = useCallback(
    async (orderedDayIds: string[]) => {
      await withDraft((id) => bookingApi.reorderDays(id, orderedDayIds));
    },
    [withDraft],
  );

  const updateDeliverables = useCallback(
    async (patch: Partial<Booking["deliverables"]>) => {
      await withDraft((id) => bookingApi.updateDeliverables(id, patch));
    },
    [withDraft],
  );

  const updateExpectedDelivery = useCallback(
    async (date: string) => {
      await withDraft((id) => bookingApi.updateExpectedDelivery(id, date));
    },
    [withDraft],
  );

  const submitBudget = useCallback(
    async (budget: number) => {
      const current = activeDraftRef.current;
      if (!current) throw new Error("No active booking draft.");
      const { booking, feasibility } = await bookingApi.submitBudget(current.bookingId, budget);
      upsertLocalBooking(booking);
      return feasibility;
    },
    [upsertLocalBooking],
  );

  const selectPackage = useCallback(
    async (tier: PackageTierId) => {
      await withDraft((id) => bookingApi.selectPackage(id, tier));
    },
    [withDraft],
  );

  const setProviderLocationPreference = useCallback(
    async (pref: ProviderLocationPreference) => {
      await withDraft((id) => bookingApi.updateProviderLocationPreference(id, pref));
    },
    [withDraft],
  );

  const loadVendorMatches = useCallback(async () => {
    await withDraft((id) => bookingApi.getVendorMatches(id));
  }, [withDraft]);

  const selectVendor = useCallback(
    async (vendorId: string) => {
      await withDraft((id) => bookingApi.selectVendor(id, vendorId));
    },
    [withDraft],
  );

  const submitVendorRequest = useCallback(async () => {
    return withDraft((id) => bookingApi.submitVendorRequest(id));
  }, [withDraft]);

  const respondToCounterOffer = useCallback(
    async (action: "accept" | "decline") => {
      await withDraft((id) => bookingApi.respondToCounterOffer(id, action));
    },
    [withDraft],
  );

  const confirmBooking = useCallback(async () => {
    await withDraft((id) => bookingApi.confirmBooking(id));
  }, [withDraft]);

  const confirmPhotographer = useCallback(
    async (bookingId: string, providerId: string) => {
      const updated = await bookingApi.confirmPhotographer(bookingId, providerId);
      upsertLocalBooking(updated);
      await refreshBookings();
      return updated;
    },
    [upsertLocalBooking, refreshBookings],
  );

  const markPaymentComplete = useCallback(async () => {
    await withDraft((id) => bookingApi.markPaymentComplete(id));
  }, [withDraft]);

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await bookingApi.cancelBooking(bookingId);
      await refreshBookings();
      if (activeDraft?.bookingId === bookingId) setActiveDraft(null);
    },
    [refreshBookings, activeDraft],
  );

  const deleteBooking = useCallback(
    async (bookingId: string) => {
      const target =
        bookings.find((b) => b.bookingId === bookingId || b.remoteBookingId === bookingId) ??
        (activeDraftRef.current?.bookingId === bookingId ? activeDraftRef.current : null);

      if (target && isCompletedBooking(target)) {
        throw new Error("Already finished bookings cannot be deleted.");
      }

      if (target && (isLocalWizardBooking(target) || (!target.remoteBookingId && target.status === "DRAFT"))) {
        // Local draft: permanently delete from local storage & memory
        await bookingApi.deleteDraft(target.bookingId);
        if (activeDraftRef.current?.bookingId === target.bookingId) {
          activeDraftRef.current = null;
          setActiveDraft(null);
        }
        setBookings((prev) =>
          prev.filter((b) => b.bookingId !== target.bookingId && b.remoteBookingId !== target.bookingId),
        );
      } else {
        // Submitted server booking: request cancellation via Camartes backend
        await bookingApi.cancelBooking(bookingId);
        await refreshBookings();
        if (activeDraftRef.current?.bookingId === bookingId) {
          activeDraftRef.current = null;
          setActiveDraft(null);
        }
      }
    },
    [bookings, refreshBookings],
  );

  const reopenForMatching = useCallback(
    async (bookingId: string) => {
      const updated = await bookingApi.reopenForMatching(bookingId);
      setActiveDraft(updated);
      await refreshBookings();
    },
    [refreshBookings],
  );

  const searchAgainBooking = useCallback(
    async (booking: Booking) => {
      const draft = await bookingApi.cloneBookingForSearchAgain(booking);
      setActiveDraft(draft);
      await refreshBookings();
      return draft;
    },
    [refreshBookings],
  );

  const markNotificationsRead = useCallback(async () => {
    await markAllRead();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      profile,
      login,
      signup,
      loginWithGoogle,
      logout,
      updateProfile: updateProfileFn,
      bookings,
      refreshBookings,
      activeDraft,
      startNewBooking,
      loadDraft,
      clearActiveDraft,
      addDay,
      duplicateLastDay,
      duplicateEventDay,
      updateDay,
      deleteDay,
      reorderDays,
      updateDeliverables,
      updateExpectedDelivery,
      submitBudget,
      selectPackage,
      setProviderLocationPreference,
      loadVendorMatches,
      selectVendor,
      submitVendorRequest,
      respondToCounterOffer,
      confirmBooking,
      confirmPhotographer,
      markPaymentComplete,
      cancelBooking,
      deleteBooking,
      deleteDraft: deleteBooking,
      reopenForMatching,
      searchAgainBooking,
      notifications,
      refreshNotifications,
      markNotificationsRead,
    }),
    [
      ready,
      profile,
      login,
      signup,
      loginWithGoogle,
      logout,
      updateProfileFn,
      bookings,
      refreshBookings,
      activeDraft,
      startNewBooking,
      loadDraft,
      clearActiveDraft,
      addDay,
      duplicateLastDay,
      duplicateEventDay,
      updateDay,
      deleteDay,
      reorderDays,
      updateDeliverables,
      updateExpectedDelivery,
      submitBudget,
      selectPackage,
      setProviderLocationPreference,
      loadVendorMatches,
      selectVendor,
      submitVendorRequest,
      respondToCounterOffer,
      confirmBooking,
      confirmPhotographer,
      markPaymentComplete,
      cancelBooking,
      deleteBooking,
      reopenForMatching,
      searchAgainBooking,
      notifications,
      refreshNotifications,
      markNotificationsRead,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      <InAppNotificationToast
        notification={activeToastNotification}
        onPress={handleToastPress}
        onDismiss={() => setActiveToastNotification(null)}
      />
      {children}
    </Ctx.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
