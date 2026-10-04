# Adaptador: Skill / Plugin de Claude Code

Usar cuando lo que se documenta es una **skill de Claude Code** (o un
conjunto de ellas) — un `SKILL.md` con frontmatter YAML, no un proyecto
Salesforce ni un paquete Node.js con `package.json` propio (aunque una
skill puede *usar* un servidor MCP en Node.js como pieza aparte, como
`doc-harness` usa `sf-doc-mcp` — documenta esa pieza con el adaptador
[nodejs.md](nodejs.md), no con este). Este adaptador solo aporta lo
específico de skills — el proceso, los puntos HITL y las reglas de formato
siguen siendo los de [SKILL.md](../../SKILL.md) y [template.md](../template.md).

## Detección

Un fichero `SKILL.md` con frontmatter YAML (`name`, `description`, y
opcionalmente `tools`) dentro de `.claude/skills/<nombre>/`. Puede haber
más de una skill en el mismo proyecto — acótalo a la(s) que el usuario haya
nombrado, no documentes todas las que encuentres salvo que el alcance
elegido en el paso 1 sea "arquitectura general" del propio catálogo de
skills.

## Tipos de componente a cubrir (paso 3 de SKILL.md)

| Tipo | Patrón de fichero | Notas |
|---|---|---|
| Definición de la skill | `.claude/skills/<nombre>/SKILL.md` | El frontmatter (`name`, `description`, `tools`) es en sí mismo contenido a documentar — la `description` es lo que decide cuándo se activa |
| Referencias / documentación de apoyo | `.claude/skills/<nombre>/references/**/*.md` | Ficheros que el `SKILL.md` carga bajo demanda — cita cuáles existen y qué cubre cada uno, no dupliques su contenido completo |
| Adaptadores (si la skill tiene su propio patrón núcleo/adaptador) | `.claude/skills/<nombre>/references/adapters/*.md` | Caso reflexivo: este mismo fichero es un ejemplo |
| Scripts / herramientas ejecutables | `.claude/skills/<nombre>/scripts/**` | Puede ser cualquier lenguaje (Python, Node, Bash) — documenta el lenguaje real, no asumas uno |
| Hooks relacionados | `.claude/settings.json` / `.claude/settings.local.json`, bloque `hooks` | Solo si la skill los usa — no todas las skills tienen hook asociado (p. ej. `naming-convention` y `sf-doc-feature` no lo tienen; `doc-harness` sí) |
| Agentes / comandos relacionados (si existen) | `.claude/agents/*.md`, `.claude/commands/*.md` | No siempre presentes — compruébalo, no lo asumas por defecto |
| Assets / plantillas | `.claude/skills/<nombre>/assets/**` | P. ej. una plantilla de ejemplo que la skill copia |

Usa `Grep`/`Glob` para cruzar referencias: qué ficheros de `references/`
carga realmente el `SKILL.md` (busca el nombre del fichero entre
corchetes `[texto](references/...)`), y si algún hook en `settings.json`
invoca un script de la skill (busca la ruta del script en el `command`).

## Convención de nombrado (paso 2 de SKILL.md)

El nombre de una skill (`name:` en el frontmatter, y el nombre de su
carpeta) es casi siempre **kebab-case** por convención de la plataforma —
`doc-harness`, `sf-doc-feature`, `naming-convention` son los tres ejemplos
reales de este mismo entorno. Aun así, **no lo des por sentado sin
comprobarlo**: propón kebab-case como patrón observado, citando el ejemplo
real, y pide confirmación — puede haber proyectos con otra convención.

**Esta convención decide solo el nombre de los ficheros de documentación,
nunca el de la skill documentada** — mismo criterio que los adaptadores de
Salesforce y Node.js. Cita el `name:` real del frontmatter tal cual está,
aunque no seas tú quien lo escribió.

## Fila adicional obligatoria en el MANIFEST

No aplica — una skill no tiene un identificador de plataforma equivalente
al ID de Salesforce o a un `functionId` de cloud. Si la skill forma parte
de un plugin publicado (con `.claude-plugin/plugin.json` o
`marketplace.json`), documenta su versión y el marketplace de origen como
fila adicional, igual que el resto de adaptadores documentan su
identificador propio.

## Tabla de tipos para diagramas Mermaid (Unicode Mathematical Sans-Bold)

| Tipo | Copiar tal cual |
|---|---|
| Skill | `𝗦𝗞𝗜𝗟𝗟` |
| Referencia | `𝗥𝗘𝗙𝗘𝗥𝗘𝗡𝗖𝗘` |
| Script | `𝗦𝗖𝗥𝗜𝗣𝗧` |
| Hook | `𝗛𝗢𝗢𝗞` |
| MCP Tool | `𝗠𝗖𝗣 𝗧𝗢𝗢𝗟` |
| Agente | `𝗔𝗚𝗘𝗡𝗧` |

Si aparece un tipo no listado, genera el equivalente en Unicode
Mathematical Sans-Bold Capital (rango U+1D5D4–U+1D5ED) letra a letra, igual
que los demás adaptadores.

## Herramientas de exportación

Mismo servidor `sf-doc-mcp` que para cualquier otro stack. Sin cambios
respecto al núcleo.

## Manejo de errores — qué mirar en una skill de Claude Code

- **Frontmatter malformado.** Comprobación real hecha al escribir este
  adaptador: `sf-doc-feature/SKILL.md` tiene `name:` y `description:` en la
  misma línea física, sin salto de línea entre campos — un frontmatter YAML
  mal formado puede hacer que la skill no se liste con su descripción
  completa, o que el campo se interprete distinto de lo previsto. Si
  detectas esto en la skill que documentas, dilo como hallazgo en
  `LECCIONES.md`, no lo "arregles" en silencio como parte de la
  documentación (arreglar el fichero real es una acción aparte que hay que
  pedir explícitamente).
- Qué falla si un script referenciado por un hook no existe en la ruta
  esperada, o si depende de un binario del sistema no garantizado
  (`python3`, `jq`, `pandoc`...) — documenta el mensaje de error real, no
  uno genérico.
- Si la skill declara `tools:` en el frontmatter, documenta qué pasa si
  intenta usar una herramienta no listada ahí — normalmente la propia
  plataforma lo restringe, no es un error del código de la skill.
