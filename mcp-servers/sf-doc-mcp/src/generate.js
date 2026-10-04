import fs from "node:fs";
import path from "node:path";
import { scanProject } from "./scanner.js";
import { parseAgentScript } from "./parsers/agentScript.js";
import { parseLwc } from "./parsers/lwc.js";
import { parseFlow } from "./parsers/flow.js";
import { parseApex } from "./parsers/apex.js";
import { parseManifest, renderManifest } from "./parsers/manifest.js";
import { resolveComponents } from "./resolve.js";
import { renderProjectMarkdown } from "./render/markdown.js";
import { renderProjectDocx } from "./render/docx.js";

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "feature";
}

function nowStamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/**
 * Parses every file in a canonical-shaped file map ({ "Agent Script": [...],
 * "Lightning Web Component": [...], Flow: [...], "Apex Class": [...] })
 * into the documentation-friendly structures used by the renderers.
 */
function parseAndGroup(filesByType) {
  const groups = {
    "Agent Script": [],
    "Lightning Web Component": [],
    Flow: [],
    "Apex Class": []
  };
  const errors = [];

  for (const f of filesByType["Agent Script"] || []) {
    try {
      groups["Agent Script"].push(parseAgentScript(f));
    } catch (e) {
      errors.push({ file: f, error: e.message });
    }
  }
  for (const l of filesByType["Lightning Web Component"] || []) {
    try {
      groups["Lightning Web Component"].push(parseLwc(l));
    } catch (e) {
      errors.push({ file: l.dir, error: e.message });
    }
  }
  for (const f of filesByType.Flow || []) {
    try {
      groups.Flow.push(parseFlow(f));
    } catch (e) {
      errors.push({ file: f, error: e.message });
    }
  }
  for (const f of filesByType["Apex Class"] || []) {
    try {
      groups["Apex Class"].push(parseApex(f));
    } catch (e) {
      errors.push({ file: f, error: e.message });
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  return { groups, errors };
}

/**
 * Full-project mode: scans and documents EVERY recognized component found
 * anywhere in the project tree. Good for a complete audit / onboarding doc,
 * but will include legacy components you didn't touch.
 */
export async function generateDocumentation({ projectPath, outputPath, projectName }) {
  const resolvedProject = path.resolve(projectPath);
  if (!fs.existsSync(resolvedProject)) {
    throw new Error(`Project path not found: ${resolvedProject}`);
  }
  const resolvedOutput = path.resolve(outputPath || path.join(resolvedProject, "docs"));
  fs.mkdirSync(resolvedOutput, { recursive: true });

  const found = scanProject(resolvedProject);
  const filesByType = {
    "Agent Script": found.agentScripts,
    "Lightning Web Component": found.lwc,
    Flow: found.flows,
    "Apex Class": found.apex
  };
  const { groups, errors } = parseAndGroup(filesByType);

  const name = projectName || path.basename(resolvedProject);
  const generatedAt = nowStamp();

  const markdown = renderProjectMarkdown(name, groups, generatedAt);
  const markdownPath = path.join(resolvedOutput, "DOCUMENTATION.md");
  fs.writeFileSync(markdownPath, markdown, "utf8");

  const docxBuffer = await renderProjectDocx(name, groups, generatedAt);
  const docxPath = path.join(resolvedOutput, "DOCUMENTATION.docx");
  fs.writeFileSync(docxPath, docxBuffer);

  const stats = {
    agentScripts: groups["Agent Script"].length,
    lwc: groups["Lightning Web Component"].length,
    flows: groups.Flow.length,
    apex: groups["Apex Class"].length,
    errors
  };

  return { markdownPath, docxPath, stats };
}

/**
 * Feature mode: you give the exact list of components that make up a
 * feature (manually, or via a saved manifest.md) plus a short human
 * description of what the feature does. The project tree is still scanned
 * (so components can live anywhere in the standard SFDX folders), but only
 * the requested components are resolved, parsed, and documented -- anything
 * requested but not found is reported instead of silently skipped.
 *
 * Accepts either:
 *   - manifestPath: path to an existing manifest.md (feature name + context + components), or
 *   - featureName + components (+ optional featureContext) passed directly.
 * If both are given, the explicit params win and the manifest is only used as a fallback.
 */
export async function generateFeatureDocumentation({
  projectPath,
  outputPath,
  manifestPath,
  featureName,
  featureContext,
  components
}) {
  const resolvedProject = path.resolve(projectPath);
  if (!fs.existsSync(resolvedProject)) {
    throw new Error(`Project path not found: ${resolvedProject}`);
  }

  let name = featureName;
  let context = featureContext;
  let componentList = components;

  if (manifestPath) {
    const manifestSource = fs.readFileSync(path.resolve(manifestPath), "utf8");
    const manifest = parseManifest(manifestSource);
    name = name || manifest.featureName;
    context = context || manifest.context;
    componentList = componentList && componentList.length ? componentList : manifest.components;
  }

  if (!name) throw new Error("Falta featureName (o un manifestPath que lo incluya).");
  if (!componentList || !componentList.length) {
    throw new Error(
      "No se especificaron componentes. Da la lista de componentes (tipo + nombre) o un manifestPath que la incluya."
    );
  }

  const resolvedOutput = path.resolve(outputPath || path.join(resolvedProject, "docs", slugify(name)));
  fs.mkdirSync(resolvedOutput, { recursive: true });

  const found = scanProject(resolvedProject);
  const { resolved, notFound } = resolveComponents(found, componentList);
  const { groups, errors } = parseAndGroup(resolved);

  const generatedAt = nowStamp();
  const featureMeta = { context, notFound };

  // Persist the manifest actually used, so re-runs (or future edits) don't
  // require re-typing everything -- this is the "pequeño md" that captures
  // human context alongside the component list.
  const finalManifestPath = path.join(resolvedOutput, "manifest.md");
  fs.writeFileSync(finalManifestPath, renderManifest({ featureName: name, context, components: componentList }), "utf8");

  const markdown = renderProjectMarkdown(name, groups, generatedAt, featureMeta);
  const markdownPath = path.join(resolvedOutput, "DOCUMENTATION.md");
  fs.writeFileSync(markdownPath, markdown, "utf8");

  const docxBuffer = await renderProjectDocx(name, groups, generatedAt, featureMeta);
  const docxPath = path.join(resolvedOutput, "DOCUMENTATION.docx");
  fs.writeFileSync(docxPath, docxBuffer);

  const stats = {
    requested: componentList.length,
    resolved: componentList.length - notFound.length,
    notFound: notFound.length,
    agentScripts: groups["Agent Script"].length,
    lwc: groups["Lightning Web Component"].length,
    flows: groups.Flow.length,
    apex: groups["Apex Class"].length,
    errors
  };

  return { markdownPath, docxPath, manifestPath: finalManifestPath, notFound, stats };
}
