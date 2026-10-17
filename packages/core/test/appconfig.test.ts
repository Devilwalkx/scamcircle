import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cfg = JSON.parse(readFileSync(new URL("../../../apps/mobile/app.json", import.meta.url), "utf8")).expo;
const pkg = JSON.parse(readFileSync(new URL("../../../apps/mobile/package.json", import.meta.url), "utf8"));

describe("mobile app config (checked once for real with `expo prebuild`; CI re-checks the generated manifest)", () => {
  it("identity: unique placeholder package and visible synthetic name", () => {
    expect(cfg.android.package).toBe("invalid.placeholder.scamcircle");
    expect(cfg.name).toBe("ScamCircle (synthetic demo)");
  });
  it("blocks internet, location, microphone, camera, storage, overlay and vibration permissions", () => {
    for (const p of ["INTERNET", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "RECORD_AUDIO", "CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW", "VIBRATE"]) {
      expect(cfg.android.blockedPermissions).toContain(p);
    }
    expect(cfg.android.permissions ?? []).toEqual([]);
  });
  it("image picker requests neither camera nor microphone", () => {
    const ip = cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-image-picker")?.[1];
    expect(ip.cameraPermission).toBe(false);
    expect(ip.microphonePermission).toBe(false);
  });
  it("no analytics, crash-reporting, notification or networking packages", () => {
    const names = [...Object.keys(pkg.dependencies), ...cfg.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p))];
    expect(names.filter((n: string) => /analytics|sentry|firebase|segment|amplitude|tracking|notifications|axios|location|camera|contacts|sms/i.test(n))).toEqual([]);
  });
});
