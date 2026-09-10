# -*- coding: utf-8 -*-
"""Arma los .dc.html del boceto. La hoja de estilo va inline en cada uno
porque cada artboard es un archivo autocontenido."""
import pathlib

BASE = pathlib.Path("_base.css").read_text(encoding="utf-8")

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
%s%s
  </style>
</helmet>
%s
</x-dc>
</body>
</html>
"""


def escribir(nombre, css_extra, cuerpo):
    pathlib.Path(nombre).write_text(
        PLANTILLA % (BASE, css_extra, cuerpo), encoding="utf-8"
    )
    print("escrito", nombre)


# --- Los nueve módulos, tal como los define la arquitectura ------------
MODULOS = [
    ("Todos los días", [
        ("Hoy", "¿Quién viene y a qué hora?", False),
        ("Clientas", "¿Qué le hice la última vez?", False),
        ("Los números", "¿Cuánto entró y por dónde?", True),
        ("Productos", "¿Qué queda y qué usé?", True),
    ]),
    ("Cada tanto", [
        ("El salón", "¿Cuánto sale y cuánto lleva?", True),
        ("Quién atiende", "¿Cuánto produjo cada una?", True),
        ("Proveedores", "¿A quién le compro?", True),
    ]),
    ("Casi nunca", [
        ("Permisos", "¿Quién puede ver qué?", True),
        ("Qué pasó", "¿Quién cambió esto?", True),
    ]),
]

TURNOS = [
    ("9:00", "Marcela", "Color y corte · Puesto 2"),
    ("10:30", "Vanina", "Brushing · Puesto 1"),
    ("11:15", "Ale", "Semipermanente · Uñas"),
    ("12:00", "Rocío", "Baño de luz · Puesto 3"),
    ("13:30", "Noe", "Corte · Puesto 1"),
    ("14:15", "Silvina", "Cejas · Depilación"),
]


def turnos_html(cuantos, sangria="      "):
    filas = []
    for hora, quien, det in TURNOS[:cuantos]:
        filas.append(
            f'{sangria}<div class="turno">\\n'
            f'{sangria}  <span class="hora">{hora}</span>\\n'
            f'{sangria}  <div style="display: flex; flex-direction: column; gap: 2px;">\\n'
            f'{sangria}    <span class="quienviene">{quien}</span>\\n'
            f'{sangria}    <span class="detalle">{det}</span>\\n'
            f'{sangria}  </div>\\n'
            f'{sangria}</div>'
        )
    return "\\n".join(filas)


# ======================================================================
# 1 · Cómo está hoy: el mapa entero arriba de cada pantalla
# ======================================================================
chips = []
for grupo, items in MODULOS:
    fichas = []
    for label, pregunta, _solo in items:
        activo = label == "Hoy"
        borde = "var(--marca)" if activo else "var(--linea)"
        fondo = "var(--marca-tenue)" if activo else "#fff"
        fichas.append(
            '        <div style="border: 1px solid %s; background: %s; '
            'border-radius: 14px; padding: 7px 11px;">\n'
            '          <span style="display: block; font-size: 14px;">%s</span>\n'
            '          <span style="display: block; font-size: 11px; color: var(--tinta-suave);">%s</span>\n'
            '        </div>' % (borde, fondo, label, pregunta)
        )
    chips.append(
        '      <div style="display: flex; flex-direction: column; gap: 7px;">\n'
        '        <span class="grupo">%s</span>\n'
        '        <div style="display: flex; flex-wrap: wrap; gap: 7px;">\n%s\n        </div>\n'
        '      </div>' % (grupo, "\n".join(fichas))
    )

escribir("Main.dc.html", "", """
<div class="pantalla">
  <div class="cabecera">
    <span class="marca-txt">Sol Mai</span>
    <span class="quien">Sol · dueña</span>
  </div>

  <div style="display: flex; flex-direction: column; gap: 14px; padding: 14px 20px 16px; border-bottom: 1px solid var(--linea-tenue);">
%s
  </div>

  <div class="cuerpo" style="padding-top: 16px;">
    <span class="grupo">Miércoles 10</span>
    <div style="display: flex; flex-direction: column; gap: 9px; margin-top: 9px;">
%s
    </div>
  </div>

  <div style="padding: 10px 20px 16px;">
    <span class="nota-lapiz">El trabajo del día empieza acá abajo</span>
  </div>
