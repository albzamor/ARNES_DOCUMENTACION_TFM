const TYPE_ALIASES = {
  apex: "Apex Class",
  "apex class": "Apex Class",
  class: "Apex Class",
  lwc: "Lightning Web Component",
  "lightning web component": "Lightning Web Component",
  component: "Lightning Web Component",
  flow: "Flow",
  flows: "Flow",
  "agent script": "Agent Script",
  agentscript: "Agent Script",
  agent: "Agent Script"
};

/** Normalizes a free-typed type string ("apex", "LWC", "Agent Script"...) to a canonical type. */
export function normalizeType(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return TYPE_ALIASES[key] || null;
}

/**
 * Parses a small, human-written feature manifest:
 *
 * # Feature: Case Triage
 *
 * Free-text context describing what the feature does and why.
 *
 * ## Components
 * - Apex: CaseService
 * - LWC: caseSummary
 * - Flow: Case_Auto_Assign
 * - Agent Script: CaseTriage
 */
export function parseManifest(source) {
  const lines = source.split(/\r?\n/);

  let featureName = null;
  let contextLines = [];
  const components = [];
  const unknownComponentLines = [];

  let section = "header"; // header -> context -> components
  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^#\s+/.test(line) && featureName === null) {
      featureName = line.replace(/^#\s+/, "").replace(/^Feature:\s*/i, "").trim();
      section = "context";
      continue;
    }

    if (/^##\s+Components/i.test(line)) {
      section = "components";
      continue;
    }

    if (section === "context") {
      if (line.length) contextLines.push(line);
    } else if (section === "components") {
      if (!line || !line.startsWith("-")) continue;
      const item = line.replace(/^-+\s*/, "");
      const m = item.match(/^([^:]+):\s*(.+)$/);
      if (!m) {
        unknownComponentLines.push(item);
        continue;
      }
      const type = normalizeType(m[1]);
      const name = m[2].trim();
      if (!type) {
        unknownComponentLines.push(item);
        continue;
      }
      components.push({ type, name });
    }
  }

  return {
    featureName: featureName || "Untitled Feature",
    context: contextLines.join(" ").trim() || null,
    components,
    unknownComponentLines
  };
}

const SHORT_LABEL = {
  "Apex Class": "Apex",
  "Lightning Web Component": "LWC",
  Flow: "Flow",
  "Agent Script": "Agent Script"
};

/** Renders a manifest object back to the canonical Markdown manifest format. */
export function renderManifest({ featureName, context, components }) {
  const lines = [];
  lines.push(`# Feature: ${featureName}`);
  lines.push("");
  if (context) {
    lines.push(context);
    lines.push("");
  }
  lines.push("## Components");
  lines.push("");
  for (const c of components) {
    lines.push(`- ${SHORT_LABEL[c.type] || c.type}: ${c.name}`);
  }
  lines.push("");
  return lines.join("\n");
}
