-- =====================================================================
-- Sol Mai · Las promociones dejan de estar escritas en TypeScript
--
-- QUÉ PROBLEMA RESUELVE
--
-- Hasta acá la promoción del salón —color y tratamiento juntos salen
-- menos— vivía en `server/src/domain/promocion.ts`, con la regla escrita
-- a mano: «si hay un color y un tratamiento, el tratamiento cotiza a
-- price_addon». Funcionaba, pero para cambiarla había que tocar código.
--
-- Eso convertía cada duda comercial en una pregunta para un
-- desarrollador. «¿Mechas y balayage también?» no es una pregunta que
-- deba existir: es una casilla que Sol tilda.
--
-- CÓMO QUEDA
--
-- Una promoción es una regla con nombre, vigencia y dos lados:
--
--   DISPARADOR  qué tiene que haber en el turno para que se active
--   BENEFICIO   qué se abarata, y cuánto
--
-- La regla que hoy está en código es UNA fila de esta tabla:
--   disparador = servicios de kind 'color'
--   beneficio  = los de kind 'tratamiento' pasan a su price_addon
--
-- POR QUÉ `price_addon` SIGUE EXISTIENDO
--
-- Porque es el precio que Sol ya tiene escrito en su lista, fila por
-- fila, y no un porcentaje que se pueda derivar: karseell baja 65% y
-- color shine 52%. Un descuento porcentual único no reproduce su lista.
-- La promoción dice CUÁNDO se usa ese precio; la columna dice CUÁL es.
--
-- QUÉ NO HACE ESTA MIGRACIÓN
--
-- No cambia el motor de cotización. `promocion.ts` sigue decidiendo con
-- la misma regla hasta que el bloque siguiente lo haga leer de acá. Esta
-- migración crea el lugar y lo llena con lo que hoy está en código, para
-- que el cambio de motor sea un reemplazo verificable y no un salto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. La promoción
-- ---------------------------------------------------------------------
create table if not exists public.promotions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  -- Lo que ve la clienta. Se muestra tal cual, así que lo escribe Sol.
  name          text not null,
  description   text,

  -- Qué abarata y cómo. `precio_de_agregado` usa el price_addon que ya
  -- está cargado por servicio y largo; los otros dos son para promociones
  -- que Sol quiera inventar después sin que haga falta una migración.
  benefit_kind  text not null default 'precio_de_agregado'
    check (benefit_kind in ('precio_de_agregado', 'porcentaje', 'monto_fijo')),
  benefit_value integer
    check (benefit_value is null or benefit_value >= 0),

  -- Vigencia. NULL de los dos lados = siempre, que es el caso normal.
  starts_on     date,
  ends_on       date,
  is_active     boolean not null default true,

  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint promotions_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint promotions_vigencia check (ends_on is null or starts_on is null or ends_on >= starts_on),
  -- Un porcentaje sin número, o un porcentaje mayor a 100, es una
  -- promoción que no se puede aplicar: se rechaza al guardarla y no al
  -- cobrar, que es cuando molesta.
  constraint promotions_valor_coherente check (
    (benefit_kind = 'precio_de_agregado' and benefit_value is null)
    or (benefit_kind = 'porcentaje' and benefit_value between 1 and 100)
    or (benefit_kind = 'monto_fijo' and benefit_value > 0)
  )
);

comment on table public.promotions is
  'Reglas comerciales que Sol edita desde el panel. Reemplazan a la regla '
  'que estaba escrita en server/src/domain/promocion.ts.';
comment on column public.promotions.benefit_kind is
  'precio_de_agregado: usa service_price_tiers.price_addon, que es el precio '
  'que Sol ya tiene por servicio y largo. porcentaje y monto_fijo existen '
  'para promociones futuras sin migración.';

-- ---------------------------------------------------------------------
-- 2. Qué la dispara
--
--    Dos formas de nombrar el disparador, y una sola por fila:
--    por CLASE de servicio (todos los de color) o por SERVICIO puntual
--    (sólo balayage). La primera es la que se mantiene sola cuando Sol
--    agrega un servicio nuevo; la segunda es para las excepciones.
-- ---------------------------------------------------------------------
create table if not exists public.promotion_triggers (
  id           uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  service_kind text check (service_kind in ('servicio', 'color', 'tratamiento')),
  service_id   uuid references public.services(id) on delete cascade,
  constraint promotion_triggers_uno_u_otro check (
    (service_kind is not null and service_id is null)
    or (service_kind is null and service_id is not null)
  )
);
create index if not exists promotion_triggers_promotion_idx
  on public.promotion_triggers (promotion_id);

