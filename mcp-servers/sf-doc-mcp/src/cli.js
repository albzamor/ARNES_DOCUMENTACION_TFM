#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { generateDocumentation, generateFeatureDocumentation } from "./generate.js";

function printUsage() {
  console.log(`Uso:
  node src/cli.js                                   Modo feature interactivo (te pregunta todo por terminal)
  node src/cli.js full <projectPath> [outputPath]    Documenta TODO el proyecto (modo auditoría)
  node src/cli.js feature --project <p> --manifest <m> [--output <o>]
                                                      Modo feature sin preguntas, reusando un manifest.md existente
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    flags[key] = argv[i + 1];
  }
  return flags;
}

async function runInteractiveFeature() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log("== Documentar una feature ==\n");
    const projectPath = await rl.question("Ruta del proyecto Salesforce: ");
    const featureName = await rl.question("Nombre de la feature: ");
    console.log("Breve descripcion de la feature (que hace y por que). Linea vacia para terminar:");
    const contextLines = [];
    while (true) {
      const line = await rl.question("> ");
      if (!line.trim()) break;
      contextLines.push(line.trim());
    }
    console.log('\nComponentes (formato "Tipo: Nombre", tipos validos: Apex, LWC, Flow, Agent Script). Linea vacia para terminar:');
    const components = [];
    while (true) {
      const line = await rl.question("> ");
      if (!line.trim()) break;
      const m = line.match(/^([^:]+):\s*(.+)$/);
      if (!m) {
        console.log('  (ignorado, formato esperado "Tipo: Nombre")');
        continue;
      }
      components.push({ type: m[1].trim(), name: m[2].trim() });
    }
    const outputPathRaw = await rl.question("Carpeta de salida (Enter = <proyecto>/docs/<feature>): ");

    rl.close();

    const result = await generateFeatureDocumentation({
      projectPath,
      outputPath: outputPathRaw.trim() || undefined,
      featureName,
      featureContext: contextLines.join(" ") || undefined,
      components
    });

    printFeatureResult(featureName, result);
  } catch (err) {
    rl.close();
    throw err;
  }
}

function printFeatureResult(featureName, result) {
  console.log(`\nDocumentacion generada para "${featureName}":`);
  console.log(`  Manifest: ${result.manifestPath}`);
  console.log(`  Markdown: ${result.markdownPath}`);
  console.log(`  Word:     ${result.docxPath}`);
  console.log("Stats:", result.stats);
  if (result.notFound.length) {
    console.log("\nComponentes NO encontrados:");
    for (const nf of result.notFound) {
      console.log(`  - ${nf.type}: ${nf.name} — ${nf.reason}`);
    }
  }
}

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd) {
    await runInteractiveFeature();
    return;
  }

  if (cmd === "full") {
    const [projectPath, outputPath] = rest;
    if (!projectPath) return printUsage();
    const result = await generateDocumentation({ projectPath, outputPath });
    console.log("Documentacion generada (proyecto completo):");
    console.log(`  Markdown: ${result.markdownPath}`);
    console.log(`  Word:     ${result.docxPath}`);
    console.log("Stats:", result.stats);
    return;
  }

  if (cmd === "feature") {
    const flags = parseFlags(rest);
    if (!flags.project || !flags.manifest) return printUsage();
    const result = await generateFeatureDocumentation({
      projectPath: flags.project,
      manifestPath: flags.manifest,
      outputPath: flags.output
    });
    printFeatureResult(flags.manifest, result);
    return;
  }

  printUsage();
}

await main();
