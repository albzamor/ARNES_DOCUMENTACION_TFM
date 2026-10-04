import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  AlignmentType,
  PageBreak
} from "docx";
import path from "node:path";
import {
  considerationsForAgentScript,
  considerationsForLwc,
  considerationsForFlow,
  considerationsForApex
} from "./markdown.js";

// Salesforce-blue accent, used consistently across every generated document.
const SF_BLUE = "0176D3";
const SF_DARK = "032D60";
const SF_GREY = "F3F3F3";

function h(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: level === HeadingLevel.HEADING_1 ? SF_DARK : SF_BLUE })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: text ?? "", italics: !!opts.italic })]
  });
}

function bullets(items) {
  if (!items.length) return [p("None.", { italic: true })];
  return items.map((i) => new Paragraph({ text: i, bullet: { level: 0 }, spacing: { after: 60 } }));
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.header ? { fill: SF_BLUE, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? "—"), bold: !!opts.header, color: opts.header ? "FFFFFF" : undefined })]
      })
    ]
  });
}

function dataTable(headers, rows) {
  if (!rows.length) return p("None.", { italic: true });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((hd) => cell(hd, { header: true })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) }))
    ]
  });
}

function sectionLabel(text) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, color: SF_DARK, size: 22 })]
  });
}

// ---------- Per-type sections ----------

function agentScriptSection(doc) {
  const el = [];
  el.push(h(doc.label || doc.name || path.basename(doc.filePath), HeadingLevel.HEADING_2));
  el.push(p(`Agent Script  •  Developer Name: ${doc.name || "—"}  •  File: ${doc.filePath}`, { italic: true }));
  el.push(sectionLabel("Overview"));
  el.push(p(doc.description || "No description was provided in the source .agent file."));
  el.push(sectionLabel("Considerations"));
  el.push(...bullets(considerationsForAgentScript(doc)));
  el.push(sectionLabel("Config Reference"));
  el.push(
    dataTable(
      ["Field", "Value"],
      [
        ["Agent Type", doc.agentType || "—"],
        ["Welcome Message", doc.welcomeMessage || "—"],
        ["Error Message", doc.errorMessage || "—"],
        ["Instructions", doc.instructions || "—"],
        ["Connections", doc.connections.join(", ") || "—"]
      ]
    )
  );
  if (doc.variables.length) {
    el.push(sectionLabel("Variables"));
    el.push(
      dataTable(
        ["Name", "Kind", "Type", "Default/Source", "Description"],
        doc.variables.map((v) => [v.name, v.kind || "—", v.dataType || "—", v.defaultValue ?? v.source ?? "—", v.description || "—"])
      )
    );
  }
  if (doc.subagents.length) {
    el.push(sectionLabel("Subagents"));
    el.push(
      dataTable(
        ["Name", "Description", "Defined Actions", "Reasoning Actions"],
        doc.subagents.map((s) => [s.name, s.description || "—", s.definedActions.map((a) => a.name).join(", ") || "—", s.reasoningActions.join(", ") || "—"])
      )
    );
  }
  return el;
}

function lwcSection(doc) {
  const el = [];
  el.push(h(`c-${doc.name}`, HeadingLevel.HEADING_2));
  el.push(p(`Lightning Web Component  •  Folder: ${doc.filePath}`, { italic: true }));
  el.push(sectionLabel("Overview"));
  el.push(p(doc.description || "No description was provided in the component source."));
  el.push(sectionLabel("Considerations"));
  el.push(...bullets(considerationsForLwc(doc)));
  el.push(sectionLabel("Reference"));
  el.push(
    dataTable(
      ["Field", "Value"],
      [
        ["Extends", doc.extendsClass],
        ["Exposed", doc.isExposed ? "Yes" : "No"],
        ["Targets", doc.targets.join(", ") || "—"]
      ]
    )
  );
  if (doc.apiProperties.length) {
    el.push(sectionLabel("Public Properties (@api)"));
    el.push(dataTable(["Property", "Notes"], doc.apiProperties.map((a) => [a.name, a.options || "—"])));
  }
  if (doc.publicMethods.length) {
    el.push(sectionLabel("Public Methods"));
    el.push(dataTable(["Method", "Parameters"], doc.publicMethods.map((m) => [`${m.name}()`, m.params || "—"])));
  }
  if (doc.eventsDispatched.length) {
    el.push(sectionLabel("Events Dispatched"));
    el.push(...bullets(doc.eventsDispatched));
  }
  return el;
}

