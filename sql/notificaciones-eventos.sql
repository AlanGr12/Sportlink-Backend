-- Notificaciones por eventos (empleos, entrenamientos, pruebas, likes, comentarios, seguidores).
-- Ejecutar una vez en el SQL Editor de Supabase.

-- "clave" identifica una notificación acumulativa o de una sola vez por usuario, por ejemplo:
--   LIKES:123            → una única notificación por publicación, con el contador actualizado
--   COMENTARIOS:123      → idem para comentarios
--   SEGUIDORES           → una única notificación con el total de seguidores
--   RECORDATORIO:PRUEBA:5 → recordatorio del día previo (se envía una sola vez)
-- Las notificaciones existentes (lista de espera, etc.) quedan con clave NULL y no cambian.
alter table public.notificaciones
  add column if not exists clave character varying;

-- Una sola notificación por (usuario, clave). Las filas con clave NULL no se ven afectadas.
create unique index if not exists notificaciones_usuario_clave_uidx
  on public.notificaciones (id_usuario, clave)
  where clave is not null;

notify pgrst, 'reload schema';
