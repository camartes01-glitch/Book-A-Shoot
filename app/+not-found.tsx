import { Platform } from "react-native";
import { Redirect } from "expo-router";
import { SeoNotFound } from "@/src/components/seo/SeoNotFound";

/**
 * Catch-all for unknown URLs.
 * - Native: unknown deep links go to the app home instead of an error screen.
 * - Web: a real "page not found" page (served by Vercel with a 404 status and
 *   marked noindex) that links visitors to the city pages.
 */
export default function NotFoundScreen() {
  if (Platform.OS === "web") return <SeoNotFound />;
  return <Redirect href="/(tabs)" />;
}
