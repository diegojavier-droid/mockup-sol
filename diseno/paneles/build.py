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


def barra_sup(modulo, secciones=(), activa=None):
    """La barra del sistema: marca, módulo y —el nivel nuevo— sus secciones."""
    menu = ""
    if secciones:
        items = []
        for nombre in secciones:
            if nombre == activa:
                items.append(
                    '<span style="font-size: 12.5px; color: #fff; font-weight: 500; '
                    'padding: 0 2px 2px; border-bottom: 2px solid var(--acento);">%s</span>' % nombre)
            else:
                items.append(
                    '<span style="font-size: 12.5px; opacity: 0.62; padding: 0 2px 2px;">%s</span>' % nombre)
        menu = ('\n    <span style="display: flex; align-items: center; gap: 17px; '
                'margin-left: 6px;">%s</span>' % "".join(items))
    return """  <div class="barra-sup">
    <span style="display: flex; align-items: center; gap: 9px;">%s</span>
    <span class="barra-marca">Sol Mai</span>
    <span style="opacity: 0.35;">/</span>
    <span class="barra-modulo" style="font-weight: 500;">%s</span>%s
    <span class="barra-der">
      <span>Sol · dueña</span>
    </span>
  </div>""" % (svg(IC["grilla"], 17), modulo, menu)


# ======================================================================
# El árbol: nueve módulos, cada uno con sus secciones.
#
# Los nombres son de categoría, no preguntas: quien entra al panel viene
# a buscar algo y necesita encontrarlo, no que le hablen lindo. Esa voz
# —la de Sol— es la de la web de las clientas, y no se mezcla.
# ======================================================================
ARBOL = [
    ("Todos los días", [
        ("Calendario", [("Hoy", 1), ("Semana", 1), ("Mes", 0), ("Año", 0)]),
        ("Clientas", [("Fichas", 0), ("Sin venir hace tiempo", 0), ("Consentimientos", 0)]),
        ("Finanzas", [("Caja del día", 1), ("Cobros", 1), ("Devoluciones", 1),
                      ("Facturación", 0), ("Gastos", 0), ("Resumen", 1)]),
        ("Inventario", [("Productos", 1), ("Stock", 0), ("Movimientos", 0)]),
    ]),
    ("Cada tanto", [
        ("Servicios", [("Precios y tiempos", 1), ("Áreas", 1),
                       ("Puestos de trabajo", 1), ("Horarios", 1)]),
        ("Personal", [("Empleados", 0), ("Horarios", 0), ("Producción", 0)]),
        ("Compras", [("Proveedores", 0), ("Pedidos", 0)]),
    ]),
    ("Casi nunca, pero tiene que estar", [
        ("Configuración", [("Usuarios y permisos", 0), ("Datos del negocio", 1),
                           ("Términos y privacidad", 1)]),
        ("Auditoría", [("Registro de cambios", 0)]),
    ]),
]


# ======================================================================
# 1 · El escritorio: el árbol entero de un vistazo
# ======================================================================
bandas = []
for grupo, modulos in ARBOL:
    fichas = []
    for nombre, secciones in modulos:
        hay_algo = any(listo for _, listo in secciones)
        lineas = []
        for sec, listo in secciones:
            if listo:
                lineas.append(
                    '            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--texto-2);">'
                    '<span style="width: 4px; height: 4px; border-radius: 50%%; background: var(--acento); flex-shrink: 0;"></span>%s</span>' % sec)
            else:
                lineas.append(
                    '            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--texto-3);">'
                    '<span style="width: 4px; height: 4px; border-radius: 50%%; border: 1px solid var(--texto-3); box-sizing: border-box; flex-shrink: 0;"></span>%s</span>' % sec)
        fichas.append(
            '        <div style="border: 1px solid %s; background: var(--panel); border-radius: 5px; '
            'padding: 13px 14px 14px; display: flex; flex-direction: column; gap: 9px;">\n'
            '          <span style="font-size: 14.5px; font-weight: 600; color: %s;">%s</span>\n'
            '          <div style="display: flex; flex-direction: column; gap: 4px;">\n%s\n          </div>\n'
            '        </div>' % (
                "var(--borde)" if hay_algo else "var(--borde-suave)",
                "var(--texto)" if hay_algo else "var(--texto-2)",
                nombre, "\n".join(lineas))
        )
    bandas.append(
        '      <div style="display: flex; flex-direction: column; gap: 9px;">\n'
        '        <span class="rotulo">%s</span>\n'
        '        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; align-items: start;">\n%s\n        </div>\n'
        '      </div>' % (grupo, "\n".join(fichas))
    )

