import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppNotification, Booking, EventDay, PackageTierId } from "@/src/types/booking";
import type { CustomerProfile } from "@/src/types/booking";
import * as authApi from "@/src/services/authApi";
import * as bookingApi from "@/src/services/bookingApi";
import { getNotifications, markAllRead, subscribeNotifications } from "@/src/services/notificationsStore";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";

type AppContextValue = {
  ready: boolean;
  profile: CustomerProfile | null;
  requestOtp: (mobile: string) => Promise<{ demoOtp: string }>;
  verifyOtp: (mobile: string, code: string) => Promise<boolean>;
  loginWithEmail: (email: string, name: string) => Promise<void>;
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
  updateDay: (dayId: string, patch: Partial<EventDay>) => Promise<void>;
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

  const refreshBookings = useCallback(async () => {
    const current = await authApi.getStoredProfile();
    if (!current) return;
    const list = await bookingApi.listBookings(current.customerId);
    setBookings(list);
  }, []);

  const refreshNotifications = useCallback(async () => {
    setNotifications(await getNotifications());
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await authApi.getStoredProfile();
      setProfile(stored);
      if (stored) {
        const list = await bookingApi.listBookings(stored.customerId);
        setBookings(list);
        const draft = list.find((b) => b.status === "DRAFT") ?? null;
        setActiveDraft(draft);
      }
      setNotifications(await getNotifications());
      setReady(true);
    })();
  }, []);

  useEffect(() => subscribeNotifications(() => void refreshNotifications()), [refreshNotifications]);

  const requestOtp = useCallback((mobile: string) => authApi.requestOtp(mobile), []);

  const verifyOtp = useCallback(async (mobile: string, code: string) => {
    const result = await authApi.verifyOtp(mobile, code);
    if (!result) return false;
    setProfile(result);
    await refreshBookings();
    return true;
  }, [refreshBookings]);

  const loginWithEmail = useCallback(async (email: string, name: string) => {
    const result = await authApi.loginWithEmail(email, name);
    setProfile(result);
    await refreshBookings();
  }, [refreshBookings]);

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
    const booking = await bookingApi.createBooking(profile.customerId);
    setActiveDraft(booking);
    await refreshBookings();
    return booking;
  }, [profile, refreshBookings]);

  const loadDraft = useCallback(async (bookingId: string) => {
    const booking = await bookingApi.getBooking(bookingId);
    setActiveDraft(booking);
    return booking;
  }, []);

  const clearActiveDraft = useCallback(() => setActiveDraft(null), []);

  const withDraft = useCallback(
    async (fn: (bookingId: string) => Promise<Booking>) => {
      if (!activeDraft) throw new Error("No active booking draft.");
      const updated = await fn(activeDraft.bookingId);
      setActiveDraft(updated);
      await refreshBookings();
      return updated;
    },
    [activeDraft, refreshBookings],
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
    async (dayId: string, patch: Partial<EventDay>) => {
      await withDraft((id) => bookingApi.updateDay(id, dayId, patch));
    },
    [withDraft],
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
      if (!activeDraft) throw new Error("No active booking draft.");
      const { booking, feasibility } = await bookingApi.submitBudget(activeDraft.bookingId, budget);
      setActiveDraft(booking);
      await refreshBookings();
      return feasibility;
    },
    [activeDraft, refreshBookings],
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
      requestOtp,
      verifyOtp,
      loginWithEmail,
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
      reopenForMatching,
      notifications,
      refreshNotifications,
      markNotificationsRead,
    }),
    [
      ready,
      profile,
      requestOtp,
      verifyOtp,
      loginWithEmail,
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
