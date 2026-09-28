import { Redirect } from "expo-router";

/**
 * Expo Router catch-all route for any unhandled URLs or deep links.
 * Gracefully redirects to the main app tabs instead of displaying an "Unmatched Route" error screen.
 */
export default function NotFoundScreen() {
  return <Redirect href="/(tabs)" />;
}
