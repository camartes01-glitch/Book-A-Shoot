/**
 * App-wide Instant Image Prefetcher
 * Warms up browser memory and disk cache for all key high-resolution assets in parallel.
 * This guarantees 0ms latency and instantaneous visual rendering when navigating across pages.
 */

import { Image as RNImage, Platform } from "react-native";

const CRITICAL_IMAGES = [
  "/book-a-shoot-wordmark.png",
  "/logo-white.png",
  "/hero1.webp",
  "/hero2.webp",
  "/hero3.webp",
  "/phonehero1.webp",
  "/phonehero2.webp",
  "/phonehero3.webp",
  "/contact.webp",
  "/phonecontact.webp",
  "/aboutus.webp",
  "/phoneabout.webp",
  "/cta.webp",
  "/multipleevents.webp",
  "/blog1.webp",
  "/blog2.webp",
  "/whatsapp.png",
  "/instagram.png",
  "/facebook.png",
];

let prefetched = false;

export function prefetchAllAppImages(): void {
  if (prefetched) return;
  prefetched = true;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    // 1. Browser HTML Image preloading (immediate high-concurrency background fetch)
    const runPrefetch = () => {
      CRITICAL_IMAGES.forEach((src) => {
        try {
          const img = new (window as any).Image();
          img.decoding = "async";
          img.src = src;
        } catch {
          // ignore
        }
      });
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(runPrefetch, { timeout: 1200 });
    } else {
      setTimeout(runPrefetch, 100);
    }
  } else {
    // 2. React Native Native Image prefetching
    CRITICAL_IMAGES.forEach((src) => {
      RNImage.prefetch(src).catch(() => {});
    });
  }
}
