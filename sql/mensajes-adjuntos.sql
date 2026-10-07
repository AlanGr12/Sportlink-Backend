-- Adjuntar eventos (prueba, entrenamiento o empleo) en los mensajes del chat.
-- Un mensaje con tipomensaje = 'EVENTO' referencia exactamente uno de los tres.
-- Ejecutar una vez en el SQL Editor de Supabase.

alter table public.mensajes
  add column if not exists idprueba        integer references public.pruebas(idprueba)                     on delete set null,
  add column if not exists identrenamiento integer references public.entrenamientos(identrenamientos)    on delete set null,
  add column if not exists idempleo        integer references public.empleo(idempleo)                      on delete set null;

-- Sumar 'EVENTO' a los tipos de mensaje permitidos
alter table public.mensajes drop constraint if exists mensajes_tipomensaje_check;
alter table public.mensajes add constraint mensajes_tipomensaje_check
  check (tipomensaje::text = any (array['TEXTO', 'IMAGEN', 'ARCHIVO', 'SISTEMA', 'EVENTO']::text[]));

notify pgrst, 'reload schema';
