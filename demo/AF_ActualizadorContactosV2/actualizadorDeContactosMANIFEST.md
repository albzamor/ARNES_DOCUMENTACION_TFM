# Manifest: Actualizador de Contactos

Permite subir una foto o PDF de una tarjeta de visita (o carnet/credencial similar) desde la página de detalle de un Contact; un Prompt Template de Agentforce/Einstein lee el documento y extrae nombre, apellidos, cargo, empresa, email y teléfonos, que el usuario revisa y confirma antes de guardar. Cada cambio queda auditado (campo, valor anterior, valor nuevo, quién y cuándo) en un objeto de log propio.

La feature no incluye ningún Bot/Agente Agentforce ni Data Library, por lo que no lleva ID de agente ni ficheros fuente de RAG.

## Components

| Tipo | API name | Ruta |
|---|---|---|
| Apex | AF_ActualizadorContactos_Controller | `force-app/main/default/classes/AF_ActualizadorContactos_Controller.cls` |
| Apex | AF_ActualizadorContactos_ControllerTest | `force-app/main/default/classes/AF_ActualizadorContactos_ControllerTest.cls` |
| LWC | af_ActualizadorContactos | `force-app/main/default/lwc/af_ActualizadorContactos/` |
| Prompt Template | AF_ActualizadorContactos_BusinessCardExtractor | `force-app/main/default/genAiPromptTemplates/AF_ActualizadorContactos_BusinessCardExtractor.genAiPromptTemplate-meta.xml` |
| Custom Object | AF_ActualizadorContactos_UpdateLog__c | `force-app/main/default/objects/AF_ActualizadorContactos_UpdateLog__c/` |
| Permission Set | AF_ActualizadorContactos_Access | `force-app/main/default/permissionsets/AF_ActualizadorContactos_Access.permissionset-meta.xml` |
