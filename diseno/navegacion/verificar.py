#!/usr/bin/env python3
"""
Cuenta lo que tiene que estar en cada boceto.

POR QUÉ EXISTE

`seed-canvas.mjs --check` prueba que el archivo PARSEA, no que tenga
adentro lo que uno cree. Un reemplazo con expresión regular se comió el
contenido de tres artboards —«Más» quedó con un módulo de seis, la barra
lateral con uno de nueve— y el `--check` dio verde igual, porque el
resultado era HTML perfectamente válido. Se publicó así.

Esto cuenta elementos concretos. Se corre ANTES de sembrar.

    python3 verificar.py
"""
import sys
from pathlib import Path

AQUI = Path(__file__).parent

ESPERADO = {
    "Main":       {"filas de turno": ('class="fila"', 5),
                   "destinos en la barra de abajo": ('class="abajo-item', 4)},
    "Mas":        {"módulos listados": ('font-size: 14.5px; font-weight: 500;"', 6),
                   "destinos en la barra de abajo": ('class="abajo-item', 4)},
    "Caja":       {"secciones de Finanzas": ('<span class="sec', 6),
                   "destinos en la barra de abajo": ('class="abajo-item', 4)},
    "Escritorio": {"módulos en la lateral": ('class="lat-item', 9),
                   "migas de pan": ('class="miga"', 1),
                   "secciones arriba": ("border-radius: 4px; font-size: 12.5px", 4)},
    "Horarios":   {"módulos en la lateral": ('class="lat-item', 9),
                   "migas de pan": ('class="miga"', 1),
                   "secciones arriba": ("border-radius: 4px; font-size: 12.5px", 4)},
    "Antes":      {"rótulos de grupo (los que se van)": ("letter-spacing: 0.2em", 3)},
    "Rutas":      {"módulos propuestos": ('color: var(--texto); font-weight: 600;">/', 10)},
}

# Lo que NO puede aparecer: datos que parecen reales y no lo son.
PROHIBIDO = {
    "diegojavierzimmermann": "identificador personal usado como dato de relleno",
    "12 de octubre": "feriado argentino real presentado como día cerrado del salón",
    "Miércoles 10 de septiembre": "el 10/9/2026 es jueves",
    "Estaciones": "el árbol dice «Puestos»; una de las dos sobra",
}

def main() -> int:
    malos = 0
    for arch, checks in ESPERADO.items():
        t = (AQUI / "cuerpos" / f"{arch}.body.html").read_text(encoding="utf-8")
        for nombre, (aguja, n) in checks.items():
            real = t.count(aguja)
            if real != n:
                print(f"  MAL {arch}: {nombre} → {real}, esperaba {n}")
                malos += 1
    for f in (AQUI / "cuerpos").glob("*.body.html"):
        t = f.read_text(encoding="utf-8")
        for aguja, porque in PROHIBIDO.items():
            if aguja in t:
                print(f"  MAL {f.name}: aparece «{aguja}» — {porque}")
                malos += 1
    print("todo en pie" if not malos else f"{malos} sin cuadrar")
    return 1 if malos else 0

if __name__ == "__main__":
    sys.exit(main())
