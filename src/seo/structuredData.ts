/**
 * Schema.org JSON-LD builders for the local SEO pages. Everything here must
 * describe content the visitor can see on the page. Book A Shoot is a
 * marketplace, not a studio in each city, so pages use Service with an
 * areaServed City (never LocalBusiness) and carry no ratings or reviews.
 */
import { SITE_URL, type Faq } from "@/src/seo/seoContent";

const ORG_ID = `${SITE_URL}/#organization`;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}`;
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serviceSchema(input: {
  name: string;
  serviceType: string;
  description: string;
  path: string;
  city: string;
  state: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    serviceType: input.serviceType,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@id": ORG_ID, "@type": "Organization", name: "Book A Shoot", url: SITE_URL },
    areaServed: {
      "@type": "City",
      name: input.city,
      containedInPlace: { "@type": "State", name: input.state },
    },
  };
}

export function faqSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
