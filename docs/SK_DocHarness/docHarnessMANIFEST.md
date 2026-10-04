# Manifest: Arnés de Documentación Comprensible (doc-harness)

Genera documentación técnica con una capa de comprensión humana (diagramas Mermaid, capturas explicadas, adaptada al lector) además de la capa Markdown para IA, con puntos de confirmación humana y verificación automática — para cerrar la brecha entre lo que genera una IA y lo que un humano puede entender rápido.

## Components

| Tipo | API name / identificador | Ruta |
|---|---|---|
| Skill | doc-harness | `.claude/skills/doc-harness/SKILL.md` |
| Referencia | template.md | `.claude/skills/doc-harness/references/template.md` |
| Referencia | drift-detector.md | `.claude/skills/doc-harness/references/drift-detector.md` |
| Adaptador | salesforce.md | `.claude/skills/doc-harness/references/adapters/salesforce.md` |
| Adaptador | nodejs.md | `.claude/skills/doc-harness/references/adapters/nodejs.md` |
| Adaptador | claude-code-skill.md | `.claude/skills/doc-harness/references/adapters/claude-code-skill.md` |
| Script | comprehension_linter.py | `.claude/skills/doc-harness/scripts/comprehension_linter.py` |
| Script | drift_detector.py | `.claude/skills/doc-harness/scripts/drift_detector.py` |
| Hook | PostToolUse (`Write\|Edit`) | `.claude/settings.json` |
| MCP Tool | validate_document | `mcp-servers/sf-doc-mcp/src/index.js` + `mcp-servers/sf-doc-mcp/src/validateDocument.js` |
