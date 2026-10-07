-- Preselección de postulantes a empleos (el club marca a los candidatos que más le gustan).
-- Ejecutar una vez en el SQL Editor de Supabase.

alter table public.inscripcionesempleo
  add column if not exists preseleccionado boolean not null default false;
