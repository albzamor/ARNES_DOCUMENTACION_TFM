import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const ELEMENT_TAGS = {
  screens: "Screen element(s)",
  decisions: "Decision element(s)",
  assignments: "Assignment element(s)",
  loops: "Loop element(s)",
  recordCreates: "Record Create element(s)",
  recordUpdates: "Record Update element(s)",
  recordLookups: "Record Lookup element(s)",
  recordDeletes: "Record Delete element(s)",
  actionCalls: "Action Call element(s)",
  subflows: "Subflow element(s)"
};

/**
 * Parses a Flow metadata file (*.flow-meta.xml) into a normalized,
 * documentation-friendly structure: trigger/process type, variables and
 * a summary of the elements that make up the flow.
 */
export function parseFlow(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const parsed = xmlParser.parse(xml);
  const flow = parsed?.Flow || {};

  const apiName = path.basename(filePath).replace(".flow-meta.xml", "");

  const variables = toArray(flow.variables).map((v) => ({
    name: v.name,
    dataType: v.dataType,
    isInput: v.isInput === true || v.isInput === "true",
    isOutput: v.isOutput === true || v.isOutput === "true",
    isCollection: v.isCollection === true || v.isCollection === "true"
  }));

  const elementSummary = {};
  for (const [tag, label] of Object.entries(ELEMENT_TAGS)) {
    const items = toArray(flow[tag]);
    if (items.length) {
      elementSummary[label] = items.map((i) => i.label || i.name).filter(Boolean);
    }
  }

  let startElementRef = null;
  let triggerType = null;
  if (flow.start) {
    startElementRef = flow.start.connector?.targetReference || null;
    triggerType = flow.start.triggerType || null;
  }

  return {
    type: "Flow",
    filePath,
    name: flow.label || apiName,
    apiName,
    description: flow.description || null,
    processType: flow.processType || null,
    status: flow.status || null,
    triggerType,
    startElementRef,
    variables,
    elementSummary
  };
}
