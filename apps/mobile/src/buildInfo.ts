import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

/** What this installed build is. Version and commit come from the build (CI sets them); a local build says "local". */
export function buildInfo() {
  const extra = (Constants.expoConfig?.extra ?? {}) as { commit?: string; builtAt?: string; channel?: string };
  return {
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.2.0",
    code: Application.nativeBuildVersion ?? "web",
    id: Application.applicationId ?? (Platform.OS === "web" ? "app.devilwalkx.scamcircle (web build)" : "unknown"),
    commit: extra.commit ?? "local",
    builtAt: extra.builtAt ?? "",
    channel: extra.channel ?? "development"
  };
}
