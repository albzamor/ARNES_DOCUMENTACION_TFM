# Instalación y uso

Esta guía explica cómo poner en marcha el arnés de documentación, cómo usarlo y cómo llevarlo a otro proyecto.

## 1. Requisitos

| Herramienta | Para qué | Versión probada |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | Ejecuta la skill y el hook | — |
| Node.js | Servidor MCP `sf-doc-mcp` | 26 |
| Python 3 | Linter de comprensión y detector de deriva | 3.11 |
| [pandoc](https://pandoc.org) | Exportación a Word | 3.10 |
| Google Chrome | Convertir los diagramas Mermaid en imagen | — |
| git | El detector de deriva lee el historial | — |
| jq | El hook lo usa para leer qué fichero se ha guardado | — |

Sin Node, pandoc ni Chrome el arnés sigue generando la documentación en Markdown y el linter funciona. Solo se pierde la exportación a Word y a imagen. Sin jq, el hook no se dispara y el linter hay que lanzarlo a mano.

## 2. Instalación

```bash
# 1. Clonar el repositorio
git clone <URL del repositorio>
cd ARNES_DOCUMENTACION_TFM

# 2. Instalar las dependencias del servidor MCP
cd mcp-servers/sf-doc-mcp
npm install
cd ../..

# 3. Abrir Claude Code en la raíz del repositorio
claude
```

Al abrirlo, Claude Code detecta tres cosas sin configuración adicional:

- **La skill** `doc-harness`, en `.claude/skills/`. Junto a ella está `naming-convention`, la convención de nombrado del squad: el arnés la detecta y la propone en el momento de nombrado.
- **El hook** del linter, en `.claude/settings.json`.
- **El servidor MCP** `sf-doc-mcp`, declarado en `.mcp.json`. La primera vez, Claude Code pide permiso para activarlo.

Para comprobarlo, dentro de Claude Code: `/hooks` debe mostrar un hook `PostToolUse` y `/mcp` debe listar `sf-doc-mcp`.

## 3. Uso

### Documentar una feature

Pide en lenguaje natural lo que quieres documentar, o invoca la skill por su nombre:

```
/doc-harness documenta la feature <nombre>
```

El arnés recorre cuatro momentos. En cada uno pregunta y espera tu respuesta:

1. **Brief.** Nombre y frase de negocio, alcance, lector objetivo, nivel de detalle y si vas a aportar capturas.
2. **Nombrado.** Convención de nombres, dónde se guarda la documentación y el árbol completo de ficheros que va a crear.
3. **Componentes.** La lista de componentes que ha descubierto en el código, para que la confirmes.
4. **Cierre.** Si recuerdas algún problema real que no esté en git, y si aceptas el resultado, pides cambios o regeneras.

El resultado queda en `docs/<Carpeta>/`:

```
docs/<Carpeta>/
├── <nombre>DOCU.md          documento técnico completo
├── <nombre>MANIFEST.md      inventario de componentes
├── <nombre>LECCIONES.md     problemas reales y límites
├── <nombre>RESUMEN.md       ficha corta para el equipo
├── 2_screenshot/            tus capturas
└── 3_mdXML/                 versión intermedia para generar el Word
```

### Documentar código que vive en otro repositorio

El código a documentar no tiene que estar en este repositorio. Abre Claude Code aquí y añade el otro proyecto como directorio adicional:

```
/add-dir /ruta/al/proyecto/con/el/codigo
```

### Verificar un documento

El hook lanza el linter cada vez que se guarda un fichero `*DOCU.md`. También se puede lanzar a mano:

```bash
python3 .claude/skills/doc-harness/scripts/comprehension_linter.py docs/<Carpeta>/<nombre>DOCU.md
```

Devuelve una lista de errores y avisos. Los errores (enlace interno roto, diagrama sin exportar, captura sin explicación) bloquean el cierre. Los avisos (una sección larga sin ningún elemento visual) son para que decidas tú.

### Comprobar si la documentación sigue al día

```bash
python3 .claude/skills/doc-harness/scripts/drift_detector.py \
  --doc docs/<Carpeta>/<nombre>DOCU.md \
  --manifest docs/<Carpeta>/<nombre>MANIFEST.md \
  --source-repo /ruta/al/repositorio/con/el/codigo
```

Compara la fecha "Última actualización" del documento con el último commit de cada componente del inventario.

### Exportar a Word

Dentro de Claude Code, pide "exporta esta documentación a Word". El arnés usa la herramienta `convert_markdown_to_docx` del servidor MCP y deja el `.docx` en `docs/<Carpeta>/1_docsFinales/`. Para sacar los diagramas como imágenes sueltas, pide "exporta los diagramas"; quedan en `4_diagramas/`.

## 4. Llevar el arnés a otro proyecto

Son tres piezas independientes. Copia las que necesites a la raíz de tu proyecto:

| Pieza | Qué copiar | Qué aporta |
|---|---|---|
| La skill | `.claude/skills/doc-harness/` | El proceso completo y el linter |
| El hook | El bloque `hooks` de `.claude/settings.json` | El linter se lanza solo al guardar |
| El servidor MCP | `mcp-servers/sf-doc-mcp/` y su entrada en `.mcp.json` | Exportación a Word y validación desde otros clientes |

La skill `naming-convention` es específica de mi squad (prefijo `AF_`). Sirve como ejemplo: si tu proyecto tiene su propia convención, sustitúyela por la tuya o bórrala, y el arnés te preguntará la convención directamente.

Si tu tecnología no es Salesforce, Node.js ni una skill de Claude Code, el arnés te lo dirá y te ofrecerá crear un adaptador nuevo en `.claude/skills/doc-harness/references/adapters/`.

## 5. Problemas conocidos

**El hook no se dispara.** Los hooks de proyecto solo se cargan cuando este repositorio es la raíz de la sesión de Claude Code. Si lo abres como directorio adicional desde otro proyecto, la skill funciona pero el hook no. En ese caso el linter se lanza a mano, con el comando de la sección 3.

**La exportación de diagramas falla porque no encuentra Chrome.** El servidor MCP busca Google Chrome o Chromium en sus rutas de instalación habituales de macOS y Linux. Si lo tienes en otra ruta, indícala con la variable de entorno `PUPPETEER_EXECUTABLE_PATH` antes de abrir Claude Code:

```bash
export PUPPETEER_EXECUTABLE_PATH="/ruta/a/tu/chrome"
```

**`/mcp` no muestra `sf-doc-mcp`.** Comprueba que has ejecutado `npm install` en `mcp-servers/sf-doc-mcp/` y que has aceptado el servidor cuando Claude Code lo pidió. La ruta de `.mcp.json` es relativa a la raíz del repositorio; si abres Claude Code desde otra carpeta, regístralo con la ruta absoluta:

```bash
claude mcp add sf-doc-mcp -- node /ruta/absoluta/a/mcp-servers/sf-doc-mcp/src/index.js
```

**El detector de deriva dice "sin historial de git".** El componente existe en disco pero nunca se ha commiteado en el repositorio indicado con `--source-repo`. No significa que esté al día: significa que no se puede saber.
