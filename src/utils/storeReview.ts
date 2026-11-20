import { Linking, Platform } from "react-native";

/** Book A Shoot customer app (package / bundle com.camartes.customer). */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.camartes.customer";
const PLAY_STORE_MARKET_URL = "market://details?id=com.camartes.customer";
const APP_STORE_ID = "6817542041";
const APP_STORE_REVIEW_URL = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const APP_STORE_WEB_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

async function openFirst(primary: string, fallback: string): Promise<void> {
  try {
    if (await Linking.canOpenURL(primary)) {
      await Linking.openURL(primary);
      return;
    }
  } catch {
    // fall through to the web page
  }
  await Linking.openURL(fallback).catch(() => undefined);
}

/** Opens the store page where the customer can rate the app (Play Store on Android and web, App Store on iOS). */
export function openAppStoreReview(): Promise<void> {
  if (Platform.OS === "ios") return openFirst(APP_STORE_REVIEW_URL, APP_STORE_WEB_URL);
  if (Platform.OS === "android") return openFirst(PLAY_STORE_MARKET_URL, PLAY_STORE_URL);
  return Linking.openURL(PLAY_STORE_URL).catch(() => undefined);
}