escribir("Main.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <span class="miga"><strong>Escritorio</strong></span>
    <span class="buscador">%s<span>Buscar una clienta, un turno, un producto…</span></span>
  </div>

  <div class="lienzo" style="padding: 20px 24px; overflow: hidden;">
    <div style="display: flex; flex-direction: column; gap: 18px;">
%s
    </div>
    <div style="display: flex; align-items: center; gap: 18px; padding-top: 16px; font-size: 12px; color: var(--texto-3);">
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 4px; height: 4px; border-radius: 50%%; background: var(--acento);"></span>anda</span>
      <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 4px; height: 4px; border-radius: 50%%; border: 1px solid var(--texto-3); box-sizing: border-box;"></span>todavía no</span>
    </div>
  </div>
</div>
""" % (barra_sup("Escritorio"), svg(IC["lupa"], 15), "\n".join(bandas)))


SEC = {m[0]: [s for s, _ in m[1]] for g in ARBOL for m in g[1]}


# ======================================================================
# 2 · Clientas › Fichas — el formato «lista de cosas»
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
            nombre, tel, "var(--alerta)" if lejos else "var(--texto-2)", ultima, que, turnos)
    )

escribir("Lista.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nueva</button>
    <span class="miga">Clientas <span style="opacity: 0.5;">/</span> <strong>Fichas</strong></span>
    <span class="buscador">%s<span>Buscar por nombre o teléfono…</span></span>
    <span style="display: flex; align-items: center; gap: 7px; color: var(--texto-2);">%s</span>
  </div>

  <div style="background: var(--panel); border-bottom: 1px solid var(--borde); padding: 9px 14px; display: flex; align-items: center; gap: 8px;">
    <span class="pildora">Peluquería <span style="opacity: 0.6;">×</span></span>
    <span style="font-size: 12px; color: var(--texto-3);">Se guardan solos los filtros que usás siempre</span>
    <span class="paginador"><span class="num">1-8 / 150</span>%s%s</span>
  </div>

  <div class="lienzo">
    <div class="hoja">
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
""" % (barra_sup("Clientas", SEC["Clientas"], "Fichas"), svg(IC["mas"], 14),
       svg(IC["lupa"], 15), svg(IC["filtro"], 15), svg(IC["izq"], 15), svg(IC["der"], 15),
       "\n".join(filas)))


# ======================================================================
# 3 · Clientas › Fichas › una clienta — el formato «una cosa abierta»
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
        '              </tr>' % (fecha, servicio, area, cobrado, formula))

