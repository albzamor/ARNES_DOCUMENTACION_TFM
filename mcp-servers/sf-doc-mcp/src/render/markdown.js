import path from "node:path";

function esc(s) {
  return s == null ? "" : String(s);
}

function bulletList(items) {
  if (!items || !items.length) return "_None._";
  return items.map((i) => `- ${i}`).join("\n");
}

function table(headers, rows) {
  if (!rows.length) return "_None._";
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map((c) => esc(c).replace(/\n/g, "<br/>") || "—").join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

function overviewBlock(description, fallback) {
  return description && description.trim() ? description.trim() : fallback;
}

// ---------- Agent Script ----------

function considerationsForAgentScript(doc) {
  const notes = [];
  if (!doc.description) notes.push("No `description` set in `config` — add one so the agent's purpose is discoverable in Setup.");
  if (!doc.welcomeMessage) notes.push("No `welcome` message defined in `system.messages`.");
  if (!doc.errorMessage) notes.push("No `error` message defined in `system.messages` — the agent will fall back to a default.");
  const undocVars = doc.variables.filter((v) => !v.description);
  if (undocVars.length) notes.push(`${undocVars.length} variable(s) have no \`description\`: ${undocVars.map((v) => `\`${v.name}\``).join(", ")}.`);
  const undocSubagents = doc.subagents.filter((s) => !s.description);
  if (undocSubagents.length) notes.push(`${undocSubagents.length} subagent(s) have no \`description\`: ${undocSubagents.map((s) => `\`${s.name}\``).join(", ")}.`);
  if (!doc.subagents.length) notes.push("No `subagent` blocks found.");
  return notes;
}

function renderAgentScript(doc) {
  const lines = [];
  lines.push(`### ${doc.label || doc.name || path.basename(doc.filePath)}`);
  lines.push("");
  lines.push(`**Type:** Agent Script &nbsp;|&nbsp; **Developer Name:** \`${doc.name || "—"}\` &nbsp;|&nbsp; **File:** \`${doc.filePath}\``);
  lines.push("");
  lines.push("#### Overview");
  lines.push(overviewBlock(doc.description, "_No description was provided in the source `.agent` file._"));
  lines.push("");
  lines.push("#### Considerations");
  lines.push(bulletList(considerationsForAgentScript(doc)));
  lines.push("");
  lines.push("#### Reference");
  lines.push("");
  lines.push("**Config**");
  lines.push("");
  lines.push(
    table(
      ["Field", "Value"],
      [
        ["Agent Type", doc.agentType || "—"],
        ["Default Agent User", doc.defaultAgentUser || "—"],
        ["Welcome Message", doc.welcomeMessage || "—"],
        ["Error Message", doc.errorMessage || "—"],
        ["Instructions", doc.instructions || "—"],
        ["Connections", doc.connections.length ? doc.connections.join(", ") : "—"],
        ["Knowledge configured", doc.hasKnowledge ? "Yes" : "No"],
        ["Language block configured", doc.hasLanguage ? "Yes" : "No"]
      ]
    )
  );
  lines.push("");
  if (doc.variables.length) {
    lines.push("**Variables**");
    lines.push("");
    lines.push(
      table(
        ["Name", "Kind", "Type", "Default / Source", "Description"],
        doc.variables.map((v) => [v.name, v.kind || "—", v.dataType || "—", v.defaultValue ?? v.source ?? "—", v.description || "—"])
      )
    );
    lines.push("");
  }
  if (doc.startAgent) {
    lines.push("**Start Agent (entry point)**");
    lines.push("");
    lines.push(
      table(
        ["Field", "Value"],
        [
          ["Name", doc.startAgent.name || "—"],
          ["Description", doc.startAgent.description || "—"],
          ["Actions available in reasoning", doc.startAgent.reasoningActions.join(", ") || "—"]
        ]
      )
    );
    lines.push("");
  }
  if (doc.subagents.length) {
    lines.push("**Subagents**");
    lines.push("");
    lines.push(
      table(
        ["Name", "Description", "Defined Actions", "Reasoning Actions", "after_reasoning?"],
        doc.subagents.map((s) => [
          s.name,
          s.description || "—",
          s.definedActions.map((a) => a.name).join(", ") || "—",
          s.reasoningActions.join(", ") || "—",
          s.hasAfterReasoning ? "Yes" : "No"
        ])
      )
    );
    lines.push("");
  }
  lines.push("#### Example");
  lines.push("```agentscript");
  lines.push(`config:`);
  lines.push(`   developer_name: "${doc.name || "MyAgent"}"`);
  lines.push("```");
  lines.push("_Reference to how this agent is configured; see the file above for the full definition._");
  return lines.join("\n");
}

// ---------- LWC ----------

function considerationsForLwc(doc) {
  const notes = [];
  if (!doc.description) notes.push("No header JSDoc comment (`/** ... */`) or `description` found — add one at the top of the JS controller.");
  if (!doc.apiProperties.length && !doc.publicMethods.length) notes.push("No public `@api` surface detected — this component may only be usable standalone, not composable from a parent.");
  if (!doc.isExposed) notes.push("`isExposed` is not `true` in the `.js-meta.xml` — this component will not appear in Lightning App Builder / Experience Builder.");
  return notes;
}