</div>
""" % ("\n".join(chips), turnos_html(2)))


# --- Iconos de línea, 24px, un solo trazo -----------------------------
def icono(d, extra=""):
    return (
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
        'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
        'stroke-linejoin="round" aria-hidden="true">%s%s</svg>' % (d, extra)
    )


ICONOS = {
    "hoy": icono('<rect x="3" y="5" width="18" height="16" rx="2"></rect>'
                 '<path d="M8 3v4M16 3v4M3 10h18"></path>'),
    "clientas": icono('<circle cx="12" cy="8" r="3.2"></circle>'
                      '<path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"></path>'),
    "numeros": icono('<circle cx="12" cy="12" r="8.5"></circle>'
                     '<path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 010 3.6h-3a1.8 1.8 0 000 3.6h4"></path>'),
    "salon": icono('<path d="M4 9h16l-1 11H5L4 9z"></path>'
                   '<path d="M9 9V6.5a3 3 0 016 0V9"></path>'),
    "mas": icono('<circle cx="5.5" cy="12" r="1.3"></circle>'
                 '<circle cx="12" cy="12" r="1.3"></circle>'
                 '<circle cx="18.5" cy="12" r="1.3"></circle>'),
    "menu": icono('<path d="M4 7h16M4 12h16M4 17h16"></path>'),
    "volver": icono('<path d="M15 5l-7 7 7 7"></path>'),
}


# ======================================================================
# 2 · Dirección A — barra fija abajo
# ======================================================================
barra = []
for clave, label, activo in [
    ("hoy", "Hoy", True),
    ("clientas", "Clientas", False),
    ("numeros", "Números", False),
    ("salon", "El salón", False),
    ("mas", "Más", False),
]:
    color = "var(--marca)" if activo else "var(--tinta-suave)"
    barra.append(
        '      <div style="display: flex; flex-direction: column; align-items: center; '
        'gap: 4px; flex-grow: 1; padding: 8px 0; min-height: 44px; color: %s;">\n'
        '        %s\n'
        '        <span style="font-size: 11px;">%s</span>\n'
        '      </div>' % (color, ICONOS[clave], label)
    )

escribir("BarraAbajo.dc.html", "", """
<div class="pantalla">
  <div class="cabecera">
    <span class="marca-txt">Hoy</span>
    <span class="quien">Miércoles 10 · 6 turnos</span>
  </div>

  <div class="cuerpo" style="padding-top: 14px;">
    <div style="display: flex; flex-direction: column; gap: 9px;">
%s
    </div>
    <div style="margin-top: 14px;">
      <span class="nota-lapiz">Toda la pantalla es el día</span>
    </div>
  </div>

  <div style="display: flex; align-items: stretch; border-top: 1px solid var(--linea); background: #fff; padding: 0 4px 8px;">
%s
  </div>
</div>
""" % (turnos_html(6), "\n".join(barra)))


# ======================================================================
# 3 · Dirección B — la pantalla de inicio ES el mapa
# ======================================================================
def tarjeta(label, pregunta, dato, alto):
    return (
        '      <div style="border: 1px solid var(--linea); border-radius: 16px; '
        'background: #fff; padding: %s; display: flex; flex-direction: column; gap: 4px;">\n'
        '        <span style="font-size: %s;">%s</span>\n'
        '        <span style="font-size: 12px; color: var(--tinta-suave);">%s</span>\n'
        '        <span style="font-size: 13px; color: var(--marca);">%s</span>\n'
        '      </div>' % (alto, "18px" if alto == "16px 16px" else "15px",
                          label, pregunta, dato)
    )


cada_tanto = []
for label, pregunta, _ in MODULOS[1][1] + MODULOS[2][1]:
    cada_tanto.append(
        '        <div style="display: flex; align-items: baseline; justify-content: space-between; '
        'gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--linea-tenue);">\n'
        '          <span style="font-size: 15px;">%s</span>\n'
        '          <span style="font-size: 11px; color: var(--tinta-suave);">%s</span>\n'
        '        </div>' % (label, pregunta)
    )

escribir("Inicio.dc.html", "", """
<div class="pantalla">
  <div class="cabecera">
    <span class="marca-txt">Sol Mai</span>
    <span class="quien">Sol · dueña</span>
  </div>

  <div class="cuerpo" style="padding-top: 16px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 9px;">
      <span class="grupo">Todos los días</span>
      <div style="display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 9px;">
%s
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px;">
%s
%s
%s
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span class="grupo">Cada tanto</span>
      <div style="display: flex; flex-direction: column;">
%s
      </div>
    </div>

    <span class="nota-lapiz">Cada módulo se abre entero, y se vuelve acá</span>
  </div>
