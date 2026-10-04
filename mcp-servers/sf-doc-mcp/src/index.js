#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateDocumentation, generateFeatureDocumentation } from "./generate.js";
import { convertMarkdownToDocx } from "./render/pandocDocx.js";
import { exportMermaidDiagrams } from "./render/exportDiagrams.js";
import { validateDocument } from "./validateDocument.js";

const server = new McpServer({
  name: "sf-doc-mcp",
  version: "1.0.0",
  description:
    "Scans a Salesforce project (Agent Script, LWC, Flows, Apex) and generates consistent, Salesforce-style technical documentation (Markdown + Word)."
});

server.tool(
  "document_salesforce_project",
  "FULL-PROJECT AUDIT MODE. Examines an entire Salesforce project folder (Agent Script .agent files, Lightning Web " +
    "Components, Flows, Apex classes) and generates a single, complete technical documentation set (DOCUMENTATION.md + " +
    "DOCUMENTATION.docx) covering EVERY component found, following a fixed Salesforce-style structure (Overview, " +
    "Considerations, Reference, Example) for each. Use this for onboarding docs or a full org audit. " +
    "For documenting just the components that make up one feature you just built, use 'document_feature' instead — " +
    "it won't pull in unrelated legacy components.",
  {
    projectPath: z
      .string()
      .describe("Absolute path to the Salesforce project root (e.g. the folder containing 'force-app', or the specific folder you want documented)."),
    outputPath: z
      .string()
      .optional()
      .describe("Absolute path to the folder where DOCUMENTATION.md and DOCUMENTATION.docx should be written. Defaults to <projectPath>/docs."),
    projectName: z
      .string()
      .optional()
      .describe("Display name for the project, used as the document title. Defaults to the project folder name.")
  },
  async ({ projectPath, outputPath, projectName }) => {
    try {
      const result = await generateDocumentation({ projectPath, outputPath, projectName });
      const summary = [
        `Documentation generated successfully.`,
        `- Markdown: ${result.markdownPath}`,
        `- Word:     ${result.docxPath}`,
        ``,
        `Found and documented:`,
        `- Agent Script files: ${result.stats.agentScripts}`,
        `- Lightning Web Components: ${result.stats.lwc}`,
        `- Flows: ${result.stats.flows}`,
        `- Apex classes: ${result.stats.apex}`
      ];
      if (result.stats.errors.length) {
        summary.push("", `Files that could not be parsed:`, ...result.stats.errors.map((e) => `- ${e.file}: ${e.error}`));
      }
      return { content: [{ type: "text", text: summary.join("\n") }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to generate documentation: ${err.message}` }]
      };
    }
  }
);

const componentSchema = z.object({
  type: z
    .enum(["Apex", "LWC", "Flow", "Agent Script"])
    .describe("Component type. Use exactly one of: Apex, LWC, Flow, Agent Script."),
  name: z
    .string()
    .describe(
      "The component's file/folder name as it exists on disk (Apex class name, LWC folder name, Flow API name, or the .agent file name)."
    )
});

server.tool(
  "document_feature",
  "FEATURE MODE (recommended for day-to-day development). Documents ONLY the specific components that make up one " +
    "feature you just built, instead of the whole project. Before calling this tool, ASK THE USER: (1) a short name " +
    "for the feature, (2) a 1-3 sentence description of what it does and why (this becomes the human-written Overview " +
    "-- static analysis can't produce this part), and (3) the exact list of components involved, each as " +
    "{type, name} where type is one of Apex / LWC / Flow / Agent Script and name matches the file or folder name on " +
    "disk. The tool then scans the project tree, locates each named component wherever it lives (classes/, lwc/, " +
    "flows/, etc.), and warns about any that couldn't be found -- so typos are caught rather than silently skipped. " +
    "It writes DOCUMENTATION.md + DOCUMENTATION.docx AND a manifest.md capturing exactly what was asked for, so the " +
    "same feature can be re-documented later via manifestPath without re-asking the user everything. " +
    "If the user already has a manifest.md (from a previous run), pass manifestPath instead and skip asking.",
  {
    projectPath: z.string().describe("Absolute path to the Salesforce project root (e.g. the folder containing 'force-app')."),
    outputPath: z
      .string()
      .optional()
      .describe("Absolute path to the folder where manifest.md, DOCUMENTATION.md and DOCUMENTATION.docx should be written. Defaults to <projectPath>/docs/<feature-slug>."),
    manifestPath: z
      .string()
      .optional()
      .describe("Absolute path to an existing manifest.md to reuse (skips featureName/featureContext/components if they fully cover it)."),
    featureName: z.string().optional().describe("Short name for the feature. Required unless manifestPath is given."),
    featureContext: z
      .string()
      .optional()
      .describe("1-3 sentences, in the developer's own words, describing what the feature does and why. Required unless manifestPath is given."),
    components: z
      .array(componentSchema)
      .optional()
      .describe("Exact list of components that make up this feature. Required unless manifestPath is given.")
  },
  async ({ projectPath, outputPath, manifestPath, featureName, featureContext, components }) => {
    try {
      const result = await generateFeatureDocumentation({
        projectPath,
        outputPath,
        manifestPath,
        featureName,
        featureContext,
        components
      });
      const summary = [
        `Documentation generated for feature "${featureName || "(from manifest)"}".`,
        `- Manifest:  ${result.manifestPath}`,
        `- Markdown:  ${result.markdownPath}`,
        `- Word:      ${result.docxPath}`,
        ``,
        `Requested: ${result.stats.requested}  ·  Resolved: ${result.stats.resolved}  ·  Not found: ${result.stats.notFound}`
      ];
      if (result.notFound.length) {
        summary.push("", "Components that could NOT be located (check for typos or that they exist on disk):", ...result.notFound.map((nf) => `- ${nf.type}: ${nf.name} — ${nf.reason}`));
      }
      if (result.stats.errors.length) {
        summary.push("", "Files that could not be parsed:", ...result.stats.errors.map((e) => `- ${e.file}: ${e.error}`));
      }
      return { content: [{ type: "text", text: summary.join("\n") }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to generate feature documentation: ${err.message}` }]
      };
    }
  }
);

