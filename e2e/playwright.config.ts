import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Use the pre-installed Chromium when present (sandbox); CI installs its own via `playwright install`.
const local = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(local) ? local : undefined);
// ScamCircle owns 4411 (dev Metro 8411). Other apps: AccessChain 4391, ScopeLock 4401, IngredientAlert 4421, CareRelay 4431.
const PORT = process.env.E2E_PORT ?? "4411";
const DIST = process.env.E2E_DIST ?? "../apps/mobile/dist-web";
// Keep Chromium from phoning home (component updates, sync, safe browsing). In the sandbox those requests go
// through a policy proxy that refuses them, and --no-proxy-server makes every request direct (localhost only).
const args = ["--no-proxy-server", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-default-apps", "--no-first-run", "--disable-domain-reliability", "--disable-client-side-phishing-detection", "--metrics-recording-only"];
const launchOptions = executablePath ? { executablePath, args } : { args };

export default defineConfig({
  testDir: "tests",
  timeout: 240_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "off", actionTimeout: 30_000, launchOptions },
  webServer: {
    command: `npx serve ${DIST} -l ${PORT} -s --no-clipboard`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000
  },
  projects: [
    { name: "android-phone", use: { ...devices["Pixel 7"], launchOptions } },
    { name: "iphone-size", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["iPhone 14"].userAgent, launchOptions } },
    { name: "small-phone", use: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, launchOptions } }
  ]
});
