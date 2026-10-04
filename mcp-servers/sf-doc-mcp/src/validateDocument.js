import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This server lives at mcp-servers/sf-doc-mcp/src/ inside TOOLS_AGENTFORCE; the
// doc-harness skill (and its comprehension linter) lives as a sibling under
// .claude/skills/. Kept as a *default*, never hardcoded elsewhere -- callers in a
// different repo layout pass `linterPath` explicitly instead of relying on this.
const DEFAULT_LINTER_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  ".claude",
  "skills",
  "doc-harness",
  "scripts",
  "comprehension_linter.py"
);

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function runPython(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [scriptPath, ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      reject(new Error(`No se pudo ejecutar python3: ${err.message}`));
    });
    child.on("close", (code) => {
      // A non-zero exit here is the linter's own PASS/FAIL signal, not a tool
      // execution failure -- resolve either way and let the caller read `code`.
      resolve({ stdout, stderr, code });
    });
  });
}

/**
 * Runs the doc-harness comprehension linter (a Python script bundled with the
 * skill, not reimplemented here) against a DOCU.md and returns its structured
 * pass/fail result. This function does zero content judgement itself -- it is
 * a thin process wrapper so the same linter is callable from MCP (e.g. a CI
 * step, or a client that isn't Claude Code) without duplicating its logic.
 */
export async function validateDocument({ markdownPath, linterPath, minSectionLines, minCaptionWords }) {
  if (!markdownPath) {
    throw new Error("markdownPath es obligatorio.");
  }
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No se encuentra el fichero Markdown: ${markdownPath}`);
  }

  const resolvedLinterPath = linterPath || DEFAULT_LINTER_PATH;
  if (!(await fileExists(resolvedLinterPath))) {
    throw new Error(
      `No se encuentra el linter de comprensión en: ${resolvedLinterPath}. ` +
        `Pasa 'linterPath' explícito si comprehension_linter.py vive en otro sitio ` +
        `(por ejemplo, en un repo que no sigue la misma estructura que TOOLS_AGENTFORCE).`
    );
  }

  const args = [markdownPath];
  if (minSectionLines != null) args.push("--min-section-lines", String(minSectionLines));
  if (minCaptionWords != null) args.push("--min-caption-words", String(minCaptionWords));

  const { stdout, stderr, code } = await runPython(resolvedLinterPath, args);

  return {
    passed: code === 0,
    exitCode: code,
    output: stdout.trim() || stderr.trim(),
    linterPath: resolvedLinterPath
  };
}