function renderLwc(doc) {
  const lines = [];
  lines.push(`### c-${doc.name}`);
  lines.push("");
  lines.push(`**Type:** Lightning Web Component &nbsp;|&nbsp; **Folder:** \`${doc.filePath}\``);
  lines.push("");
  lines.push("#### Overview");
  lines.push(overviewBlock(doc.description, "_No description was provided in the component source._"));
  lines.push("");
  lines.push("#### Considerations");
  lines.push(bulletList(considerationsForLwc(doc)));
  lines.push("");
  lines.push("#### Reference");
  lines.push("");
  lines.push(
    table(
      ["Field", "Value"],
      [
        ["Extends", doc.extendsClass],
        ["Exposed to App/Experience Builder", doc.isExposed ? "Yes" : "No"],
        ["API Version", doc.apiVersion ?? "—"],
        ["Targets", doc.targets.join(", ") || "—"]
      ]
    )
  );
  lines.push("");
  if (doc.apiProperties.length) {
    lines.push("**Public Properties (`@api`)**");
    lines.push("");
    lines.push(table(["Property", "Notes"], doc.apiProperties.map((p) => [p.name, p.options || "—"])));
    lines.push("");
  }
  if (doc.publicMethods.length) {
    lines.push("**Public Methods**");
    lines.push("");
    lines.push(table(["Method", "Parameters"], doc.publicMethods.map((m) => [`${m.name}()`, m.params || "—"])));
    lines.push("");
  }
  if (doc.wireAdapters.length) {
    lines.push("**Wire Adapters**");
    lines.push("");
    lines.push(table(["Property", "Adapter"], doc.wireAdapters.map((w) => [w.property, w.adapter])));
    lines.push("");
  }
  if (doc.eventsDispatched.length) {
    lines.push("**Events Dispatched**");
    lines.push("");
    lines.push(bulletList(doc.eventsDispatched.map((e) => `\`${e}\``)));
    lines.push("");
  }
  if (doc.imports.length) {
    lines.push("**Dependencies**");
    lines.push("");
    lines.push(bulletList(doc.imports.map((i) => `\`${i}\``)));
    lines.push("");
  }
  lines.push("#### Example");
  lines.push("```html");
  const attrs = doc.apiProperties.map((p) => ` ${p.name.replace(/([A-Z])/g, "-$1").toLowerCase()}="value"`).join("");
  lines.push(`<c-${doc.name}${attrs}></c-${doc.name}>`);
  lines.push("```");
  return lines.join("\n");
}

// ---------- Flow ----------

function considerationsForFlow(doc) {
  const notes = [];
  if (!doc.description) notes.push("No `description` found on the Flow — add one so admins understand its purpose from Setup.");
  if (doc.status && doc.status !== "Active") notes.push(`Flow status is \`${doc.status}\` — it will not run until activated.`);
  if (!Object.keys(doc.elementSummary).length) notes.push("No recognized elements found (screens, decisions, assignments, etc.) — verify this is a complete Flow.");
  return notes;
}

function renderFlow(doc) {
  const lines = [];
  lines.push(`### ${doc.name}`);
  lines.push("");
  lines.push(`**Type:** Flow &nbsp;|&nbsp; **API Name:** \`${doc.apiName}\` &nbsp;|&nbsp; **File:** \`${doc.filePath}\``);
  lines.push("");
  lines.push("#### Overview");
  lines.push(overviewBlock(doc.description, "_No description was provided on this Flow._"));
  lines.push("");
  lines.push("#### Considerations");
  lines.push(bulletList(considerationsForFlow(doc)));
  lines.push("");
  lines.push("#### Reference");
  lines.push("");
  lines.push(
    table(
      ["Field", "Value"],
      [
        ["Process Type", doc.processType || "—"],
        ["Status", doc.status || "—"],
        ["Trigger Type", doc.triggerType || "—"]
      ]
    )
  );
  lines.push("");
  if (doc.variables.length) {
    lines.push("**Variables**");
    lines.push("");
    lines.push(
      table(
        ["Name", "Data Type", "Input?", "Output?", "Collection?"],
        doc.variables.map((v) => [v.name, v.dataType, v.isInput ? "Yes" : "No", v.isOutput ? "Yes" : "No", v.isCollection ? "Yes" : "No"])
      )
    );
    lines.push("");
  }
  const elementEntries = Object.entries(doc.elementSummary);
  if (elementEntries.length) {
    lines.push("**Elements**");
    lines.push("");
    lines.push(table(["Element Type", "Labels"], elementEntries.map(([label, items]) => [label, items.join(", ")])));
    lines.push("");
  }
  lines.push("#### Example");
  lines.push(
    doc.processType === "AutoLaunchedFlow"
      ? "Invoke from Apex with `Flow.Interview.createInterview('" + doc.apiName + "', inputs).start();` or reference it as an Action target in Agent Script / Flow Builder."
      : "Launch from a Lightning page, Experience Builder page, or as a quick action, depending on how it is exposed."
  );
  return lines.join("\n");
}

