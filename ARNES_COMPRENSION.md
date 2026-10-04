# Arnés de Documentación Comprensible (doc-harness)

TFM — track de arneses de IA. Este documento explica qué problema resuelve
el arnés, cómo está construido y qué evidencia real lo respalda. Es la base
de la sección "Solución paso a paso" del documento técnico del TFM.

## 1. El problema

Un modelo de IA genera información — código, configuración, cambios — más
rápido de lo que un humano puede asimilarla. Cuando se le pide a una IA que
documente lo que acaba de construir, el resultado por defecto es un `.md`
correcto para que **otra IA** lo indexe o lo lea, pero pobre para que una
**persona** entienda la arquitectura rápido: sin diagramas, sin capturas, sin
señal visual. Ese trabajo de "traducir para humanos" se acaba haciendo a
mano, después, y de forma inconsistente.

## 2. La solución: dos capas, una verificación

El arnés genera **dos capas sincronizadas desde una misma pasada**: la capa
de texto (Markdown, para IA/buscadores) y la capa de comprensión humana
(diagramas Mermaid, capturas explicadas). La segunda capa no es un adorno —
tiene su propio verificador automático que falla si está incompleta.

```
┌─────────────────────────────────────────────────────────────┐
│  doc-harness (.claude/skills/doc-harness/)                   │
│                                                                │
│  SKILL.md ─── núcleo agnóstico de stack, 3 puntos HITL        │
│      │                                                        │
│      ├── references/adapters/salesforce.md ── lo específico   │
│      │                                         de un stack    │
│      │                                                        │
│      ├── scripts/comprehension_linter.py ── ESTRELLA:         │
│      │       verifica anchors, diagramas, capturas, ratio     │
│      │       visual — wireado como hook PostToolUse            │
│      │                                                        │
│      └── scripts/drift_detector.py ── verifica que el código  │
│              real no se haya movido sin que la doc lo siga    │
└─────────────────────────────────────────────────────────────┘
```

## 3. Los 12 puntos de confirmación humana, en 4 momentos (human-in-the-loop)

El arnés nunca decide en silencio nada que requiera criterio o preferencia
humana — 12 puntos concretos, en el código del `SKILL.md`, no una promesa en
prosa. Agrupados en **4 momentos de interacción real** para que sea una
conversación con criterio, no un interrogatorio de 12 preguntas sueltas:

**Momento 1 — Brief inicial** (una sola ronda de preguntas, antes de tocar
el proyecto): nombre + frase de negocio, alcance (arquitectura general / un
flujo concreto / un proceso / una integración externa), lector objetivo
(developer / arquitecto / consultor funcional / negocio), nivel de detalle
(propuesto según el lector, confirmable), y si hay capturas disponibles
ahora o se generará sin ellas.

**Momento 2 — Nombrado, ubicación y árbol de entregables**: convención de
nombrado (se detecta y propone, o se pregunta si no hay ninguna), ubicación
de `docs/`, y — la incorporación más reciente — **mostrar el árbol completo
de ficheros y carpetas que se van a crear, con los nombres ya resueltos, y
pedir confirmación explícita antes de crear nada real**. Deja igual de claro
qué NO se genera por defecto (`.docx`, diagramas sueltos) y qué se puede
pedir después bajo petición. Esto es lo que prepara al humano para el
trabajo que va a recibir, no solo para el contenido que va a leer.

**Momento 3 — Componentes**: confirmar la lista exacta de componentes
descubiertos (con ruta) antes de escribir una sola línea, y preguntar qué
representa cualquier captura ambigua en vez de adivinarlo.

**Momento 4 — Revisión de cierre**: antes de finalizar LECCIONES.md,
preguntar si hay algún problema real que el arnés no pueda ver en el
historial; y, con el resultado del linter ya en la mesa, preguntar
explícitamente si se acepta tal cual, se piden cambios en una sección
concreta, o se regenera — nunca entregar y asumir silencio como aprobación.

## 4. El linter de comprensión — la pieza central

`scripts/comprehension_linter.py` audita la capa humana de un documento ya
escrito con cuatro reglas:

| Regla | Qué comprueba | Bloqueante |
|---|---|---|
| ANCHORS | Todo `[texto](#id)` resuelve a un `{#id}` real | Sí |
| DIAGRAMS | Todo bloque ` ```mermaid ` tiene su imagen exportada en `4_diagramas/` | Sí |
| SCREENSHOTS | Toda captura de `2_screenshot/` lleva un párrafo explicativo real debajo | Sí |
| VISUAL_RATIO | Ninguna sección larga se queda sin diagrama ni captura | Aviso |

Wireado en `.claude/settings.json` como hook `PostToolUse` sobre
`Write`/`Edit` de ficheros `*DOCU.md`: cada vez que se escribe o edita un
documento técnico, el linter corre solo y su salida se inyecta de vuelta al
contexto de la conversación — no hace falta acordarse de ejecutarlo.

**Evidencia real de esta sesión** (`docs/AF_Plat_DJTermoScript/djTermoScriptDOCU.md`):

```
anchors definidos=25 usados=25
diagramas mermaid=2 imágenes exportadas=2
capturas de usuario referenciadas=4

