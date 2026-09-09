import { useMemo, useState } from "react";
import {
  useAplicarPropuesta,
  useAsistenteDisponible,
  usePropuestaDePrecios,
  useSalonProducts,
  useSalonServices,
  useSetProductActive,
  useSetServicePrice,
  useSetStationActive,
  useStations,
  useUpsertProduct,
  useUpsertStation,
  type CambioPropuesto,
  type ProductRow,
  type ServiceTierRow,
} from "@/lib/api/admin-hooks";

const LARGO_LABEL: Record<string, string> = {
  corto: "Corto",
  medio: "Media melena",
  largo: "Largo",
  xl: "Muy largo",
  unico: "Precio único",
};

const AREA_LABEL: Record<string, string> = {
  peluqueria: "Peluquería",
  maquillaje: "Maquillaje",
  unas: "Uñas",
  depilacion: "Depilación",
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

/**
 * «El salón»: lo que Sol cambia cuando cambia algo de su negocio.
 *
 * Tres cosas y ninguna más: cuánto sale y cuánto lleva cada servicio, qué
 * puestos hay, y qué productos vende. La estructura de preguntas de un
 * servicio no se toca desde acá —rompería la cotización en silencio— y eso
 * está dicho en la pantalla, no escondido.
 *
 * Reglas de forma, tomadas de la arquitectura:
 *
 * - **Se edita donde se ve.** El precio es un campo, no un formulario que
 *   se abre. Si cambiar un número cuesta tres clics, no se cambia.
 * - **Se puede deshacer.** Después de guardar, la pantalla dice «antes →
 *   ahora» y ofrece volver. No hay carteles de confirmación: quien no
 *   estudió esto aprende probando, y un sistema que castiga probar se
 *   evita.
 * - **Nada se borra.** Sacar de la lista es archivar.
 */
export function SalonScreen() {
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);

  return (
    <div className="space-y-8">
      {aviso && (
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
      )}

      <Servicios onAviso={setAviso} />
      <Estaciones onAviso={setAviso} />
      <Productos onAviso={setAviso} />
    </div>
  );
}

type Aviso = (a: { texto: string; deshacer?: () => void } | null) => void;

/* ------------------------------------------------------------------ */

