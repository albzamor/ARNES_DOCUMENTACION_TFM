import { access, constants } from "node:fs/promises";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium"
];

async function fileExists(p) {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locates a usable Chrome/Chromium executable for Puppeteer-based rendering
 * (mermaid-filter and mmdc both shell out to Puppeteer under the hood).
 * Honors PUPPETEER_EXECUTABLE_PATH first, then falls back to common install paths.
 */
export async function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const candidate of CHROME_CANDIDATES) {
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

export { fileExists };
