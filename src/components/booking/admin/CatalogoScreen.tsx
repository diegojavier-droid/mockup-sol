/**
 * Servicios › Servicios, Tratamientos y Promociones.
 *
 * Las tres pantallas que hacían falta para que Sol no tenga que pedirle
 * nada a nadie: dar de alta lo que vende, decir de qué clase es, cargar
 * cuánto le cuesta, y escribir las promociones que hoy hace de memoria.
 *
 * POR QUÉ SERVICIOS Y TRATAMIENTOS SON DOS PANTALLAS Y UNA SOLA TABLA
 *
 * Sol los nombra distinto y los cobra distinto, así que verlos mezclados
 * en una lista de sesenta renglones no la ayuda. Pero un tratamiento se
 * reserva, ocupa tiempo y ocupa estación igual que un corte: lo que los
 * separa es una columna, `kind`, no una tabla.
 *
 * La consecuencia está a la vista y es deliberada: cambiar la clase de un
 * servicio lo muda de pantalla. La fila avisa antes de que pase.
 *
 * REGLAS DE FORMA, LAS MISMAS QUE PRECIOS Y TIEMPOS
 *
 * - **Se edita donde se ve.** El costo es un campo, no un formulario.
 * - **Se puede deshacer.** Después de guardar, «antes → ahora» y un botón.
 *   No hay carteles de confirmación: quien no estudió esto aprende
 *   probando, y un sistema que castiga probar se evita.
 * - **Nada se borra.** Dar de baja archiva; los turnos viejos que lo
 *   nombran siguen valiendo.
 */

import { useMemo, useState } from "react";
import {
  useBajaDeServicio,
  useBorrarPromocion,
  useCatalogo,
  useCategorias,
  useCrearServicio,
  useEditarServicio,
  useGuardarPromocion,
  usePromociones,
  useReglaDePromocion,
  useSetPromocionActiva,
  useSetServiceCost,
  type CatalogRow,
  type CategoryRow,
  type PromotionRow,
  type ServiceKind,
} from "@/lib/api/admin-hooks";

const KIND_LABEL: Record<ServiceKind, string> = {
  servicio: "Servicio",
  color: "Color",
  tratamiento: "Tratamiento",
};

/**
 * Qué significa cada clase, dicho para quien la elige.
 *
 * La palabra sola no alcanza: «color» no es la categoría del servicio, es
 * el marcador que hace que la promoción se dispare. Si eso no está a la
 * vista en el momento de elegir, la casilla se tilda mal.
 */
const KIND_AYUDA: Record<ServiceKind, string> = {
  servicio: "Vale lo mismo vaya solo o acompañado.",
  color: "Dispara las promociones que se activan con un color.",
  tratamiento: "Cuando va con un color puede salir menos.",
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

/**
 * Para buscar: sin acentos y en minúsculas.
 *
 * Sol escribe «nutricion» y el servicio se llama «Alisado + nutrición». Una
 * búsqueda que distingue el acento no encuentra nada y parece rota.
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Sin acentos ni mayúsculas: es lo que va en la dirección. */
function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** El cartel de «listo, y se puede deshacer». */
function useAviso() {
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);

  const barra = aviso ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-champagne-deep/30 bg-cream/60 px-4 py-3 text-sm text-foreground/85">
      <span>{aviso.texto}</span>
      {aviso.deshacer && (
        <button
          type="button"
          onClick={() => {
            aviso.deshacer?.();
            setAviso(null);
          }}
          className="shrink-0 rounded-full border border-current/30 px-3 py-1 text-xs font-medium"
        >
          Deshacer
        </button>
      )}
    </div>
  ) : null;

  return { setAviso, barra };
}

type Aviso = (a: { texto: string; deshacer?: () => void } | null) => void;

const CAMPO =
  "min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const BOTON =
  "shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";
const CHIP = "shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium";

/* ------------------------------------------------------------------ */
/* Servicios y Tratamientos: la misma pantalla con distinto filtro     */
/* ------------------------------------------------------------------ */

/** Servicios › Servicios. */
export function ServiciosScreen() {
  return <Catalogo modo="servicios" />;
}

