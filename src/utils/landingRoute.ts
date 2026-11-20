import { Platform } from "react-native";

/**
 * Route for the public landing page.
 *
 * Both `app/index.tsx` (landing) and `app/(tabs)/index.tsx` (signed-in home)
 * map to "/", so on native a signed-in customer tapping "Home" on a marketing
 * page could land on the authenticated home instead of the landing page.
 * Native therefore always uses the unambiguous "/landing"; web keeps "/" as
 * the canonical, SEO-indexed URL.
 */
export const LANDING_ROUTE = Platform.OS === "web" ? "/" : "/landing";
