/**
 * Vendor domain types for the Camartes Customer Booking App.
 *
 * The customer app never owns vendor data. Vendors, services, pricing rules
 * and availability all live on the Camartes Vendor Platform
 * (https://camartes-backend.onrender.com) and are only ever read here via
 * `src/services/vendorApi.ts`. See section 2 ("Important Business Rule") and
 * section 25 ("Vendor Matching Engine") of the product spec.
 */

export type PhotographyStyle = "traditional" | "candid";
export type VideographyStyle = "traditional" | "candid";

export type CoreServiceKind = "photography" | "videography";
export type AddOnServiceKind = "aerial_photo" | "aerial_video" | "led_wall" | "web_live";

export type VendorService = CoreServiceKind | AddOnServiceKind;

/** Vendor record as consumed by the customer app — adapted from the raw
 * Camartes Vendor Platform catalog shape (see lib/camartes-api.ts in the
 * Camartes Field app for the raw mapping this mirrors). */
export type CustomerVendor = {
  vendorId: string;
  studioName: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  experienceYears: number;
  rating: number;
  completedBookings: number;
  responseRatePct: number;
  photography: { traditional: boolean; candid: boolean; maxPhotographers: number };
  videography: { traditional: boolean; candid: boolean; maxVideographers: number };
  aerial: { photography: boolean; videography: boolean; maxDrones: number };
  ledWall: { available: boolean; sizes: string[]; maxScreens: number };
  webLive: { available: boolean; qualities: Array<"HD" | "4K"> };
  portfolioImages: string[];
  about: string;
  serviceAreas: string[];
  kycVerified: boolean;
  /** From the live Camartes catalog when true, otherwise a cached snapshot. */
  liveSource: boolean;
  /** Vendor day-rate from the catalog when the platform returned one. 0 means no catalog price. */
  basePricePerDay: number;
  /** `is_available` from the live catalog search. Unknown defaults to true. */
  listedAvailable: boolean;
  contactMaskedUntilAccepted: boolean;
  phone?: string;
  email?: string;
};

export type VendorAvailabilityCheck = {
  vendorId: string;
  /** True only when the vendor can satisfy every event day's date, time and
   * quantity requirements (see spec sections 28–29). */
  available: boolean;
  reason?: string;
};
