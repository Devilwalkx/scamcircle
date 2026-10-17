import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { b64Encode, hasJpegMetadata, stripJpegMetadata } from "@scamcircle/core";

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * The screenshot is only shown while the person types out what it says. There is no on-device text reading
 * (OCR) in this build. It is re-encoded (drops EXIF/GPS), checked and stripped again, held in memory only,
 * and never saved into the vault or shared. The re-encode step itself may leave a temporary copy in the
 * app's cache folder until the system clears it (open item, see DATA_FLOWS.md).
 */
export async function pickScreenshot(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], exif: false, quality: 0.7, allowsMultipleSelection: false });
  if (picked.canceled || !picked.assets[0]) return null;
  const re = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 900 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!re.base64) throw new Error("The picture could not be prepared.");
  let bytes = b64ToBytes(re.base64);
  if (hasJpegMetadata(bytes)) bytes = stripJpegMetadata(bytes);
  if (hasJpegMetadata(bytes)) throw new Error("Could not remove hidden picture details, so the picture was not used.");
  return `data:image/jpeg;base64,${b64Encode(bytes)}`;
}
