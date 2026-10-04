# sf-doc-mcp

Servidor MCP que examina un proyecto de Salesforce (Agent Script, LWC, Flows, Apex) y genera **una documentación técnica completa y siempre con el mismo formato**: `DOCUMENTATION.md` + `DOCUMENTATION.docx`.

No valida ni compila tu código (para eso usa la extensión oficial `salesforce/agentscript` o `sfdx`) — su único trabajo es **leer lo que ya construiste y documentarlo**, de forma consistente cada vez.

## Qué documenta

| Tipo | Detecta | Extrae |
|---|---|---|
| Agent Script (`.agent`) | cualquier archivo `.agent` | config, variables, mensajes, subagents, acciones |
| LWC | carpetas con `<nombre>.js-meta.xml` | `@api`, `@track`, `@wire`, métodos públicos, eventos, dependencias |
| Flow | `*.flow-meta.xml` | tipo de proceso, trigger, variables, elementos (screens, decisions, etc.) |
| Apex | `*.cls` | clase, sharing, métodos públicos/globales, ApexDoc, `@InvocableMethod` |

Cada componente se documenta siempre con la misma estructura: **Overview → Considerations → Reference → Example**. Las "Considerations" son notas automáticas (ej. "falta descripción", "falta ApexDoc") pensadas para que uses la herramienta también como checklist de calidad.

## Instalación

```bash
cd sf-doc-mcp
npm install
```

## Dos modos

- **`document_feature` (recomendado, día a día).** Tú das el nombre de la feature, una breve descripción y la lista exacta de componentes (`Tipo: Nombre`). La tool escanea el proyecto completo (recorre `classes/`, `lwc/`, `flows/`, etc. sin que le digas dónde está cada carpeta) pero **solo documenta lo que pediste**, avisando de cualquier nombre que no encuentre. Genera además un `manifest.md` con lo que le diste, para poder volver a generar la doc más adelante sin repetir todo.
- **`document_salesforce_project` (auditoría completa).** Documenta absolutamente todo lo que encuentra en el proyecto. Útil para un onboarding o una foto completa del org, pero incluye también componentes legacy que no tocaste.

## Uso 1: como servidor MCP en VS Code (recomendado)

1. En tu proyecto (o en el proyecto Salesforce que quieras documentar), crea `.vscode/mcp.json`:

```json
{
  "servers": {
    "sf-doc-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/absoluta/a/sf-doc-mcp/src/index.js"]
    }
  }
}
```

2. En VS Code, abre el Chat en modo Agente (Copilot Chat / Claude) y activa el servidor `sf-doc-mcp` cuando te lo pregunte.
3. Pide, por ejemplo:

   > Documenta la feature que acabo de construir en /ruta/a/mi-proyecto

   Como `featureName`, `featureContext` y `components` son parámetros obligatorios de `document_feature` (salvo que le des un `manifestPath` existente), el propio asistente te preguntará por chat el nombre de la feature, una breve descripción, y la lista de componentes antes de poder llamar a la tool. Te dirá el formato exacto (`Tipo: Nombre`, con Tipo en Apex / LWC / Flow / Agent Script).

   Si ya tienes un `manifest.md` de una vez anterior (por ejemplo porque añadiste algo a la misma feature), dile "usa el manifest en docs/mi-feature/manifest.md" y se salta las preguntas.

   Para una auditoría completa en cambio:

   > Documenta TODO el proyecto Salesforce en /ruta/a/mi-proyecto

## Uso 2: por línea de comandos (sin cliente MCP)

```bash
# Modo feature interactivo -- te pregunta todo por terminal y genera el manifest.md
node src/cli.js

# Modo feature reusando un manifest.md ya existente (sin preguntas)
node src/cli.js feature --project /ruta/a/mi-proyecto --manifest /ruta/a/manifest.md [--output /ruta/salida]

# Modo auditoría completa
node src/cli.js full /ruta/a/mi-proyecto [/ruta/de/salida]
```

Formato del `manifest.md` (lo genera solo el modo feature, pero también puedes escribirlo a mano):

```markdown
# Feature: Case Triage

Permite a los agentes de soporte recibir una sugerencia automática de
prioridad al abrir un caso, y escalarlo a la cola on-call si es urgente.

## Components

- Apex: CaseService
- LWC: caseSummary
- Flow: Case_Auto_Assign
- Agent Script: CaseTriage
```

## Estructura del proyecto

```
sf-doc-mcp/
  src/
    index.js            servidor MCP (tools document_feature y document_salesforce_project)
    cli.js               ejecución directa por terminal (interactiva o con manifest)
    generate.js           orquesta escaneo + resolución + parseo + render
    resolve.js             matchea componentes pedidos contra lo encontrado en el proyecto
    scanner.js             recorre el proyecto y clasifica archivos
    parsers/
      agentScript.js       parser de .agent (basado en AGENT_SCRIPT.md)
      lwc.js                parser de bundles LWC
      flow.js               parser de *.flow-meta.xml
      apex.js               parser de clases Apex
      manifest.js           parser/render del manifest.md de una feature
    render/
      markdown.js           plantilla Markdown estilo Salesforce (+ Overview/avisos de feature)
      docx.js                mismo contenido como documento Word
```

## Limitaciones conocidas

- Los parsers son **best-effort** (basados en patrones/indentación), no compiladores completos. Para Agent Script, si necesitas validación 100% fiel a la gramática oficial, complementa con la extensión oficial `salesforce/agentscript` (github.com/salesforce/agentscript).
- Apex: la extracción de métodos/campos es por expresiones regulares, no un parser AST completo. Cubre los casos comunes (métodos con cuerpo `{ }`, ApexDoc, `@InvocableMethod`), pero construcciones muy inusuales pueden no detectarse.
- Flow: se listan los elementos por tipo (screens, decisions, etc.) con sus labels; no se documenta la lógica interna de cada elemento.

## Extender a nuevos tipos de metadata

Para añadir un tipo nuevo (por ejemplo Custom Objects o Permission Sets):

1. Añade su detección en `scanner.js`.
2. Crea `parsers/<tipo>.js` que devuelva un objeto con `{ type, filePath, name, description, ... }`.
3. Añade su renderer en `render/markdown.js` y `render/docx.js`, y regístralo en `SECTION_RENDERERS` / `SECTION_BUILDERS`.
4. Añade el tipo al array `order` en ambos renderers para que aparezca en el índice.