</div>
""" % (
    tarjeta("Hoy", "Quién viene y a qué hora", "6 turnos · el próximo 9:00", "16px 16px"),
    tarjeta("Clientas", "La última vez", "150", "12px 11px"),
    tarjeta("Números", "Cuánto entró", "hoy", "12px 11px"),
    tarjeta("Productos", "Qué queda", "2 por pedir", "12px 11px"),
    "\n".join(cada_tanto),
))


# ======================================================================
# 4 · Dirección C — el día ocupa todo; el resto vive en un cajón
# ======================================================================
cajon = []
for grupo, items in MODULOS:
    filas = []
    for label, pregunta, _ in items:
        activo = label == "Hoy"
        filas.append(
            '        <div style="display: flex; flex-direction: column; gap: 1px; '
            'padding: 9px 12px; border-radius: 11px; background: %s;">\n'
            '          <span style="font-size: 15px;">%s</span>\n'
            '          <span style="font-size: 11px; color: var(--tinta-suave);">%s</span>\n'
            '        </div>' % ("var(--marca-tenue)" if activo else "transparent", label, pregunta)
        )
    cajon.append(
        '      <div style="display: flex; flex-direction: column; gap: 3px;">\n'
        '        <span class="grupo" style="padding: 0 12px;">%s</span>\n%s\n      </div>'
        % (grupo, "\n".join(filas))
    )

escribir("Cajon.dc.html", "", """
<div class="pantalla" style="position: relative;">
  <div class="cabecera">
    <div style="display: flex; align-items: center; gap: 11px;">
      <span style="color: var(--marca);">%s</span>
      <span class="marca-txt">Hoy</span>
    </div>
    <span class="quien">Miércoles 10</span>
  </div>

  <div class="cuerpo" style="padding-top: 14px;">
    <div style="display: flex; flex-direction: column; gap: 9px;">
%s
    </div>
  </div>

  <div style="position: absolute; inset: 0 0 0 88px; background: #fff; border-left: 1px solid var(--linea); box-shadow: -18px 0 34px oklch(0.32 0.015 60 / 0.13); display: flex; flex-direction: column; gap: 15px; padding: 20px 8px;">
    <span style="font-size: 13px; color: var(--tinta-suave); padding: 0 12px;">El sistema</span>
%s
    <span class="nota-lapiz" style="margin: auto 12px 0;">Se abre con el botón de arriba y se cierra solo</span>
  </div>
</div>
""" % (ICONOS["menu"], turnos_html(5), "\n".join(cajon)))


# ======================================================================
# 5 · La restricción que decide: dos personas, dos mapas distintos
# ======================================================================
def columna(titulo, subtitulo, visibles):
    filas = []
    for grupo, items in MODULOS:
        propios = [m for m in items if m[0] in visibles]
        if not propios:
            continue
        celdas = []
        for label, pregunta, _ in propios:
            celdas.append(
                '        <div style="display: flex; align-items: baseline; gap: 8px; '
                'padding: 7px 10px; border: 1px solid var(--linea); border-radius: 11px; background: #fff;">\n'
                '          <span style="font-size: 14px;">%s</span>\n'
                '          <span style="font-size: 11px; color: var(--tinta-suave);">%s</span>\n'
                '        </div>' % (label, pregunta)
            )
        filas.append(
            '      <div style="display: flex; flex-direction: column; gap: 5px;">\n'
            '        <span class="grupo">%s</span>\n%s\n      </div>' % (grupo, "\n".join(celdas))
        )
    return (
        '    <div style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1;">\n'
        '      <div style="display: flex; flex-direction: column; gap: 2px;">\n'
        '        <span style="font-size: 19px;">%s</span>\n'
        '        <span style="font-size: 12px; color: var(--tinta-suave);">%s</span>\n'
        '      </div>\n%s\n    </div>' % (titulo, subtitulo, "\n".join(filas))
    )


TODOS = {m[0] for g in MODULOS for m in g[1]}
DE_LA_SECRETARIA = {"Hoy", "Clientas", "Productos"}

escribir("DosPersonas.dc.html", """
  .hoja {
    width: 620px;
    height: 660px;
    box-sizing: border-box;
    background: var(--papel);
    padding: 26px 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
  }
""", """
<div class="hoja">
  <div style="display: flex; flex-direction: column; gap: 5px;">
    <span style="font-size: 22px;">Lo que decide el armazón</span>
    <span style="font-size: 13px; color: var(--tinta-suave); max-width: 520px;">
      No son nueve módulos para todo el mundo. La misma estructura tiene que
      servirle a quien ve nueve y a quien ve tres, sin que a ninguna de las dos
      le sobre pantalla.
    </span>
  </div>

  <div style="display: flex; gap: 26px; align-items: flex-start;">
%s
%s
  </div>

  <span class="nota-lapiz" style="margin-top: auto;">
    Quien atiende entra al panel veinte veces por día. Si su pantalla arranca
    con seis puertas cerradas, el panel le estorba todos los días.
  </span>
</div>
""" % (
    columna("Sol", "Dueña · ve todo", TODOS),
    columna("Quien atiende", "Mostrador · ve lo suyo", DE_LA_SECRETARIA),
))
