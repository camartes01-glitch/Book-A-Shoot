import type { BookingStatus } from "@/src/types/booking";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  MATCHING: "Finding vendors",
  VENDOR_SELECTED: "Vendor selected",
  REQUEST_SENT: "Request sent",
  VENDOR_ACCEPTED: "Vendor accepted",
  CUSTOMER_CONFIRMED: "Confirmed by you",
  PAYMENT_PENDING: "Confirmed by you",
  CONFIRMED: "Confirmed by you",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  VENDOR_REJECTED: "Vendor declined",
  CUSTOMER_CANCELLED: "Cancelled",
  VENDOR_CANCELLED: "Vendor cancelled",
  EXPIRED: "Expired",
};

export const STATUS_TONE: Record<BookingStatus, "default" | "peach" | "green" | "blue" | "violet" | "red" | "amber"> = {
  DRAFT: "peach",
  SUBMITTED: "peach",
  MATCHING: "peach",
  VENDOR_SELECTED: "peach",
  REQUEST_SENT: "peach",
  VENDOR_ACCEPTED: "peach",
  CUSTOMER_CONFIRMED: "peach",
  PAYMENT_PENDING: "peach",
  CONFIRMED: "peach",
  IN_PROGRESS: "peach",
  COMPLETED: "peach",
  VENDOR_REJECTED: "red",
  CUSTOMER_CANCELLED: "red",
  VENDOR_CANCELLED: "red",
  EXPIRED: "red",
};
