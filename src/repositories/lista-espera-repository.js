import supabase from '../configs/supabase-config.js'

// Configuración por tipo de actividad (nomenclatura exacta de la BD)
const CONFIG = {
  prueba: {
    tabla: 'lista_espera_pruebas',
    colActividad: 'id_prueba',
    tablaInscripciones: 'inscripcionesprueba',
    colInscActividad: 'idprueba',
    colInscJugador: 'idjugador',
    rpc: 'promover_lista_espera_prueba',
    rpcParam: 'p_id_prueba'
  },
  entrenamiento: {
    tabla: 'lista_espera_entrenamientos',
    colActividad: 'id_entrenamiento',
    tablaInscripciones: 'inscripcionesentrenamientos',
    colInscActividad: 'identrenamiento',
    colInscJugador: 'idjugadorinscripto',
    rpc: 'promover_lista_espera_entrenamiento',
    rpcParam: 'p_id_entrenamiento'
  }
}

class ListaEsperaRepository {
  constructor(tipo) {
    this.cfg = CONFIG[tipo]
    if (!this.cfg) throw new Error(`Tipo de lista de espera inválido: ${tipo}`)
  }

  async anotarseEnListaEspera(idActividad, idJugador) {
    const { data, error } = await supabase
      .from(this.cfg.tabla)
      .insert({
        [this.cfg.colActividad]: idActividad,
        id_jugador: idJugador,
        fecha_inscripcion: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async salirDeListaEspera(idActividad, idJugador) {
    const { error } = await supabase
      .from(this.cfg.tabla)
      .delete()
      .eq(this.cfg.colActividad, idActividad)
      .eq('id_jugador', idJugador)

    if (error) throw new Error(error.message)
    return true
  }

  async getRegistro(idActividad, idJugador) {
    const { data, error } = await supabase
      .from(this.cfg.tabla)
      .select('*')
      .eq(this.cfg.colActividad, idActividad)
      .eq('id_jugador', idJugador)
      .limit(1)

    if (error) throw new Error(error.message)
    return data?.[0] || null
  }

  async estaEnLista(idActividad, idJugador) {
    return !!(await this.getRegistro(idActividad, idJugador))
  }

  // Puesto = cantidad de anotados antes + 1. null si el jugador no está en la lista.
  async obtenerPosicionEnLista(idActividad, idJugador) {
    const registro = await this.getRegistro(idActividad, idJugador)
    if (!registro) return null

    const { count, error } = await supabase
      .from(this.cfg.tabla)
      .select('id', { count: 'exact', head: true })
      .eq(this.cfg.colActividad, idActividad)
      .lt('fecha_inscripcion', registro.fecha_inscripcion)

    if (error) throw new Error(error.message)
    return (count || 0) + 1
  }

  async contarLista(idActividad) {
    const { count, error } = await supabase
      .from(this.cfg.tabla)
      .select('id', { count: 'exact', head: true })
      .eq(this.cfg.colActividad, idActividad)

    if (error) throw new Error(error.message)
    return count || 0
  }

  async obtenerSiguienteEnLista(idActividad) {
    const { data, error } = await supabase
      .from(this.cfg.tabla)
      .select('*')
      .eq(this.cfg.colActividad, idActividad)
      .order('fecha_inscripcion', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)

    if (error) throw new Error(error.message)
    return data?.[0] || null
  }

  async contarInscriptos(idActividad) {
    const { count, error } = await supabase
      .from(this.cfg.tablaInscripciones)
      .select('*', { count: 'exact', head: true })
      .eq(this.cfg.colInscActividad, idActividad)

    if (error) throw new Error(error.message)
    return count || 0
  }

  async estaInscripto(idActividad, idJugador) {
    const { data, error } = await supabase
      .from(this.cfg.tablaInscripciones)
      .select('*')
      .eq(this.cfg.colInscActividad, idActividad)
      .eq(this.cfg.colInscJugador, idJugador)
      .limit(1)

    if (error) throw new Error(error.message)
    return Array.isArray(data) && data.length > 0
  }

  /**
   * Mueve al primero de la lista a las inscripciones confirmadas de forma atómica.
   * Usa la función SQL (transacción) si existe (ver sql/lista-espera.sql); si todavía no
   * fue creada, cae a una secuencia insertar -> borrar con rollback manual.
   * Devuelve el idjugador promovido o null si la lista estaba vacía.
   */
  async promoverSiguiente(idActividad) {
    const { data, error } = await supabase.rpc(this.cfg.rpc, { [this.cfg.rpcParam]: idActividad })
    if (!error) return data ?? null

    const funcionInexistente = error.code === 'PGRST202' || error.code === '42883'
    if (!funcionInexistente) throw new Error(error.message)

    console.warn(`[lista-espera] Función ${this.cfg.rpc} no encontrada; usando promoción secuencial. Ejecutar sql/lista-espera.sql.`)
    const siguiente = await this.obtenerSiguienteEnLista(idActividad)
    if (!siguiente) return null

    const { error: errIns } = await supabase
      .from(this.cfg.tablaInscripciones)
      .insert({ [this.cfg.colInscActividad]: idActividad, [this.cfg.colInscJugador]: siguiente.id_jugador })
    if (errIns) throw new Error(errIns.message)

    const { error: errDel } = await supabase.from(this.cfg.tabla).delete().eq('id', siguiente.id)
    if (errDel) {
      // rollback manual para no dejar al jugador duplicado
      await supabase
        .from(this.cfg.tablaInscripciones)
        .delete()
        .eq(this.cfg.colInscActividad, idActividad)
        .eq(this.cfg.colInscJugador, siguiente.id_jugador)
      throw new Error(errDel.message)
    }
    return siguiente.id_jugador
  }
}

export default ListaEsperaRepository
