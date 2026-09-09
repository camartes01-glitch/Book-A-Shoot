import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppNotification, Booking, EventDay, PackageTierId } from "@/src/types/booking";
import type { CustomerProfile } from "@/src/types/booking";
import * as authApi from "@/src/services/authApi";
import * as bookingApi from "@/src/services/bookingApi";
import { getNotifications, markAllRead, subscribeNotifications } from "@/src/services/notificationsStore";
import { isLocalWizardBooking, selectActiveWizardDraft } from "@/src/domain/bookingRequest";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";
import { normalizeRouteParam } from "@/src/utils/routeParam";

type AppContextValue = {
  ready: boolean;
  profile: CustomerProfile | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  signup: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<CustomerProfile>) => Promise<void>;

  bookings: Booking[];
  refreshBookings: () => Promise<void>;

  activeDraft: Booking | null;
  startNewBooking: () => Promise<Booking>;
  loadDraft: (bookingId: string) => Promise<Booking | null>;
  clearActiveDraft: () => void;
  addDay: () => Promise<void>;
  duplicateLastDay: () => Promise<void>;
  duplicateEventDay: (dayId: string) => Promise<void>;
  updateDay: (dayId: string | string[], patch: Partial<EventDay>) => Promise<void>;
  deleteDay: (dayId: string) => Promise<void>;
  reorderDays: (orderedDayIds: string[]) => Promise<void>;
  updateDeliverables: (patch: Partial<Booking["deliverables"]>) => Promise<void>;
  updateExpectedDelivery: (date: string) => Promise<void>;
  submitBudget: (budget: number) => Promise<BudgetFeasibilityResult>;
  selectPackage: (tier: PackageTierId) => Promise<void>;
  loadVendorMatches: () => Promise<void>;
  selectVendor: (vendorId: string) => Promise<void>;
  submitVendorRequest: () => Promise<Booking>;
  respondToCounterOffer: (action: "accept" | "decline") => Promise<void>;
  confirmBooking: () => Promise<void>;
  markPaymentComplete: () => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  deleteDraft: (bookingId: string) => Promise<void>;
  reopenForMatching: (bookingId: string) => Promise<void>;

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
  const activeDraftRef = useRef<Booking | null>(null);
  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);

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
    (async () => {
      try {
        const stored = await authApi.restoreSession();
        if (cancelled) return;
        setProfile(stored);
        if (stored) {
          await adoptAuthenticatedBookings(stored.customerId);
        }
        if (!cancelled) setNotifications(await getNotifications());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adoptAuthenticatedBookings]);

  useEffect(() => subscribeNotifications(() => void refreshNotifications()), [refreshNotifications]);

  const login = useCallback(
    async (emailOrPhone: string, password: string) => {
      const result = await authApi.login(emailOrPhone, password);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
    },
    [adoptAuthenticatedBookings],
  );

  const signup = useCallback(
    async (input: { name: string; email: string; phone: string; password: string }) => {
      const result = await authApi.signup(input);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
    },
    [adoptAuthenticatedBookings],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const result = await authApi.loginWithGoogle(idToken);
      setProfile(result);
      await adoptAuthenticatedBookings(result.customerId);
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
    const booking = await bookingApi.getBooking(bookingId);
    setActiveDraft(booking);
    return booking;
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
    await withDraft((id) => bookingApi.addDay(id));
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
      loadVendorMatches,
      selectVendor,
      submitVendorRequest,
      respondToCounterOffer,
      confirmBooking,
      markPaymentComplete,
      cancelBooking,
      deleteBooking,
      deleteDraft: deleteBooking,
      reopenForMatching,
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
      loadVendorMatches,
      selectVendor,
      submitVendorRequest,
      respondToCounterOffer,
      confirmBooking,
      markPaymentComplete,
      cancelBooking,
      deleteBooking,
      reopenForMatching,
      notifications,
      refreshNotifications,
      markNotificationsRead,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
