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

function Catalogo({ modo }: { modo: "servicios" | "tratamientos" }) {
  const { setAviso, barra } = useAviso();
  const catalogo = useCatalogo(true);
  const esTratamiento = modo === "tratamientos";

  const filas = useMemo(
    () =>
      (catalogo.data ?? []).filter((f) =>
        esTratamiento ? f.kind === "tratamiento" : f.kind !== "tratamiento",
      ),
    [catalogo.data, esTratamiento],
  );

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
            : "Lo principal del turno: corte, color, mechas, balayage. Marcá «Color» a los que tengan que disparar las promociones de tratamientos."}
        </p>

        <Alta modo={modo} onAviso={setAviso} />

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
              Agregá el primero con el formulario de arriba.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {filas.map((f) => (
            <FilaCatalogo
              key={`${f.slug}-${f.kind}-${f.standardCost}`}
              fila={f}
              onAviso={setAviso}
            />
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          El precio y la duración por largo se cambian en{" "}
          <span className="text-foreground/70">Precios y tiempos</span>. Acá se decide qué existe y
          de qué clase es.
        </p>
      </section>
    </div>
  );
}

/**
 * Un servicio, editable donde se ve.
 *
 * El nombre corto —el que va en la dirección— no se edita nunca. Cambiarlo
 * rompería los turnos viejos que lo nombran, y renombrar lo que se lee es
 * lo que hace falta el 100% de las veces.
 */
function FilaCatalogo({ fila, onAviso }: { fila: CatalogRow; onAviso: Aviso }) {
  const editar = useEditarServicio();
  const costo = useSetServiceCost();
  const baja = useBajaDeServicio();
  const categorias = useCategorias(true);

  const [nombre, setNombre] = useState(fila.name);
  const [costoTexto, setCostoTexto] = useState(
    fila.standardCost === null ? "" : String(fila.standardCost),
  );

  const fallo = (e: unknown) =>
    onAviso({ texto: e instanceof Error ? e.message : "No se pudo guardar." });

  const cambiarClase = (kind: ServiceKind) => {
    if (kind === fila.kind) return;
    const antes = fila.kind;
    editar.mutate(
      { slug: fila.slug, kind },
      {
        onSuccess: () =>
          onAviso({
            texto:
              `${fila.name}: ${KIND_LABEL[antes]} → ${KIND_LABEL[kind]}.` +
              (kind === "tratamiento" || antes === "tratamiento" ? " Cambió de pantalla." : ""),
            deshacer: () => editar.mutate({ slug: fila.slug, kind: antes }),
          }),
        onError: fallo,
      },
    );
  };

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
            texto: `${fila.name} · costo: ${antes === null ? "sin dato" : pesos(antes)} → ${
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            aria-label={`Nombre de ${fila.name}`}
            className={`${CAMPO} w-full font-serif text-base`}
            onBlur={() => {
              const limpio = nombre.trim();
              if (limpio === "" || limpio === fila.name) {
                setNombre(fila.name);
                return;
              }
              const antes = fila.name;
              editar.mutate(
                { slug: fila.slug, name: limpio },
                {
                  onSuccess: () =>
                    onAviso({
                      texto: `«${antes}» → «${limpio}»`,
                      deshacer: () => editar.mutate({ slug: fila.slug, name: antes }),
                    }),
                  onError: fallo,
                },
              );
            }}
            onChange={(e) => setNombre(e.target.value)}
            value={nombre}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {fila.slug} · {fila.category} · {fila.durationMin} min · {pesos(fila.priceAmount)}
          </p>
        </div>

        <button
          className={`${CHIP} ${fila.isActive ? "" : "opacity-60"}`}
          onClick={() => {
            const antes = fila.isActive;
            editar.mutate(
              { slug: fila.slug, isActive: !antes },
              {
                onSuccess: () =>
                  onAviso({
                    texto: `${fila.name}: ${antes ? "ya no se ofrece" : "vuelve a ofrecerse"}.`,
                    deshacer: () => editar.mutate({ slug: fila.slug, isActive: antes }),
                  }),
                onError: fallo,
              },
            );
          }}
          type="button"
        >
          {fila.isActive ? "Se ofrece" : "Guardado"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["servicio", "color", "tratamiento"] as ServiceKind[]).map((k) => (
          <button
            className={`${CHIP} ${
              fila.kind === k ? "border-foreground bg-foreground text-background" : ""
            }`}
            key={k}
            onClick={() => cambiarClase(k)}
            title={KIND_AYUDA[k]}
            type="button"
          >
            {KIND_LABEL[k]}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">{KIND_AYUDA[fila.kind]}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">
          <span className="block">Nos cuesta</span>
          <input
            className={`${CAMPO} mt-1 w-32`}
            inputMode="numeric"
            onBlur={guardarCosto}
            onChange={(e) => setCostoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="No sabemos"
            value={costoTexto}
          />
        </label>

        <p className="pb-2 text-xs text-muted-foreground">
          {margen === null
            ? "Sin el costo, el margen queda sin calcular. Vacío no es cero."
            : `Queda ${pesos(margen)} por cada uno.`}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            className={`${CHIP} ${fila.isPublic ? "border-foreground" : ""}`}
            onClick={() => {
              const antes = fila.isPublic;
              editar.mutate(
                { slug: fila.slug, isPublic: !antes },
                {
                  onSuccess: () =>
                    onAviso({
                      texto: `${fila.name}: ${
                        antes ? "ya no se ve en la web" : "ahora se ve en la web"
                      }.`,
                      deshacer: () => editar.mutate({ slug: fila.slug, isPublic: antes }),
                    }),
                  onError: fallo,
                },
              );
            }}
            type="button"
          >
            {fila.isPublic ? "En la web" : "Sólo adentro"}
          </button>

          <select
            aria-label={`Categoría de ${fila.name}`}
            className={`${CAMPO} py-1 text-xs`}
            onChange={(e) => {
              const antes = fila.category;
              editar.mutate(
                { slug: fila.slug, category: e.target.value },
                {
                  onSuccess: () =>
                    onAviso({
                      texto: `${fila.name}: ${antes} → ${e.target.value}`,
                      deshacer: () => editar.mutate({ slug: fila.slug, category: antes }),
                    }),
                  onError: fallo,
                },
              );
            }}
            value={fila.category}
          >
            {(categorias.data ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            className={`${CHIP} text-muted-foreground`}
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

/**
 * El alta.
 *
 * Nace con un precio y una duración para los cuatro largos: un servicio
 * sin precio no se puede cotizar, y uno que nace roto es peor que uno que
 * no existe. Los cuatro largos se afinan después en Precios y tiempos.
 *
 * Nace además sin publicar. Publicar algo cuya duración nadie confirmó es
 * ofrecer un turno de una duración inventada.
 */
function Alta({ modo, onAviso }: { modo: "servicios" | "tratamientos"; onAviso: Aviso }) {
  const crear = useCrearServicio();
  const categorias = useCategorias(true);
  const [abierto, setAbierto] = useState(false);
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

  if (!abierto) {
    return (
      <button className={`${BOTON} mt-4`} onClick={() => setAbierto(true)} type="button">
        {modo === "tratamientos" ? "Agregar un tratamiento" : "Agregar un servicio"}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-champagne-deep/30 bg-cream/40 p-4">
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
        {(["servicio", "color", "tratamiento"] as ServiceKind[]).map((k) => (
          <button
            className={`${CHIP} ${kind === k ? "border-foreground bg-foreground text-background" : ""}`}
            key={k}
            onClick={() => setKind(k)}
            type="button"
          >
            {KIND_LABEL[k]}
          </button>
        ))}
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
                  setAbierto(false);
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
        <button className={CHIP} onClick={() => setAbierto(false)} type="button">
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
