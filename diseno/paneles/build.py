# -*- coding: utf-8 -*-
"""Arma los .dc.html de los paneles internos.

Lenguaje visual propio, distinto del de la web de las clientas: la web es
la vidriera del salón, esto es una herramienta de trabajo.
"""
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
    pathlib.Path(nombre).write_text(PLANTILLA % (BASE, css_extra, cuerpo), encoding="utf-8")
    print("escrito", nombre)


def svg(d, size=16):
    return ('<svg viewBox="0 0 24 24" width="%d" height="%d" fill="none" stroke="currentColor" '
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '
            'aria-hidden="true">%s</svg>' % (size, size, d))


IC = {
    "grilla": '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
    "lupa": '<circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4.4-4.4"></path>',
    "izq": '<path d="M15 6l-6 6 6 6"></path>',
    "der": '<path d="M9 6l6 6-6 6"></path>',
    "mas": '<path d="M12 5v14M5 12h14"></path>',
    "filtro": '<path d="M4 6h16M7 12h10M10 18h4"></path>',
    "chispa": '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4z"></path>',
}


def barra_sup(modulo):
    return """  <div class="barra-sup">
    <span style="display: flex; align-items: center; gap: 9px;">%s</span>
    <span class="barra-marca">Sol Mai</span>
    <span style="opacity: 0.35;">/</span>
    <span class="barra-modulo">%s</span>
    <span class="barra-der">
      <span>Sol · dueña</span>
    </span>
  </div>""" % (svg(IC["grilla"], 17), modulo)


# ======================================================================
# 1 · El escritorio: la puerta de entrada a los nueve módulos
# ======================================================================
MODULOS = [
    ("Todos los días", [
        ("Hoy", "Quién viene y a qué hora", "6 turnos", True),
        ("Clientas", "Qué le hice la última vez", "150 fichas", False),
        ("Los números", "Cuánto entró y por dónde", "la caja de hoy", True),
        ("Productos", "Qué queda y qué usé", None, False),
    ]),
    ("Cada tanto", [
        ("El salón", "Cuánto sale y cuánto lleva", "127 precios", True),
        ("Quién atiende", "Cuánto produjo cada una", None, False),
        ("Proveedores", "A quién le compro", None, False),
    ]),
    ("Casi nunca, pero tiene que estar", [
        ("Permisos", "Quién puede ver qué", None, False),
        ("Qué pasó", "Quién cambió esto y cuándo", None, False),
    ]),
]

bandas = []
for grupo, items in MODULOS:
    fichas = []
    for nombre, pregunta, dato, listo in items:
        if listo:
            estilo = ("border: 1px solid var(--borde); background: var(--panel);")
            tono, tono2 = "var(--texto)", "var(--texto-2)"
            pie = ('<span style="font-size: 12px; color: var(--acento);" class="num">%s</span>' % dato) if dato else ""
        else:
            estilo = ("border: 1px dashed var(--borde); background: transparent;")
            tono, tono2 = "var(--texto-3)", "var(--texto-3)"
            pie = '<span style="font-size: 11.5px; color: var(--texto-3);">Todavía no</span>'
        fichas.append(
            '        <div style="%s border-radius: 5px; padding: 14px 15px; height: 104px; '
            'display: flex; flex-direction: column; gap: 3px;">\n'
            '          <span style="font-size: 15px; font-weight: 600; color: %s;">%s</span>\n'
            '          <span style="font-size: 12.5px; color: %s;">%s</span>\n'
            '          <span style="margin-top: auto;">%s</span>\n'
            '        </div>' % (estilo, tono, nombre, tono2, pregunta, pie)
        )
    bandas.append(
        '      <div style="display: flex; flex-direction: column; gap: 9px;">\n'
        '        <span class="rotulo">%s</span>\n'
        '        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;">\n%s\n        </div>\n'
        '      </div>' % (grupo, "\n".join(fichas))
    )

