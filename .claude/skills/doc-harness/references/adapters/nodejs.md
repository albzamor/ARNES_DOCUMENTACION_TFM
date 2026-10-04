# Adaptador: Node.js / JavaScript

Usar cuando el proyecto tenga `package.json` en la raíz y no sea un proyecto
Salesforce DX (si tiene ambos — p. ej. un MCP server que vive dentro de un
repo Salesforce — usa este adaptador para la parte Node.js y el de
[salesforce.md](salesforce.md) para la parte de metadata). Este adaptador
solo aporta lo específico de Node.js/JS — el proceso, los puntos HITL y las
reglas de formato siguen siendo los de [SKILL.md](../../SKILL.md) y
[template.md](../template.md).

## Detección

`package.json` en la raíz del proyecto o de la carpeta que se está
documentando. Mira `"type"` (`"module"` = ESM, ausente/`"commonjs"` = CJS) y
`"bin"` (puntos de entrada CLI) antes de descubrir componentes — cambia qué
patrón de import/require buscar en las referencias cruzadas.

## Tipos de componente a cubrir (paso 3 de SKILL.md)

| Tipo | Patrón de fichero | Notas |
|---|---|---|
| Módulo / Servicio (lógica de negocio) | `src/**/*.js` (o `.ts`), excluyendo tests | El núcleo de lo que hace el código |
| Punto de entrada / CLI | Ficheros listados en `package.json` → `bin`, o `scripts` que apuntan a un fichero concreto | P. ej. `sf-doc-mcp: ./src/index.js` |
| Definición de tool/endpoint (si es un servidor MCP, API o similar) | Grep por el patrón de registro del framework (`server.tool(`, `app.get(`, `router.post(`...) | El nombre del tool/endpoint suele ir como primer argumento literal |
| Tests | `**/*.test.js`, `**/*.spec.js`, o la carpeta que declare `package.json` → `scripts.test` | Documenta si existen, no los inventes si no hay |
| Configuración | `package.json`, `.env.example`, `*.config.js` | Nunca cites el contenido real de `.env` (secretos) — solo `.env.example` |
| Dependencias externas críticas | Entradas de `dependencies`/`devDependencies` que el código realmente importa | Cruza `package.json` con `import`/`require` reales — no documentes una dependencia declarada pero no usada |
| Assets / plantillas | Carpetas como `assets/`, `templates/` referenciadas desde el código | P. ej. una plantilla `.docx` de referencia para un generador de documentos |

Usa `Grep`/`Glob` para cruzar referencias (qué módulo importa a cuál, qué
tool usa qué helper) — en ESM busca `import ... from "./ruta.js"`; en CJS,
`require("./ruta")`.

## Convención de nombrado (paso 2 de SKILL.md)

**Esta convención decide solo el nombre de los ficheros de documentación,
nunca el de los componentes documentados** — mismo criterio que el
adaptador de Salesforce. Cita cada módulo/tool/fichero con su nombre real
tal cual existe en el repo, aunque no siga el patrón dominante del resto
del proyecto; anótalo como nota informativa en el inventario si es
relevante, nunca lo renombres.

Node.js/JS no tiene, por defecto, una convención de prefijo de squad como
`AF_` en Salesforce. En vez de proponer un prefijo, el arnés debe:

1. Mirar el campo `"name"` de `package.json` y el naming ya presente en
   `src/` (¿camelCase para ficheros? ¿kebab-case? ¿un prefijo de paquete,
   p. ej. `@miorg/algo`?) y proponerlo como patrón a seguir — nunca inventar
   uno nuevo si ya hay uno establecido.
2. Si no hay nada establecido (proyecto muy nuevo o inconsistente), preguntar
   directamente qué convención seguir, igual que exige el núcleo — nunca
   asumir camelCase/kebab-case por ser "lo normal en JS" sin confirmarlo.

## Fila adicional obligatoria en el MANIFEST

No aplica — Node.js no tiene un equivalente al ID de Salesforce (`BotDefinition.Id`)
que haga falta documentar. Si el proyecto se despliega a una plataforma con
un identificador propio (p. ej. un `functionId` de una cloud function, un
`serviceId` de un orquestador), sigue el mismo criterio que el adaptador de
Salesforce: fila adicional en el MANIFEST y en la header table del DOCU,
obtenido de una fuente real (nunca inventado).

## Tabla de tipos para diagramas Mermaid (Unicode Mathematical Sans-Bold)

| Tipo | Copiar tal cual |
|---|---|
| Módulo | `𝗠𝗢𝗗𝗨𝗟𝗘` |
| MCP Tool | `𝗠𝗖𝗣 𝗧𝗢𝗢𝗟` |
| CLI | `𝗖𝗟𝗜` |
| API / Endpoint | `𝗔𝗣𝗜` |
| Config | `𝗖𝗢𝗡𝗙𝗜𝗚` |
| Dependencia externa | `𝗘𝗫𝗧𝗘𝗥𝗡𝗔𝗟 𝗗𝗘𝗣` |

Si aparece un tipo no listado, genera el equivalente en Unicode Mathematical
Sans-Bold Capital (rango U+1D5D4–U+1D5ED) letra a letra, igual que indica el
adaptador de Salesforce.

## Herramientas de exportación

Mismo servidor `sf-doc-mcp` que para cualquier otro stack —
`convert_markdown_to_docx`, `export_mermaid_diagrams`, `validate_document`
no dependen de que el proyecto documentado sea Salesforce; solo procesan el
`.md` ya escrito. Sin cambios respecto al núcleo.

## Manejo de errores — qué mirar en un proyecto Node.js

A diferencia de Salesforce (donde los errores suelen ser códigos HTTP de
callout o excepciones Apex tipadas), en Node.js documenta:

- Qué falla si falta una dependencia del sistema (p. ej. un binario externo
  como `python3`, `pandoc` o `chrome` que el código invoca vía
  `child_process`) — mensaje exacto y dónde se lanza.
- Qué falla si un fichero de entrada no existe o una ruta no resuelve —
  mismo criterio que un componente Salesforce sin desplegar: el error debe
  decir qué falta, no solo "algo falló".
- Códigos de salida (`exit code`) si el componente es un CLI o un script
  invocado por otro proceso — documenta qué significa cada uno, no solo
  "0 = éxito".
