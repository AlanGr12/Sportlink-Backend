-- Promoción atómica desde la lista de espera.
-- Mueve al primer jugador de la lista (más antiguo) a las inscripciones confirmadas
-- y lo borra de la lista, todo dentro de una única transacción (una función plpgsql
-- se ejecuta atómicamente). Devuelve el idjugador promovido, o NULL si no había nadie.
-- Ejecutar una vez en el SQL Editor de Supabase.

create or replace function promover_lista_espera_prueba(p_id_prueba int)
returns int
language plpgsql
as $$
declare
  v_id bigint;
  v_jugador int;
begin
  select id, id_jugador into v_id, v_jugador
  from lista_espera_pruebas
  where id_prueba = p_id_prueba
  order by fecha_inscripcion asc, id asc
  limit 1
  for update;

  if v_id is null then
    return null;
  end if;

  insert into inscripcionesprueba (idjugador, idprueba) values (v_jugador, p_id_prueba);
  delete from lista_espera_pruebas where id = v_id;

  return v_jugador;
end;
$$;

create or replace function promover_lista_espera_entrenamiento(p_id_entrenamiento int)
returns int
language plpgsql
as $$
declare
  v_id bigint;
  v_jugador int;
begin
  select id, id_jugador into v_id, v_jugador
  from lista_espera_entrenamientos
  where id_entrenamiento = p_id_entrenamiento
  order by fecha_inscripcion asc, id asc
  limit 1
  for update;

  if v_id is null then
    return null;
  end if;

  insert into inscripcionesentrenamientos (identrenamiento, idjugadorinscripto) values (p_id_entrenamiento, v_jugador);
  delete from lista_espera_entrenamientos where id = v_id;

  return v_jugador;
end;
$$;