escribir("Ficha.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nuevo turno</button>
    <button class="btn" type="button">Escribirle</button>
    <span class="miga">Clientas <span style="opacity: 0.5;">/</span> <a href="#">Fichas</a> <span style="opacity: 0.5;">/</span> <strong>Marcela Ferreyra</strong></span>
    <span class="paginador"><span class="num">1 / 150</span>%s%s</span>
  </div>

  <div class="lienzo">
    <div class="hoja" style="padding: 22px 26px; gap: 20px;">

      <div style="display: flex; align-items: flex-start; gap: 20px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 23px; font-weight: 600;">Marcela Ferreyra</span>
          <span style="font-size: 13px; color: var(--texto-2);">Viene hace 6 años · 34 turnos</span>
        </div>
        <div style="margin-left: auto;">
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

      <div style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
        <div style="display: flex; gap: 22px; border-bottom: 1px solid var(--borde);">
          <span style="padding: 8px 0; font-size: 13px; font-weight: 600; border-bottom: 2px solid var(--acento); color: var(--acento);">Turnos</span>
          <span style="padding: 8px 0; font-size: 13px; color: var(--texto-2);">Notas</span>
          <span style="padding: 8px 0; font-size: 13px; color: var(--texto-2);">Consentimientos</span>
        </div>
        <table>
          <tbody>
%s
          </tbody>
        </table>
        <span style="font-size: 12px; color: var(--texto-3); padding-top: 11px; margin-top: auto;">
          Lo cobrado es lo que se cerró en el mostrador, no el estimado de la web.
        </span>
      </div>

    </div>
  </div>
</div>
""" % (barra_sup("Clientas", SEC["Clientas"], "Fichas"), svg(IC["mas"], 14),
       svg(IC["izq"], 15), svg(IC["der"], 15),
       campo("Teléfono", "342 415-8890"),
       campo("Email", "marce.ferreyra@gmail.com"),
       campo("Cómo llegó", "Reservó sola por la web"),
       campo("Alergias", "Amoníaco", "var(--alerta)"),
       campo("Última vez", "Hoy, 9:00"),
       campo("Suele venir", "Cada 4 semanas"),
       "\n".join(hist)))


# ======================================================================
# 4 · Servicios › Precios y tiempos — «lista que se edita en el lugar»
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
    ("Uñas", [("Semipermanente", "Precio único", "16.500", "60")]),
]
secciones = []
for area, items in PRECIOS:
    filas_p = []
    for servicio, largo, precio, dur in items:
        filas_p.append(
            '              <tr>\n'
            '                <td style="font-weight: 500;">%s</td>\n'
            '                <td style="color: var(--texto-2);">%s</td>\n'
            '                <td class="der" style="width: 132px;"><span class="num" style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; min-width: 92px; border: 1px solid var(--borde); border-radius: 4px; padding: 4px 9px;"><span style="color: var(--texto-3);">$</span>%s</span></td>\n'
            '                <td class="der" style="width: 118px;"><span class="num" style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 78px; border: 1px solid var(--borde); border-radius: 4px; padding: 4px 9px;">%s<span style="color: var(--texto-3);">min</span></span></td>\n'
            '              </tr>' % (servicio, largo, precio, dur))
    secciones.append(
        '            <tr><td colspan="4" style="background: var(--fila-hover); padding: 7px 12px;">'
        '<span class="rotulo">%s</span></td></tr>\n%s' % (area, "\n".join(filas_p)))

escribir("Precios.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nuevo servicio</button>
    <span class="miga">Servicios <span style="opacity: 0.5;">/</span> <strong>Precios y tiempos</strong></span>
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
      <div style="margin-top: auto; border-top: 1px solid var(--borde); padding: 10px 12px; font-size: 12px; color: var(--texto-3);">
        Se escribe al salir del campo, y queda «Deshacer».
      </div>
    </div>
  </div>
</div>
""" % (barra_sup("Servicios", SEC["Servicios"], "Precios y tiempos"), svg(IC["mas"], 14),
       svg(IC["lupa"], 15), svg(IC["chispa"], 16), "\n".join(secciones)))


# ======================================================================
# 5 · Calendario › Mes — la sección que hoy no existe, y por qué se pide
# ======================================================================
import calendar, datetime

ANIO, MES = 2026, 9
cal = calendar.Calendar(firstweekday=0)  # lunes
OCUPACION = {1: 5, 2: 6, 3: 8, 4: 7, 8: 4, 9: 6, 10: 6, 11: 8, 12: 3,
             15: 7, 16: 5, 17: 8, 18: 8, 22: 6, 23: 4, 24: 7, 25: 8,
             29: 5, 30: 6}
CERRADO = {0, 5, 6}  # lunes cerrado; sábado y domingo fuera del canal online

celdas = []
for semana in cal.monthdatescalendar(ANIO, MES):
    for d in semana:
        propio = d.month == MES
        cerrado = d.weekday() in CERRADO
        turnos = OCUPACION.get(d.day) if propio else None
        hoy = propio and d.day == 10
        if not propio:
            fondo, borde, color = "var(--fondo)", "var(--borde-suave)", "var(--texto-3)"
            cuerpo = ""
        elif cerrado:
            fondo, borde, color = "var(--fondo)", "var(--borde-suave)", "var(--texto-3)"
            cuerpo = '<span style="font-size: 11px; color: var(--texto-3);">cerrado</span>'
        else:
            fondo = "var(--acento-2)" if hoy else "var(--panel)"
            borde = "var(--acento)" if hoy else "var(--borde)"
            color = "var(--texto)"
            barra_ancho = int((turnos or 0) / 8 * 100)
            cuerpo = (
                '<span class="num" style="font-size: 12px; color: var(--texto-2);">%s turnos</span>'
                '<span style="display: block; height: 3px; border-radius: 2px; background: var(--borde-suave); overflow: hidden;">'
                '<span style="display: block; height: 3px; width: %d%%; background: var(--acento);"></span></span>'
                % (turnos, barra_ancho))
        celdas.append(
            '          <div style="border: 1px solid %s; background: %s; border-radius: 4px; '
            'padding: 7px 9px; height: 92px; display: flex; flex-direction: column; gap: 5px;">\n'
            '            <span class="num" style="font-size: 13px; font-weight: %s; color: %s;">%d</span>\n'
            '            %s\n'
            '          </div>' % (borde, fondo, "600" if hoy else "500", color, d.day, cuerpo))

