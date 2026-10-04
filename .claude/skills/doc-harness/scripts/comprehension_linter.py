#!/usr/bin/env python3
"""
Linter de comprensión humana — la pieza central del arnés doc-harness.

No comprueba sintaxis Markdown ni ortografía: comprueba que la CAPA PARA
HUMANOS de un documento generado por IA está realmente completa, no solo la
capa de texto que otra IA sabría leer igual de bien sin ella.

Cuatro reglas:
  1. ANCHORS  — todo [texto](#id) resuelve a un {#id} real en el documento.
  2. DIAGRAMS — todo bloque ```mermaid tiene su imagen exportada en 4_diagramas/.
  3. SCREENSHOTS — toda captura de 2_screenshot/ referenciada lleva un párrafo
     explicativo real debajo (no un pie de foto de una línea).
  4. VISUAL RATIO — ninguna sección larga se queda sin ningún diagrama ni
     captura (aviso, no bloqueante).

Uso:
  python3 comprehension_linter.py <ruta/al/nombreFeatureDOCU.md> [--min-section-lines N] [--min-caption-words N]

Exit code 0 = sin errores (puede haber avisos). Exit code 1 = hay errores.
"""

import argparse
import re
import sys
from pathlib import Path

ANCHOR_DEF_RE = re.compile(r"\{#([a-z0-9\-]+)\}")
ANCHOR_USE_RE = re.compile(r"\]\(#([a-z0-9\-]+)\)")
MERMAID_BLOCK_RE = re.compile(r"```mermaid\n(.*?)\n```", re.DOTALL)
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^(#{2,6})\s+(.+?)\s*(\{#[a-z0-9\-]+\})?\s*$")
OPENXML_BLOCK_RE = re.compile(r"```\{=openxml\}\n.*?\n```\n?", re.DOTALL)


class Finding:
    def __init__(self, level, rule, message, line=None):
        self.level = level  # "error" | "warn"
        self.rule = rule
        self.message = message
        self.line = line

    def __str__(self):
        loc = f" (línea {self.line})" if self.line else ""
        tag = "ERROR" if self.level == "error" else "AVISO"
        return f"[{tag}] {self.rule}{loc}: {self.message}"


def strip_openxml(text):
    """Los bloques OOXML de 3_mdXML/ no son contenido para el humano — no
    deben contar ni para anchors ni para nada. Los quitamos antes de analizar
    para que el linter dé el mismo resultado en ambas versiones del fichero."""
    return OPENXML_BLOCK_RE.sub("", text)


def check_anchors(text):
    findings = []
    defined = set(ANCHOR_DEF_RE.findall(text))
    used = set(ANCHOR_USE_RE.findall(text))
    missing = used - defined
    for anchor_id in sorted(missing):
        findings.append(Finding(
            "error", "ANCHORS",
            f"se referencia #{anchor_id} pero ningún encabezado define {{#{anchor_id}}}",
        ))
    return findings, len(defined), len(used)


def check_diagrams(text, feature_dir):
    findings = []
    mermaid_blocks = MERMAID_BLOCK_RE.findall(text)
    n_blocks = len(mermaid_blocks)
    diagrams_dir = feature_dir / "4_diagramas"
    n_images = 0
    if diagrams_dir.is_dir():
        n_images = len([p for p in diagrams_dir.iterdir() if p.suffix.lower() in (".png", ".svg")])
    if n_blocks == 0:
        return findings, n_blocks, n_images
    if not diagrams_dir.is_dir():
        findings.append(Finding(
            "error", "DIAGRAMS",
            f"el documento tiene {n_blocks} diagrama(s) Mermaid pero no existe "
            f"{diagrams_dir} — corre export_mermaid_diagrams (paso 7 de SKILL.md)",
        ))
    elif n_images < n_blocks:
        findings.append(Finding(
            "error", "DIAGRAMS",
            f"el documento tiene {n_blocks} diagrama(s) Mermaid pero {diagrams_dir} "
            f"solo tiene {n_images} imagen(es) — faltan {n_blocks - n_images} por exportar",
        ))
    return findings, n_blocks, n_images


def check_screenshots(text, min_caption_words):
    findings = []
    lines = text.split("\n")
    n_screenshots = 0
    for i, line in enumerate(lines):
        m = IMAGE_RE.search(line)
        if not m:
            continue
        alt, src = m.group(1), m.group(2)
        if "screenshot" not in src:
            continue  # solo auditamos capturas de usuario, no diagramas exportados
        n_screenshots += 1
        caption_words = 0
        for j in range(i + 1, min(i + 6, len(lines))):
            candidate = lines[j].strip()
            if candidate == "":
                continue
            if candidate.startswith("#") or IMAGE_RE.search(candidate) or candidate.startswith("|"):
                break
            caption_words = len(candidate.split())
            break
        if caption_words < min_caption_words:
            findings.append(Finding(
                "error", "SCREENSHOTS",
                f"la captura '{src}' (línea {i + 1}) no lleva un párrafo explicativo "
                f"de al menos {min_caption_words} palabras justo debajo (encontradas: {caption_words})",
                line=i + 1,
            ))
    return findings, n_screenshots


def check_visual_ratio(text, min_section_lines):
    findings = []
    lines = text.split("\n")
    sections = []  # (heading_text, start_line, level)
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m:
            sections.append((m.group(2), i, len(m.group(1))))
    sections.append(("__END__", len(lines), 0))

    for idx in range(len(sections) - 1):
        heading, start, level = sections[idx]
        _, next_start, next_level = sections[idx + 1]
        # una sub-subsección posterior de nivel MAS PROFUNDO sigue dentro de esta
        # sección para efectos de longitud; solo cerramos en el siguiente heading
        # de nivel igual o más alto (menor número de #).
        end = next_start
        j = idx + 1
        while j < len(sections) - 1 and sections[j][2] > level:
            end = sections[j + 1][1]
            j += 1
        body = "\n".join(lines[start:end])
        n_lines = end - start
        if n_lines < min_section_lines:
            continue
        has_image = bool(IMAGE_RE.search(body))
        has_mermaid = "```mermaid" in body
        if not has_image and not has_mermaid:
            findings.append(Finding(
                "warn", "VISUAL_RATIO",
                f"sección '{heading}' tiene {n_lines} líneas sin ningún diagrama "
                f"ni captura — valora si un lector humano puede seguirla solo con texto",
                line=start + 1,
            ))
    return findings


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("doc_path", help="Ruta al DOCU.md (versión limpia o 3_mdXML) a auditar")
    parser.add_argument("--min-section-lines", type=int, default=40)
    parser.add_argument("--min-caption-words", type=int, default=12)
    args = parser.parse_args()

    doc_path = Path(args.doc_path).resolve()
    if not doc_path.is_file():
        print(f"No existe el fichero: {doc_path}", file=sys.stderr)
        sys.exit(2)

    raw = doc_path.read_text(encoding="utf-8")
    text = strip_openxml(raw)

    # feature_dir: si estamos en 3_mdXML/, la carpeta de la feature es el padre.
    feature_dir = doc_path.parent
    if feature_dir.name == "3_mdXML":
        feature_dir = feature_dir.parent

    all_findings = []

    anchor_findings, n_anchors_def, n_anchors_used = check_anchors(text)
    all_findings += anchor_findings

    diagram_findings, n_blocks, n_images = check_diagrams(text, feature_dir)
    all_findings += diagram_findings

    screenshot_findings, n_screenshots = check_screenshots(text, args.min_caption_words)
    all_findings += screenshot_findings

    ratio_findings = check_visual_ratio(text, args.min_section_lines)
    all_findings += ratio_findings

    errors = [f for f in all_findings if f.level == "error"]
    warnings = [f for f in all_findings if f.level == "warn"]

    print(f"Linter de comprensión — {doc_path}")
    print(f"  anchors definidos={n_anchors_def} usados={n_anchors_used}")
    print(f"  diagramas mermaid={n_blocks} imágenes exportadas={n_images}")
    print(f"  capturas de usuario referenciadas={n_screenshots}")
    print()

    if not all_findings:
        print("Todo correcto — capa de comprensión humana completa.")
        sys.exit(0)

    for f in errors:
        print(str(f))
    for f in warnings:
        print(str(f))

    print()
    print(f"{len(errors)} error(es), {len(warnings)} aviso(s).")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
