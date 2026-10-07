import supabase from '../configs/supabase-config.js'

// Borra filas de una tabla por columna. Es "best effort": si la tabla/columna no existe
// o hay un error se loguea y se continúa; el borrado final del recurso principal es el
// que falla (y se reporta) si quedara alguna referencia por FK.
async function borrar(tabla, columna, valores) {
  const lista = (Array.isArray(valores) ? valores : [valores]).filter(v => v !== null && v !== undefined)
  if (lista.length === 0) return
  const { error } = await supabase.from(tabla).delete().in(columna, lista)
  if (error) console.warn(`[moderacion] No se pudo limpiar ${tabla}.${columna}: ${error.message}`)
}

async function ids(tabla, columnaId, columnaFiltro, valores) {
  const lista = (Array.isArray(valores) ? valores : [valores]).filter(v => v !== null && v !== undefined)
  if (lista.length === 0) return []
  const { data, error } = await supabase.from(tabla).select(columnaId).in(columnaFiltro, lista)
  if (error) {
    console.warn(`[moderacion] No se pudo leer ${tabla}.${columnaFiltro}: ${error.message}`)
    return []
  }
  return (data || []).map(r => r[columnaId])
}

async function borrarPrincipal(tabla, columna, valor) {
  const { error } = await supabase.from(tabla).delete().eq(columna, valor)
  if (error) throw new Error(error.message)
}

class ModeracionRepository {

