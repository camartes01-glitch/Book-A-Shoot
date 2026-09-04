import type { BookingStatus } from "@/src/types/booking";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  MATCHING: "Finding vendors",
  VENDOR_SELECTED: "Vendor selected",
  REQUEST_SENT: "Request sent",
  VENDOR_ACCEPTED: "Vendor accepted",
  CUSTOMER_CONFIRMED: "Confirmed by you",
  PAYMENT_PENDING: "Payment pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  VENDOR_REJECTED: "Vendor declined",
  CUSTOMER_CANCELLED: "Cancelled",
  VENDOR_CANCELLED: "Vendor cancelled",
  EXPIRED: "Expired",
};

export const STATUS_TONE: Record<BookingStatus, "default" | "peach" | "green" | "blue" | "violet" | "red" | "amber"> = {
  DRAFT: "peach",
  SUBMITTED: "blue",
  MATCHING: "blue",
  VENDOR_SELECTED: "violet",
  REQUEST_SENT: "amber",
  VENDOR_ACCEPTED: "green",
  CUSTOMER_CONFIRMED: "green",
  PAYMENT_PENDING: "amber",
  CONFIRMED: "green",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  VENDOR_REJECTED: "red",
  CUSTOMER_CANCELLED: "red",
  VENDOR_CANCELLED: "red",
  EXPIRED: "red",
};
