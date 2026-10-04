import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/** Extracts the leading /** ... *\/ JSDoc-style comment above the class, if any. */
function extractHeaderComment(js) {
  const m = js.match(/\/\*\*([\s\S]*?)\*\//);
  if (!m) return null;
  return m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .filter((l) => l.length > 0)
    .join(" ");
}

function extractDecoratedFields(js, decorator) {
  const re = new RegExp(`@${decorator}(?:\\(([^)]*)\\))?\\s+(\\w+)`, "g");
  const out = [];
  let m;
  while ((m = re.exec(js))) {
    out.push({ name: m[2], options: m[1] || null });
  }
  return out;
}

function extractWireAdapters(js) {
  const re = /@wire\(([^,)]+)(?:,\s*([\s\S]*?))?\)\s+(\w+)/g;
  const out = [];
  let m;
  while ((m = re.exec(js))) {
    out.push({ property: m[3], adapter: m[1].trim() });
  }
  return out;
}

function extractClassName(js) {
  const m = js.match(/export\s+default\s+class\s+(\w+)\s+extends\s+(\w+)/);
  return m ? { name: m[1], extends: m[2] } : null;
}

function extractMethods(js) {
  // Public (non-underscore-prefixed) class methods, excluding lifecycle hooks & getters/setters already captured elsewhere.
  const lifecycle = new Set([
    "constructor",
    "connectedCallback",
    "disconnectedCallback",
    "renderedCallback",
    "errorCallback",
    "render"
  ]);
  const re = /^\s{2,}(?:@api\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm;
  const out = [];
  let m;
  while ((m = re.exec(js))) {
    const name = m[1];
    if (lifecycle.has(name) || name.startsWith("_")) continue;
    if (["get", "set", "if", "for", "while", "switch", "catch"].includes(name)) continue;
    out.push({ name, params: m[2].trim() });
  }
  return out;
}

function extractDispatchedEvents(js) {
  const re = /new CustomEvent\(\s*['"`]([\w-]+)['"`]/g;
  const out = new Set();
  let m;
  while ((m = re.exec(js))) out.add(m[1]);
  return [...out];
}

function extractImports(js) {
  const re = /import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const out = [];
  let m;
  while ((m = re.exec(js))) out.push(m[1]);
  return out;
}

/**
 * Parses an LWC bundle directory into a normalized, documentation-friendly
 * structure: public API surface, wire adapters, events, and target config
 * pulled from the *.js-meta.xml.
 */
export function parseLwc({ name, dir }) {
  const jsPath = path.join(dir, `${name}.js`);
  const metaPath = path.join(dir, `${name}.js-meta.xml`);
  const htmlPath = path.join(dir, `${name}.html`);

  const js = readIfExists(jsPath) || "";
  const metaXml = readIfExists(metaPath);
  const html = readIfExists(htmlPath) || "";

  let meta = {};
  if (metaXml) {
    try {
      const parsed = xmlParser.parse(metaXml);
      meta = parsed?.LightningComponentBundle || {};
    } catch {
      meta = {};
    }
  }

  const targets = meta.targets?.target
    ? Array.isArray(meta.targets.target)
      ? meta.targets.target
      : [meta.targets.target]
    : [];

  const cls = extractClassName(js);

  return {
    type: "Lightning Web Component",
    filePath: dir,
    name,
    description: extractHeaderComment(js) || meta.description || null,
    isExposed: meta.isExposed === true || meta.isExposed === "true",
    apiVersion: meta.apiVersion ?? null,
    targets,
    extendsClass: cls ? cls.extends : "LightningElement",
    apiProperties: extractDecoratedFields(js, "api"),
    trackedProperties: extractDecoratedFields(js, "track"),
    wireAdapters: extractWireAdapters(js),
    publicMethods: extractMethods(js),
    eventsDispatched: extractDispatchedEvents(js),
    imports: extractImports(js).filter((i) => !i.startsWith("lwc")),
    hasTemplate: html.length > 0
  };
}