server.tool(
  "convert_markdown_to_docx",
  "FORMAT-ONLY CONVERSION. Converts an already-written Markdown documentation file into a polished, " +
    "Salesforce-styled Word document (.docx). Unlike document_feature/document_salesforce_project, this tool does " +
    "NOT scan a Salesforce project or generate documentation content -- it takes a finished .md file exactly as-is " +
    "(e.g. one written by hand or by an AI assistant reading the real source code) and only handles presentation: " +
    "(1) applies a Salesforce-branded Word style (navy/blue headings, bordered tables with a shaded header row) via " +
    "a built-in reference template, and (2) renders any ```mermaid fenced code blocks (sequenceDiagram, erDiagram, " +
    "etc.) into real embedded diagram images instead of leaving them as ASCII art or raw code. Use this as the " +
    "final step after the Markdown documentation is already complete and reviewed. Requires 'pandoc' installed on " +
    "the system and this server's npm dependencies installed (mermaid-filter).",
  {
    markdownPath: z.string().describe("Absolute path to the finished Markdown file to convert."),
    outputPath: z
      .string()
      .optional()
      .describe("Absolute path for the output .docx. Defaults to markdownPath with its extension swapped to .docx."),
    referenceDocPath: z
      .string()
      .optional()
      .describe("Absolute path to an alternate reference .docx style template, if you don't want the built-in Salesforce style.")
  },
  async ({ markdownPath, outputPath, referenceDocPath }) => {
    try {
      const result = await convertMarkdownToDocx({ markdownPath, outputPath, referenceDocPath });
      const lines = [`Documento Word generado: ${result.docxPath}`, `Plantilla usada: ${result.referenceDocUsed}`];
      lines.push(
        result.chromeUsed
          ? `Diagramas Mermaid renderizados con: ${result.chromeUsed}`
          : `Aviso: no se encontró Chrome/Chromium en el sistema -- si el .md tenía bloques de Mermaid, revisa si la conversión falló.`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to convert Markdown to Word: ${err.message}` }]
      };
    }
  }
);

server.tool(
  "export_mermaid_diagrams",
  "STANDALONE DIAGRAM EXPORT. Extracts every ```mermaid fenced diagram from a finished Markdown documentation file " +
    "and renders each one as its own image file (PNG by default) in a dedicated folder -- so diagrams can be opened " +
    "directly and viewed at full size, without generating a Word document first. Independent of " +
    "convert_markdown_to_docx (no pandoc involved); uses 'mmdc' (@mermaid-js/mermaid-cli, bundled with this server) " +
    "directly against the .md file. Diagrams are numbered in the order they appear in the document " +
    "(diagrama-1, diagrama-2, ...); pass 'names' to rename them to something descriptive in that same order. " +
    "Requires Chrome/Chromium installed (or PUPPETEER_EXECUTABLE_PATH set) and this server's npm dependencies " +
    "installed.",
  {
    markdownPath: z.string().describe("Absolute path to the finished Markdown file containing the ```mermaid blocks."),
    outputDir: z
      .string()
      .optional()
      .describe("Absolute path to the folder where the diagram images should be written. Defaults to '<markdownPath's folder>/4_diagramas'."),
    format: z.enum(["png", "svg"]).optional().describe("Image format. Defaults to 'png'."),
    width: z.number().optional().describe("Diagram width in pixels before scaling. Defaults to 1600 (high-res, good for viewing full-size)."),
    scale: z.number().optional().describe("Puppeteer render scale factor. Defaults to 2 (sharper output)."),
    theme: z.string().optional().describe("Mermaid theme: default, forest, dark, or neutral. Defaults to 'default'."),
    background: z.string().optional().describe("Background color (e.g. 'white', 'transparent', '#F0F0F0'). Defaults to 'white'."),
    names: z
      .array(z.string())
      .optional()
      .describe(
        "Optional descriptive file names (without extension), one per diagram, in the same order the ```mermaid " +
          "blocks appear in the document (e.g. ['arquitectura', 'conexion-spotify']). Must match the number of " +
          "diagrams found exactly, or the tool errors out rather than guessing the mapping."
      )
  },
  async ({ markdownPath, outputDir, format, width, scale, theme, background, names }) => {
    try {
      const result = await exportMermaidDiagrams({
        markdownPath,
        outputDir,
        format,
        width,
        scale,
        theme,
        background,
        names
      });
      const lines = [
        `${result.files.length} diagrama(s) exportado(s) a: ${result.outputDir}`,
        ...result.files.map((f) => `- ${f}`)
      ];
      lines.push(
        result.chromeUsed
          ? `Renderizado con: ${result.chromeUsed}`
          : `Aviso: no se encontró Chrome/Chromium en el sistema -- si el export falló, instala Chrome o define PUPPETEER_EXECUTABLE_PATH.`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to export Mermaid diagrams: ${err.message}` }]
      };
    }
  }
);

server.tool(
  "validate_document",
  "HUMAN-COMPREHENSION VALIDATION. Runs the doc-harness comprehension linter against an already-written DOCU.md: " +
    "checks that every internal anchor link ([text](#id)) resolves to a real heading, every ```mermaid diagram in " +
    "the document has its image already exported to 4_diagramas/, every screenshot referenced from 2_screenshot/ " +
    "has a real explanatory paragraph beneath it (not just a one-line caption), and flags (non-blocking) long " +
    "sections with no diagram or screenshot at all. This is a structural/deterministic check -- it never produces " +
    "a fabricated confidence percentage, only a verifiable pass/fail per rule. It does not judge prose quality or " +
    "generate anything; it only tells you whether the human-comprehension layer is actually complete. Exit code 0 " +
    "means every blocking check passed (warnings may remain); non-zero means at least one blocking check failed. " +
    "Callable standalone, outside Claude Code, since it just shells out to the Python linter bundled with the " +
    "doc-harness skill -- useful as a CI step or from any other MCP client.",
  {
    markdownPath: z.string().describe("Absolute path to the DOCU.md (clean root version or 3_mdXML version) to validate."),
    linterPath: z
      .string()
      .optional()
      .describe(
        "Absolute path to comprehension_linter.py. Defaults to the doc-harness skill bundled alongside this server " +
          "(.claude/skills/doc-harness/scripts/comprehension_linter.py). Pass this explicitly if the linter lives " +
          "elsewhere (e.g. a repo that doesn't mirror the TOOLS_AGENTFORCE layout)."
      ),
    minSectionLines: z.number().optional().describe("Override for the VISUAL_RATIO warning threshold (default 40 lines)."),
    minCaptionWords: z.number().optional().describe("Override for the minimum caption word count required per screenshot (default 12).")
  },
  async ({ markdownPath, linterPath, minSectionLines, minCaptionWords }) => {
    try {
      const result = await validateDocument({ markdownPath, linterPath, minSectionLines, minCaptionWords });
      const header = result.passed
        ? "Validación de comprensión humana: TODO CORRECTO (puede haber avisos no bloqueantes)."
        : "Validación de comprensión humana: HAY ERRORES BLOQUEANTES -- no des el documento por terminado.";
      return {
        content: [{ type: "text", text: `${header}\n\n${result.output}` }]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to run comprehension linter: ${err.message}` }]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
