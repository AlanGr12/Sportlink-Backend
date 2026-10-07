-- Seguidores / seguidos entre cuentas.
-- Se puede seguir únicamente a clubes y entrenadores (se valida en el backend).
-- Ejecutar una vez en el SQL Editor de Supabase.

create table if not exists public.seguidores (
  idseguidor integer not null references public.usuarios(idusuario) on delete cascade,
  idseguido  integer not null references public.usuarios(idusuario) on delete cascade,
  createdat  timestamp without time zone not null default now(),
  primary key (idseguidor, idseguido),
  check (idseguidor <> idseguido)
);

-- El PK ya indexa por idseguidor; este índice acelera "¿cuántos seguidores tiene X?".
create index if not exists seguidores_idseguido_idx on public.seguidores (idseguido);

-- Permisos para la API de Supabase (sin esto: "permission denied for table seguidores").
-- Igual que el resto de las tablas del proyecto, sin RLS: el acceso lo controla el backend.
grant select, insert, update, delete on table public.seguidores to anon, authenticated, service_role;

notify pgrst, 'reload schema';