  async #borrarConversaciones(columna, valores) {
    const convs = await ids('conversaciones', 'idconversacion', columna, valores)
    if (convs.length === 0) return
    const msgs = await ids('mensajes', 'idmensaje', 'idconversacion', convs)
    await borrar('mensajes_leidos', 'idmensaje', msgs)
    await borrar('mensajes', 'idconversacion', convs)
    await borrar('participantes_conversacion', 'idconversacion', convs)
    await borrar('conversaciones', 'idconversacion', convs)
  }

  async #limpiarPublicaciones(idsPublicaciones) {
    await borrar('comentarios_publicacion', 'idpublicacion', idsPublicaciones)
    await borrar('likes_publicacion', 'idpublicacion', idsPublicaciones)
    await borrar('publicaciones', 'idpublicacion', idsPublicaciones)
  }

  async #limpiarEmpleos(idsEmpleos) {
    if (idsEmpleos.length === 0) return
    const insc = await ids('inscripcionesempleo', 'idinsripcion', 'idempleo', idsEmpleos)
    await borrar('entrevistas', 'idinscripcion', insc)
    await borrar('calendarioeventos', 'idinscripcionempleo', insc)
    await borrar('inscripcionesempleo', 'idempleo', idsEmpleos)
    await this.#borrarConversaciones('idempleo', idsEmpleos)
    await this.#limpiarPublicaciones(await ids('publicaciones', 'idpublicacion', 'idempleo', idsEmpleos))
    await borrar('empleo', 'idempleo', idsEmpleos)
  }

  async #limpiarPruebas(idsPruebas) {
    if (idsPruebas.length === 0) return
    await borrar('calendarioeventos', 'idprueba', idsPruebas)
    await borrar('inscripcionesprueba', 'idprueba', idsPruebas)
    await borrar('jugadoresxprueba', 'idprueba', idsPruebas)
    await borrar('resenias', 'idprueba', idsPruebas)
    await this.#limpiarPublicaciones(await ids('publicaciones', 'idpublicacion', 'idprueba', idsPruebas))
    await borrar('lista_espera_pruebas', 'id_prueba', idsPruebas)
    await this.#borrarConversaciones('idprueba', idsPruebas)
  }

  async #limpiarEntrenamientos(idsEntr) {
    if (idsEntr.length === 0) return
    await borrar('calendarioeventos', 'identrenamiento', idsEntr)
    await borrar('inscripcionesentrenamientos', 'identrenamiento', idsEntr)
    await borrar('jugadoresxentrenamiento', 'identrenamiento', idsEntr)
    await borrar('resenias', 'identrenamiento', idsEntr)
    await this.#limpiarPublicaciones(await ids('publicaciones', 'idpublicacion', 'identrenamiento', idsEntr))
    await borrar('lista_espera_entrenamientos', 'id_entrenamiento', idsEntr)
    await borrar('horarioentrenamiento', 'identrenamiento', idsEntr)
    await this.#borrarConversaciones('identrenamiento', idsEntr)
  }

  /** idusuario dueño de la prueba (vía club); undefined si la prueba no existe. */
  async getDuenioPruebaAsync(idprueba) {
    const { data, error } = await supabase
      .from('pruebas').select('idprueba, clubes ( idusuario )').eq('idprueba', idprueba).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return undefined
    return data.clubes?.idusuario ?? null
  }

  /** idusuario dueño del entrenamiento (vía entrenador); undefined si no existe. */
  async getDuenioEntrenamientoAsync(identrenamiento) {
    const { data, error } = await supabase
      .from('entrenamientos').select('identrenamientos, entrenadores ( idusuario )').eq('identrenamientos', identrenamiento).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return undefined
    return data.entrenadores?.idusuario ?? null
  }

  async eliminarPruebaAsync(idprueba) {
    await this.#limpiarPruebas([idprueba])
    await borrarPrincipal('pruebas', 'idprueba', idprueba)
  }

  async eliminarEmpleoAsync(idempleo) {
    await this.#limpiarEmpleos([idempleo])
    await borrarPrincipal('empleo', 'idempleo', idempleo)
  }

  async eliminarEntrenamientoAsync(identrenamiento) {
    await this.#limpiarEntrenamientos([identrenamiento])
    await borrarPrincipal('entrenamientos', 'identrenamientos', identrenamiento)
  }

  async eliminarUsuarioAsync(idusuario, tipousuario) {
    const tipo = String(tipousuario || '').toLowerCase()

    if (tipo === 'club') {
      const clubes = await ids('clubes', 'idclub', 'idusuario', idusuario)
      const pruebas = await ids('pruebas', 'idprueba', 'idclub', clubes)
      await this.#limpiarPruebas(pruebas)
      await borrar('pruebas', 'idprueba', pruebas)
      await this.#limpiarEmpleos(await ids('empleo', 'idempleo', 'idclub', clubes))
      await borrar('resenias', 'idclub', clubes)
      await borrar('clubesxdeportes', 'idclub', clubes)
      await borrar('imagenesclub', 'idclub', clubes)
      await borrar('clubes', 'idusuario', idusuario)
    } else if (tipo === 'entrenador') {
      const entrenadores = await ids('entrenadores', 'identrenador', 'idusuario', idusuario)
      const entrs = await ids('entrenamientos', 'identrenamientos', 'identrenador', entrenadores)
      await this.#limpiarEntrenamientos(entrs)
      await borrar('entrenamientos', 'identrenamientos', entrs)
      const insc = await ids('inscripcionesempleo', 'idinsripcion', 'identrenador', entrenadores)
      await borrar('entrevistas', 'idinscripcion', insc)
      await borrar('calendarioeventos', 'idinscripcionempleo', insc)
      await borrar('inscripcionesempleo', 'identrenador', entrenadores)
      await borrar('resenias', 'identrenador', entrenadores)
      await borrar('resenias', 'identrenador_autor', entrenadores)
      await borrar('entrenadoresxdeportes', 'identrenador', entrenadores)
      await borrar('entrenadores', 'idusuario', idusuario)
    } else if (tipo === 'jugador') {
      const jugadores = await ids('jugadores', 'idjugador', 'idusuario', idusuario)
      await borrar('inscripcionesprueba', 'idjugador', jugadores)
      await borrar('jugadoresxprueba', 'idjugador', jugadores)
      await borrar('jugadoresxentrenamiento', 'idjugador', jugadores)
      await borrar('inscripcionesentrenamientos', 'idjugadorinscripto', jugadores)
      await borrar('lista_espera_pruebas', 'id_jugador', jugadores)
      await borrar('lista_espera_entrenamientos', 'id_jugador', jugadores)
      await borrar('resenias', 'idjugador', jugadores)
      await borrar('jugadores', 'idusuario', idusuario)
    }

    // Actividad común a todos los tipos de usuario
    await this.#limpiarPublicaciones(await ids('publicaciones', 'idpublicacion', 'idusuario', idusuario))
    await borrar('comentarios_publicacion', 'idusuario', idusuario)
    await borrar('likes_publicacion', 'idusuario', idusuario)
    await borrar('mensajes_leidos', 'idusuario', idusuario)
    await borrar('mensajes_leidos', 'idmensaje', await ids('mensajes', 'idmensaje', 'idusuarioemisor', idusuario))
    await borrar('mensajes', 'idusuarioemisor', idusuario)
    await borrar('participantes_conversacion', 'idusuario', idusuario)
    await borrar('notificaciones', 'id_usuario', idusuario)
    await borrar('calendarioeventos', 'idusuario', idusuario)

    await borrarPrincipal('usuarios', 'idusuario', idusuario)
  }
}

export default new ModeracionRepository()