[AVISO] VISUAL_RATIO (línea 215): sección '7. Componentes en detalle' tiene
161 líneas sin ningún diagrama ni captura
[AVISO] VISUAL_RATIO (línea 286): sección '7.4 Subagente recomendar_cancion'
tiene 61 líneas sin ningún diagrama ni captura

0 error(es), 2 aviso(s).
```

Y una prueba negativa (documento roto a propósito) confirma que el linter
detecta fallos reales, no que siempre pasa:

```
[ERROR] ANCHORS: se referencia #no-existe pero ningún encabezado define {#no-existe}
[ERROR] DIAGRAMS: el documento tiene 1 diagrama(s) Mermaid pero no existe 4_diagramas
[ERROR] SCREENSHOTS (línea 12): la captura no lleva un párrafo explicativo
3 error(es), 0 aviso(s). — exit code 1
```

## 5. El detector de deriva

`scripts/drift_detector.py` compara la fecha "Última actualización" de un
DOCU.md contra el `git log` real de cada componente de su MANIFEST — en un
repo distinto (el código vive en el proyecto de cliente, la documentación
aquí). Uso y comandos: [references/drift-detector.md](.claude/skills/doc-harness/references/drift-detector.md).

**Evidencia real** (`AF_Plat_DJTermoScript` contra `AGENTFORCE_SANDBOX`):

```
✓ 3 componente(s) sin deriva (Apex, Named Credential, Auth Provider reutilizados)

? 2 componente(s) sin historial de git en esa ruta exacta:
  - Agent Script (AiAuthoringBundle) — .agent
  - Agent Script — bundle metadata

RESULTADO: sin deriva.
```

Hallazgo real, no preparado: el propio `.agent` del agente documentado
nunca se llegó a comitear (`git status` lo confirma como `??` — untracked).
El detector lo señala en vez de asumir que "sin historial" significa "sin
deriva" — es la forma más sutil de deriva: ni el propio inventario de
componentes es fiable si el componente nunca entró en control de versiones.

## 6. Adaptador vs núcleo — la prueba de reutilización

Hay dos adaptadores construidos:
[salesforce.md](.claude/skills/doc-harness/references/adapters/salesforce.md)
(tipos de metadata, convención de nombrado, tabla Mermaid de tipos) y
[nodejs.md](.claude/skills/doc-harness/references/adapters/nodejs.md)
(módulos, CLI, tools de un servidor MCP, dependencias npm). Todo lo demás —
los 12 puntos HITL, el formato de los 4 documentos, las reglas de Mermaid,
el linter, el detector de deriva — no menciona ningún stack concreto en
ningún sitio. Añadir un stack nuevo es escribir un adaptador nuevo, no tocar
el núcleo.

**Prueba real, no solo argumentada.** El propio `sf-doc-mcp` — el servidor
MCP de este mismo arnés — es un proyecto Node.js sin nada de Salesforce, así
que sirvió de caso de prueba real para el adaptador nuevo, documentando su
propia feature `validate_document` recién construida:

```
$ ls package.json sfdx-project.json
package.json
ls: sfdx-project.json: No such file or directory        ← detección correcta: adaptador Node.js, no Salesforce

$ grep -n 'server.tool(' src/index.js
17: / 76: / 142: / 183: / 244:                            ← las 5 tools reales del servidor, ni una de más ni de menos

