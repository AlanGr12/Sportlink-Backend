-- Recomendaciones de jugadores que un entrenador le hace a su club vinculado.
-- Referencia: las sentencias son idempotentes, se pueden ejecutar de nuevo en el SQL Editor de Supabase.

create table if not exists public.recomendaciones_jugador_club (
  id               serial primary key,
  id_club          integer not null references public.clubes(idclub) on delete cascade,
  id_entrenador    integer not null references public.entrenadores(identrenador) on delete cascade,
  id_jugador       integer not null references public.jugadores(idjugador) on delete cascade,
  id_entrenamiento integer references public.entrenamientos(identrenamientos) on delete set null,
  nota             text check (nota is null or char_length(nota) <= 500),
  estado           text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'CONTACTADO', 'DESCARTADA')),
  fecha_creacion   timestamp without time zone not null default now(),
  fecha_respuesta  timestamp without time zone
);

create index if not exists recomendaciones_club_estado_idx on public.recomendaciones_jugador_club (id_club, estado);
create index if not exists recomendaciones_club_entrenador_idx on public.recomendaciones_jugador_club (id_entrenador);

-- Un jugador no se recomienda dos veces al mismo club mientras la recomendación siga vigente
create unique index if not exists recomendaciones_club_jugador_uidx
  on public.recomendaciones_jugador_club (id_club, id_jugador)
  where estado <> 'DESCARTADA';

-- Permisos para la API de Supabase (sin esto: "permission denied for table ...").
grant select, insert, update, delete on table public.recomendaciones_jugador_club to anon, authenticated, service_role;
grant usage, select on sequence public.recomendaciones_jugador_club_id_seq to anon, authenticated, service_role;

notify pgrst, 'reload schema';
