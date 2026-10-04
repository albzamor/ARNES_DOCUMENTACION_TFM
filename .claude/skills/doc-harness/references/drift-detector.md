# Detector de deriva — uso e interpretación

El detector (`scripts/drift_detector.py`) compara la fecha **Última
actualización** de un `DOCU.md` contra el historial de git real de cada
componente listado en su `MANIFEST.md`. No mide si el Markdown está bien
formado — mide si sigue describiendo el código que dice describir.

## Cuándo correrlo

No es parte de la generación (paso 10 de [SKILL.md](../SKILL.md) lo deja
claro). Es una comprobación bajo demanda o periódica:

- El usuario pregunta "¿esta documentación sigue al día?".
- Antes de dar por buena una entrega o cierre de sprint.
- Como paso de CI, sobre las features que cambian más a menudo.

## Uso

```bash
python3 .claude/skills/doc-harness/scripts/drift_detector.py \
  --doc docs/<CarpetaFeature>/<nombreFeature>DOCU.md \
  --manifest docs/<CarpetaFeature>/<nombreFeature>MANIFEST.md \
  --source-repo <ruta al repo que contiene el código real>
```

`--source-repo` es obligatorio y casi siempre **distinto** del repo donde
viven los documentos — en este proyecto, la documentación vive en
`TOOLS_AGENTFORCE` y el código real en `AGENTFORCE_SANDBOX` (o cualquier
otro repo de cliente). El detector no asume que están en el mismo sitio.

## Cómo leer la salida

- **✓ sin deriva** — el código de ese componente no ha cambiado desde la
  fecha "Última actualización" del DOCU. No hace falta tocar nada.
- **⚠ deriva detectada** — el componente tiene commits posteriores a la
  fecha documentada. Se reporta la fecha del último commit y cuántos
  commits de retraso lleva la documentación sobre ese componente concreto
  — no todo el documento necesita reescribirse, solo la sección que
  describe ese componente.
- **? sin historial de git en esa ruta** — la ruta del MANIFEST no tiene
  commits en ese repo. Dos causas típicas, y el detector no distingue entre
  ellas automáticamente:
  - el componente nunca se comiteó (quedó como cambio local/untracked);
  - la ruta cambió (se movió o renombró el fichero) y el MANIFEST quedó
    desactualizado en sí mismo — esto es, de hecho, la forma más sutil de
    deriva: ni siquiera el propio inventario de componentes es de fiar.

## Qué hacer ante una deriva real

1. Revisa el `git log` del componente concreto para ver qué cambió.
2. Si el cambio afecta a lo documentado, vuelve a pasar por el arnés
   (`doc-harness`) solo para ese componente — no hace falta rehacer todo el
   documento desde cero, el paso de confirmación de componentes (paso 4 de
   SKILL.md) admite una lista parcial.
3. Si el cambio es cosmético/irrelevante para el documento (p. ej. un
   comentario, un formateo), decide conscientemente **no** regenerar y
   dilo — la fecha de "Última actualización" sigue siendo honesta si se
   revisó y se decidió que no hacía falta cambiar nada, distinto de no
   haberla revisado nunca.
