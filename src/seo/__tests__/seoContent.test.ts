/**
 * Guards for the local SEO content. These fail when a new page is added that
 * would hurt search rankings: broken links, duplicate titles, missing images,
 * or made-up ratings.
 */
import fs from "fs";
import path from "path";
import {
  SEO_CITIES,
  SEO_SERVICES,
  SERVICE_CITY_PAGES,
  getCity,
  getService,
} from "@/src/seo/seoContent";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";

const PUBLIC_DIR = path.join(__dirname, "..", "..", "..", "public");

const allPages = [
  ...SEO_CITIES.map((c) => ({ id: c.slug, title: c.title, description: c.metaDescription, h1: c.h1, faqs: c.faqs, hero: c.hero })),
  ...SERVICE_CITY_PAGES.map((p) => ({
    id: `${p.service}/${p.city}`,
    title: p.title,
    description: p.metaDescription,
    h1: p.h1,
    faqs: p.faqs,
    hero: p.hero,
  })),
];

describe("SEO content", () => {
  it("every service + city page points at a real city and service", () => {
    for (const p of SERVICE_CITY_PAGES) {
      expect(getCity(p.city)).toBeDefined();
      expect(getService(p.service)).toBeDefined();
    }
  });

  it("has no duplicate pages or slugs", () => {
    const ids = allPages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(SEO_SERVICES.map((s) => s.slug)).size).toBe(SEO_SERVICES.length);
  });

  it("gives every page a unique title, description and H1", () => {
    for (const key of ["title", "description", "h1"] as const) {
      const values = allPages.map((p) => p[key].toLowerCase());
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("keeps titles and descriptions within search-result lengths", () => {
    for (const p of allPages) {
      expect(p.title.length).toBeLessThanOrEqual(65);
      expect(p.description.length).toBeGreaterThanOrEqual(110);
      expect(p.description.length).toBeLessThanOrEqual(200);
    }
  });

  it("gives every page FAQs with unique questions", () => {
    for (const p of allPages) {
      expect(p.faqs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(p.faqs.map((f) => f.q)).size).toBe(p.faqs.length);
    }
  });

  it("uses hero images that exist, with descriptive alt text", () => {
    for (const p of allPages) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, p.hero.src))).toBe(true);
      expect(p.hero.alt.split(" ").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("maps every service to an event type the booking flow knows", () => {
    const known = new Set(DEFAULT_EVENT_CATEGORIES.map((c) => c.id));
    for (const s of SEO_SERVICES) expect(known.has(s.eventTypeId)).toBe(true);
  });

  it("never claims ratings, review counts or guarantees we can't back", () => {
    const text = JSON.stringify({ SEO_CITIES, SERVICE_CITY_PAGES, SEO_SERVICES }).toLowerCase();
    for (const banned of ["rating", "reviews", "/5", "escrow", "guarantee", "100%", "best photographer"]) {
      expect(text).not.toContain(banned);
    }
  });
});
