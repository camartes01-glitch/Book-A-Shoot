import type { EventCategory, EventCategoryGroup } from "@/src/types/booking";

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
  { id: "sangeeth", group: "wedding", label: "Sangeeth", enabled: true, order: 7 },
  { id: "groom_making", group: "wedding", label: "Groom Making", enabled: true, order: 8 },
  { id: "bride_making", group: "wedding", label: "Bride Making", enabled: true, order: 9 },
  { id: "reception", group: "wedding", label: "Reception", enabled: true, order: 10 },

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

  { id: "ganesh_pooja", group: "pooja", label: "Ganesh Pooja", enabled: true, order: 24 },
  { id: "satyanarayan_pooja", group: "pooja", label: "Satyanarayan Pooja", enabled: true, order: 25 },
  { id: "gruha_pravesh_pooja", group: "pooja", label: "Gruha Pravesh Pooja", enabled: true, order: 26 },
  { id: "lakshmi_pooja", group: "pooja", label: "Lakshmi Pooja", enabled: true, order: 27 },
  { id: "saraswati_pooja", group: "pooja", label: "Saraswati Pooja", enabled: true, order: 28 },
  { id: "navratri_pooja", group: "pooja", label: "Navratri Pooja", enabled: true, order: 29 },
  { id: "diwali_pooja", group: "pooja", label: "Diwali Pooja", enabled: true, order: 30 },
  { id: "durga_pooja", group: "pooja", label: "Durga Pooja", enabled: true, order: 31 },
  { id: "varalakshmi_vratham", group: "pooja", label: "Varalakshmi Vratham", enabled: true, order: 32 },
  { id: "naming_ceremony_pooja", group: "pooja", label: "Naming Ceremony Pooja", enabled: true, order: 33 },
  { id: "wedding_pooja", group: "pooja", label: "Wedding Pooja", enabled: true, order: 34 },
  { id: "other_pooja", group: "pooja", label: "Other Pooja", enabled: true, order: 35 },
];

export const EVENT_GROUP_LABEL: Record<EventCategoryGroup, string> = {
  wedding: "Wedding",
  personal: "Personal Events",
  commercial: "Commercial",
  pooja: "Pooja",
};

export const POOJA_EVENT_TYPE_IDS = DEFAULT_EVENT_CATEGORIES.filter((c) => c.group === "pooja").map((c) => c.id);

/** Home discovery card for Pooja. Starts a booking without preselecting a subtype. */
export const HOME_POOJA_DISCOVERY: EventCategory = {
  id: "pooja",
  group: "pooja",
  label: "Pooja",
  enabled: true,
  order: 0,
};

export function getEnabledCategories(categories: EventCategory[] = DEFAULT_EVENT_CATEGORIES) {
  return [...categories].filter((c) => c.enabled).sort((a, b) => a.order - b.order);
}

