---
name: naming-convention
description: Aplica la convención de nombrado del squad de Agentforce (prefijo AF_) a cualquier componente Salesforce nuevo o renombrado en este proyecto — API names y labels. Usar cuando se cree, genere o renombre un componente desplegable (Apex, LWC, Permission Set, Custom Object/Field, Prompt Template, Flow, Custom Metadata Type, etc.) en AGENTFORCE_SANDBOX, o cuando el usuario pida "sigue la convención de naming", "nómbralo según el estándar del squad", "aplica AF_ a esto".
tools: Read, Glob, Grep
---

# Convención de nombrado — squad Agentforce (`AF_`)

Todo componente Salesforce **desplegable** que se cree en este proyecto para un desarrollo del squad de Agentforce lleva el prefijo `AF_<NombreDesarrollo>_`, tanto en el **API name / developer name** como en el **label humano** visible en Setup. Las dos superficies, no solo una — un componente con el API name correcto pero el label sin prefijo es una convención a medias.

`NombreDesarrollo` es el nombre de la feature en **PascalCase, sin espacios ni acentos** (el mismo criterio que ya usa la skill `doc-harness` para nombrar ficheros de documentación, pero sin la primera letra en minúscula). Ejemplo: la feature "Actualizador de Contactos" → `ActualizadorContactos`.

## Ejemplo de referencia (cópialo, no lo reinventes)

La feature "Actualizador de Contactos" es el caso ya aplicado end-to-end en este proyecto — si tienes dudas de cómo nombrar algo, mira cómo quedó ahí primero.

| Tipo | API name / developer name | Label / masterLabel |
|---|---|---|
| Apex Class | `AF_ActualizadorContactos_Controller` | — (Apex no tiene label separado) |
| Apex Test | `AF_ActualizadorContactos_ControllerTest` | — |
| Permission Set | `AF_ActualizadorContactos_Access` | `AF_Actualizador de Contactos - Acceso` |
| Prompt Template (GenAiPromptTemplate) | `AF_ActualizadorContactos_BusinessCardExtractor` | `AF_Contact BusinessCard Extractor` |
| Custom Object | `AF_ActualizadorContactos_UpdateLog__c` | `AF_Contact Field Update Log` (label) / `AF_Contact Field Update Logs` (pluralLabel) |
| LWC (bundle/API name) | `af_ActualizadorContactos` — **excepción**, ver más abajo | `AF_Actualizador de Contactos` (`masterLabel`, sin excepción) |
| Agent Script (aiAuthoringBundle: carpeta, fichero `.agent` y `developer_name`) | `AF_PersonalizacionTratamientosAura` | `AF_Personalización Tratamientos Aura` (`agent_label`) |
| Data Library (`sf agent adl create --developer-name` / `--name`) | `AF_PersonalizacionTratamientosAura_DataLibrary` | `AF_Aura Medical Tratamientos` |

**Data Library — dónde viven sus ficheros fuente (validado con el usuario el 2026-09-28):** los documentos con los que se monta una Data Library se guardan siempre en `docs/<PREFIJO><NombreDesarrollo>/dataLibrary/` antes de subirlos, y se suben desde ahí. Ver el adaptador de Salesforce de la skill `doc-harness`.

## Regla de los labels: prefijo pegado, sin traducir ni reformular

El label se forma anteponiendo `AF_` **literalmente** al texto que el label ya tendría de forma natural — no se traduce, no se reformula, no se le da la vuelta al orden de las palabras. Es un prefijo, no una reescritura:

- `Contact BusinessCard Extractor` → `AF_Contact BusinessCard Extractor`
- `Actualizador de Contactos` → `AF_Actualizador de Contactos`
- `Contact Field Update Log` → `AF_Contact Field Update Log`

## Excepción de plataforma: Lightning Web Components

Un LWC **no puede** empezar por mayúscula — es una regla dura de Salesforce (el bundle/API name debe empezar por minúscula, sin eso el deploy falla). `AF_` con mayúscula no es válido ahí. El patrón validado para este proyecto es `af_<NombreDesarrollo>` (prefijo `af_` en minúscula con guion bajo, luego el nombre en PascalCase): `af_ActualizadorContactos`. Esta excepción es **solo del API name** — el `masterLabel` del LWC (lo que se ve en Lightning App Builder) no tiene esa restricción y lleva el prefijo `AF_` normal, como cualquier otro label.

Ningún otro tipo de metadata de este proyecto tiene una restricción equivalente — si aparece alguno nuevo que si la tenga, documenta la excepción aquí mismo, con el mismo criterio: primero resuelve la restricción de plataforma, luego aplica el prefijo hasta donde la plataforma lo permita.

## Caso especial: desarrollos del curso de plataformización

Si el desarrollo pertenece al curso de plataformización del squad de Agentforce, el prefijo pasa a ser `AF_Plat_<NombreDesarrollo>` en vez de `AF_<NombreDesarrollo>` — se inserta `Plat_` entre `AF_` y el nombre de la feature, tanto en API name/developer name como en label (respetando siempre la excepción de LWC en minúscula: `af_Plat_<NombreDesarrollo>`).

Este caso no siempre es evidente a partir del nombre de la feature. **Si no está claro si el desarrollo pertenece al curso de plataformización, pregúntalo al usuario antes de nombrar el componente** — no lo asumas ni en un sentido ni en el otro.

## Qué NO lleva el prefijo repetido

- **Custom Fields dentro de un objeto ya prefijado**: si el objeto ya es `AF_ActualizadorContactos_UpdateLog__c`, sus campos (`Contact__c`, `Source__c`, etc.) no necesitan repetir `AF_` — ya quedan namespaced por vivir dentro de ese objeto. Solo prefija un campo si vive suelto en un objeto estándar (p. ej. un campo nuevo directamente en `Contact`), porque ahí sí hace falta poder atribuirlo al squad.
- **Clases internas de Apex** (inner classes, DTOs) — se namespacean solas por vivir dentro de una clase ya prefijada.
- **El `title` en runtime que ve el usuario de negocio** (p. ej. el atributo `title` de un `<lightning-card>` en un LWC): ese texto es UI final para el usuario, no un identificador de Setup para admins — se queda con el nombre de negocio limpio, sin `AF_`. El prefijo es para quien navega Setup (Apex, Permission Sets, Prompt Templates, App Builder), no para el usuario final del componente.

## Antes de nombrar algo nuevo

1. Deriva `NombreDesarrollo` en PascalCase del nombre de la feature.
2. Si no está claro si el desarrollo pertenece al curso de plataformización, pregúntalo al usuario — de eso depende si el prefijo es `AF_` o `AF_Plat_`.
3. Aplica `AF_<NombreDesarrollo>_<Sufijo>` (o `AF_Plat_<NombreDesarrollo>_<Sufijo>` si es del curso de plataformización) al API/developer name de cada componente desplegable, con la excepción de LWC → `af_<NombreDesarrollo>` / `af_Plat_<NombreDesarrollo>`.
4. Aplica el mismo prefijo + el label natural (sin reformular) a cada label/masterLabel correspondiente.
5. Si es un LWC, deja el `title` visible en runtime sin prefijo.
6. Si dudas de un caso no cubierto aquí, compáralo con la tabla de "Actualizador de Contactos" antes de improvisar un patrón nuevo.