function flowSection(doc) {
  const el = [];
  el.push(h(doc.name, HeadingLevel.HEADING_2));
  el.push(p(`Flow  •  API Name: ${doc.apiName}  •  File: ${doc.filePath}`, { italic: true }));
  el.push(sectionLabel("Overview"));
  el.push(p(doc.description || "No description was provided on this Flow."));
  el.push(sectionLabel("Considerations"));
  el.push(...bullets(considerationsForFlow(doc)));
  el.push(sectionLabel("Reference"));
  el.push(
    dataTable(
      ["Field", "Value"],
      [
        ["Process Type", doc.processType || "—"],
        ["Status", doc.status || "—"],
        ["Trigger Type", doc.triggerType || "—"]
      ]
    )
  );
  if (doc.variables.length) {
    el.push(sectionLabel("Variables"));
    el.push(dataTable(["Name", "Data Type", "Input", "Output"], doc.variables.map((v) => [v.name, v.dataType, v.isInput ? "Yes" : "No", v.isOutput ? "Yes" : "No"])));
  }
  const entries = Object.entries(doc.elementSummary);
  if (entries.length) {
    el.push(sectionLabel("Elements"));
    el.push(dataTable(["Element Type", "Labels"], entries.map(([label, items]) => [label, items.join(", ")])));
  }
  return el;
}

function apexSection(doc) {
  const el = [];
  el.push(h(doc.name, HeadingLevel.HEADING_2));
  el.push(p(`Apex Class  •  File: ${doc.filePath}`, { italic: true }));
  el.push(sectionLabel("Overview"));
  el.push(p(doc.description || "No description was provided for this class."));
  el.push(sectionLabel("Considerations"));
  el.push(...bullets(considerationsForApex(doc)));
  el.push(sectionLabel("Reference"));
  el.push(
    dataTable(
      ["Field", "Value"],
      [
        ["Access Modifier", doc.accessModifier || "—"],
        ["Sharing Model", doc.sharingModel || "—"],
        ["Test Class", doc.isTestClass ? "Yes" : "No"]
      ]
    )
  );
  if (doc.methods.length) {
    el.push(sectionLabel("Methods"));
    el.push(
      dataTable(
        ["Signature", "Access", "Returns", "Description"],
        doc.methods.map((m) => [`${m.name}(${m.params})`, m.accessModifier, m.returnType, m.description || "—"])
      )
    );
  }
  return el;
}

const SECTION_BUILDERS = {
  "Agent Script": agentScriptSection,
  "Lightning Web Component": lwcSection,
  Flow: flowSection,
  "Apex Class": apexSection
};

/**
 * Builds the full project documentation as a .docx Buffer, using the same
 * fixed structure and section order every time this is run.
 *
 * `featureMeta` (optional) = { context, notFound }, same contract as in
 * render/markdown.js.
 */
export async function renderProjectDocx(projectName, groups, generatedAt, featureMeta) {
  const order = ["Agent Script", "Lightning Web Component", "Flow", "Apex Class"];
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: projectName, bold: true, size: 56, color: SF_DARK })]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [new TextRun({ text: "Technical Documentation", size: 32, color: SF_BLUE, bold: true })]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `Generated automatically on ${generatedAt}`, italics: true, color: "706E6B" })]
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  if (featureMeta?.context) {
    children.push(h("Overview", HeadingLevel.HEADING_1));
    children.push(p(featureMeta.context));
  }
  if (featureMeta?.notFound?.length) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "⚠ Componentes declarados y no encontrados en el proyecto", bold: true, color: "BA0517" })]
      })
    );
    children.push(
      ...featureMeta.notFound.map(
        (nf) => new Paragraph({ text: `${nf.type ? `${nf.type}: ` : ""}${nf.name || "(sin nombre)"} — ${nf.reason}`, bullet: { level: 0 } })
      )
    );
  }

  for (const type of order) {
    const items = groups[type] || [];
    if (!items.length) continue;
    children.push(h(type, HeadingLevel.HEADING_1));
    for (const item of items) {
      children.push(...SECTION_BUILDERS[type](item));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 }
        }
      }
    },
    sections: [{ properties: {}, children }]
  });

  return Packer.toBuffer(doc);
}