escribir("Main.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <span class="miga"><strong>Escritorio</strong></span>
    <span class="buscador">%s<span>Buscar una clienta, un turno, un producto…</span></span>
  </div>

  <div class="lienzo" style="padding: 22px 26px;">
    <div style="display: flex; flex-direction: column; gap: 22px; max-width: 1120px;">
%s
    </div>
  </div>
</div>
""" % (barra_sup("Escritorio"), svg(IC["lupa"], 15), "\n".join(bandas)))


# ======================================================================
# 2 · Clientas, vista lista: el formato de todo módulo que es «una lista de cosas»
# ======================================================================
CLIENTAS = [
    ("Marcela Ferreyra", "342 415-8890", "hoy", "Color y corte", "34"),
    ("Vanina Quiroga", "342 466-2031", "hace 3 días", "Brushing", "12"),
    ("Alejandra Sosa", "342 501-7744", "hace 1 semana", "Semipermanente", "27"),
    ("Rocío Benítez", "342 488-1290", "hace 2 semanas", "Baño de luz", "8"),
    ("Noelia Ibarra", "342 433-9915", "hace 3 semanas", "Corte", "41"),
    ("Silvina Ledesma", "342 470-3388", "hace 1 mes", "Cejas", "19"),
    ("Carla Maidana", "342 492-6607", "hace 2 meses", "Alisado", "6"),
    ("Daniela Ojeda", "342 455-2214", "hace 4 meses", "Color", "23"),
    ("Julieta Roldán", "342 407-8853", "hace 7 meses", "Corte y brushing", "15"),
]

filas = []
for i, (nombre, tel, ultima, que, turnos) in enumerate(CLIENTAS):
    lejos = "meses" in ultima
    filas.append(
        '            <tr%s>\n'
        '              <td style="font-weight: 500;">%s</td>\n'
        '              <td class="num" style="color: var(--texto-2);">%s</td>\n'
        '              <td style="color: %s;">%s</td>\n'
        '              <td style="color: var(--texto-2);">%s</td>\n'
        '              <td class="der num">%s</td>\n'
        '            </tr>' % (
            ' style="background: var(--fila-hover);"' if i == 0 else "",
            nombre, tel,
            "var(--alerta)" if lejos else "var(--texto-2)", ultima,
            que, turnos)
    )

escribir("Lista.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nueva</button>
    <span class="miga">Escritorio <span style="opacity: 0.5;">/</span> <strong>Clientas</strong></span>
    <span class="buscador">%s<span>Buscar por nombre o teléfono…</span></span>
    <span style="display: flex; align-items: center; gap: 7px; color: var(--texto-2);">%s</span>
  </div>

  <div style="background: var(--panel); border-bottom: 1px solid var(--borde); padding: 9px 14px; display: flex; align-items: center; gap: 8px;">
    <span class="pildora">Hace mucho que no viene <span style="opacity: 0.6;">×</span></span>
    <span style="font-size: 12px; color: var(--texto-3);">Se guardan solos los filtros que usás siempre</span>
    <span class="paginador"><span class="num">1-9 / 150</span>%s%s</span>
  </div>

  <div class="lienzo">
    <div class="hoja">
      <div style="overflow: hidden;">
        <table>
          <thead>
            <tr>
              <th style="width: 26%%;">Clienta</th>
              <th style="width: 16%%;">Teléfono</th>
              <th style="width: 16%%;">Última vez</th>
              <th>Qué le hicimos</th>
              <th class="der" style="width: 10%%;">Turnos</th>
            </tr>
          </thead>
          <tbody>
%s
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
""" % (barra_sup("Clientas"), svg(IC["mas"], 14), svg(IC["lupa"], 15),
       svg(IC["filtro"], 15), svg(IC["izq"], 15), svg(IC["der"], 15),
       "\n".join(filas)))


