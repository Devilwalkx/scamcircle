// Adds PWA/home-screen metadata to the exported index.html. Deliberately NO service worker:
// caching case content offline needs a staleness policy first (see DECISIONS).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = new URL("../dist-web/index.html", import.meta.url);
if (!existsSync(file)) throw new Error("dist-web/index.html not found; run the export first");
let html = readFileSync(file, "utf8");
const tags = [
  '<link rel="manifest" href="manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',
  '<meta name="theme-color" content="#0b5a60" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="ScamCircle" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="application-id" content="app.devilwalkx.scamcircle" />'
];
if (!html.includes('name="application-id"')) html = html.replace("</head>", `${tags.join("\n")}\n</head>`);
writeFileSync(file, html);
console.log("PWA metadata added");