export function eventTypeLabel(id: string, categories: EventCategory[] = DEFAULT_EVENT_CATEGORIES): string {
  if (!id) return "";
  const trimmed = id.trim();
  const matched = categories.find(
    (c) => c.id.toLowerCase() === trimmed.toLowerCase() || c.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) return matched.label;
  if (trimmed.includes("_")) {
    return trimmed
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  if (trimmed.length > 0) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
}

export function eventTypeLabels(ids: string[], categories: EventCategory[] = DEFAULT_EVENT_CATEGORIES): string {
  return ids.map((id) => eventTypeLabel(id, categories)).filter(Boolean).join(", ");
}

/** Existing home/search matching, plus Pooja group discovery for queries like "Pooja" / "puja". */
export function categoryMatchesSearchQuery(category: EventCategory, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = category.label.toLowerCase();
  const groupLabel = EVENT_GROUP_LABEL[category.group].toLowerCase();
  const idText = category.id.replace(/_/g, " ");
  if (label.includes(q) || groupLabel.includes(q) || idText.includes(q)) return true;
  if (q.split(/\s+/).some((part) => part.length > 0 && (label.includes(part) || idText.includes(part)))) return true;
  if (category.group === "pooja" && (q.includes("pooja") || q.includes("puja"))) return true;
  return false;
}

/** Popular marketplace categories on Home. */
export const HOME_QUICK_PICKS = [
  "wedding",
  "pre_wedding",
  "birthday",
  "baby_shoot",
  "maternity_shoot",
  "corporate_event",
  "product_shoot",
];

export const WEDDING_CATALOG_EVENT_IDS = [
  "engagement",
  "pre_wedding",
  "wedding",
  "post_wedding",
  "haldi",
  "mehendi",
  "sangeeth",
  "groom_making",
  "bride_making",
  "reception",
];

export const FEATURED_EVENT_TYPE_IDS = [
  "wedding",
  "engagement",
  "pre_wedding",
  "reception",
  "haldi",
  "mehendi",
  "birthday",
  "baby_shoot",
  "maternity_shoot",
  "anniversary",
  "naming_ceremony",
  "housewarming",
  "corporate_event",
  "product_shoot",
];

export const REAL_CELEBRATION_ITEMS: Array<{
  id: string;
  label: string;
  tagline: string;
  group: "real_celebrations";
}> = [
  { id: "mehndi", label: "Mehndi & Traditions", tagline: "Real candid henna celebrations & traditional rituals", group: "real_celebrations" },
  { id: "drone", label: "Aerial & Drone Coverage", tagline: "4K cinematic drone footage & grand venue perspectives", group: "real_celebrations" },
  { id: "led_wall", label: "Live Stage & LED Wall", tagline: "Concerts, sangeet performances & grand live stages", group: "real_celebrations" },
];

export const EVENT_TAGLINES: Record<string, string> = {
  wedding: "Timeless moments & sacred rituals",
  pre_wedding: "Romantic stories & scenic portraits",
  engagement: "Rings, love & eternal beginnings",
  post_wedding: "Intimate portraits post celebration",
  haldi: "Vibrant colors, joy & festive laughter",
  mehendi: "Intricate henna artistry & dance",
  sangeeth: "Music, dance performances & grand stage celebrations",
  groom_making: "Groom preparation, swag & royal getting-ready moments",
  bride_making: "Bridal makeup, jewelry reveal & candid getting-ready grace",
  reception: "Grand evening, elegance & toast",
  birthday: "Milestone birthdays & celebrations",
  baby_shoot: "Precious smiles & tiny footprints",
  maternity_shoot: "Motherhood elegance & glowing grace",
  anniversary: "Decades of love celebrated together",
  naming_ceremony: "Welcoming little stars to the family",
  housewarming: "New beginnings & cherished spaces",
  get_together: "Reunions, friends & family bonding",
  personal_other: "Tailored private celebrations",
  product_shoot: "Crisp studio e-commerce visuals",
  corporate_event: "Conferences, summits & galas",
  brand_event: "Brand activations & launches",
  fashion_shoot: "High-fashion editorials & lookbooks",
  advertising_shoot: "Commercial campaign visuals",
  real_estate_shoot: "Architectural & property showcases",
  food_photography: "Culinary delights & menu styling",
  commercial_other: "Specialized commercial media",
  pooja: "Auspicious poojas & sacred ceremonies",
  ganesh_pooja: "Blessings for prosperous beginnings",
  satyanarayan_pooja: "Devotion, katha & divine grace",
  gruha_pravesh_pooja: "Blessing your new sanctuary",
  lakshmi_pooja: "Wealth, prosperity & divine light",
  saraswati_pooja: "Knowledge, music & arts blessings",
  navratri_pooja: "Festive devotion, garba & energy",
  diwali_pooja: "Festival of lights & prosperity",
  durga_pooja: "Power, grace & grand pandals",
  varalakshmi_vratham: "Sacred prayers for family wellness",
  naming_ceremony_pooja: "Vedic mantras for your little one",
  wedding_pooja: "Sacred vows & auspicious rituals",
  other_pooja: "Custom temple & family rituals",
  mehndi: "Real candid henna celebrations & traditional rituals",
  drone: "4K cinematic drone footage & grand venue perspectives",
  led_wall: "Concerts, sangeet performances & grand live stages",
};

export function getEventTagline(id: string): string {
  return EVENT_TAGLINES[id] ?? "Professional photo & video coverage";
}