# ======================================================================
# 3 · La ficha: el formato de todo módulo que es «una cosa abierta»
# ======================================================================
def campo(rotulo, valor, color="var(--texto)"):
    return ('        <div style="display: flex; gap: 12px; align-items: baseline; '
            'padding: 7px 0; border-bottom: 1px solid var(--borde-suave);">\n'
            '          <span style="width: 128px; flex-shrink: 0; font-size: 12px; color: var(--texto-3);">%s</span>\n'
            '          <span style="font-size: 13px; color: %s;">%s</span>\n'
            '        </div>' % (rotulo, color, valor))


HISTORIAL = [
    ("10/09/2026", "Color y corte", "Peluquería", "$41.200", "8.1 + 20 vol · 45 g"),
    ("12/08/2026", "Color", "Peluquería", "$32.500", "8.1 + 20 vol · 40 g"),
    ("15/07/2026", "Corte y brushing", "Peluquería", "$19.800", "—"),
    ("18/06/2026", "Color y corte", "Peluquería", "$38.900", "8.1 + 20 vol · 45 g"),
]
hist = []
for fecha, servicio, area, cobrado, formula in HISTORIAL:
    hist.append(
        '              <tr>\n'
        '                <td class="num" style="color: var(--texto-2); width: 108px;">%s</td>\n'
        '                <td style="font-weight: 500;">%s</td>\n'
        '                <td style="color: var(--texto-3); width: 118px;">%s</td>\n'
        '                <td class="num der" style="width: 108px;">%s</td>\n'
        '                <td style="color: var(--texto-2); width: 210px;">%s</td>\n'
        '              </tr>' % (fecha, servicio, area, cobrado, formula)
    )

