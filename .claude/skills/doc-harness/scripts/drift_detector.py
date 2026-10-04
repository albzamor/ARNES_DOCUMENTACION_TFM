#!/usr/bin/env python3
"""
Detector de deriva — compara cuándo se documentó una feature por última vez
contra cuándo cambió de verdad el código que describe.

La IA genera cambios de código más rápido de lo que la documentación para
humanos puede seguir el ritmo. Este script hace visible esa deriva con datos
de git reales, no con una fecha "última actualización" que nadie vuelve a
mirar.

Uso:
  python3 drift_detector.py \
    --doc <ruta/al/nombreFeatureDOCU.md> \
    --manifest <ruta/al/nombreFeatureMANIFEST.md> \
    --source-repo <ruta/al/repo/de/codigo>

Salida: una fila por componente del MANIFEST, con su fecha de último commit
real y cuántos commits de retraso lleva sobre la fecha "Última actualización"
del DOCU. Exit code 0 si nada ha derivado, 1 si algún componente cambió
después de la última actualización documentada.
"""

import argparse
import re
import subprocess
import sys
from datetime import datetime, date
from pathlib import Path

HEADER_ROW_RE = re.compile(r"\*\*Última actualización\*\*\s*\|\s*([0-9]{4}-[0-9]{2}-[0-9]{2})")
TABLE_ROW_RE = re.compile(r"^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|")


def parse_doc_last_updated(doc_path: Path) -> date:
    text = doc_path.read_text(encoding="utf-8")
    m = HEADER_ROW_RE.search(text)
    if not m:
        print(f"No encuentro la fila 'Última actualización' en {doc_path}", file=sys.stderr)
        sys.exit(2)
    return datetime.strptime(m.group(1), "%Y-%m-%d").date()


def parse_manifest_components(manifest_path: Path):
    """Devuelve [(tipo, nombre, ruta), ...] a partir de la tabla Components."""
    text = manifest_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    in_table = False
    components = []
    for line in lines:
        if line.strip().startswith("| Tipo") or line.strip().startswith("|Tipo"):
            in_table = True
            continue
        if in_table:
            if line.strip().startswith("|---") or line.strip().startswith("| ---"):
                continue
            if not line.strip().startswith("|"):
                in_table = False
                continue
            m = TABLE_ROW_RE.match(line)
            if m:
                tipo, nombre, ruta = m.group(1), m.group(2), m.group(3)
                components.append((tipo.strip(), nombre.strip(), ruta.strip()))
    return components


def git_last_commit_date(repo: Path, path: str):
    result = subprocess.run(
        ["git", "-C", str(repo), "log", "-1", "--format=%cI", "--", path],
        capture_output=True, text=True,
    )
    out = result.stdout.strip()
    if not out:
        return None
    return datetime.fromisoformat(out).date()


def git_commits_since(repo: Path, path: str, since: date) -> int:
    result = subprocess.run(
        ["git", "-C", str(repo), "log", "--oneline", f"--since={since.isoformat()}", "--", path],
        capture_output=True, text=True,
    )
    lines = [l for l in result.stdout.strip().split("\n") if l.strip()]
    return len(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--doc", required=True, help="Ruta al DOCU.md de la feature")
    parser.add_argument("--manifest", required=True, help="Ruta al MANIFEST.md de la feature")
    parser.add_argument("--source-repo", required=True, help="Ruta al repo git que contiene el código real")
    args = parser.parse_args()

    doc_path = Path(args.doc).resolve()
    manifest_path = Path(args.manifest).resolve()
    source_repo = Path(args.source_repo).resolve()

    if not doc_path.is_file():
        print(f"No existe: {doc_path}", file=sys.stderr)
        sys.exit(2)
    if not manifest_path.is_file():
        print(f"No existe: {manifest_path}", file=sys.stderr)
        sys.exit(2)
    if not (source_repo / ".git").exists():
        print(f"{source_repo} no parece un repo git (sin .git)", file=sys.stderr)
        sys.exit(2)

    last_updated = parse_doc_last_updated(doc_path)
    components = parse_manifest_components(manifest_path)

    if not components:
        print(f"No he encontrado componentes en la tabla de {manifest_path}", file=sys.stderr)
        sys.exit(2)

    print(f"Detector de deriva — {doc_path.parent.name}")
    print(f"  Última actualización documentada: {last_updated.isoformat()}")
    print(f"  Repo de código: {source_repo}")
    print(f"  Componentes en MANIFEST: {len(components)}")
    print()

    drifted = []
    not_found = []
    up_to_date = []

    for tipo, nombre, ruta in components:
        last_commit = git_last_commit_date(source_repo, ruta)
        if last_commit is None:
            not_found.append((tipo, nombre, ruta))
            continue
        if last_commit > last_updated:
            n_commits = git_commits_since(source_repo, ruta, last_updated)
            drifted.append((tipo, nombre, ruta, last_commit, n_commits))
        else:
            up_to_date.append((tipo, nombre, ruta, last_commit))

    if drifted:
        print(f"⚠ {len(drifted)} componente(s) han cambiado DESPUÉS de la última actualización documentada:")
        for tipo, nombre, ruta, last_commit, n_commits in sorted(drifted, key=lambda r: r[3], reverse=True):
            dias = (last_commit - last_updated).days
            print(f"  - [{tipo}] {nombre} ({ruta})")
            print(f"      último commit: {last_commit.isoformat()}  ·  {dias} día(s) de deriva  ·  {n_commits} commit(s) de retraso")
        print()

    if up_to_date:
        print(f"✓ {len(up_to_date)} componente(s) sin deriva (código no ha cambiado desde la última documentación).")

    if not_found:
        print()
        print(f"? {len(not_found)} componente(s) sin historial de git en esa ruta exacta (posible ruta obsoleta, o el fichero se movió/renombró):")
        for tipo, nombre, ruta in not_found:
            print(f"  - [{tipo}] {nombre} ({ruta})")

    print()
    if drifted:
        print(f"RESULTADO: deriva detectada en {len(drifted)}/{len(components)} componente(s).")
        sys.exit(1)
    else:
        print("RESULTADO: sin deriva. La documentación sigue al día con el código.")
        sys.exit(0)


if __name__ == "__main__":
    main()
