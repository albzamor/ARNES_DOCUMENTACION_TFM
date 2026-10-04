# Arnés de Documentación Comprensible (doc-harness) — Lecciones Aprendidas

| | |
|---|---|
| **Feature** | Arnés de Documentación Comprensible (doc-harness) |
| **Documento técnico principal** | [docHarnessDOCU.md](./docHarnessDOCU.md) |
| **Última actualización** | 2026-09-24 |
| **Org de referencia** | No aplica |

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## Índice

1. [Problemas reales encontrados y lecciones aprendidas](#problemas-reales)
2. [Limitaciones y alcance futuro](#limitaciones)

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 1. Problemas reales encontrados y lecciones aprendidas {#problemas-reales}

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

### Problema 1 — La convención de nombrado se mezclaba con el nombre de los componentes {#problema-1}

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

**Síntoma.** El diseño inicial del paso "convención de nombrado" no dejaba claro si esa convención se aplicaba solo a los ficheros de documentación o también a cómo se citaban los componentes documentados.

**Causa raíz.** El texto original decía "propónsela al usuario" sin acotar el alcance — un lector (humano o la propia IA en una sesión futura) podía interpretar que un componente que no sigue la convención vigente debía documentarse "corregido".

**Solución.** Se añadió una regla explícita en `SKILL.md` y en los tres adaptadores: la convención de nombrado decide solo los ficheros de la documentación; los componentes se citan siempre con su nombre real, con una nota informativa opcional si se desvían de la convención — nunca renombrados.

**Lección generalizable.** Una regla de nombrado necesita decir explícitamente su alcance (¿a qué se aplica?), no solo su mecanismo (¿cómo se decide?) — la ambigüedad entre ambas es fácil de introducir sin darse cuenta al escribir instrucciones para una IA.

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

### Problema 2 — El hook no disparaba, y la causa no era el propio hook {#problema-2}

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

**Síntoma.** El hook `PostToolUse` no se ejecutaba en ninguna prueba en vivo, pese a estar validado por sintaxis y por pipe.

**Causa raíz.** La sesión de Claude Code tenía un proyecto distinto (`AGENTFORCE_SANDBOX`) como raíz real — `TOOLS_AGENTFORCE` se alcanzaba solo como directorio de trabajo adicional, y los hooks de proyecto no cargan desde ahí.

**Solución.** Diagnosticado con un fichero centinela (prueba que no depende de la salida que Claude Code decida mostrar) y confirmado copiando temporalmente el hook, con ruta absoluta, a `settings.local.json` de otro proyecto — dos disparos reales confirmaron que el hook en sí era correcto al 100%.

**Lección generalizable.** Cuando algo "no dispara", separar la variable de "está mal escrito" de "no está cargado en esta sesión" — son diagnósticos distintos con soluciones distintas. Detalle completo en [ARNES_COMPRENSION.md](../../../ARNES_COMPRENSION.md#problema-hooks-directorio-adicional).

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

### Problema 3 — Nombres de captura con espacios sin codificar {#problema-3}

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

**Síntoma.** Las capturas subidas por el usuario tenían nombres con espacios (p. ej. `iScreen Shoter - Code - 260924231315.jpg`), citados sin codificar dentro de `![]()`.

**Causa raíz.** Markdown puede interpretar mal una URL con espacios sin `%20` dentro de un enlace/imagen sin comillas — riesgo real de que Pandoc rompiera la conversión a Word.

**Solución.** Se renombraron los ficheros a kebab-case descriptivo (`1-mensaje-y-widget.jpg`...) antes de referenciarlos, y se actualizaron ambas versiones del DOCU.

**Lección generalizable.** El propio `template.md` nunca documentó esta regla explícitamente — se ha añadido como paso obligatorio en `SKILL.md` (paso 6) y en `template.md` para que futuras generaciones no repitan el mismo riesgo.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 2. Limitaciones y alcance futuro {#limitaciones}

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

- **Un solo caso probado por adaptador de Salesforce/Node.js**, y este mismo documento es la única prueba del adaptador de skills — más casos reforzarían la confianza en la genericidad del núcleo.
- **El hook depende de la raíz de sesión** (ver Problema 2) — no hay forma, desde el propio arnés, de detectar y avisar de esta condición antes de que el usuario la descubra por sorpresa.
- **Sin experimento de comprensión humana todavía** — el linter verifica que la capa humana está *completa* (anchors, diagramas, capturas), no que un humano real la entienda mejor que una alternativa sin arnés. Queda como trabajo pendiente.
- **El Problema 3 ya está corregido en el arnés** — la regla de nombres de fichero descriptivos y numerados es ahora un paso obligatorio en `SKILL.md` (paso 6) y `template.md`, no solo una lección aislada.
