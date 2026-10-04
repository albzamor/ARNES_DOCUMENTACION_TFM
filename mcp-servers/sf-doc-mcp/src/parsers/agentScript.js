import fs from "node:fs";

/** Returns the number of leading whitespace characters of a line. */
function indentOf(line) {
  return line.match(/^(\s*)/)[1].length;
}

function cleanValue(raw) {
  if (raw == null) return null;
  let val = raw.trim();
  if (val === "") return null;
  const quoted = val.match(/^"([^"]*)"/);
  if (quoted) return quoted[1];
  const hashIdx = val.indexOf(" #");
  if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
  if (val === "|" || val === "->" || val === "" ) return null;
  return val || null;
}

const KEY_LINE = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(?:\s+([A-Za-z_][A-Za-z0-9_]*))?\s*:(.*)$/;

/**
 * Given the raw lines of an Agent Script file, returns every direct child
 * key found under a block whose header sits at `headerIndent`.
 * Handles both `key: value` and `key name: value` (subagent/start_agent) forms.
 */
function getChildren(lines, startIdx, headerIndent) {
  let i = startIdx;
  let minIndent = null;
  const children = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }
    const ind = indentOf(line);
    if (ind <= headerIndent) break;
    if (minIndent === null) minIndent = ind;
    if (ind === minIndent) {
      const m = line.match(KEY_LINE);
      if (m) {
        children.push({
          key: m[2],
          name: m[3] || null,
          value: cleanValue(m[4]),
          lineIndex: i,
          indent: ind
        });
      }
    }
    i++;
  }
  return { children, endIdx: i };
}

/** Collects a raw, best-effort text block (used for free-form instructions). */
function collectRawBlock(lines, startIdx, headerIndent) {
  let i = startIdx;
  const collected = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed !== "" && indentOf(line) <= headerIndent) break;
    if (trimmed !== "" && !trimmed.startsWith("#")) {
      collected.push(trimmed.replace(/^\|\s?/, ""));
    }
    i++;
  }
  return collected.length ? collected.join("\n") : null;
}

function extractAgentBlock(lines, header) {
  const { children } = getChildren(lines, header.lineIndex + 1, header.indent);
  const descChild = children.find((c) => c.key === "description");
  const actionsChild = children.find((c) => c.key === "actions");
  const reasoningChild = children.find((c) => c.key === "reasoning");
  const afterReasoningChild = children.find((c) => c.key === "after_reasoning");

  let definedActions = [];
  if (actionsChild) {
    const { children: ac } = getChildren(lines, actionsChild.lineIndex + 1, actionsChild.indent);
    definedActions = ac.map((a) => {
      const { children: fields } = getChildren(lines, a.lineIndex + 1, a.indent);
      const target = fields.find((f) => f.key === "target");
      const desc = fields.find((f) => f.key === "description");
      return { name: a.key, target: target ? target.value : null, description: desc ? desc.value : null };
    });
  }

  let reasoningInstructions = null;
  let reasoningActions = [];
  if (reasoningChild) {
    const { children: rc } = getChildren(lines, reasoningChild.lineIndex + 1, reasoningChild.indent);
    const instrChild = rc.find((c) => c.key === "instructions");
    if (instrChild) {
      reasoningInstructions = collectRawBlock(lines, instrChild.lineIndex + 1, instrChild.indent);
    }
    const raChild = rc.find((c) => c.key === "actions");
    if (raChild) {
      const { children: rac } = getChildren(lines, raChild.lineIndex + 1, raChild.indent);
      reasoningActions = rac.map((a) => a.key);
    }
  }

  return {
    name: header.name,
    description: descChild ? descChild.value : null,
    definedActions,
    reasoningInstructions,
    reasoningActions,
    hasAfterReasoning: !!afterReasoningChild
  };
}

/**
 * Parses a Salesforce Agent Script (.agent) file into a normalized,
 * documentation-friendly structure. This is a best-effort static parser
 * built from the public Agent Script block-ordering rules -- it favors
 * extracting documentable structure over full language compliance.
 */
export function parseAgentScript(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);
  const { children: top } = getChildren(lines, 0, -1);

  const doc = {
    type: "Agent Script",
    filePath,
    name: null,
    label: null,
    description: null,
    agentType: null,
    defaultAgentUser: null,
    welcomeMessage: null,
    errorMessage: null,
    instructions: null,
    variables: [],
    connections: [],
    hasKnowledge: false,
    hasLanguage: false,
    startAgent: null,
    subagents: []
  };

  for (const child of top) {
    if (child.key === "config") {
      const { children: cfg } = getChildren(lines, child.lineIndex + 1, child.indent);
      for (const c of cfg) {
        if (c.key === "developer_name") doc.name = c.value;
        if (c.key === "agent_label") doc.label = c.value;
        if (c.key === "description") doc.description = c.value;
        if (c.key === "agent_type") doc.agentType = c.value;
        if (c.key === "default_agent_user") doc.defaultAgentUser = c.value;
      }
    } else if (child.key === "variables") {
      const { children: vars } = getChildren(lines, child.lineIndex + 1, child.indent);
      for (const v of vars) {
        const m = (v.value || "").match(/(mutable|linked)\s+([\w[\]]+)(?:\s*=\s*(.*))?/);
        const { children: sub } = getChildren(lines, v.lineIndex + 1, v.indent);
        const descC = sub.find((s) => s.key === "description");
        const srcC = sub.find((s) => s.key === "source");
        doc.variables.push({
          name: v.key,
          kind: m ? m[1] : null,
          dataType: m ? m[2] : null,
          defaultValue: m && m[3] ? m[3].trim() : null,
          description: descC ? descC.value : null,
          source: srcC ? srcC.value : null
        });
      }
    } else if (child.key === "system") {
      const { children: sys } = getChildren(lines, child.lineIndex + 1, child.indent);
      const messagesC = sys.find((s) => s.key === "messages");
      if (messagesC) {
        const { children: msgs } = getChildren(lines, messagesC.lineIndex + 1, messagesC.indent);
        const w = msgs.find((s) => s.key === "welcome");
        const e = msgs.find((s) => s.key === "error");
        if (w) doc.welcomeMessage = w.value;
        if (e) doc.errorMessage = e.value;
      }
      const instrC = sys.find((s) => s.key === "instructions");
      if (instrC) {
        doc.instructions = instrC.value || collectRawBlock(lines, instrC.lineIndex + 1, instrC.indent);
      }
    } else if (child.key === "connections") {
      const { children: conns } = getChildren(lines, child.lineIndex + 1, child.indent);
      doc.connections = conns.map((c) => c.key);
    } else if (child.key === "knowledge") {
      doc.hasKnowledge = true;
    } else if (child.key === "language") {
      doc.hasLanguage = true;
    } else if (child.key === "start_agent") {
      doc.startAgent = extractAgentBlock(lines, child);
    } else if (child.key === "subagent") {
      doc.subagents.push(extractAgentBlock(lines, child));
    }
  }

  return doc;
}
