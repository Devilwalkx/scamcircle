import { Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";

/** Copy text to the clipboard. The person decides where to paste it. Nothing is sent by the app itself. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** Opens the phone's own share sheet with the text. The app does not choose or contact any recipient. */
export async function shareText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === "web" && !(navigator as { share?: unknown }).share) return copyText(text);
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

export async function pasteText(): Promise<string> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return "";
  }
}
