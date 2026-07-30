-- Versión actualizada de la función RPC que agrega el parámetro p_idusuario_admin.
-- Reemplaza la versión anterior. Correrla en el SQL Editor de Supabase.
--
-- Cambio clave: el parámetro p_idusuario_admin (DEFAULT NULL) permite marcar
-- esadmin = true para un usuario específico del array, dentro de la misma
-- transacción atómica (sin UPDATE separado post-RPC).
-- Si p_idusuario_admin es NULL (llamadas prevadas/privadas sin admin), todos
-- los participantes quedan con esadmin = false — comportamiento anterior intacto.

CREATE OR REPLACE FUNCTION crear_conversacion_con_participantes(
  p_tipo             VARCHAR,
  p_nombre           VARCHAR,
  p_foto             VARCHAR,
  p_idprueba         INTEGER,
  p_identrenamiento  INTEGER,
  p_idempleo         INTEGER,
  p_participantes    INTEGER[],
  p_idusuario_admin  INTEGER DEFAULT NULL   -- nuevo parámetro opcional
) RETURNS INTEGER AS $$
DECLARE
  v_idconversacion INTEGER;
  v_idusuario      INTEGER;
BEGIN
  -- 1. Crear la fila en conversaciones
  INSERT INTO conversaciones (tipo, nombre, foto, idprueba, identrenamiento, idempleo, createdat, updatedat)
  VALUES (p_tipo, p_nombre, p_foto, p_idprueba, p_identrenamiento, p_idempleo, NOW(), NOW())
  RETURNING idconversacion INTO v_idconversacion;

  -- 2. Insertar cada participante; el admin recibe esadmin = true
  FOREACH v_idusuario IN ARRAY p_participantes
  LOOP
    INSERT INTO participantes_conversacion (idconversacion, idusuario, esadmin, fechaingreso)
    VALUES (
      v_idconversacion,
      v_idusuario,
      CASE
        WHEN p_idusuario_admin IS NOT NULL AND v_idusuario = p_idusuario_admin THEN true
        ELSE false
      END,
      NOW()
    );
  END LOOP;

  -- 3. Retornar el ID de la conversación creada
  RETURN v_idconversacion;
END;
$$ LANGUAGE plpgsql;
