import { spawn } from "node:child_process";
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileExists, findChromeExecutable } from "./chrome.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MMDC_BIN = path.join(__dirname, "..", "..", "node_modules", ".bin", "mmdc");
const DIAGRAM_PREFIX = "diagrama";

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      reject(new Error(`No se pudo ejecutar '${command}': ${err.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`'${command}' terminó con código ${code}.\n${stderr.trim() || stdout.trim()}`));
    });
  });
}

/**
 * Extracts every ```mermaid fenced diagram from a finished Markdown file and renders each one
 * as a standalone image file (PNG by default) in its own folder -- no Word/pandoc involved.
 * Uses `mmdc` (@mermaid-js/mermaid-cli, already bundled as a dependency of mermaid-filter)
 * directly against the .md file: mmdc extracts every chart in document order and numbers them
 * `diagrama-1.<ext>`, `diagrama-2.<ext>`, etc. Optionally renames them afterward via `names`.
 */
export async function exportMermaidDiagrams({
  markdownPath,
  outputDir,
  format = "png",
  width = 1600,
  scale = 2,
  theme = "default",
  background = "white",
  names
}) {
  if (!markdownPath) {
    throw new Error("markdownPath es obligatorio.");
  }
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No se encuentra el fichero Markdown: ${markdownPath}`);
  }
  if (!(await fileExists(MMDC_BIN))) {
    throw new Error(`No se encuentra 'mmdc' en node_modules/.bin. Ejecuta 'npm install' en el directorio de sf-doc-mcp.`);
  }
  if (!["png", "svg"].includes(format)) {
    throw new Error(`Formato no soportado: ${format}. Usa 'png' o 'svg'.`);
  }

  const resolvedOutputDir = outputDir || path.join(path.dirname(markdownPath), "4_diagramas");
  await mkdir(resolvedOutputDir, { recursive: true });

  const chrome = await findChromeExecutable();
  const env = { ...process.env };
  if (chrome) env.PUPPETEER_EXECUTABLE_PATH = chrome;

  const outputStub = path.join(resolvedOutputDir, `${DIAGRAM_PREFIX}.${format}`);
  const args = [
    "-i",
    markdownPath,
    "-o",
    outputStub,
    "-w",
    String(width),
    "-s",
    String(scale),
    "-t",
    theme,
    "-b",
    background
  ];

  try {
    await run(MMDC_BIN, args, { env });
  } catch (err) {
    throw new Error(
      `Fallo al exportar los diagramas Mermaid. Requiere Chrome/Chromium instalado (o PUPPETEER_EXECUTABLE_PATH definido). Detalle: ${err.message}`
    );
  }

  // mmdc numbers charts in document order as `<stub>-1.<ext>`, `<stub>-2.<ext>`, ...
  const dirEntries = await readdir(resolvedOutputDir);
  const pattern = new RegExp(`^${DIAGRAM_PREFIX}-(\\d+)\\.${format}$`);
  const generated = dirEntries
    .map((name) => {
      const match = name.match(pattern);
      return match ? { name, index: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  if (generated.length === 0) {
    throw new Error(
      `mmdc no generó ningún diagrama -- comprueba que '${markdownPath}' contiene bloques \`\`\`mermaid.`
    );
  }

  if (names && names.length > 0) {
    if (names.length !== generated.length) {
      throw new Error(
        `Se encontraron ${generated.length} diagrama(s) pero 'names' trae ${names.length} nombre(s) -- deben coincidir uno a uno, en el mismo orden en que aparecen los bloques \`\`\`mermaid en el documento.`
      );
    }
    const renamed = [];
    for (let i = 0; i < generated.length; i++) {
      const from = path.join(resolvedOutputDir, generated[i].name);
      const safeName = names[i].replace(/[^a-zA-Z0-9_.-]/g, "-");
      const to = path.join(resolvedOutputDir, `${safeName}.${format}`);
      await rename(from, to);
      renamed.push(to);
    }
    return { outputDir: resolvedOutputDir, files: renamed, chromeUsed: chrome };
  }

  return {
    outputDir: resolvedOutputDir,
    files: generated.map((g) => path.join(resolvedOutputDir, g.name)),
    chromeUsed: chrome
  };
}
