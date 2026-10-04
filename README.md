# Mi Arnés de Documentación

**Una capa Human-in-the-Loop sobre Claude Code para preservar la autoría humana en la generación de documentación asistida por IA.**

Trabajo de Fin de Máster · Xpert IA Aplicada (Jakademy) · Alberto Zamora Hernández · Octubre 2026

## Qué es

Un arnés que convierte la generación de documentación técnica con IA en un proceso dirigido por una persona. Está construido con los tres mecanismos de extensión nativos de Claude Code:

- **Una skill** (`doc-harness`) que guía el proceso. Hace doce preguntas que solo una persona puede responder, agrupadas en cuatro momentos, y escribe la documentación con diagramas y capturas explicadas.
- **Un hook** que lanza un linter de comprensión cada vez que se guarda el documento.
- **Un servidor MCP** (`sf-doc-mcp`) que exporta a Word y valida el documento fuera de Claude Code.

El resultado es una documentación precisa, adaptada a quien la va a leer y de la que el humano sigue siendo el autor.

## Por dónde empezar

| Si quieres… | Abre |
|---|---|
| Leer la memoria | [docs/TFM/1_docsFinales/TFM.docx](docs/TFM/1_docsFinales/TFM.docx) (Word) o [docs/TFM/TFM.md](docs/TFM/TFM.md) (Markdown) |
| Ver un resultado real del arnés | [docs/SK_DocHarness/docHarnessDOCU.md](docs/SK_DocHarness/docHarnessDOCU.md): el arnés documentándose a sí mismo |
| Instalarlo y probarlo | [INSTALACION.md](INSTALACION.md) |
| Ver la demo | [demo/README.md](demo/README.md) |
| Entender la arquitectura a fondo | [ARNES_COMPRENSION.md](ARNES_COMPRENSION.md) |

## Mapa del repositorio

```
.
├── README.md                     este fichero
├── INSTALACION.md                requisitos, instalación y uso
├── ARNES_COMPRENSION.md          arquitectura completa del arnés
├── .mcp.json                     registra el servidor MCP al abrir el repo con Claude Code
├── .claude/
│   ├── settings.json             el hook que lanza el linter al guardar
│   └── skills/doc-harness/       la skill
│       ├── SKILL.md              el proceso: 12 decisiones en 4 momentos
│       ├── references/           plantilla del documento y adaptadores por tecnología
│       └── scripts/              linter de comprensión y detector de deriva
├── mcp-servers/sf-doc-mcp/       servidor MCP: exportación a Word y validación
├── docs/
│   ├── TFM/                      la memoria del trabajo
│   └── SK_DocHarness/            documentación del arnés, generada con el arnés
└── demo/                         vídeo de la demo y caso de referencia
```

## Comprobarlo en cinco minutos

Sin instalar nada más que Python 3, desde la raíz del repositorio:

```bash
# 1. El linter de comprensión, sobre la documentación del propio arnés
python3 .claude/skills/doc-harness/scripts/comprehension_linter.py \
  docs/SK_DocHarness/docHarnessDOCU.md

# 2. El detector de deriva: ¿sigue esa documentación al día con el código?
python3 .claude/skills/doc-harness/scripts/drift_detector.py \
  --doc docs/SK_DocHarness/docHarnessDOCU.md \
  --manifest docs/SK_DocHarness/docHarnessMANIFEST.md \
  --source-repo .
```

El primero comprueba que los enlaces internos resuelven, que los diagramas están exportados y que cada captura lleva su explicación. El segundo compara la fecha del documento con el último cambio real de cada componente en git.

Para usar el arnés completo, con las doce decisiones y la exportación a Word, sigue [INSTALACION.md](INSTALACION.md).
