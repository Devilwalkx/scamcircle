import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Use the pre-installed Chromium when present (sandbox); CI installs its own via `playwright install`.
const local = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(local) ? local : undefined);
// Keep Chromium from phoning home (component updates, sync, safe browsing). In the sandbox those requests go
// through a policy proxy that refuses them, and --no-proxy-server makes every request direct (localhost only).
const args = ["--no-proxy-server", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-default-apps", "--no-first-run", "--disable-domain-reliability", "--disable-client-side-phishing-detection", "--metrics-recording-only"];
const launchOptions = executablePath ? { executablePath, args } : { args };

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "off", launchOptions },
  webServer: {
    command: "npx serve ../apps/mobile/dist-web -l 4173 -s --no-clipboard",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 60_000
  },
  projects: [
    { name: "pixel-7", use: { ...devices["Pixel 7"], launchOptions } },
    { name: "phone-390", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["iPhone 14"].userAgent, launchOptions } },
    { name: "phone-320", use: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, launchOptions } }
  ]
});
