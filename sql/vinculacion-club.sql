-- Vinculación entre clubes y entrenadores.
-- Referencia: las sentencias son idempotentes, se pueden ejecutar de nuevo en el SQL Editor de Supabase.

create table if not exists public.solicitudes_vinculacion_club (
  id              serial primary key,
  id_club         integer not null references public.clubes(idclub) on delete cascade,
  id_entrenador   integer not null references public.entrenadores(identrenador) on delete cascade,
  origen          text not null check (origen in ('ENTRENADOR', 'CLUB')),
  estado          text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'ACEPTADO', 'RECHAZADO')),
  fecha_creacion  timestamp without time zone not null default now(),
  fecha_respuesta timestamp without time zone
);

create index if not exists solicitudes_vinc_club_idx on public.solicitudes_vinculacion_club (id_club, estado);
create index if not exists solicitudes_vinc_entrenador_idx on public.solicitudes_vinculacion_club (id_entrenador, estado);

alter table public.entrenamientos
  add column if not exists id_club integer references public.clubes(idclub) on delete set null;

-- Permisos para la API de Supabase (sin esto: "permission denied for table ...").
grant select, insert, update, delete on table public.solicitudes_vinculacion_club to anon, authenticated, service_role;
grant usage, select on sequence public.solicitudes_vinculacion_club_id_seq to anon, authenticated, service_role;

notify pgrst, 'reload schema';
