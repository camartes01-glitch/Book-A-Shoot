import type { EventCategory } from "@/src/types/booking";

/**
 * Initial event categories (spec section 8 / "Event Categories").
 *
 * This list is shaped exactly like an admin-managed table (id, group, label,
 * enabled, order) on purpose: `src/services/adminConfigApi.ts` is the single
 * seam that would fetch this from `GET /api/admin/event-categories` on the
 * Camartes backend instead. No screen or validator switches on a hard-coded
 * id list — everything iterates this array, so adding/disabling/reordering
 * categories from an admin panel requires zero app code changes.
 */
export const DEFAULT_EVENT_CATEGORIES: EventCategory[] = [
  { id: "engagement", group: "wedding", label: "Engagement", enabled: true, order: 1 },
  { id: "pre_wedding", group: "wedding", label: "Pre-Wedding", enabled: true, order: 2 },
  { id: "wedding", group: "wedding", label: "Wedding", enabled: true, order: 3 },
  { id: "post_wedding", group: "wedding", label: "Post-Wedding", enabled: true, order: 4 },
  { id: "haldi", group: "wedding", label: "Haldi", enabled: true, order: 5 },
  { id: "mehendi", group: "wedding", label: "Mehendi", enabled: true, order: 6 },
  { id: "reception", group: "wedding", label: "Reception", enabled: true, order: 7 },

  { id: "birthday", group: "personal", label: "Birthday", enabled: true, order: 8 },
  { id: "get_together", group: "personal", label: "Get Together", enabled: true, order: 9 },
  { id: "anniversary", group: "personal", label: "Anniversary", enabled: true, order: 10 },
  { id: "baby_shoot", group: "personal", label: "Baby Shoot", enabled: true, order: 11 },
  { id: "maternity_shoot", group: "personal", label: "Maternity Shoot", enabled: true, order: 12 },
  { id: "naming_ceremony", group: "personal", label: "Naming Ceremony", enabled: true, order: 13 },
  { id: "housewarming", group: "personal", label: "Housewarming", enabled: true, order: 14 },
  { id: "personal_other", group: "personal", label: "Other", enabled: true, order: 15 },

  { id: "product_shoot", group: "commercial", label: "Product Shoot", enabled: true, order: 16 },
  { id: "corporate_event", group: "commercial", label: "Corporate Event", enabled: true, order: 17 },
  { id: "brand_event", group: "commercial", label: "Brand Event", enabled: true, order: 18 },
  { id: "fashion_shoot", group: "commercial", label: "Fashion Shoot", enabled: true, order: 19 },
  { id: "advertising_shoot", group: "commercial", label: "Advertising Shoot", enabled: true, order: 20 },
  { id: "real_estate_shoot", group: "commercial", label: "Real Estate Shoot", enabled: true, order: 21 },
  { id: "food_photography", group: "commercial", label: "Food Photography", enabled: true, order: 22 },
  { id: "commercial_other", group: "commercial", label: "Other Commercial Shoot", enabled: true, order: 23 },
];

export const EVENT_GROUP_LABEL: Record<EventCategoryGroupKey, string> = {
  wedding: "Wedding",
  personal: "Personal Events",
  commercial: "Commercial",
};

type EventCategoryGroupKey = "wedding" | "personal" | "commercial";

export function getEnabledCategories(categories: EventCategory[] = DEFAULT_EVENT_CATEGORIES) {
  return [...categories].filter((c) => c.enabled).sort((a, b) => a.order - b.order);
}

/** Quick-pick chips shown on Home ("What are you planning?"). */
export const HOME_QUICK_PICKS = ["wedding", "birthday", "pre_wedding", "baby_shoot", "corporate_event"];
