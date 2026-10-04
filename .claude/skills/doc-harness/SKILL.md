---
name: doc-harness
description: Genera documentación de una feature con una capa deliberada de comprensión humana (diagramas Mermaid, capturas explicadas, adaptada al lector) además de la capa Markdown para IA/motores de búsqueda. Arnés human-centric con 12 puntos de confirmación humana agrupados en 4 momentos de interacción (brief inicial, nombrado/ubicación + árbol de entregables, componentes, revisión de cierre) y verificación automática vía el linter de comprensión. Núcleo agnóstico de stack — ver references/adapters/ para el adaptador de cada tipo de proyecto.
tools: Read, Write, Edit, Bash, Glob, Grep
---

# Arnés de Documentación Comprensible (doc-harness)

Genera la documentación técnica de una feature razonando sobre el código real
(no un scanner por patrones), y produce **dos capas sincronizadas** desde una
misma pasada: una capa Markdown plana (para que otra IA la indexe/lea) y una
capa de comprensión humana (diagramas Mermaid + capturas explicadas,
adaptada a quién la va a leer) que un scanner automático no puede generar
porque requiere juicio, no extracción.

**Por qué existe esto.** Un modelo genera información más rápido de lo que un
humano puede asimilarla. Un `.md` correcto pero sin diagramas ni capturas es
completo para una IA y casi inútil para una persona que necesita entender la
arquitectura en 30 segundos, no leyendo 15 páginas. Este arnés no es "una
skill que también hace diagramas" — la capa humana es el entregable, no un
adorno, y por eso lleva su propio verificador automático (ver
[Linter de comprensión](#7-linter-de-comprensión-verificación-automática)).

**Human-centric, no solo human-in-the-loop puntual.** Este arnés no decide
en silencio nada que requiera criterio, intención o preferencia humana que
la IA no pueda inferir de forma fiable. La lista completa de esos puntos —
qué se pregunta, por qué es del humano y no de la IA, y si para en seco o
solo propone-y-confirma — está en
[Los 12 puntos de decisión humana](#los-12-puntos-de-decisión-humana) más
abajo. Están agrupados en **4 momentos de interacción real**, no sueltos —
el objetivo es una conversación con criterio, no un interrogatorio.

**Núcleo agnóstico de stack.** Este fichero cubre el proceso completo, igual
para cualquier proyecto. Lo específico de cada stack (tipos de metadata,
convención de nombrado, plantilla de marca) vive en `references/adapters/` —
lee el adaptador que corresponda al proyecto actual antes del paso 3. Si no
existe adaptador para este stack, dilo explícitamente y sigue con las
categorías genéricas del paso 3; no inventes un adaptador sobre la marcha.

## Los 12 puntos de decisión humana

| # | Momento | Pregunta | Por qué es del humano | Tipo |
|---|---|---|---|---|
| 1 | 1. Brief | Nombre de la feature + frase de negocio | La IA infiere el "qué" del código, no el "por qué" de negocio | Bloqueante, texto libre |
| 2 | 1. Brief | Alcance: arquitectura general / un flujo concreto / un proceso / una integración externa / otro | Decide qué componentes son relevantes antes de descubrir nada | Bloqueante, elección |
| 3 | 1. Brief | Lector objetivo: developer / arquitecto / consultor funcional / negocio | Determina vocabulario, profundidad y qué diagrama sirve | Bloqueante, elección |
| 4 | 1. Brief | Nivel de detalle (propuesto según el lector, ver tabla en el paso 1) | Propuesta razonable, pero el usuario puede tener un motivo para otro nivel | Propone y confirma |
| 5 | 1. Brief | ¿Capturas ahora o sin ellas? | El usuario decide si tiene evidencia real disponible | Bloqueante |
| 6 | 2. Nombrado | Convención de nombrado **de los ficheros de documentación** (no de los componentes, que siempre llevan su nombre real) | Nunca se asume un prefijo, y puede cambiar con el tiempo | Propone y confirma / bloquea si no hay nada que proponer |
| 7 | 2. Nombrado | Dónde vive la documentación | Depende de la convención del proyecto, no de una ruta fija | Propone y confirma |
| 8 | 2. Nombrado | **Árbol completo de entregables**: qué ficheros/carpetas se van a crear (con nombres reales ya resueltos) y qué queda disponible después, bajo petición | Ver la estructura antes de que exista da margen para pedir otros nombres de ruta y prepara al humano para el trabajo que va a recibir | Bloqueante |
| 9 | 3. Componentes | Confirmar lista de componentes descubiertos | El descubrimiento por Grep/Glob puede fallar por exceso o por defecto | Bloqueante |
| 10 | 3. Componentes | Si una captura es ambigua, qué representa | Adivinar el contenido de una imagen es la inferencia no verificable que este arnés existe para evitar | Bloqueante solo si es ambiguo |
| 11 | 4. Cierre | Revisión de cierre: aceptar / pedir cambios en una sección / regenerar | Entregar y confiar en que el usuario avise si algo falla es pasivo — cerrar el bucle es activo | Bloqueante, una vez por generación completa |
| 12 | 4. Cierre | "¿Algún problema real que yo no haya visto en el git/la conversación?" | La IA solo ve lo que el historial deja ver | Propone (si no hay nada, se omite la sección) y confirma |

## Flujo

### 0. Carpeta de capturas (mecánico)

Crea `docs/<CarpetaFeature>/2_screenshot/` (vacía) — sin preguntar nada
todavía. `<CarpetaFeature>` se resuelve en el paso 2 (nombrado); si aún no
la conoces, usa un nombre provisional en PascalCase a partir de lo que el
usuario haya dicho y renómbralo si hace falta tras el paso 2.

### 1. Brief inicial — MOMENTO 1

Antes de tocar el proyecto, agrupa las preguntas 1-5 en una sola ronda,
no una detrás de otra (usa `AskUserQuestion` con hasta 4 preguntas
estructuradas en la misma llamada — la 1 es texto libre, va aparte en la
conversación):

**Pregunta 1 (texto libre, fuera de AskUserQuestion):** nombre de la feature
y una frase de negocio — qué hace y por qué existe. Si el usuario ya lo dio
en su petición inicial, no lo repreguntes.

**Preguntas 2-5 (una sola llamada a AskUserQuestion, 4 preguntas):**

- *Alcance* — opciones: "Arquitectura general", "Un flujo concreto",
  "Un proceso de negocio", "Una integración externa", más la opción libre
  que da la propia herramienta. El alcance elegido filtra qué se busca en
  el paso 3 — no descubras componentes fuera de él salvo referencia cruzada
  directa.
- *Lector objetivo* — opciones: "Developer", "Arquitecto", "Consultor
  funcional", "Negocio".
- *Nivel de detalle* — propuesto según el lector (no bloquea si el usuario
  acepta la sugerencia, pero se dice en voz alta):

  | Lector | Nivel sugerido | Qué cambia en el documento |
  |---|---|---|
  | Developer | Técnico | Sección "Componentes en detalle" completa, código citado inline, diagrama de flujo con variables si aplica |
  | Arquitecto | Técnico profundo | Igual que developer + énfasis en "Decisiones de diseño clave" y alternativas descartadas |
  | Consultor funcional | Funcional | "Componentes en detalle" se resume a una tabla corta; el peso va en "Recorrido visual" y el diagrama de arquitectura en lenguaje llano |
  | Negocio | Ejecutivo | Solo "Resumen ejecutivo" + diagrama de arquitectura simplificado (sin nombres técnicos) + "Recorrido visual"; se omite "Componentes en detalle" |

  No dupliques el documento por audiencia por defecto — genera **una**
  versión al nivel elegido. Generar varias versions (una por audiencia) es
  una capacidad válida solo si el usuario la pide explícitamente para ese
  caso.
- *Capturas* — "Subo capturas ahora" / "Genera sin ellas por ahora". Si
  "ahora", no sigas al paso 2 sin confirmación de que ya están subidas.

### 2. Convención de nombrado, ubicación y árbol de entregables — MOMENTO 2

Resuelve las preguntas 6-8 — **antes de crear ningún fichero real**, nunca
en silencio:

1. Busca si el proyecto tiene una skill o documento de convención de
   nombrado propio (p. ej. `.claude/skills/naming-convention/`, una sección
   en `CLAUDE.md`). Si existe, propónsela: *"Este proyecto usa la convención
   X (ejemplo: `<caso real>`) — ¿la aplico, o prefieres otra?"*. Si no
   existe, pregunta directamente.

   **Alcance de esta convención — solo para los ficheros de documentación,
   nunca para los componentes documentados.** Esta pregunta decide cómo se
   llaman `<CarpetaFeature>` y `<nombreFeature>` (la carpeta y los ficheros
   `DOCU.md`/`MANIFEST.md`/...). Una convención de nombrado de proyecto
   (p. ej. un prefijo de squad) puede cambiar con el tiempo, y su uso real
   — aplicarla al *crear* componentes nuevos — es responsabilidad de otra
   skill (p. ej. `naming-convention`), no de esta. **Los componentes que
   este arnés documenta se citan siempre con su nombre real, exactamente
   como existen en el código o el org — nunca "corregidos" a lo que la
   convención diría que deberían llamarse**, aunque un componente antiguo o
   de otro origen no la siga. Si al construir el inventario del paso 4
   detectas un componente cuyo nombre real se desvía de la convención
   vigente, dilo como nota informativa junto a ese componente — nunca lo
   renombres ni lo omitas por no encajar.
2. Busca si el proyecto ya tiene una convención de ubicación para `docs/`.
   Si la encuentras, confírmala en una frase; si no, propone `docs/` en la
   raíz y pide confirmación.
3. Deriva `<CarpetaFeature>` y `<nombreFeature>` de la respuesta — nunca
   inventes un prefijo no confirmado. Renombra la carpeta de capturas del
   paso 0 si el nombre provisional no coincide.
4. **Muestra el árbol completo de entregables, con los nombres reales ya
   resueltos**, y pide confirmación explícita antes de seguir. Esto es lo
   que prepara al humano para el trabajo que va a recibir — nunca lo omitas
   ni lo des por implícito:

   ```
   docs/<CarpetaFeature>/
   ├── <nombreFeature>DOCU.md          ← documento técnico completo
   ├── <nombreFeature>MANIFEST.md      ← inventario de componentes
   ├── <nombreFeature>LECCIONES.md     ← problemas reales + límites (se omite si no hay evidencia)
   ├── <nombreFeature>RESUMEN.md       ← ficha corta para el equipo
   ├── 2_screenshot/                   ← tus capturas, si las subes
   └── 3_mdXML/                        ← versión técnica intermedia (no hace falta mirarla)
   ```

   Deja igual de explícito qué **no** se crea todavía, y qué se puede pedir
   después, bajo petición — `1_docsFinales/` y `4_diagramas/` **no** se
   crean por defecto:

   - Exportar todo a Word (`.docx`) → `1_docsFinales/`
   - Exportar los diagramas Mermaid como imagen suelta → `4_diagramas/`
   - Comprobar si la documentación sigue al día con el código real
     (detector de deriva, ver paso 10)

   Cierra con una pregunta directa: *"¿Te vale esta estructura y estos
   nombres, o quieres cambiar alguna ruta antes de que cree nada?"*. Si pide
   cambios, ajusta el árbol y vuelve a confirmarlo antes de continuar.

### 3. Descubrir componentes

Lee el adaptador de `references/adapters/` que corresponda al stack del
proyecto (ver tabla de adaptadores disponibles al final de este fichero) y
usa su tabla de tipos de componente, **acotado por el alcance elegido en el
paso 1** — no descubras toda la arquitectura si el usuario pidió "un flujo
concreto". Si no hay adaptador, usa estas categorías genéricas: código/
lógica de negocio, interfaz de usuario, modelo de datos, automatización/
reglas, control de acceso, integración con IA/LLM, configuración/
infraestructura.

Usa `Grep`/`Glob` para encontrar referencias cruzadas — así no se escapan
piezas relacionadas que el usuario no nombró de memoria, incluso dentro del
alcance elegido.

### 4. Confirmar componentes — MOMENTO 3

Resuelve la pregunta 9. **Antes de escribir nada**, presenta la lista de
componentes encontrados (con ruta exacta) y pide confirmación explícita —
siempre, no la saltes aunque parezca obvia. En cuanto confirma, escribe
`<nombreFeature>MANIFEST.md`. Formato: ver
[references/template.md](references/template.md), sección Manifest.

### 5. Leer y escribir el documento

Lee cada componente confirmado por completo (no solo grep de firmas).
Escribe siguiendo [references/template.md](references/template.md), **al
nivel de detalle acordado en el paso 1** (tabla de la pregunta 4): DOCU
técnico, LECCIONES, RESUMEN corto. Reglas de formato están en el template —
no las repitas de memoria, léelas.

### 6. Incorporar capturas reales

Si `2_screenshot/` tiene contenido, **antes de referenciar ninguna imagen**,
renombra cada fichero a kebab-case descriptivo con número de orden secuencial
según el punto del flujo que representa (p. ej. `3-confirmando-capturas.jpg`,
nunca el nombre original del sistema de capturas, que suele traer espacios
sin codificar y no dice nada del contenido — ver
[Problema 3 de LECCIONES](../../../docs/SK_DocHarness/docHarnessLECCIONES.md#problema-3)).
Este renombrado es un paso obligatorio, no una opción de estilo: un nombre
con espacios sin codificar puede romper la conversión a Word, y un nombre
descriptivo con orden es lo que permite reconstruir el recorrido visual solo
mirando la carpeta.

Con los ficheros ya renombrados, incorpora cada imagen en la sección más
relevante. Resuelve la pregunta 10: si el nombre de fichero o el contenido no
dejan claro qué punto del flujo representa, pregunta antes de suponerlo —
nunca inventes la explicación de una captura. Con la respuesta (o si ya era
obvio), explica siempre, en un párrafo normal debajo, **qué se ve** y **en
qué punto del flujo estamos**.

### 7. Linter de comprensión — verificación automática

Antes de la revisión de cierre, corre el linter:

```bash
python3 .claude/skills/doc-harness/scripts/comprehension_linter.py \
  docs/<CarpetaFeature>/<nombreFeature>DOCU.md
```

Está también wireado como hook (`PostToolUse` sobre `Write`/`Edit` de
ficheros `*DOCU.md`) — ver `.claude/settings.json`. **El hook solo dispara
si este repo es la raíz real del proyecto de la sesión de Claude Code** —
no si se alcanza como directorio de trabajo adicional desde otra sesión (ver
[Problema: los hooks no cargan desde un directorio adicional](../../../ARNES_COMPRENSION.md#problema-hooks-directorio-adicional)).
Si el hook no aparece en `/hooks`, no es el linter (corre el comando manual
de arriba para comprobarlo) — comprueba primero cuál es la raíz real de la
sesión. El linter falla si:

- algún `[texto](#id)` no tiene su `{#id}` en ningún encabezado;
- algún bloque ```mermaid del documento no tiene su imagen exportada en
  `4_diagramas/`;
- alguna captura de `2_screenshot/` referenciada no lleva un párrafo
  explicativo real debajo;
- (aviso, no bloqueante) una sección larga sin ningún diagrama ni captura.

### 8. Revisión de cierre — MOMENTO 4

Resuelve las preguntas 11-12, **una vez por generación completa** (no en
ediciones menores posteriores):

1. Antes de finalizar `LECCIONES.md`, pregunta: *"¿Hay algún problema real
   que recuerdes de esta feature y que yo no haya visto en el git o en
   nuestra conversación?"*. Si no hay nada, omite la sección tal como ya
   indica el template — dilo explícitamente, no la dejes en blanco sin más.
2. Presenta un resumen de cierre: qué documentos se generaron, el resultado
   íntegro del linter (checklist de errores/avisos, **nunca un porcentaje
   de confianza inventado**), y los párrafos explicativos redactados para
   cada captura (para que el usuario los valide, no solo las imágenes).
3. Pregunta cómo cerrar: **aceptar tal cual** / **pedir cambios en una
   sección concreta** / **regenerar**. Si pide cambios, vuelve al paso 5
   solo para esa sección — no regeneres el documento entero por defecto.

### 9. (Opcional) Exportar a Word y diagramas sueltos

`convert_markdown_to_docx` / `export_mermaid_diagrams` del servidor
`sf-doc-mcp` — incluye también `validate_document`, que envuelve el linter
de comprensión para poder correrlo también fuera de Claude Code (CI, otro
cliente MCP) sin duplicar su lógica — ver
[references/template.md](references/template.md) para rutas de salida
(`1_docsFinales/`, `4_diagramas/`) y cuándo regenerar cada uno.

### 10. Detector de deriva — cuándo correrlo

No forma parte de la generación — es una comprobación bajo demanda que
compara la fecha de "Última actualización" de un DOCU.md contra el último
commit real de cada componente de su MANIFEST. Ver
[references/drift-detector.md](references/drift-detector.md). Ejecútalo
cuando el usuario pida "revisar si la documentación está al día".

## Adaptadores disponibles

| Adaptador | Cuándo usarlo |
|---|---|
| [references/adapters/salesforce.md](references/adapters/salesforce.md) | Proyecto Salesforce DX (`sfdx-project.json` presente): Apex, LWC, Flow, Custom Object, Agent Script, Bot/GenAiPlannerBundle... |
| [references/adapters/nodejs.md](references/adapters/nodejs.md) | Proyecto Node.js/JavaScript (`package.json` presente, sin `sfdx-project.json`): módulos, CLI, tools de un servidor MCP, dependencias npm... |
| [references/adapters/claude-code-skill.md](references/adapters/claude-code-skill.md) | Skill o plugin de Claude Code (`.claude/skills/<nombre>/SKILL.md` con frontmatter): la propia skill, sus referencias, scripts, hooks relacionados... |

Si documentas un stack sin adaptador, dilo al usuario y ofrece crear uno
nuevo en `references/adapters/<stack>.md` a partir de lo que aprendas en esa
sesión — así el arnés crece por uso real, no por diseño anticipado.

## Qué NO hacer

- No asumas alcance, lector, nivel de detalle, convención de nombrado o
  ubicación de `docs/` sin resolverlos en los momentos 1 y 2.
- No renombres ni "corrijas" un componente en la documentación para que
  encaje con la convención de nombrado — cita siempre su nombre real, tal
  cual existe en el código o el org. La convención de nombrado confirmada
  en el momento 2 es solo para los ficheros de documentación; crear
  componentes que la sigan es trabajo de otra skill, no de este arnés.
- No crees ningún fichero real (MANIFEST, DOCU...) antes de mostrar y
  confirmar el árbol completo de entregables — la carpeta de capturas del
  paso 0 es la única excepción, porque es mecánica y vacía.
- No descubras componentes fuera del alcance acordado salvo referencia
  cruzada directa.
- No escribas el documento sin la confirmación de componentes (momento 3).
- No inventes secciones (problemas encontrados, decisiones de diseño) sin
  evidencia real — y antes de cerrar LECCIONES, pregunta explícitamente si
  falta algo que tú no puedas ver.
- No dejes una captura sin su párrafo explicativo, ni inventes qué muestra
  una captura ambigua sin preguntar.
- No entregues sin la revisión de cierre (momento 4) — nunca asumas que
  "sin noticias, buenas noticias".
- No inventes un porcentaje de confianza — el linter da un checklist
  verificable, no una métrica fabricada.
- No generes varias versiones por audiencia salvo que el usuario lo pida
  explícitamente para ese caso — una versión al nivel acordado es el
  comportamiento por defecto.
- No uses un scanner por patrones (`document_feature` u homólogos) para
  generar el contenido — no cubren todos los tipos de componente y no
  pueden razonar el "por qué"; este arnés existe precisamente para eso.
