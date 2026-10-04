import path from "node:path";
import { normalizeType } from "./parsers/manifest.js";

/**
 * Matches a manually-provided list of components ({type, name}) against
 * everything the scanner found in the project, by filename/folder-name
 * convention (which Salesforce already enforces: LWC folder name ==
 * component name, Apex file name == class name, Flow file name == API name).
 *
 * Returns:
 *   resolved: { "Agent Script": [...], "Lightning Web Component": [...], Flow: [...], "Apex Class": [...] }
 *   notFound: [{ type, name, reason }]
 */
export function resolveComponents(found, requested) {
  const resolved = {
    "Agent Script": [],
    "Lightning Web Component": [],
    Flow: [],
    "Apex Class": []
  };
  const notFound = [];

  for (const req of requested) {
    const type = normalizeType(req.type);
    const wantedName = (req.name || "").trim().toLowerCase();

    if (!type || !(type in resolved)) {
      notFound.push({ ...req, reason: `Tipo de componente no reconocido: "${req.type}".` });
      continue;
    }
    if (!wantedName) {
      notFound.push({ ...req, reason: "Nombre vacío." });
      continue;
    }

    let match = null;
    if (type === "Apex Class") {
      match = found.apex.find((f) => path.basename(f, ".cls").toLowerCase() === wantedName);
    } else if (type === "Flow") {
      match = found.flows.find((f) => path.basename(f, ".flow-meta.xml").toLowerCase() === wantedName);
    } else if (type === "Lightning Web Component") {
      match = found.lwc.find((l) => l.name.toLowerCase() === wantedName);
    } else if (type === "Agent Script") {
      match = found.agentScripts.find((f) => path.basename(f, ".agent").toLowerCase() === wantedName);
    }

    if (match) {
      resolved[type].push(match);
    } else {
      notFound.push({
        ...req,
        reason: `No se encontró ningún ${type} llamado "${req.name}" en el proyecto.`
      });
    }
  }

  return { resolved, notFound };
}