comment on table public.promotion_triggers is
  'Qué tiene que haber en el turno para que la promoción se active. Por clase '
  '(todos los colores) o por servicio puntual (sólo balayage).';

-- ---------------------------------------------------------------------
-- 3. Qué se abarata
--
--    Misma forma que el disparador. Separarlos es lo que permite decir
--    «con cualquier color, los tratamientos salen menos» en dos filas, y
--    que siga valiendo el día que Sol agregue un color nuevo.
-- ---------------------------------------------------------------------
create table if not exists public.promotion_benefits (
  id           uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  service_kind text check (service_kind in ('servicio', 'color', 'tratamiento')),
  service_id   uuid references public.services(id) on delete cascade,
  constraint promotion_benefits_uno_u_otro check (
    (service_kind is not null and service_id is null)
    or (service_kind is null and service_id is not null)
  )
);
create index if not exists promotion_benefits_promotion_idx
  on public.promotion_benefits (promotion_id);

comment on table public.promotion_benefits is
  'Sobre qué prestaciones del turno cae el beneficio. El disparador y el '
  'beneficio son distintos: el color dispara, el tratamiento se abarata.';

-- ---------------------------------------------------------------------
-- 4. Permisos
--
--    Las promociones son parte del catálogo público: una clienta tiene
--    que poder ver que existen antes de reservar. La escritura es sólo
--    del panel, como el resto del catálogo.
-- ---------------------------------------------------------------------
revoke all on public.promotions from anon, authenticated;
revoke all on public.promotion_triggers from anon, authenticated;
revoke all on public.promotion_benefits from anon, authenticated;

grant select on public.promotions to anon, authenticated;
grant select on public.promotion_triggers to anon, authenticated;
grant select on public.promotion_benefits to anon, authenticated;

grant all on public.promotions to service_role;
grant all on public.promotion_triggers to service_role;
grant all on public.promotion_benefits to service_role;

alter table public.promotions enable row level security;
alter table public.promotion_triggers enable row level security;
alter table public.promotion_benefits enable row level security;

-- Una promoción apagada o vencida no se muestra: que la clienta vea una
-- promoción que no se le va a aplicar es peor que no verla.
create policy promotions_public_read on public.promotions
  for select using (
    is_active
    and (starts_on is null or starts_on <= current_date)
    and (ends_on is null or ends_on >= current_date)
  );

create policy promotion_triggers_public_read on public.promotion_triggers
  for select using (
    exists (select 1 from public.promotions p where p.id = promotion_id and p.is_active)
  );

create policy promotion_benefits_public_read on public.promotion_benefits
  for select using (
    exists (select 1 from public.promotions p where p.id = promotion_id and p.is_active)
  );

-- ---------------------------------------------------------------------
-- 5. `updated_at` al día, con el trigger que ya usa el resto del esquema
-- ---------------------------------------------------------------------
drop trigger if exists promotions_touch on public.promotions;
create trigger promotions_touch before update on public.promotions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 6. La regla que hoy está en código, cargada como fila
--
--    A partir de acá el sistema TIENE la promoción escrita en la base.
--    Que el motor la lea de acá en vez de decidirla sola es el paso
--    siguiente, y se puede verificar comparando las dos.
-- ---------------------------------------------------------------------
insert into public.promotions (slug, name, description, benefit_kind, sort_order)
values (
  'color-mas-tratamiento',
  'Tratamiento con tu color',
  'Si te hacés color y le sumás un tratamiento, el tratamiento sale menos.',
  'precio_de_agregado',
  0
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  benefit_kind = excluded.benefit_kind;

insert into public.promotion_triggers (promotion_id, service_kind)
  select id, 'color' from public.promotions where slug = 'color-mas-tratamiento'
  on conflict do nothing;

insert into public.promotion_benefits (promotion_id, service_kind)
  select id, 'tratamiento' from public.promotions where slug = 'color-mas-tratamiento'
  on conflict do nothing;
