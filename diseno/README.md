# Diseño

Bocetos y maquetas del producto, antes de que sean código. Cada carpeta es
un ejercicio con su propia pregunta.

| Carpeta | Qué pregunta contesta | Estado |
|---|---|---|
| `paneles/` | Qué aspecto y qué formato tienen los módulos internos | Vigente |
| `armazon/` | Cómo se organizan los nueve módulos en un teléfono | Superado por `paneles/` |

## Los paneles internos NO usan el diseño de la web

Son dos productos distintos y no comparten lenguaje visual. La web de las
clientas es la vidriera del salón: serif, champagne, aire, esquinas
generosas. Los paneles de gestión son una herramienta de trabajo: sans
neutra, gris, un solo color funcional, esquinas de 4 px, filas apretadas y
números alineados.

Mezclarlos fue un error concreto del primer boceto —`armazon/`— y por eso
quedó superado. De la familia de sistemas de gestión tipo Odoo se toma la
**estructura** (escritorio de módulos, migas de pan, lista y ficha), nunca
su marca ni su chrome.

La apuesta de `paneles/` es que hay **tres formatos y nada más**, y que los
nueve módulos se arman con esos tres: la lista, la ficha, y la lista que se
edita en el lugar.

## Cómo se regenera un lienzo

Las fuentes son los `.dc.html` (un archivo por pantalla), `canvas.json` (dónde
va cada uno y las notas al margen) y `build.py`, que los arma desde una hoja
de estilo compartida para no repetirla cinco veces.

```bash
cd diseno/armazon
python3 build.py          # reescribe los .dc.html
```

El archivo grande que queda al lado —el lienzo publicado— **no se versiona**:
son 2,5 MB de editor y se vuelve a generar entero cada vez. Está en
`.gitignore` a propósito.

## Por qué el boceto es feo a propósito

Los bocetos van en letra de lápiz, sin color y con datos de relleno. Es para
que la conversación sea sobre dónde va cada cosa y no sobre de qué tono es el
botón: una maqueta demasiado terminada se discute como si ya estuviera
decidida.

Los números y los nombres de clientas que aparecen en los bocetos son
inventados y no salen de la base.
