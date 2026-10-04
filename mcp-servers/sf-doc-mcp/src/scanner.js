import fs from "node:fs";
import path from "node:path";

/**
 * Recursively walks a directory and returns every file path found.
 * Skips heavy/irrelevant folders to keep scans fast.
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".sf",
  ".sfdx",
  ".localdevserver",
  "coverage",
  "dist",
  "build"
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      // allow hidden files to be skipped, but keep scanning fast
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Scans a Salesforce project root and classifies every file we know how
 * to document: Agent Script (.agent), LWC bundles, Flows (.flow-meta.xml),
 * and Apex classes (.cls).
 *
 * Returns: { agentScripts: string[], lwc: {name, dir}[], flows: string[], apex: string[] }
 */
export function scanProject(rootDir) {
  const allFiles = walk(rootDir);

  const agentScripts = allFiles.filter((f) => f.endsWith(".agent"));
  const flows = allFiles.filter((f) => f.endsWith(".flow-meta.xml"));
  const apex = allFiles.filter(
    (f) => f.endsWith(".cls") && !f.endsWith(".cls-meta.xml")
  );

  // LWC bundles: a folder named after its own .js and .js-meta.xml files,
  // typically living under a "lwc" parent directory.
  const lwcDirs = new Map();
  for (const f of allFiles) {
    const base = path.basename(f);
    const dir = path.dirname(f);
    const dirName = path.basename(dir);
    if (base === `${dirName}.js-meta.xml`) {
      lwcDirs.set(dir, dirName);
    }
  }
  const lwc = [...lwcDirs.entries()].map(([dir, name]) => ({ name, dir }));

  return { agentScripts, flows, apex, lwc };
}
