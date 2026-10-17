import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cfg = JSON.parse(readFileSync(new URL("../../../apps/mobile/app.json", import.meta.url), "utf8")).expo;
const pkg = JSON.parse(readFileSync(new URL("../../../apps/mobile/package.json", import.meta.url), "utf8"));
const e2eCfg = readFileSync(new URL("../../../e2e/playwright.config.ts", import.meta.url), "utf8");
const postweb = readFileSync(new URL("../../../apps/mobile/scripts/postweb.mjs", import.meta.url), "utf8");

describe("mobile app config (checked once for real with `expo prebuild`; CI re-checks the generated manifest)", () => {
  it("identity: unique application id, version 0.2.0, plain name", () => {
    expect(cfg.android.package).toBe("app.devilwalkx.scamcircle");
    expect(cfg.ios.bundleIdentifier).toBe("app.devilwalkx.scamcircle");
    expect(cfg.version).toBe("0.2.0");
    expect(cfg.name).toBe("ScamCircle");
    expect(JSON.stringify(cfg)).not.toContain("invalid.placeholder");
  });
  it("blocks internet, location, microphone, camera, storage, overlay and vibration permissions; no permission is added by hand", () => {
    for (const p of ["INTERNET", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "RECORD_AUDIO", "CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW", "VIBRATE"]) {
      expect(cfg.android.blockedPermissions).toContain(p);
    }
    expect(cfg.android.permissions ?? []).toEqual([]);
  });
  it("Android behaviour flags: no cloud backup, predictive back, keyboard resizes the window", () => {
    expect(cfg.android.allowBackup).toBe(false);
    expect(cfg.android.predictiveBackGestureEnabled).toBe(true);
    expect(cfg.android.softwareKeyboardLayoutMode).toBe("resize");
  });
  it("share-in: the expo-sharing plugin accepts plain text and pictures on Android only", () => {
    const sh = cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-sharing")?.[1];
    expect(sh.android.enabled).toBe(true);
    expect(sh.android.singleShareMimeTypes).toEqual(["text/plain", "image/*"]);
    expect(sh.ios).toBeUndefined();
  });
  it("image picker requests neither camera nor microphone", () => {
    const ip = cfg.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-image-picker")?.[1];
    expect(ip.cameraPermission).toBe(false);
    expect(ip.microphonePermission).toBe(false);
  });
  it("no analytics, crash-reporting, notification or networking packages", () => {
    const names = [...Object.keys(pkg.dependencies), ...cfg.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p))];
    expect(names.filter((n: string) => /analytics|sentry|firebase|segment|amplitude|tracking|notifications|axios|location|camera|contacts|sms|webview/i.test(n))).toEqual([]);
  });
  it("browser tests: dedicated port 4411, never reuse another app's server, and the page proves which app it is", () => {
    expect(e2eCfg).toMatch(/E2E_PORT \?\? "4411"/);
    expect(e2eCfg).toMatch(/reuseExistingServer: false/);
    expect(e2eCfg).not.toMatch(/4173/);
    expect(postweb).toContain('<meta name="application-id" content="app.devilwalkx.scamcircle" />');
    expect(pkg.scripts.start).toContain("--port 8411");
  });
});
