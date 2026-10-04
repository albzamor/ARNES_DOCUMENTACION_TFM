import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileExists, findChromeExecutable } from "./chrome.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REFERENCE_DOCX = path.join(__dirname, "..", "..", "assets", "reference-salesforce.docx");
const MERMAID_FILTER_BIN = path.join(__dirname, "..", "..", "node_modules", ".bin", "mermaid-filter");

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      reject(new Error(`No se pudo ejecutar '${command}': ${err.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`'${command}' terminó con código ${code}.\n${stderr.trim()}`));
    });
  });
}

/**
 * Converts a finished Markdown documentation file into a Salesforce-styled Word document.
 * Renders ```mermaid fenced blocks into real embedded diagram images via mermaid-filter,
 * and applies a Salesforce-branded reference.docx template (headings, tables, colors) via Pandoc.
 * This is purely a formatting step -- it does not scan a project or generate documentation content.
 */
export async function convertMarkdownToDocx({ markdownPath, outputPath, referenceDocPath }) {
  if (!markdownPath) {
    throw new Error("markdownPath es obligatorio.");
  }
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No se encuentra el fichero Markdown: ${markdownPath}`);
  }

  const reference = referenceDocPath || DEFAULT_REFERENCE_DOCX;
  if (!(await fileExists(reference))) {
    throw new Error(`No se encuentra la plantilla de referencia: ${reference}`);
  }

  if (!(await fileExists(MERMAID_FILTER_BIN))) {
    throw new Error(
      `No se encuentra 'mermaid-filter' en node_modules/.bin. Ejecuta 'npm install' en el directorio de sf-doc-mcp.`
    );
  }

  const resolvedOutput = outputPath || markdownPath.replace(/\.md$/i, ".docx");
  const chrome = await findChromeExecutable();

  const env = { ...process.env };
  if (chrome) env.PUPPETEER_EXECUTABLE_PATH = chrome;

  // Sin --resource-path, pandoc resuelve las imágenes relativas (p. ej. `screenshots/foo.jpg`)
  // contra el cwd del proceso de este servidor MCP, no contra la carpeta del .md -- así que
  // cualquier imagen referenciada con ruta relativa se omitía en silencio del .docx final.
  const markdownDir = path.dirname(markdownPath);
  const args = [
    markdownPath,
    "-F",
    MERMAID_FILTER_BIN,
    "--resource-path",
    markdownDir,
    "--reference-doc",
    reference,
    "-o",
    resolvedOutput
  ];

  try {
    await run("pandoc", args, { env });
  } catch (err) {
    throw new Error(
      `Fallo al convertir a Word. Requisitos: 'pandoc' instalado en el sistema (brew install pandoc / apt install pandoc) ` +
        `y las dependencias npm de sf-doc-mcp instaladas ('npm install', incluye mermaid-filter). ` +
        `Si el .md contiene bloques \`\`\`mermaid y no hay Chrome/Chromium disponible, el renderizado de diagramas falla; ` +
        `instala Google Chrome o define PUPPETEER_EXECUTABLE_PATH. Detalle: ${err.message}`
    );
  }

  return { docxPath: resolvedOutput, referenceDocUsed: reference, chromeUsed: chrome };
}
