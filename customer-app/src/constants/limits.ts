/**
 * Admin-configurable maximums / catalogs (spec section 52, "Admin Controls").
 *
 * These are plain data structures precisely so that a future
 * `GET /api/admin/config` call can replace the static values without any
 * screen or validator changing shape.
 */
export const ADMIN_LIMITS = {
  maxPhotographersPerType: 10,
  maxVideographersPerType: 6,
  maxDronesPerType: 6,
  maxLedScreens: 10,
  minPhotographers: 1,
  minVideographers: 1,
};

export const LED_WALL_SIZES = ["6 x 8", "8 x 12", "12 x 16"];

export const ALBUM_PAGE_OPTIONS = ["10", "15", "20", "25"] as const;
export const EDITED_PHOTO_OPTIONS = ["25", "50", "100"] as const;

export const WEB_LIVE_QUALITIES: Array<"HD" | "4K"> = ["HD", "4K"];
