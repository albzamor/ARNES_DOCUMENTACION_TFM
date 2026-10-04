# Resumen Actualizador de Contactos

| | |
|---|---|
| **Feature** | Actualizador de Contactos |
| **Squad** | Agentforce (`AF_`) |
| **Estado** | Desplegado en el org de referencia |
| **Org de referencia** | Agentforce_Sandbox |
| **Documento técnico** | [actualizadorDeContactosDOCU.md](actualizadorDeContactosDOCU.md) |

```{=openxml}
<w:p/>
<w:p/>
```

## Qué hace

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

Desde la ficha de un contacto se sube la foto o el PDF de una tarjeta de visita o un carnet, y la IA rellena por ti nombre, apellidos, cargo, email y teléfonos. Tú revisas, corriges si hace falta y confirmas; cada cambio queda registrado con su valor anterior, quién lo hizo y cuándo.

```{=openxml}
<w:p/>
<w:p/>
```

## Cómo funciona (en 5 pasos)

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

1. Abres un contacto y subes el documento en el componente "Actualizador de Contactos".
2. La IA lee el documento y extrae los datos de contacto.
3. Aparece un formulario ya rellenado, que puedes editar.
4. Pulsas "Guardar en Contacto" y el contacto se actualiza.
5. El historial del componente muestra una fila por cada dato que ha cambiado.

```{=openxml}
<w:p/>
<w:p/>
```

## Diagrama de arquitectura

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant LWC as 𝗟𝗪𝗖<br/>af_ActualizadorContactos
    participant Apex as 𝗔𝗣𝗘𝗫<br/>AF_ActualizadorContactos_Controller
    participant PT as 𝗣𝗥𝗢𝗠𝗣𝗧 𝗧𝗘𝗠𝗣𝗟𝗔𝗧𝗘<br/>AF_ActualizadorContactos_BusinessCardExtractor
    participant Contact as 𝗢𝗕𝗝𝗘𝗧𝗢 𝗘𝗦𝗧𝗔𝗡𝗗𝗔𝗥<br/>Contact
    participant Log as 𝗖𝗨𝗦𝗧𝗢𝗠 𝗢𝗕𝗝𝗘𝗖𝗧<br/>AF_ActualizadorContactos_UpdateLog__c

    Usuario->>LWC: Sube la foto o el PDF de la tarjeta
    LWC->>Apex: Pide analizar el archivo subido

    rect rgb(255, 244, 214)
        Note over Apex,PT: 🤖 Llamada al LLM (IA generativa)
        Apex->>PT: Envía el documento a la plantilla
        PT-->>Apex: Devuelve los datos de contacto en JSON
    end

    Apex->>Apex: Limpia y convierte el JSON en datos
    Apex-->>LWC: Devuelve los datos extraídos
    LWC-->>Usuario: Muestra el formulario prellenado
    Usuario->>LWC: Revisa, corrige y pulsa Guardar
    LWC->>Apex: Envía los valores confirmados

    rect rgb(183, 228, 199)
        Note over Apex,Log: 📦 𝗦𝗮𝗹𝗶𝗱𝗮 — datos guardados y auditados
        Apex->>Contact: 𝗔𝗰𝘁𝘂𝗮𝗹𝗶𝘇𝗮 𝗲𝗹 𝗰𝗼𝗻𝘁𝗮𝗰𝘁𝗼
        Apex->>Log: 𝗥𝗲𝗴𝗶𝘀𝘁𝗿𝗮 𝘂𝗻𝗮 𝗳𝗶𝗹𝗮 𝗽𝗼𝗿 𝗰𝗮𝗺𝗽𝗼 𝗰𝗮𝗺𝗯𝗶𝗮𝗱𝗼
    end

    LWC-->>Usuario: Avisa del éxito y refresca el historial
```

```{=openxml}
<w:p/>
<w:p/>
```

## Componentes creados

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

| Tipo | Nombre |
|---|---|
| Prompt Template | `AF_ActualizadorContactos_BusinessCardExtractor` |
| Custom Object | `AF_ActualizadorContactos_UpdateLog__c` |
| Permission Set | `AF_ActualizadorContactos_Access` |
| Apex | `AF_ActualizadorContactos_Controller` |
| Apex (test) | `AF_ActualizadorContactos_ControllerTest` |
| LWC | `af_ActualizadorContactos` |

```{=openxml}
<w:p/>
<w:p/>
```

## Dónde ampliar información

```{=openxml}
<w:p><w:pPr><w:keepNext/></w:pPr></w:p>
```

- [Documento técnico completo](actualizadorDeContactosDOCU.md)
- [Inventario de componentes](../actualizadorDeContactosMANIFEST.md)
- [Problemas reales y limitaciones](actualizadorDeContactosLECCIONES.md)
