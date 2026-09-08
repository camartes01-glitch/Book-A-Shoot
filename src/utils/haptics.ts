import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Light selection tick for marketplace taps. Never throws on web/unsupported devices. */
export async function selectionFeedback() {
  try {
    if (Platform.OS === "web") return;
    await Haptics.selectionAsync();
  } catch {
    /* haptic hardware is optional */
  }
}

export async function successFeedback() {
  try {
    if (Platform.OS === "web") return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* haptic hardware is optional */
  }
}