$ grep -n "validateDocument" src/index.js
8:  import { validateDocument } from "./validateDocument.js";
271:  const result = await validateDocument({...})        ← referencia cruzada módulo↔tool resuelta correctamente
```

El arnés que documenta agentes de Salesforce documentó correctamente su
propio servidor MCP en JavaScript, sin tocar una línea del núcleo — solo
leyendo el adaptador nuevo.

## 7. Estado y siguiente paso

- Arnés construido y probado con datos reales de esta sesión (no un caso
  sintético preparado para la demo).
- Hook `PostToolUse` escrito, validado con `jq -e`, probado por pipe, y
  **confirmado disparando en vivo** (salida real del linter + fichero
  centinela con marca de tiempo, dos veces) tras aislar la causa raíz de por
  qué no disparaba en esta sesión — ver
  [Problema: los hooks de proyecto no cargan desde un directorio de trabajo
  adicional](#problema-hooks-directorio-adicional) más abajo.
- Tool MCP `validate_document` construida en `sf-doc-mcp` (envuelve el
  linter, sin duplicar su lógica) y probada directamente contra la función
  real: caso positivo, caso negativo y ruta de linter inválida.
- El diseño del HITL se amplió a 12 puntos: se añadió la confirmación del
  árbol completo de entregables (qué ficheros/carpetas se van a crear, qué
  no se crea por defecto) como parte del Momento 2, para preparar al humano
  para el trabajo que va a recibir antes de que exista nada real.
- Segundo adaptador (Node.js/JS) construido y probado contra un caso real
  del propio proyecto (`sf-doc-mcp` documentándose a sí mismo) — ver
  [Adaptador vs núcleo](#6-adaptador-vs-núcleo--la-prueba-de-reutilización).
- Pendiente: diseñar el experimento comparativo (casos A/B/C + test de
  comprensión humana); y correr el flujo completo de principio a fin sobre
  un caso real con los 12 puntos ya integrados.

## 8. Problema real: los hooks de proyecto no cargan desde un directorio de trabajo adicional {#problema-hooks-directorio-adicional}

**Síntoma.** El hook `PostToolUse` de `TOOLS_AGENTFORCE/.claude/settings.json`
estaba bien escrito — sintaxis válida (`jq -e`), y su comando probado por
pipe con el JSON exacto que Claude Code le pasaría, se comporta
correctamente. Pero en dos intentos de disparo en vivo (una edición real
sobre `djTermoScriptDOCU.md`, y una segunda con un centinela en fichero que
no depende de que Claude Code devuelva nada) no se ejecutó. Al abrir
`/hooks` en la sesión, el hook ni siquiera aparecía en la lista de los 38
hooks cargados — todos "Plugin", ninguno de proyecto.

**Causa raíz.** Esta sesión de Claude Code se abrió con `AGENTFORCE_SANDBOX`
como **directorio raíz del proyecto**; `TOOLS_AGENTFORCE` es solo un
"directorio de trabajo adicional" alcanzado con `cd` para los comandos.
Claude Code carga los hooks de proyecto desde la raíz real de la sesión, no
desde cualquier carpeta que el agente visite — así que
`TOOLS_AGENTFORCE/.claude/settings.json` nunca entra en la lista de
candidatos, con independencia de si su sintaxis es correcta o de si `/hooks`
se reabre.

**Cómo se verificó (no se asumió).** Prueba de centinela: se prefijó
temporalmente el comando del hook con `echo "$(date) hook fired" >>
/tmp/claude-hook-check.txt;`, se disparó el matcher (`Write`/`Edit`) con una
edición real, y se comprobó el fichero — no existía. Esto descarta que el
problema fuera "se ejecuta pero su salida se pierde": sencillamente no
corre. El propio listado de `/hooks` confirma la causa: cero hooks de
proyecto de ningún tipo, solo los del plugin `salesforce-development`.

**Implicación para el arnés (y para cualquiera que lo reutilice).** Un hook
de `doc-harness` solo se activará en una sesión de Claude Code que tenga
`TOOLS_AGENTFORCE` (o el repo donde viva `.claude/settings.json`) como
**raíz real del proyecto** — abierta directamente ahí, no alcanzada como
directorio adicional desde otra sesión. Es exactamente el escenario de uso
real previsto (alguien abre Claude Code en el repo del arnés para
documentar ese mismo repo, o en un repo que lo tenga instalado), así que no
bloquea el diseño — es una limitación real del entorno, no del hook.

**Confirmación en vivo, con la causa raíz aislada como variable de
control.** En vez de esperar a una sesión nueva rooteada en
`TOOLS_AGENTFORCE`, se aisló la causa: se añadió temporalmente una copia
del mismo hook, con ruta absoluta al linter, a
`AGENTFORCE_SANDBOX/.claude/settings.local.json` (personal, nunca se
comitea — no contamina la configuración compartida de ese proyecto, que es
uno distinto y no debe mezclarse con el arnés). Con eso, una edición real
sobre `djTermoScriptDOCU.md` sí disparó el hook — salida del linter
inyectada en el contexto sin pedirla, y el fichero centinela con dos marcas
de tiempo reales confirmándolo por partida doble. Eso demuestra que el
propio hook (matcher, comando, invocación del linter) es correcto al 100% —
el único factor que impedía el disparo era la raíz del proyecto de la
sesión, nunca el hook en sí. Tras confirmarlo, la copia temporal se retiró
de `AGENTFORCE_SANDBOX` (su sitio real sigue siendo solo `TOOLS_AGENTFORCE`,
sin duplicados) y el `DOCU.md` de prueba quedó revertido a su estado
original (verificado con `git diff --stat`, sin cambios).

**Lección generalizable.** `jq -e` y una prueba por pipe validan que el
hook está *bien escrito*; no prueban que está *cargado* en la sesión activa.
La única prueba fiable de que un hook dispara en vivo es un centinela en
fichero (no depende de la salida que Claude Code decida mostrar) más
`/hooks` para confirmar qué se cargó de verdad. Y cuando la causa parece ser
el entorno (raíz de proyecto) y no el propio código, se puede aislar esa
variable moviendo temporalmente el hook a un sitio de control (aquí,
`settings.local.json` de otro proyecto, nunca compartido) en vez de esperar
a reproducir el entorno "correcto" — más rápido y, sobre todo, evidencia
real en vez de una suposición razonable sin comprobar.