// ---------- Apex ----------

function considerationsForApex(doc) {
  const notes = [];
  if (!doc.description) notes.push("No ApexDoc header comment (`/** ... */`) found above the class declaration.");
  if (doc.accessModifier === "private") notes.push("Class is `private` — it can only be used within the same file.");
  const undocMethods = doc.methods.filter((m) => (m.accessModifier === "public" || m.accessModifier === "global") && !m.description);
  if (undocMethods.length) notes.push(`${undocMethods.length} public/global method(s) have no ApexDoc comment: ${undocMethods.map((m) => `\`${m.name}\``).join(", ")}.`);
  if (!doc.sharingModel) notes.push("No sharing keyword (`with sharing` / `without sharing` / `inherited sharing`) declared — defaults to the caller's sharing context.");
  return notes;
}

function renderApex(doc) {
  const lines = [];
  lines.push(`### ${doc.name}`);
  lines.push("");
  lines.push(`**Type:** Apex Class &nbsp;|&nbsp; **File:** \`${doc.filePath}\``);
  lines.push("");
  lines.push("#### Overview");
  lines.push(overviewBlock(doc.description, "_No description was provided for this class._"));
  lines.push("");
  lines.push("#### Considerations");
  lines.push(bulletList(considerationsForApex(doc)));
  lines.push("");
  lines.push("#### Reference");
  lines.push("");
  lines.push(
    table(
      ["Field", "Value"],
      [
        ["Access Modifier", doc.accessModifier || "—"],
        ["Sharing Model", doc.sharingModel || "—"],
        ["Test Class", doc.isTestClass ? "Yes" : "No"]
      ]
    )
  );
  lines.push("");
  if (doc.methods.length) {
    lines.push("**Methods**");
    lines.push("");
    lines.push(
      table(
        ["Signature", "Access", "Returns", "Invocable?", "Description"],
        doc.methods.map((m) => [`${m.name}(${m.params})`, m.accessModifier, m.returnType, m.isInvocable ? "Yes" : "No", m.description || "—"])
      )
    );
    lines.push("");
  }
  if (doc.fields.length) {
    lines.push("**Fields**");
    lines.push("");
    lines.push(table(["Name", "Type", "Access"], doc.fields.map((f) => [f.name, f.type, f.accessModifier])));
    lines.push("");
  }
  lines.push("#### Example");
  lines.push("```apex");
  lines.push(`${doc.name} instance = new ${doc.name}();`);
  lines.push("```");
  return lines.join("\n");
}

const SECTION_RENDERERS = {
  "Agent Script": renderAgentScript,
  "Lightning Web Component": renderLwc,
  Flow: renderFlow,
  "Apex Class": renderApex
};

/**
 * Renders the full, consistent project documentation as a single
 * Markdown document, grouped by component type in a fixed order.
 *
 * `featureMeta` (optional) = { context, notFound } is used in feature mode:
 * `context` is the human-written description of the feature (becomes the
 * top-level Overview), and `notFound` lists requested components that
 * could not be located in the project tree.
 */
export function renderProjectMarkdown(projectName, groups, generatedAt, featureMeta) {
  const order = ["Agent Script", "Lightning Web Component", "Flow", "Apex Class"];
  const out = [];
  out.push(`# ${projectName} — Technical Documentation`);
  out.push("");
  out.push(`> Generated automatically from source on ${generatedAt}. Regenerate this file any time your Salesforce project changes — the structure and section order will always stay the same.`);
  out.push("");
  if (featureMeta?.context) {
    out.push("## Overview");
    out.push("");
    out.push(featureMeta.context);
    out.push("");
  }
  if (featureMeta?.notFound?.length) {
    out.push("> **⚠ Componentes declarados y no encontrados en el proyecto:**");
    for (const nf of featureMeta.notFound) {
      out.push(`> - ${nf.type ? `${nf.type}: ` : ""}${nf.name || "(sin nombre)"} — ${nf.reason}`);
    }
    out.push("");
  }
  out.push("## Table of Contents");
  out.push("");
  for (const type of order) {
    const items = groups[type] || [];
    if (!items.length) continue;
    out.push(`- **${type}**`);
    for (const item of items) {
      const label = item.label || item.name || path.basename(item.filePath);
      out.push(`  - [${label}](#${slug(label)})`);
    }
  }
  out.push("");
  out.push("---");
  out.push("");

  for (const type of order) {
    const items = groups[type] || [];
    if (!items.length) continue;
    out.push(`## ${type}`);
    out.push("");
    for (const item of items) {
      out.push(SECTION_RENDERERS[type](item));
      out.push("");
      out.push("---");
      out.push("");
    }
  }

  return out.join("\n");
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export { considerationsForAgentScript, considerationsForLwc, considerationsForFlow, considerationsForApex };
