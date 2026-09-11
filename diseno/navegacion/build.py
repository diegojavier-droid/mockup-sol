#!/usr/bin/env python3
"""
Arma los `.dc.html` de este ejercicio desde una hoja de estilo compartida.

Mismo mecanismo que `diseno/paneles/build.py`: los cuerpos viven sueltos en
`cuerpos/` y acá se les pega el CSS, para no repetir 130 líneas cinco veces
y que cambiar un color no sea cinco ediciones.

    python3 build.py
"""
from pathlib import Path

AQUI = Path(__file__).parent
CSS = (AQUI / "_base.css").read_text(encoding="utf-8")

PLANTILLA = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
{css}
  </style>
</helmet>
{cuerpo}
</x-dc>
</body>
</html>
"""

def main() -> None:
    cuerpos = sorted((AQUI / "cuerpos").glob("*.body.html"))
    if not cuerpos:
        raise SystemExit("No hay cuerpos en cuerpos/")
    for c in cuerpos:
        nombre = c.name.replace(".body.html", ".dc.html")
        salida = AQUI / nombre
        salida.write_text(
            PLANTILLA.format(css=CSS.rstrip(), cuerpo=c.read_text(encoding="utf-8").strip()),
            encoding="utf-8",
        )
        print(f"  {nombre}")

if __name__ == "__main__":
    main()
