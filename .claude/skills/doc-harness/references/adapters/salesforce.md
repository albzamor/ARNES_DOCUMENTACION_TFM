# Adaptador: Salesforce DX

Usar cuando el proyecto tenga `sfdx-project.json` en la raíz. Este adaptador
solo aporta lo específico de Salesforce — el proceso, los puntos de
confirmación y las reglas de formato siguen siendo los de
[SKILL.md](../../SKILL.md) y [template.md](../template.md).

## Tipos de componente a cubrir (paso 3 de SKILL.md)

| Tipo | Patrón de fichero |
|---|---|
| Apex (clase + test) | `**/classes/*.cls` |
| LWC | `**/lwc/<nombre>/**` |
| Flow | `**/flows/*.flow-meta.xml` |
| Custom Object | `**/objects/*/*.object-meta.xml` + `**/objects/*/fields/*.field-meta.xml` |
| Permission Set | `**/permissionsets/*.permissionset-meta.xml` |
| Prompt Template (GenAiPromptTemplate) | `**/genAiPromptTemplates/*.genAiPromptTemplate-meta.xml` |
| Bot (builder clásico) | `**/bots/<nombre>/**` + `**/genAiPlannerBundles/<nombre>/**` |
| Agent Script (builder nuevo) | `**/aiAuthoringBundles/<nombre>/**` |
| Data Library (ficheros fuente del RAG) | `docs/<PREFIJO><NombreFeature>/dataLibrary/*` — siempre ahí; si el agente tiene bloque `knowledge` y la carpeta no existe, pedir los ficheros al usuario |
| Named Credential / Auth Provider | `**/namedCredentials/*.namedCredential-meta.xml`, `**/authproviders/*.authprovider-meta.xml` |

Usa `Grep`/`Glob` para cruzar referencias (qué Apex referencia un Custom
Object, qué Permission Set da acceso a esa clase).

## Convención de nombrado (paso 2 de SKILL.md)

Si el proyecto tiene su propia skill `naming-convention` (buscar en
`.claude/skills/naming-convention/`), léela y aplícala tal cual — no la
reinventes aquí. Si no existe pero el proyecto sigue un patrón visible en
componentes ya desplegados (prefijo de squad, sufijo de entorno), detéctalo
por ejemplo real y ofrécelo al usuario para confirmación, igual que exige el
paso 2 del núcleo. No asumas un prefijo `AF_`/`AF_Plat_` ni ningún otro sin
verlo en el proyecto o sin que el usuario lo confirme explícitamente — ese
prefijo es específico de un squad concreto (y puede cambiar de un proyecto a
otro, o con el tiempo dentro del mismo proyecto), no una convención
universal de Salesforce.

**Esta convención decide solo el nombre de los ficheros de documentación,
nunca el de los componentes documentados.** `naming-convention` es la skill
que aplica el prefijo `AF_`/`AF_Plat_`/`SK_` **al crear** componentes nuevos
(Apex, LWC, Permission Set...) — ese es su trabajo, no el de `doc-harness`.
Cuando documentes, cita cada componente con su nombre real tal cual existe
desplegado, aunque no siga la convención vigente (p. ej. un componente
legado sin prefijo, o de un squad distinto). Si el MANIFEST muestra un
componente que se desvía de la convención confirmada, añade una nota
informativa junto a esa fila (p. ej. *"No sigue la convención AF_ vigente —
componente legado anterior a su adopción"*) — nunca lo renombres en la
documentación ni lo excluyas del inventario por ese motivo.

## Fila adicional obligatoria: ID de plataforma

Si la feature incluye un Bot/Agente Agentforce, tanto el MANIFEST como la
header table del DOCU llevan siempre su ID de Salesforce (18 caracteres):

```sql
SELECT Id FROM BotDefinition WHERE DeveloperName = '<API name del Bot>'
```

Consíguelo vía consulta SOQL contra el org de referencia — nunca lo
inventes ni lo dejes en blanco. Si el Bot aún no está desplegado, dilo
explícitamente en vez de omitir la fila sin explicación.

## Tabla de tipos para diagramas Mermaid (Unicode Mathematical Sans-Bold)

| Tipo | Copiar tal cual |
|---|---|
| Apex | `𝗔𝗣𝗘𝗫` |
| LWC | `𝗟𝗪𝗖` |
| Flow | `𝗙𝗟𝗢𝗪` |
| Custom Object | `𝗖𝗨𝗦𝗧𝗢𝗠 𝗢𝗕𝗝𝗘𝗖𝗧` |
| Permission Set | `𝗣𝗘𝗥𝗠𝗜𝗦𝗦𝗜𝗢𝗡 𝗦𝗘𝗧` |
| Prompt Template | `𝗣𝗥𝗢𝗠𝗣𝗧 𝗧𝗘𝗠𝗣𝗟𝗔𝗧𝗘` |
| Agent Script | `𝗔𝗚𝗘𝗡𝗧 𝗦𝗖𝗥𝗜𝗣𝗧` |
| Named Credential | `𝗡𝗔𝗠𝗘𝗗 𝗖𝗥𝗘𝗗𝗘𝗡𝗧𝗜𝗔𝗟` |
| Auth Provider | `𝗔𝗨𝗧𝗛 𝗣𝗥𝗢𝗩𝗜𝗗𝗘𝗥` |

Si aparece un tipo no listado, genera el equivalente en Unicode
Mathematical Sans-Bold Capital (rango U+1D5D4–U+1D5ED) letra a letra, nunca
lo dejes en mayúsculas normales sin negrita.

## Herramientas de exportación

Formato/export a Word y diagramas sueltos vía el servidor MCP `sf-doc-mcp`
(`convert_markdown_to_docx`, `export_mermaid_diagrams`) — mismo servidor,
sin cambios respecto al núcleo.