/** Servicios › Tratamientos. */
export function TratamientosScreen() {
  return <Catalogo modo="tratamientos" />;
}

/**
 * El catálogo, agrupado por área.
 *
 * POR QUÉ AGRUPADO Y NO UNA LISTA SOLA
 *
 * Son 37 servicios y 22 tratamientos, y no están repartidos parejo: de los
 * 59, 44 son de Peluquería. Una sola lista alfabética mezcla «Alisado +
 * corte» con «Cera de cejas» y «Esmaltado semipermanente», y encontrar algo
 * pasa a ser cuestión de scrollear hasta verlo.
 *
 * La pantalla de Precios y tiempos ya agrupaba por área desde antes. Ésta
 * nació sin hacerlo y quedó desalineada de la que Sol ya usa todos los días.
 *
 * EL ORDEN DE LAS ÁREAS SALE DE LA BASE, NO DE ACÁ
 *
 * `categories.sort_order` ya dice que Peluquería va primero. Escribir el
 * orden en el código sería la tercera copia de un dato que ya existe, y la
 * que se olvidaría de actualizar el día que Sol agregue un área.
 */
function Catalogo({ modo }: { modo: "servicios" | "tratamientos" }) {
  const { setAviso, barra } = useAviso();
  const catalogo = useCatalogo(true);
  const categorias = useCategorias(true);
  const [busqueda, setBusqueda] = useState("");
  const [abriendoAlta, setAbriendoAlta] = useState(false);
  const esTratamiento = modo === "tratamientos";

  const filas = useMemo(
    () =>
      (catalogo.data ?? []).filter((f) =>
        esTratamiento ? f.kind === "tratamiento" : f.kind !== "tratamiento",
      ),
    [catalogo.data, esTratamiento],
  );

  const buscado = normalizar(busqueda);
  const visibles = useMemo(
    () =>
      buscado === ""
        ? filas
        : filas.filter((f) => normalizar(f.name).includes(buscado) || f.slug.includes(buscado)),
    [filas, buscado],
  );

  /**
   * Un grupo por área, en el orden de la base.
   *
   * Los que no se ofrecen van al final de su área en vez de mezclarse por
   * orden alfabético: si babylights aparece entre dos servicios activos, hay
   * que leer la etiqueta de cada fila para saber cuáles están vivos.
   */
  const grupos = useMemo(() => {
    const orden = (categorias.data ?? []).map((c) => c.slug);
    const nombre = new Map((categorias.data ?? []).map((c) => [c.slug, c.name]));
    const porArea = new Map<string, CatalogRow[]>();
    for (const f of visibles) {
      if (!porArea.has(f.category)) porArea.set(f.category, []);
      porArea.get(f.category)!.push(f);
    }
    return [...porArea.entries()]
      .sort((a, b) => {
        const ia = orden.indexOf(a[0]);
        const ib = orden.indexOf(b[0]);
        // Un área que todavía no llegó en la consulta de categorías va al
        // final, no al principio: `indexOf` devuelve -1 y ordenaría al revés.
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([slug, lista]) => ({
        slug,
        nombre: nombre.get(slug) ?? slug,
        lista: [...lista].sort(
          (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "es"),
        ),
      }));
  }, [visibles, categorias.data]);

  return (
    <div className="space-y-6">
      {barra}

      <section>
        <h2 className="font-serif text-xl text-foreground">
          {esTratamiento ? "Tratamientos" : "Servicios"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {esTratamiento
            ? "Lo que se suma a otro trabajo: hidratación, keratina, botox. Con un color pueden salir menos, y eso lo decide la promoción."
            : "Lo principal del turno: corte, color, mechas, balayage."}
        </p>

        {/*
          Las dos aclaraciones que antes se repetían en cada fila. Dichas
          treinta y siete veces dejan de leerse y se vuelven ruido; dichas
          una vez, arriba, siguen estando cuando hacen falta.
        */}
        <ul className="mt-3 max-w-2xl space-y-1 text-xs text-muted-foreground">
          <li>
            <span className="text-foreground/70">La clase</span> decide el precio cuando hay varias
            cosas en el mismo turno: un <b>color</b> activa las promociones sobre los tratamientos,
            y un <b>tratamiento</b> con un color puede salir menos. Lo demás vale lo mismo vaya solo
            o acompañado.
          </li>
          <li>
            <span className="text-foreground/70">Nos cuesta</span> es lo que el salón paga por
            prestarlo. Vacío quiere decir «no sabemos» y deja el margen sin calcular: no es cero.
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={BOTON} onClick={() => setAbriendoAlta((v) => !v)} type="button">
            {esTratamiento ? "Agregar un tratamiento" : "Agregar un servicio"}
          </button>
          <input
            aria-label="Buscar en el catálogo"
            className={`${CAMPO} w-56`}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            type="search"
            value={busqueda}
          />
          {busqueda.trim() !== "" && (
            <span className="text-xs text-muted-foreground">
              {visibles.length === 0
                ? "Nada con ese nombre."
                : `${visibles.length} de ${filas.length}`}
            </span>
          )}
        </div>

        {abriendoAlta && (
          <Alta modo={modo} onAviso={setAviso} onCerrar={() => setAbriendoAlta(false)} />
        )}

        {catalogo.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}
        {catalogo.isError && (
          <p className="mt-4 text-sm text-foreground/85">
            {catalogo.error instanceof Error
              ? catalogo.error.message
              : "No se pudo leer el catálogo."}
          </p>
        )}

        {!catalogo.isLoading && filas.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
            <p className="font-serif text-lg text-foreground">
              {esTratamiento ? "Todavía no hay tratamientos" : "Todavía no hay servicios"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Agregá el primero con el botón de arriba.
            </p>
          </div>
        )}

        {grupos.map((g) => (
          <div className="mt-8" key={g.slug}>
            <h3 className="flex items-baseline gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {g.nombre}
              <span className="tracking-normal normal-case">· {g.lista.length}</span>
            </h3>
            <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
              {g.lista.map((f) => (
                <FilaCatalogo
                  // El valor va en la clave a propósito: cuando el servidor
                  // devuelve otro —al deshacer, por ejemplo— la fila se vuelve
                  // a montar con el dato correcto en vez de mostrar el viejo.
                  key={`${f.slug}-${f.kind}-${f.standardCost}-${f.name}`}
                  categorias={categorias.data ?? []}
                  fila={f}
                  onAviso={setAviso}
                />
              ))}
            </div>
          </div>
        ))}

        <p className="mt-6 text-xs text-muted-foreground">
          El precio y la duración por largo se cambian en{" "}
          <span className="text-foreground/70">Precios y tiempos</span>. Acá se decide qué existe y
          de qué clase es.
        </p>
      </section>
    </div>
  );
}

/**
 * Un servicio, en dos renglones.
 *
 * Antes eran seis, con las mismas dos aclaraciones repetidas en cada uno y
 * tres botones para elegir la clase. Con treinta y siete filas eso son más
 * de trescientos controles en una pantalla, y la lista deja de poder leerse.
 *
 * POR QUÉ LA CLASE ES UNA LISTA Y NO TRES BOTONES
 *
 * Tres botones se leen como tres cosas que podés hacer; una lista desplegable
 * se lee como una sola cosa que está en un estado. Es lo segundo: un servicio
 * tiene una clase, no tres. Además es el mismo control que ya usa la
 * categoría dos casilleros más allá.
 *
 * El nombre corto —el que va en la dirección— no se edita nunca: cambiarlo
 * rompería los turnos viejos que lo nombran, y renombrar lo que se lee es lo
 * que hace falta el 100% de las veces.
 */
function FilaCatalogo({
  fila,
  categorias,
  onAviso,
}: {
  fila: CatalogRow;
  categorias: CategoryRow[];
  onAviso: Aviso;
}) {
  const editar = useEditarServicio();
  const costo = useSetServiceCost();
  const baja = useBajaDeServicio();

  const [nombre, setNombre] = useState(fila.name);
  const [costoTexto, setCostoTexto] = useState(
    fila.standardCost === null ? "" : String(fila.standardCost),
  );

  const fallo = (e: unknown) =>
    onAviso({ texto: e instanceof Error ? e.message : "No se pudo guardar." });

  /** Cambiar algo y poder volver atrás con el mismo gesto. */
  const cambiar = (
    campos: Parameters<typeof editar.mutate>[0],
    texto: string,
    volver: Parameters<typeof editar.mutate>[0],
  ) =>
    editar.mutate(campos, {
      onSuccess: () => onAviso({ texto, deshacer: () => editar.mutate(volver) }),
      onError: fallo,
    });

  const guardarCosto = () => {
    const limpio = costoTexto.trim();
    const valor = limpio === "" ? null : Number(limpio);
    if (valor !== null && (!Number.isInteger(valor) || valor < 0)) {
      onAviso({ texto: "El costo es un número entero, o vacío si no se sabe." });
      return;
    }
    if (valor === fila.standardCost) return;
    const antes = fila.standardCost;
    costo.mutate(
      { slug: fila.slug, amount: valor },
      {
        onSuccess: () =>
          onAviso({
            texto: `${fila.name} · nos cuesta: ${antes === null ? "sin dato" : pesos(antes)} → ${
              valor === null ? "sin dato" : pesos(valor)
            }`,
            deshacer: () => costo.mutate({ slug: fila.slug, amount: antes }),
          }),
        onError: fallo,
      },
    );
  };

  const margen = fila.standardCost === null ? null : fila.priceAmount - fila.standardCost;

  return (
    <div className={`px-4 py-3 ${fila.isActive ? "" : "bg-muted/20"}`}>
      {/* Renglón 1: qué es y cuánto sale. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          aria-label={`Nombre de ${fila.name}`}
          className={`min-w-0 flex-1 basis-48 rounded-lg border border-transparent bg-transparent px-2 py-1 font-serif text-base text-foreground hover:border-border focus-visible:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            fila.isActive ? "" : "text-muted-foreground line-through decoration-1"
          }`}
          onBlur={() => {
            const limpio = nombre.trim();
            if (limpio === "" || limpio === fila.name) {
              setNombre(fila.name);
              return;
            }
            cambiar({ slug: fila.slug, name: limpio }, `«${fila.name}» → «${limpio}»`, {
              slug: fila.slug,
              name: fila.name,
            });
          }}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          value={nombre}
        />

        <select
          aria-label={`Clase de ${fila.name}`}
          className={`${CAMPO} w-32 shrink-0 py-1 text-xs ${
            fila.kind === "servicio" ? "text-muted-foreground" : "text-foreground"
          }`}
          onChange={(e) => {
            const kind = e.target.value as ServiceKind;
            const antes = fila.kind;
            cambiar(
              { slug: fila.slug, kind },
              `${fila.name}: ${KIND_LABEL[antes]} → ${KIND_LABEL[kind]}.` +
                (kind === "tratamiento" || antes === "tratamiento" ? " Cambió de pestaña." : ""),
              { slug: fila.slug, kind: antes },
            );
          }}
          value={fila.kind}
        >
          {(["servicio", "color", "tratamiento"] as ServiceKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>

        <span className="shrink-0 text-sm tabular-nums text-foreground/80">
          {fila.durationMin} min · {pesos(fila.priceAmount)}
        </span>
      </div>

      {/* Renglón 2: lo de adentro, en voz baja. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 pl-2 text-xs text-muted-foreground">
        <span className="w-36 shrink-0 truncate font-mono" title={fila.slug}>
          {fila.slug}
        </span>

        <span className="flex items-center gap-1.5">
          Nos cuesta
          <input
            aria-label={`Costo de ${fila.name}`}
            className={`${CAMPO} w-28 py-0.5 text-xs`}
            inputMode="numeric"
            onBlur={guardarCosto}
            onChange={(e) => setCostoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="No sabemos"
            value={costoTexto}
          />
          <span className="w-24 tabular-nums">
            {margen === null ? "" : `queda ${pesos(margen)}`}
          </span>
        </span>

        <select
          aria-label={`Área de ${fila.name}`}
          className={`${CAMPO} w-32 shrink-0 py-0.5 text-xs`}
          onChange={(e) =>
            cambiar(
              { slug: fila.slug, category: e.target.value },
              `${fila.name} se movió a ${
                categorias.find((c) => c.slug === e.target.value)?.name ?? e.target.value
              }.`,
              { slug: fila.slug, category: fila.category },
            )
          }
          value={fila.category}
        >
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            className={`${CHIP} ${fila.isActive ? "border-foreground/40 text-foreground" : ""}`}
            onClick={() =>
              cambiar(
                { slug: fila.slug, isActive: !fila.isActive },
                `${fila.name}: ${fila.isActive ? "ya no se ofrece" : "vuelve a ofrecerse"}.`,
                { slug: fila.slug, isActive: fila.isActive },
              )
            }
            type="button"
          >
            {fila.isActive ? "Se ofrece" : "Guardado"}
          </button>

          <button
            className={`${CHIP} ${fila.isPublic ? "border-foreground/40 text-foreground" : ""}`}
            onClick={() =>
              cambiar(
                { slug: fila.slug, isPublic: !fila.isPublic },
                `${fila.name}: ${fila.isPublic ? "ya no se ve en la web" : "ahora se ve en la web"}.`,
                { slug: fila.slug, isPublic: fila.isPublic },
              )
            }
            type="button"
          >
            {fila.isPublic ? "En la web" : "Sólo adentro"}
          </button>

          <button
            className={CHIP}
            onClick={() =>
              baja.mutate(fila.slug, {
                onSuccess: () =>
                  onAviso({
                    texto: `${fila.name} salió de la lista. Los turnos que lo tienen no cambian.`,
                  }),
                onError: fallo,
              })
            }
            type="button"
          >
            Sacar de la lista
          </button>
        </div>
      </div>
    </div>
  );
}

function Alta({
  modo,
  onAviso,
  onCerrar,
}: {
  modo: "servicios" | "tratamientos";
  onAviso: Aviso;
  onCerrar: () => void;
}) {
  const crear = useCrearServicio();
  const categorias = useCategorias(true);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [kind, setKind] = useState<ServiceKind>(
    modo === "tratamientos" ? "tratamiento" : "servicio",
  );
  const [duracion, setDuracion] = useState("45");
  const [precio, setPrecio] = useState("");

  const slug = slugificar(nombre);
  const cat = categoria || categorias.data?.[0]?.slug || "";
  const listo =
    slug.length >= 2 &&
    cat !== "" &&
    Number(duracion) > 0 &&
    precio.trim() !== "" &&
    Number.isInteger(Number(precio)) &&
    Number(precio) >= 0;

  return (
    <div className="mt-3 rounded-2xl border border-champagne-deep/30 bg-cream/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          <span className="block">Cómo se llama</span>
          <input
            autoFocus
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Raíz Exiline"
            value={nombre}
          />
          {slug !== "" && <span className="mt-1 block text-[11px]">Quedará como «{slug}»</span>}
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Dónde va</span>
          <select
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setCategoria(e.target.value)}
            value={cat}
          >
            {(categorias.data ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Cuánto lleva (minutos)</span>
          <input
            className={`${CAMPO} mt-1 w-full`}
            inputMode="numeric"
            onChange={(e) => setDuracion(e.target.value)}
            value={duracion}
          />
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Cuánto sale</span>
          <input
            className={`${CAMPO} mt-1 w-full`}
            inputMode="numeric"
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="28000"
            value={precio}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="alta-clase">
          Clase
        </label>
        <select
          className={`${CAMPO} py-1 text-xs`}
          id="alta-clase"
          onChange={(e) => setKind(e.target.value as ServiceKind)}
          value={kind}
        >
          {(["servicio", "color", "tratamiento"] as ServiceKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{KIND_AYUDA[kind]}</span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Entra sin publicar en la web y con el mismo precio para los cuatro largos. Los largos se
        afinan en Precios y tiempos, y ahí decidís cuándo mostrarlo.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={BOTON}
          disabled={!listo || crear.isPending}
          onClick={() =>
            crear.mutate(
              {
                slug,
                name: nombre.trim(),
                category: cat,
                kind,
                durationMin: Number(duracion),
                price: Number(precio),
              },
              {
                onSuccess: () => {
                  onAviso({ texto: `«${nombre.trim()}» quedó en la lista, sin publicar.` });
                  setNombre("");
                  setPrecio("");
                  onCerrar();
                },
                onError: (e) =>
                  onAviso({ texto: e instanceof Error ? e.message : "No se pudo crear." }),
              },
            )
          }
          type="button"
        >
          {crear.isPending ? "Guardando…" : "Agregar"}
        </button>
        <button className={CHIP} onClick={onCerrar} type="button">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Promociones                                                         */
/* ------------------------------------------------------------------ */

/**
 * Servicios › Promociones.
 *
 * Una promoción tiene dos lados y se eligen por separado, porque el que
 * la dispara y el que se abarata son distintos: en el salón el color
 * dispara y el tratamiento baja de precio. Una sola lista no puede decir
 * eso.
 */
export function PromocionesScreen() {
  const { setAviso, barra } = useAviso();
  const promos = usePromociones(true);

  return (
    <div className="space-y-6">
      {barra}

      <section>
        <h2 className="font-serif text-xl text-foreground">Promociones</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Una promoción se activa con algo del turno y abarata otra cosa. La que ya hacés —quien se
          hace color y suma un tratamiento paga menos por el tratamiento— está cargada abajo.
        </p>

        <AltaDePromocion onAviso={setAviso} />

        {promos.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}
        {promos.isError && (
          <p className="mt-4 text-sm text-foreground/85">
            {promos.error instanceof Error ? promos.error.message : "No se pudieron leer."}
          </p>
        )}

        {!promos.isLoading && (promos.data ?? []).length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
            <p className="font-serif text-lg text-foreground">Todavía no hay promociones</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Agregá la primera con el formulario de arriba.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {(promos.data ?? []).map((p) => (
            <FilaPromocion key={p.slug} onAviso={setAviso} promo={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FilaPromocion({ promo, onAviso }: { promo: PromotionRow; onAviso: Aviso }) {
  const regla = useReglaDePromocion();
  const activa = useSetPromocionActiva();
  const borrar = useBorrarPromocion();

  const fallo = (e: unknown) =>
    onAviso({ texto: e instanceof Error ? e.message : "No se pudo guardar." });

  const tiene = (lado: "disparador" | "beneficio", kind: ServiceKind) =>
    (lado === "disparador" ? promo.disparadores : promo.beneficios).some(
      (r) => r.serviceKind === kind,
    );

  const alternar = (lado: "disparador" | "beneficio", kind: ServiceKind) => {
    const agregar = !tiene(lado, kind);
    regla.mutate(
      { slug: promo.slug, lado, serviceKind: kind, agregar },
      {
        onSuccess: () =>
          onAviso({
            texto: `${promo.name}: ${KIND_LABEL[kind]} ${agregar ? "entra" : "sale"} como ${lado}.`,
            deshacer: () =>
              regla.mutate({ slug: promo.slug, lado, serviceKind: kind, agregar: !agregar }),
          }),
        onError: fallo,
      },
    );
  };

  const sinLados = promo.disparadores.length === 0 || promo.beneficios.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-base text-foreground">{promo.name}</p>
          {promo.description && (
            <p className="mt-1 text-sm text-muted-foreground">{promo.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {promo.benefitKind === "precio_de_agregado"
              ? "Usa el precio con promoción que ya está cargado por servicio y largo."
              : promo.benefitKind === "porcentaje"
                ? `${promo.benefitValue}% menos.`
                : `${pesos(promo.benefitValue ?? 0)} menos.`}
            {promo.startsOn || promo.endsOn
              ? ` Del ${promo.startsOn ?? "siempre"} al ${promo.endsOn ?? "siempre"}.`
              : " Sin fecha de fin."}
          </p>
        </div>

        <button
          className={`${CHIP} ${promo.isActive ? "border-foreground" : "opacity-60"}`}
          onClick={() => {
            const antes = promo.isActive;
            activa.mutate(
              { slug: promo.slug, active: !antes },
              {
                onSuccess: () =>
                  onAviso({
                    texto: `${promo.name}: ${antes ? "apagada" : "encendida"}.`,
                    deshacer: () => activa.mutate({ slug: promo.slug, active: antes }),
                  }),
                onError: fallo,
              },
            );
          }}
          type="button"
        >
          {promo.isActive ? "Activa" : "Apagada"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Lado
          ayuda="Qué tiene que haber en el turno para que se active."
          onAlternar={(k) => alternar("disparador", k)}
          tiene={(k) => tiene("disparador", k)}
          titulo="Se activa con"
        />
        <Lado
          ayuda="Qué baja de precio cuando se activa."
          onAlternar={(k) => alternar("beneficio", k)}
          tiene={(k) => tiene("beneficio", k)}
          titulo="Abarata"
        />
      </div>

      {sinLados && (
        <p className="mt-3 text-xs text-foreground/85">
          Le falta un lado: sin algo que la active o sin algo que abaratar, no hace nada.
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          className={`${CHIP} text-muted-foreground`}
          onClick={() =>
            borrar.mutate(promo.slug, {
              onSuccess: () => onAviso({ texto: `${promo.name} se borró.` }),
              onError: fallo,
            })
          }
          type="button"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}

/**
 * Un lado de la regla, por clase de servicio.
 *
 * Por clase y no por servicio suelto a propósito: es la forma que se
 * mantiene sola. El día que Sol marque balayage como color, la promoción
 * lo cubre sin que nadie la vuelva a tocar.
 */
function Lado({
  titulo,
  ayuda,
  tiene,
  onAlternar,
}: {
  titulo: string;
  ayuda: string;
  tiene: (k: ServiceKind) => boolean;
  onAlternar: (k: ServiceKind) => void;
}) {
  // `section` con nombre y no un `div`: los dos lados tienen los mismos
  // tres botones, y sin un nombre alrededor no hay manera —ni para quien
  // usa un lector de pantalla, ni para una prueba— de decir cuál es cuál.
  return (
    <section aria-label={titulo}>
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{ayuda}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["servicio", "color", "tratamiento"] as ServiceKind[]).map((k) => (
          <button
            className={`${CHIP} ${
              tiene(k) ? "border-foreground bg-foreground text-background" : ""
            }`}
            key={k}
            onClick={() => onAlternar(k)}
            type="button"
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
    </section>
  );
}

function AltaDePromocion({ onAviso }: { onAviso: Aviso }) {
  const guardar = useGuardarPromocion();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const slug = slugificar(nombre);

  if (!abierto) {
    return (
      <button className={`${BOTON} mt-4`} onClick={() => setAbierto(true)} type="button">
        Agregar una promoción
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-champagne-deep/30 bg-cream/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          <span className="block">Cómo se llama (lo lee la clienta)</span>
          <input
            autoFocus
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tratamiento con tu color"
            value={nombre}
          />
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Qué dice</span>
          <input
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Si te hacés color y sumás un tratamiento, sale menos."
            value={texto}
          />
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Desde (opcional)</span>
          <input
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setDesde(e.target.value)}
            type="date"
            value={desde}
          />
        </label>

        <label className="text-xs text-muted-foreground">
          <span className="block">Hasta (opcional)</span>
          <input
            className={`${CAMPO} mt-1 w-full`}
            onChange={(e) => setHasta(e.target.value)}
            type="date"
            value={hasta}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Usa el precio con promoción que ya está cargado por servicio y largo. Después de crearla,
        elegí con qué se activa y qué abarata.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={BOTON}
          disabled={slug.length < 2 || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              {
                slug,
                name: nombre.trim(),
                description: texto.trim() === "" ? null : texto.trim(),
                startsOn: desde === "" ? null : desde,
                endsOn: hasta === "" ? null : hasta,
              },
              {
                onSuccess: () => {
                  onAviso({
                    texto: `«${nombre.trim()}» creada. Falta decir con qué se activa y qué abarata.`,
                  });
                  setNombre("");
                  setTexto("");
                  setAbierto(false);
                },
                onError: (e) =>
                  onAviso({ texto: e instanceof Error ? e.message : "No se pudo crear." }),
              },
            )
          }
          type="button"
        >
          {guardar.isPending ? "Guardando…" : "Crear"}
        </button>
        <button className={CHIP} onClick={() => setAbierto(false)} type="button">
          Cancelar
        </button>
      </div>
    </div>
  );
}