function Servicios({ onAviso }: { onAviso: Aviso }) {
  const servicios = useSalonServices(true);
  const guardar = useSetServicePrice();

  const porArea = useMemo(() => {
    const grupos = new Map<string, ServiceTierRow[]>();
    for (const fila of servicios.data ?? []) {
      if (!grupos.has(fila.area)) grupos.set(fila.area, []);
      grupos.get(fila.area)!.push(fila);
    }
    return [...grupos.entries()];
  }, [servicios.data]);

  return (
    <section>
      <h2 className="font-serif text-xl text-foreground">Precios y tiempos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tocá el número y escribí el nuevo. Se guarda al salir del campo.
      </p>

      <Asistente onAviso={onAviso} />

      {servicios.isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

      {porArea.map(([area, filas]) => (
        <div key={area} className="mt-6">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {AREA_LABEL[area] ?? area}
          </h3>
          <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
            {filas.map((f) => (
              <FilaServicio
                // El valor va en la clave a propósito: cuando el servidor
                // devuelve otro —al deshacer, por ejemplo— la fila se
                // vuelve a montar con el número correcto. Sin esto, Sol
                // tocaba «Deshacer», el servidor lo deshacía, y la
                // pantalla le seguía mostrando el precio viejo: la peor
                // manera de perder la confianza en un botón.
                key={`${f.slug}-${f.lengthTier}-${f.priceMain}-${f.durationMin}`}
                fila={f}
                onGuardar={(precio, duracion) => {
                  const anterior = { precio: f.priceMain, duracion: f.durationMin };
                  guardar.mutate(
                    {
                      slug: f.slug,
                      lengthTier: f.lengthTier,
                      priceMain: precio,
                      durationMin: duracion,
                    },
                    {
                      onSuccess: () =>
                        onAviso({
                          texto: `${f.name} · ${LARGO_LABEL[f.lengthTier] ?? f.lengthTier}: ${pesos(anterior.precio)} → ${pesos(precio)}`,
                          deshacer: () =>
                            guardar.mutate({
                              slug: f.slug,
                              lengthTier: f.lengthTier,
                              priceMain: anterior.precio,
                              durationMin: anterior.duracion,
                            }),
                        }),
                      onError: (e) =>
                        onAviso({
                          texto: e instanceof Error ? e.message : "No se pudo guardar.",
                        }),
                    },
                  );
                }}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="mt-4 text-xs text-muted-foreground">
        Las preguntas que se le hacen a la clienta al reservar no se cambian desde acá: tocarlas mal
        rompería el cálculo del precio. Si hay que cambiar alguna, avisanos.
      </p>
    </section>
  );
}

/**
 * El asistente: Sol escribe lo que quiere cambiar y ve qué quedaría.
 *
 * Existe por una razón concreta. Cambiar un precio es fácil —es un campo,
 * está ahí—. Cambiar treinta es una tarde. Cuando aumenta el costo de un
 * producto o el alquiler, Sol no cambia un precio: cambia la lista, y esa
 * es la tarea que hoy no se hace y termina en una lista desactualizada.
 *
 * Tres decisiones de forma:
 *
 * - **Primero muestra, después escribe.** Es la única pantalla del panel
 *   con un paso de confirmación, y se lo gana: en un cambio de a uno el
 *   error se ve solo, en uno de treinta no. La lista completa —cada
 *   servicio, antes y ahora— es el producto acá, no un trámite.
 * - **Se puede deshacer igual.** Después de aplicar queda el botón, como
 *   en cualquier otro cambio de esta pantalla.
 * - **Si no entiende, lo dice.** No hay «lo intenté igual». Una propuesta
 *   a medias sobre precios es peor que ninguna.
 */
function Asistente({ onAviso }: { onAviso: Aviso }) {
  const disponible = useAsistenteDisponible(true);
  const proponer = usePropuestaDePrecios();
  const aplicar = useAplicarPropuesta();
  const [texto, setTexto] = useState("");

  if (!disponible.data?.disponible) return null;

  const propuesta = proponer.data;
  const pedir = () => {
    const instruccion = texto.trim();
    if (instruccion.length < 3) return;
    proponer.mutate(instruccion);
  };

  const aplicarTodo = (cambios: CambioPropuesto[]) => {
    aplicar.mutate(cambios, {
      onSuccess: (r) => {
        proponer.reset();
        setTexto("");
        const sobraron = r.sinAplicar.length;
        onAviso({
          texto:
            `Listo: ${r.aplicados} ${r.aplicados === 1 ? "cambio aplicado" : "cambios aplicados"}.` +
            (sobraron > 0 ? ` ${sobraron} quedaron sin tocar porque habían cambiado.` : ""),
          // Deshacer es la misma operación con los valores dados vuelta.
          deshacer: () =>
            aplicar.mutate(
              cambios.map((c) => ({
                ...c,
                precioAntes: c.precioAhora,
                precioAhora: c.precioAntes,
                duracionAntes: c.duracionAhora,
                duracionAhora: c.duracionAntes,
              })),
            ),
        });
      },
      onError: (e) => onAviso({ texto: e instanceof Error ? e.message : "No se pudo aplicar." }),
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-champagne-deep/30 bg-cream/40 p-4">
      <label className="block text-sm text-foreground/85" htmlFor="asistente-precios">
        Cambiar varios de una vez
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        Escribilo como se lo dirías a alguien. Antes de guardar nada, te mostramos qué quedaría.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id="asistente-precios"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pedir();
          }}
          placeholder="Subí un 15% todo peluquería"
          value={texto}
        />
        <button
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          disabled={proponer.isPending || texto.trim().length < 3}
          onClick={pedir}
          type="button"
        >
          {proponer.isPending ? "Pensando…" : "Ver qué cambia"}
        </button>
      </div>

      {proponer.isError && (
        <p className="mt-3 text-sm text-foreground/85">
          {proponer.error instanceof Error
            ? proponer.error.message
            : "No pude consultar al asistente."}
        </p>
      )}

      {propuesta && !propuesta.entiendo && (
        <p className="mt-3 text-sm text-foreground/85">{propuesta.motivo}</p>
      )}

      {propuesta?.entiendo && (
        <div className="mt-3">
          {propuesta.explicacion && (
            <p className="text-sm text-foreground/85">{propuesta.explicacion}</p>
          )}
          <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
            {propuesta.cambios.map((c) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-sm"
                key={`${c.slug}-${c.lengthTier}`}
              >
                <span className="min-w-0 truncate">
                  {c.name}
                  <span className="text-muted-foreground">
                    {" · "}
                    {LARGO_LABEL[c.lengthTier] ?? c.lengthTier}
                  </span>
                </span>
                <span className="tabular-nums">
                  {c.precioAntes === c.precioAhora ? (
                    <>
                      <span className="text-muted-foreground">{c.duracionAntes} min</span>
                      {" → "}
                      {c.duracionAhora} min
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{pesos(c.precioAntes)}</span>
                      {" → "}
                      {pesos(c.precioAhora)}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              disabled={aplicar.isPending}
              onClick={() => aplicarTodo(propuesta.cambios)}
              type="button"
            >
              {aplicar.isPending
                ? "Guardando…"
                : `Aplicar ${propuesta.cambios.length} ${propuesta.cambios.length === 1 ? "cambio" : "cambios"}`}
            </button>
            <button
              className="rounded-full border border-border px-4 py-2 text-sm"
              onClick={() => proponer.reset()}
              type="button"
            >
              Dejarlo como está
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaServicio({
  fila,
  onGuardar,
}: {
  fila: ServiceTierRow;
  onGuardar: (precio: number, duracion: number) => void;
}) {
  const [precio, setPrecio] = useState(String(fila.priceMain));
  const [duracion, setDuracion] = useState(String(fila.durationMin));

  const confirmar = () => {
    const p = Number(precio);
    const d = Number(duracion);
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(d) || d <= 0) {
      setPrecio(String(fila.priceMain));
      setDuracion(String(fila.durationMin));
      return;
    }
    if (p === fila.priceMain && d === fila.durationMin) return;
    onGuardar(p, d);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{fila.name}</p>
        <p className="text-xs text-muted-foreground">
          {LARGO_LABEL[fila.lengthTier] ?? fila.lengthTier}
        </p>
      </div>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">$</span>
        <input
          aria-label={`Precio de ${fila.name} ${LARGO_LABEL[fila.lengthTier] ?? fila.lengthTier}`}
          className="w-24 rounded-xl border border-border bg-background px-2 py-1.5 text-right tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          inputMode="numeric"
          onBlur={confirmar}
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
          value={precio}
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          aria-label={`Duración de ${fila.name} ${LARGO_LABEL[fila.lengthTier] ?? fila.lengthTier}`}
          className="w-16 rounded-xl border border-border bg-background px-2 py-1.5 text-right tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          inputMode="numeric"
          onBlur={confirmar}
          onChange={(e) => setDuracion(e.target.value.replace(/\D/g, ""))}
          value={duracion}
        />
        <span className="text-muted-foreground">min</span>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Estaciones({ onAviso }: { onAviso: Aviso }) {
  const estaciones = useStations();
  const guardar = useUpsertStation();
  const activar = useSetStationActive();
  const [nueva, setNueva] = useState("");
  const [area, setArea] = useState("peluqueria");

  return (
    <section>
      <h2 className="font-serif text-xl text-foreground">Puestos de trabajo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cuántos lugares hay para atender al mismo tiempo.
      </p>

      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
        {(estaciones.data ?? []).map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.name}</span>
            <button
              type="button"
              onClick={() =>
                activar.mutate(
                  { stationId: e.id, active: false },
                  {
                    onSuccess: () =>
                      onAviso({
                        texto: `${e.name} ya no está en la lista.`,
                        deshacer: () => activar.mutate({ stationId: e.id, active: true }),
                      }),
                    onError: (err) =>
                      onAviso({ texto: err instanceof Error ? err.message : "No se pudo." }),
                  },
                )
              }
              className="shrink-0 text-xs text-muted-foreground underline underline-offset-2"
            >
              Sacar de la lista
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Área del puesto nuevo"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => setArea(e.target.value)}
          value={area}
        >
          {Object.entries(AREA_LABEL).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <input
          aria-label="Nombre del puesto nuevo"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Ej: Lavatorio 2"
          value={nueva}
        />
        <button
          type="button"
          disabled={!nueva.trim() || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              { areaSlug: area, name: nueva.trim() },
              {
                onSuccess: () => {
                  onAviso({ texto: `Agregaste «${nueva.trim()}».` });
                  setNueva("");
                },
                onError: (err) =>
                  onAviso({ texto: err instanceof Error ? err.message : "No se pudo." }),
              },
            )
          }
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Productos({ onAviso }: { onAviso: Aviso }) {
  const productos = useSalonProducts(true);
  const guardar = useUpsertProduct();
  const activar = useSetProductActive();
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("");

  const activos = (productos.data ?? []).filter((p) => p.isActive);

  return (
    <section>
      <h2 className="font-serif text-xl text-foreground">Productos que vendés</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Los que le vendés a la clienta. Sin precio no se muestra ninguno inventado.
      </p>

      {activos.length > 0 && (
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
          {activos.map((p) => (
            <FilaProducto
              key={`${p.id}-${p.salePrice ?? "sin"}`}
              producto={p}
              onGuardar={(nuevoPrecio) =>
                guardar.mutate(
                  {
                    productId: p.id,
                    name: p.name,
                    brand: p.brand,
                    salePrice: nuevoPrecio,
                  },
                  {
                    onSuccess: () =>
                      onAviso({
                        texto: `${p.name}: ${p.salePrice ? pesos(p.salePrice) : "sin precio"} → ${pesos(nuevoPrecio)}`,
                        deshacer: () =>
                          guardar.mutate({
                            productId: p.id,
                            name: p.name,
                            brand: p.brand,
                            salePrice: p.salePrice,
                          }),
                      }),
                    onError: (e) =>
                      onAviso({ texto: e instanceof Error ? e.message : "No se pudo guardar." }),
                  },
                )
              }
              onSacar={() =>
                activar.mutate(
                  { productId: p.id, active: false },
                  {
                    onSuccess: () =>
                      onAviso({
                        texto: `${p.name} ya no está en la lista.`,
                        deshacer: () => activar.mutate({ productId: p.id, active: true }),
                      }),
                  },
                )
              }
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          aria-label="Nombre del producto"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Shampoo hidratante"
          value={nombre}
        />
        <input
          aria-label="Marca del producto"
          className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          onChange={(e) => setMarca(e.target.value)}
          placeholder="Marca"
          value={marca}
        />
        <input
          aria-label="Precio del producto"
          className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-right text-sm tabular-nums"
          inputMode="numeric"
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
          placeholder="$"
          value={precio}
        />
        <button
          type="button"
          disabled={!nombre.trim() || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              {
                name: nombre.trim(),
                brand: marca.trim() || null,
                salePrice: precio ? Number(precio) : null,
              },
              {
                onSuccess: () => {
                  onAviso({ texto: `Agregaste «${nombre.trim()}».` });
                  setNombre("");
                  setMarca("");
                  setPrecio("");
                },
                onError: (e) =>
                  onAviso({ texto: e instanceof Error ? e.message : "No se pudo agregar." }),
              },
            )
          }
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </section>
  );
}

function FilaProducto({
  producto,
  onGuardar,
  onSacar,
}: {
  producto: ProductRow;
  onGuardar: (precio: number) => void;
  onSacar: () => void;
}) {
  const [precio, setPrecio] = useState(producto.salePrice ? String(producto.salePrice) : "");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{producto.name}</p>
        {producto.brand && <p className="text-xs text-muted-foreground">{producto.brand}</p>}
      </div>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">$</span>
        <input
          aria-label={`Precio de ${producto.name}`}
          className="w-24 rounded-xl border border-border bg-background px-2 py-1.5 text-right tabular-nums"
          inputMode="numeric"
          onBlur={() => {
            const p = Number(precio);
            if (!Number.isFinite(p) || p <= 0 || p === producto.salePrice) return;
            onGuardar(p);
          }}
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
          value={precio}
        />
      </label>
      <button
        type="button"
        onClick={onSacar}
        className="shrink-0 text-xs text-muted-foreground underline underline-offset-2"
      >
        Sacar
      </button>
    </div>
  );
}