escribir("Ficha.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nuevo turno</button>
    <button class="btn" type="button">Escribirle</button>
    <span class="miga">Escritorio <span style="opacity: 0.5;">/</span> <a href="#">Clientas</a> <span style="opacity: 0.5;">/</span> <strong>Marcela Ferreyra</strong></span>
    <span class="paginador"><span class="num">1 / 150</span>%s%s</span>
  </div>

  <div class="lienzo">
    <div class="hoja" style="padding: 22px 26px; gap: 20px;">

      <div style="display: flex; align-items: flex-start; gap: 20px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 23px; font-weight: 600;">Marcela Ferreyra</span>
          <span style="font-size: 13px; color: var(--texto-2);">Viene hace 6 años · 34 turnos</span>
        </div>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
          <span style="background: oklch(0.96 0.05 55); color: var(--alerta); border: 1px solid oklch(0.88 0.07 55); border-radius: 4px; padding: 5px 11px; font-size: 12.5px; font-weight: 500;">Alérgica al amoníaco</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 44px;">
        <div style="display: flex; flex-direction: column;">
%s
%s
%s
        </div>
        <div style="display: flex; flex-direction: column;">
%s
%s
%s
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0; flex-grow: 1; overflow: hidden;">
        <div style="display: flex; gap: 22px; border-bottom: 1px solid var(--borde);">
          <span style="padding: 8px 0; font-size: 13px; font-weight: 600; border-bottom: 2px solid var(--acento); color: var(--acento);">Sus turnos</span>
          <span style="padding: 8px 0; font-size: 13px; color: var(--texto-2);">Notas del salón</span>
        </div>
        <div style="overflow: hidden;">
          <table>
            <tbody>
%s
            </tbody>
          </table>
        </div>
        <span style="font-size: 12px; color: var(--texto-3); padding-top: 11px;">
          Lo cobrado es lo que se cerró en el mostrador, no el estimado de la web.
        </span>
      </div>

    </div>
  </div>
</div>
""" % (
    barra_sup("Clientas"), svg(IC["mas"], 14), svg(IC["izq"], 15), svg(IC["der"], 15),
    campo("Teléfono", "342 415-8890"),
    campo("Email", "marce.ferreyra@gmail.com"),
    campo("Cómo llegó", "Reservó sola por la web"),
    campo("Alergias", "Amoníaco", "var(--alerta)"),
    campo("Última vez", "Hoy, 9:00"),
    campo("Suele venir", "Cada 4 semanas"),
    "\n".join(hist),
))


# ======================================================================
# 4 · El salón: el formato de «una lista que se edita en el lugar»
#     (es el módulo que ya existe en código; acá redibujado)
# ======================================================================
PRECIOS = [
    ("Peluquería", [
        ("Corte femenino", "Corto", "18.000", "45"),
        ("Corte femenino", "Media melena", "21.000", "50"),
        ("Corte femenino", "Largo", "24.000", "60"),
        ("Color", "Media melena", "38.500", "120"),
        ("Baño de luz", "Media melena", "14.700", "40"),
        ("Brushing", "Largo", "12.000", "45"),
    ]),
    ("Uñas", [
        ("Semipermanente", "Precio único", "16.500", "60"),
    ]),
]

secciones = []
for area, items in PRECIOS:
    filas_p = []
    for servicio, largo, precio, dur in items:
        filas_p.append(
            '              <tr>\n'
            '                <td style="font-weight: 500;">%s</td>\n'
            '                <td style="color: var(--texto-2);">%s</td>\n'
            '                <td class="der" style="width: 132px;">\n'
            '                  <span class="num" style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; min-width: 92px; border: 1px solid var(--borde); border-radius: 4px; padding: 4px 9px; background: var(--panel);">'
            '<span style="color: var(--texto-3);">$</span>%s</span>\n'
            '                </td>\n'
            '                <td class="der" style="width: 118px;">\n'
            '                  <span class="num" style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 78px; border: 1px solid var(--borde); border-radius: 4px; padding: 4px 9px; background: var(--panel);">'
            '%s<span style="color: var(--texto-3);">min</span></span>\n'
            '                </td>\n'
            '              </tr>' % (servicio, largo, precio, dur)
        )
    secciones.append(
        '            <tr><td colspan="4" style="background: var(--fila-hover); padding: 7px 12px;">'
        '<span class="rotulo">%s</span></td></tr>\n%s' % (area, "\n".join(filas_p))
    )

escribir("Precios.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nuevo servicio</button>
    <span class="miga">Escritorio <span style="opacity: 0.5;">/</span> <a href="#">El salón</a> <span style="opacity: 0.5;">/</span> <strong>Precios y tiempos</strong></span>
    <span class="buscador">%s<span>Buscar un servicio…</span></span>
  </div>

  <div style="background: var(--acento-2); border-bottom: 1px solid var(--borde); padding: 11px 14px; display: flex; align-items: center; gap: 11px;">
    <span style="color: var(--acento); display: flex;">%s</span>
    <span style="flex-grow: 1; max-width: 420px; height: 30px; background: var(--panel); border: 1px solid var(--borde); border-radius: 4px; display: flex; align-items: center; padding: 0 10px; color: var(--texto-3); font-size: 12.5px;">Subí un 15%% todo peluquería</span>
    <button class="btn" type="button">Ver qué cambia</button>
    <span style="font-size: 12px; color: var(--texto-2);">Antes de guardar nada, te mostramos qué quedaría.</span>
  </div>

  <div class="lienzo">
    <div class="hoja">
      <div style="overflow: hidden;">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th style="width: 24%%;">Largo</th>
              <th class="der" style="width: 132px;">Precio</th>
              <th class="der" style="width: 118px;">Dura</th>
            </tr>
          </thead>
          <tbody>
%s
          </tbody>
        </table>
      </div>
      <div style="margin-top: auto; border-top: 1px solid var(--borde); padding: 10px 12px; font-size: 12px; color: var(--texto-3);">
        Se escribe al salir del campo, y queda «Deshacer». Las preguntas que se le hacen a la clienta al reservar no se tocan desde acá.
      </div>
    </div>
  </div>
</div>
""" % (barra_sup("El salón"), svg(IC["mas"], 14), svg(IC["lupa"], 15), svg(IC["chispa"], 16),
       "\n".join(secciones)))


