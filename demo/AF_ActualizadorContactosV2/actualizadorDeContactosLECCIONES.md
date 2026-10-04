# Actualizador de Contactos — Problemas Reales y Limitaciones

| | |
|---|---|
| **Feature** | Actualizador de Contactos |
| **Documento técnico principal** | [actualizadorDeContactosDOCU.md](actualizadorDeContactosDOCU.md) |
| **Última actualización** | 2026-10-04 |
| **Org de referencia** | Agentforce_Sandbox |

## Índice

1. [Problemas reales encontrados y lecciones aprendidas](#problemas-reales)
2. [Limitaciones y alcance futuro](#limitaciones)

## 1. Problemas reales encontrados y lecciones aprendidas {#problemas-reales}

Fallos reales encontrados durante el desarrollo de la feature en el org de referencia, con su causa raíz y la solución aplicada. Viven fuera del documento técnico para que este describa solo cómo funciona la feature hoy.

### Problema 1 — `versionIdentifier` inválido al desplegar el Prompt Template {#problema-1}

**Síntoma.** Con el XML del Prompt Template escrito a mano y un `versionIdentifier` inventado (`"v1"`), el despliegue falló:

```
Failure to create template: ... Caused by: [The prompt template version identifier is "v1" invalid.]
```

**Causa raíz.** Ese identificador lo genera la plataforma; no es un valor libre.

**Solución.** Quitar el campo del XML y dejar que Salesforce lo asigne. Después, recuperar el componente con `sf project retrieve start --metadata GenAiPromptTemplate:AF_ActualizadorContactos_BusinessCardExtractor` para traer el identificador real al repositorio.

**Lección.** En metadata de IA generativa, los identificadores de versión se recuperan del org, nunca se redactan.

### Problema 2 — El primer despliegue pareció funcionar pero no dejó nada en el org {#problema-2}

**Síntoma.** Un despliegue conjunto del Prompt Template (que falló por el Problema 1), las clases Apex y el LWC devolvió `"success": true` en estos últimos, pero nada quedó creado.

**Causa raíz.** Con `rollbackOnError: true` (valor por defecto), el fallo de un solo componente revierte toda la transacción, incluidos los componentes que habían validado bien.

**Solución.** Desplegar el Prompt Template por separado primero y el resto en un segundo despliegue.

**Lección.** Ante un despliegue con varios tipos de metadata, mirar el `status` global de la transacción, no los `componentSuccesses` individuales.

### Problema 3 — `Invalid input value: 069... for item Input:File` en ejecución {#problema-3}

**Síntoma.** Con todo desplegado, al subir una imagen la IA no llegaba a analizarla: Apex lanzaba `AuraHandledException` con ese mensaje, pese a que el Id `069...` era un `ContentDocument` correcto.

**Causa raíz.** Se asignaba el Id directamente (`fileValue.value = contentDocumentId`). Para un input de tipo referencia a registro, la Connect API espera un mapa con la clave `'id'`.

**Solución.**

```apex
Map<String, String> fileRecordId = new Map<String, String>{ 'id' => contentDocumentId };
fileValue.value = fileRecordId;
```

**Lección.** En `ConnectApi.WrappedValue`, un registro se pasa como `{ 'id' => ... }`, no como Id suelto.

### Problema 4 — "fields being inaccessible" y "No such column 'Contact__c'" en el objeto de log {#problema-4}

**Síntoma.** Tras añadir el objeto de log, 3 tests fallaron con dos mensajes distintos:

```
System.DmlException: Operation failed due to fields being inaccessible on Sobject AF_ActualizadorContactos_UpdateLog__c...
System.QueryException: No such column 'Contact__c' on entity 'AF_ActualizadorContactos_UpdateLog__c'...
```

**Causa raíz.** Desplegar un objeto o un campo custom por Metadata API no concede CRUD ni FLS a ningún perfil, ni siquiera al del usuario que despliega. Sin FLS, Salesforce lo reporta unas veces como "inaccessible" (DML) y otras como si el campo no existiera (SOQL): es el mismo síntoma.

**Solución.** El Permission Set `AF_ActualizadorContactos_Access` (ver [Modelo de seguridad](actualizadorDeContactosDOCU.md#modelo-seguridad)), asignado con `sf org assign permset --name AF_ActualizadorContactos_Access`.

**Lección.** Todo objeto custom nuevo se despliega junto con su Permission Set, y este se asigna antes de correr tests.

### Problema 5 — `saveExtractedFields` recibía todos los campos vacíos {#problema-5}

**Síntoma.** Al pulsar "Guardar" saltaba siempre "El apellido es obligatorio...", incluso con el campo visiblemente relleno. Se descartaron varias hipótesis (falta de `.trim()`, `onchange` frente a `oninput`, caché del navegador).

**Causa raíz.** Un `System.debug` temporal, leído en vivo con `sf apex tail log`, mostró que todos los campos llegaban en `null` a Apex. Pasar una clase Apex (`ContactExtraction`) como parámetro de entrada de un método `@AuraEnabled` invocado desde LWC no es fiable: la plataforma puede construir una instancia vacía. La misma clase como tipo de retorno funciona sin problemas.

**Solución.** Cambiar la firma de `saveExtractedFields` a parámetros primitivos sueltos y enviar desde el LWC cada valor por separado.

**Lección.** En métodos `@AuraEnabled` llamados desde LWC, los tipos Apex propios son fiables como retorno, no como entrada. Cuando un fallo no cuadra con el código, `System.debug` más `sf apex tail log` enseña qué llega de verdad al servidor.

### Problema 6 — Se guardaba un email con espacio aunque el campo se veía correcto {#problema-6}

**Síntoma.** Un guardado falló en Apex con `INVALID_EMAIL_ADDRESS: invalid email address: fabrica denubes@gmail.com`, pese a que el campo mostraba `fabricadenubes@gmail.com` sin espacio.

**Causa raíz.** El valor visible del `lightning-input` y el estado interno (`this.email`) se habían desincronizado, probablemente por autocompletado o autocorrección del navegador, que cambia el valor visible sin disparar el evento `input`.

**Solución.** En `handleSave()`, releer el valor de cada input directamente del DOM justo antes de validar y guardar (ver [LWC](actualizadorDeContactosDOCU.md#componente-lwc)).

**Lección.** Cuando el estado del componente y el DOM pueden divergir por causas externas (autofill, extensiones, gestores de contraseñas), la validación previa a una acción irreversible se lee del DOM.

## 2. Limitaciones y alcance futuro {#limitaciones}

**Fuera de alcance en la versión actual:**

- No crea ni actualiza el `Account` a partir de `companyName`: el dato solo se muestra, deshabilitado.
- No soporta documentos de varias páginas ni extracción de tablas.
- No hay autoguardado sin revisión humana: es una decisión de diseño, no una limitación técnica.
- No añade campos custom a `Contact` para datos sin campo estándar equivalente.
- El historial muestra como máximo las 50 filas más recientes.
- El archivo subido queda adjunto al `Contact`; la feature no lo borra tras el análisis.

**Posibles siguientes pasos:**

- Enlazar o crear el `Account` a partir de `companyName` cuando no haya coincidencia.
- Reutilizar el objeto de log (`Source__c`) para otros orígenes de cambio sobre `Contact`.
- Soporte de varios idiomas en el prompt (hoy `message` se fuerza a español).
