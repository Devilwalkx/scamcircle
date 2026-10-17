import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { hasJpegMetadata } from "@scamcircle/core";

/**
 * Pictures, and what this app does and does not do with them.
 * - ScamCircle CANNOT READ PICTURES (no text recognition, no analysis, nothing leaves the phone by itself).
 * - A picture can be chosen with the system photo picker (no permission needed) or arrive from another app's share sheet.
 * - It is re-encoded on the phone, which drops hidden details (camera, place and time), and the result is checked.
 * - The only things a person can do with it are: look at it while typing out what it says, and trim edges off it
 *   so that a smaller copy can be handed to the share sheet for someone they trust. That copy is NOT encrypted by
 *   ScamCircle and goes to whichever app the person picks.
 * - Temporary copies are written to the app's cache folder by the re-encode step and are left for the phone to clear.
 */
export interface Picture { uri: string; width: number; height: number }

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function reencode(uri: string, actions: ImageManipulator.Action[]): Promise<Picture> {
  const r = await ImageManipulator.manipulateAsync(uri, actions, { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!r.base64) throw new Error("The picture could not be prepared.");
  if (hasJpegMetadata(b64ToBytes(r.base64))) throw new Error("Could not remove hidden picture details, so the picture was not used.");
  return { uri: r.uri, width: r.width, height: r.height };
}

/** Re-encode a picture the person chose or another app shared. Throws a plain-words error on failure. */
export function preparePicture(uri: string): Promise<Picture> {
  return reencode(uri, [{ resize: { width: 1200 } }]);
}

/** Opens the system photo picker (one picture, no permission). Returns null if the person cancels. */
export async function pickPicture(): Promise<Picture | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], exif: false, quality: 0.8, allowsMultipleSelection: false });
  if (picked.canceled || !picked.assets[0]) return null;
  return preparePicture(picked.assets[0].uri);
}

export interface Trim { top: number; bottom: number; left: number; right: number }
export const MAX_TRIM = 0.4;
export const TRIM_STEP = 0.05;

/** Crop away the trimmed fractions of each edge and return the smaller picture. */
export function cropPicture(p: Picture, t: Trim): Promise<Picture> {
  const originX = Math.round(p.width * t.left);
  const originY = Math.round(p.height * t.top);
  const width = Math.max(1, Math.round(p.width * (1 - t.left - t.right)));
  const height = Math.max(1, Math.round(p.height * (1 - t.top - t.bottom)));
  return reencode(p.uri, [{ crop: { originX, originY, width, height } }]);
}

/** Hands a picture to the phone's share sheet. Returns a plain sentence about what happened. */
export async function sharePicture(p: Picture): Promise<{ ok: boolean; message: string }> {
  try {
    if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing pictures is not available here. Use the phone app." };
    await Sharing.shareAsync(p.uri, { mimeType: "image/jpeg", dialogTitle: "Send this cropped picture to someone you trust" });
    return { ok: true, message: "The share sheet was opened. ScamCircle cannot see whether you sent it." };
  } catch {
    return { ok: false, message: "The share sheet could not be opened." };
  }
}