# ======================================================================
# 5 · El teléfono: el mismo sistema donde de verdad se usa todo el día
# ======================================================================
DIA = [
    ("9:00", "Marcela Ferreyra", "Color y corte · Puesto 2", "Llegó", "ok"),
    ("10:30", "Vanina Quiroga", "Brushing · Puesto 1", "Seña paga", "n"),
    ("11:15", "Alejandra Sosa", "Semipermanente · Uñas", "Seña paga", "n"),
    ("12:00", "Rocío Benítez", "Baño de luz · Puesto 3", "Falta la seña", "alerta"),
    ("13:30", "Noelia Ibarra", "Corte · Puesto 1", "Seña paga", "n"),
]

filas_dia = []
for hora, quien, det, estado, tono in DIA:
    if tono == "ok":
        c, b, f = "var(--ok)", "oklch(0.88 0.06 152)", "oklch(0.96 0.03 152)"
    elif tono == "alerta":
        c, b, f = "var(--alerta)", "oklch(0.88 0.07 55)", "oklch(0.96 0.04 55)"
    else:
        c, b, f = "var(--texto-2)", "var(--borde)", "var(--panel)"
    filas_dia.append(
        '      <div style="display: flex; align-items: center; gap: 13px; min-height: 62px; '
        'padding: 11px 14px; border-bottom: 1px solid var(--borde-suave); background: var(--panel);">\n'
        '        <span class="num" style="font-size: 15px; font-weight: 600; width: 46px; flex-shrink: 0;">%s</span>\n'
        '        <span style="display: flex; flex-direction: column; gap: 1px; min-width: 0; flex-grow: 1;">\n'
        '          <span style="font-size: 14px; font-weight: 500;">%s</span>\n'
        '          <span style="font-size: 12px; color: var(--texto-2);">%s</span>\n'
        '        </span>\n'
        '        <span style="flex-shrink: 0; font-size: 11.5px; color: %s; border: 1px solid %s; '
        'background: %s; border-radius: 4px; padding: 4px 8px;">%s</span>\n'
        '      </div>' % (hora, quien, det, c, b, f, estado)
    )

escribir("Telefono.dc.html", """
  .tel { width: 390px; height: 844px; display: flex; flex-direction: column; background: var(--fondo); overflow: hidden; }
""", """
<div class="tel">
  <div class="barra-sup" style="height: 52px; padding: 0 12px; gap: 12px;">
    <span style="display: flex; align-items: center; width: 44px; height: 44px; justify-content: center; margin-left: -6px;">%s</span>
    <span style="display: flex; flex-direction: column; gap: 0;">
      <span class="barra-marca" style="font-size: 15px;">Hoy</span>
      <span style="font-size: 11.5px; opacity: 0.7;">Miércoles 10 · 6 turnos</span>
    </span>
    <span class="barra-der">%s</span>
  </div>

  <div style="background: var(--panel); border-bottom: 1px solid var(--borde); padding: 9px 14px; display: flex; gap: 7px; overflow: hidden;">
    <span class="pildora" style="height: 30px; font-size: 12.5px;">Hoy</span>
    <span style="height: 30px; padding: 0 11px; border: 1px solid var(--borde); border-radius: 3px; font-size: 12.5px; color: var(--texto-2); display: inline-flex; align-items: center;">Mañana</span>
    <span style="height: 30px; padding: 0 11px; border: 1px solid var(--borde); border-radius: 3px; font-size: 12.5px; color: var(--texto-2); display: inline-flex; align-items: center;">Semana</span>
  </div>

  <div style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
%s
  </div>

  <div style="border-top: 1px solid var(--borde); background: var(--panel); padding: 11px 14px 15px;">
    <button class="btn btn-p" type="button" style="width: 100%%; height: 46px; justify-content: center; font-size: 14px;">%s Cargar un turno</button>
  </div>
</div>
""" % (svg(IC["grilla"], 19), svg(IC["lupa"], 17), "\n".join(filas_dia), svg(IC["mas"], 16)))