dias_sem = "".join(
    '<span class="rotulo" style="text-align: center;">%s</span>' % n
    for n in ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"])

escribir("Calendario.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn btn-p" type="button">%s Nuevo turno</button>
    <span class="miga">Calendario <span style="opacity: 0.5;">/</span> <strong>Mes</strong></span>
    <span style="display: flex; align-items: center; gap: 10px; margin-left: 14px;">
      <span style="color: var(--texto-2); display: flex;">%s</span>
      <span style="font-size: 13px; font-weight: 500; min-width: 132px; text-align: center;">Septiembre 2026</span>
      <span style="color: var(--texto-2); display: flex;">%s</span>
    </span>
    <span class="buscador" style="min-width: 220px;">%s<span>Buscar un turno…</span></span>
  </div>

  <div class="lienzo">
    <div class="hoja" style="padding: 14px;">
      <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 7px; padding-bottom: 8px;">
        %s
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 7px;">
%s
      </div>
      <span style="font-size: 12px; color: var(--texto-3); padding-top: 11px;">
        La barra es cuánto de la jornada está tomado. Los lunes el salón cierra; sábados y domingos no se ofrecen por la web.
      </span>
    </div>
  </div>
</div>
""" % (barra_sup("Calendario", SEC["Calendario"], "Mes"), svg(IC["mas"], 14),
       svg(IC["izq"], 16), svg(IC["der"], 16), svg(IC["lupa"], 15),
       dias_sem, "\n".join(celdas)))


# ======================================================================
# 6 · Finanzas › Caja del día — el submódulo que ya existe en código
# ======================================================================
MOVIMIENTOS = [
    ("9:12", "Marcela Ferreyra", "saldo", "Efectivo", "35.200", False),
    ("10:04", "Vanina Quiroga", "seña", "Mercado Pago", "2.400", False),
    ("11:40", "Alejandra Sosa", "saldo", "Transferencia", "16.500", False),
    ("12:15", "Rocío Benítez", "seña", "Mercado Pago", "2.940", False),
    ("13:02", "Carla Maidana", "devolución", "Transferencia", "6.000", True),
]
movs = []
for hora, quien, concepto, medio, monto, salida in MOVIMIENTOS:
    movs.append(
        '              <tr>\n'
        '                <td class="num" style="color: var(--texto-2); width: 76px;">%s</td>\n'
        '                <td style="font-weight: 500;">%s</td>\n'
        '                <td style="color: var(--texto-2); width: 110px;">%s</td>\n'
        '                <td style="color: var(--texto-2); width: 150px;">%s</td>\n'
        '                <td class="num der" style="width: 120px; color: %s;">%s$%s</td>\n'
        '              </tr>' % (hora, quien, concepto, medio,
                                 "var(--alerta)" if salida else "var(--texto)",
                                 "−" if salida else "", monto))

def tarjeta_num(rotulo, valor, color="var(--texto)", pie=""):
    return ('        <div style="border: 1px solid var(--borde); border-radius: 5px; background: var(--panel); '
            'padding: 13px 15px; display: flex; flex-direction: column; gap: 3px;">\n'
            '          <span class="rotulo">%s</span>\n'
            '          <span class="num" style="font-size: 25px; font-weight: 600; color: %s;">%s</span>\n'
            '          <span style="font-size: 12px; color: var(--texto-3);">%s</span>\n'
            '        </div>' % (rotulo, color, valor, pie))

medios = []
for medio, monto, cuantos in [("Efectivo", "35.200", 1), ("Mercado Pago", "5.340", 2),
                              ("Transferencia", "16.500", 1)]:
    medios.append(
        '          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; '
        'padding: 8px 0; border-bottom: 1px solid var(--borde-suave);">\n'
        '            <span style="font-size: 13px;">%s</span>\n'
        '            <span style="display: flex; align-items: baseline; gap: 10px;">'
        '<span style="font-size: 11.5px; color: var(--texto-3);" class="num">%d</span>'
        '<span class="num" style="font-size: 13px; min-width: 74px; text-align: right;">$%s</span></span>\n'
        '          </div>' % (medio, cuantos, monto))

escribir("Finanzas.dc.html", "", """
<div class="app">
%s

  <div class="barra-acc">
    <button class="btn" type="button">Cerrar el día</button>
    <span class="miga">Finanzas <span style="opacity: 0.5;">/</span> <strong>Caja del día</strong></span>
    <span style="display: flex; align-items: center; gap: 10px; margin-left: 14px;">
      <span style="color: var(--texto-2); display: flex;">%s</span>
      <span style="font-size: 13px; font-weight: 500;">Miércoles 10 de septiembre</span>
      <span style="color: var(--texto-2); display: flex;">%s</span>
    </span>
  </div>

  <div class="lienzo" style="display: flex; flex-direction: column; gap: 14px;">
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;">
%s
%s
%s
%s
    </div>

    <div style="display: grid; grid-template-columns: minmax(0, 2.4fr) minmax(0, 1fr); gap: 12px; flex-grow: 1; overflow: hidden;">
      <div class="hoja">
        <table>
          <thead>
            <tr>
              <th style="width: 76px;">Hora</th>
              <th>Clienta</th>
              <th style="width: 110px;">Concepto</th>
              <th style="width: 150px;">Medio</th>
              <th class="der" style="width: 120px;">Monto</th>
            </tr>
          </thead>
          <tbody>
%s
          </tbody>
        </table>
        <div style="margin-top: auto; border-top: 1px solid var(--borde); padding: 10px 12px; font-size: 12px; color: var(--texto-3);">
          Se agrupa por cuándo entró la plata, no por el día del turno. Las devoluciones se muestran aparte, nunca netadas.
        </div>
      </div>

      <div class="hoja" style="padding: 14px 15px;">
        <span class="rotulo">Por medio</span>
        <div style="display: flex; flex-direction: column; padding-top: 6px;">
%s
        </div>
        <div style="margin-top: auto; padding-top: 12px;">
          <span class="rotulo">Falta facturar</span>
          <div style="display: flex; align-items: baseline; gap: 9px; padding-top: 5px;">
            <span class="num" style="font-size: 19px; font-weight: 600; color: var(--alerta);">3</span>
            <span style="font-size: 12.5px; color: var(--texto-2);">atenciones sin comprobante</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
""" % (barra_sup("Finanzas", SEC["Finanzas"], "Caja del día"),
       svg(IC["izq"], 16), svg(IC["der"], 16),
       tarjeta_num("Entró", "$43.640", "var(--texto)", "4 cobros"),
       tarjeta_num("Devuelto", "$6.000", "var(--alerta)", "1 devolución"),
       tarjeta_num("Queda", "$37.640", "var(--ok)", "en caja al cerrar"),
       tarjeta_num("Turnos", "6", "var(--texto)", "5 atendidos · 1 por venir"),
       "\n".join(movs), "\n".join(medios)))


# ======================================================================
# 7 · El teléfono: Calendario › Hoy, donde de verdad se trabaja
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
        '      </div>' % (hora, quien, det, c, b, f, estado))

pestanas = []
for nombre in SEC["Calendario"]:
    activa = nombre == "Hoy"
    pestanas.append(
        '    <span style="height: 34px; padding: 0 13px; border-radius: 3px; font-size: 12.5px; '
        'display: inline-flex; align-items: center; flex-shrink: 0; %s">%s</span>'
        % ("background: var(--acento-2); color: var(--acento); font-weight: 500;" if activa
           else "border: 1px solid var(--borde); color: var(--texto-2);", nombre))

escribir("Telefono.dc.html", """
  .tel { width: 390px; height: 844px; display: flex; flex-direction: column; background: var(--fondo); overflow: hidden; }
""", """
<div class="tel">
  <div class="barra-sup" style="height: 52px; padding: 0 12px; gap: 11px;">
    <span style="display: flex; align-items: center; width: 44px; height: 44px; justify-content: center; margin-left: -6px;">%s</span>
    <span style="display: flex; flex-direction: column;">
      <span class="barra-marca" style="font-size: 15px;">Calendario</span>
      <span style="font-size: 11.5px; opacity: 0.7;">Miércoles 10 · 6 turnos</span>
    </span>
    <span class="barra-der">%s</span>
  </div>

  <div style="background: var(--panel); border-bottom: 1px solid var(--borde); padding: 9px 14px; display: flex; gap: 7px; overflow: hidden;">
%s
  </div>

  <div style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
%s
  </div>

  <div style="border-top: 1px solid var(--borde); background: var(--panel); padding: 11px 14px 15px;">
    <button class="btn btn-p" type="button" style="width: 100%%; height: 46px; justify-content: center; font-size: 14px;">%s Cargar un turno</button>
  </div>
</div>
""" % (svg(IC["grilla"], 19), svg(IC["lupa"], 17), "\n".join(pestanas),
       "\n".join(filas_dia), svg(IC["mas"], 16)))
