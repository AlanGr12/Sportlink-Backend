import supabase from '../configs/supabase-config.js'

const TABLA = 'solicitudes_vinculacion_club'

const SELECT_SOLICITUD = `
  id, id_club, id_entrenador, origen, estado, fecha_creacion, fecha_respuesta,
  clubes ( idclub, idusuario, nombre, fotoperfil ),
  entrenadores ( identrenador, idusuario, nombre, apellido, fotoperfil, titulo, experiencia )
`

class VinculacionesRepository {

  #normalizarFotoEntrenador(s) {
    const e = s?.entrenadores
    if (e?.fotoperfil && !e.fotoperfil.startsWith('http')) {
      e.fotoperfil = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPerfiles/entrenadores/${e.fotoperfil}`
    }
    return s
  }

  async getClubPorUsuarioAsync(idusuario) {
    const { data, error } = await supabase
      .from('clubes')
      .select('idclub, idusuario, nombre, fotoperfil, estado')
      .eq('idusuario', idusuario)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async getClubPorIdAsync(idclub) {
    const { data, error } = await supabase
      .from('clubes')
      .select('idclub, idusuario, nombre, fotoperfil, estado')
      .eq('idclub', idclub)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async getEntrenadorPorUsuarioAsync(idusuario) {
    const { data, error } = await supabase
      .from('entrenadores')
      .select('identrenador, idusuario, nombre, apellido')
      .eq('idusuario', idusuario)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async getEntrenadorPorIdAsync(identrenador) {
    const { data, error } = await supabase
      .from('entrenadores')
      .select('identrenador, idusuario, nombre, apellido')
      .eq('identrenador', identrenador)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_SOLICITUD)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? this.#normalizarFotoEntrenador(data) : null
  }

  /** Última solicitud entre un club y un entrenador (cualquier estado), o null. */
  async getPorParAsync(id_club, id_entrenador) {
    const { data, error } = await supabase
      .from(TABLA)
      .select('id, id_club, id_entrenador, origen, estado, fecha_creacion, fecha_respuesta')
      .eq('id_club', id_club)
      .eq('id_entrenador', id_entrenador)
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  /** Vinculación ACEPTADA del entrenador (con datos del club), o null. */
  async getAceptadaDeEntrenadorAsync(id_entrenador) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_SOLICITUD)
      .eq('id_entrenador', id_entrenador)
      .eq('estado', 'ACEPTADO')
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? this.#normalizarFotoEntrenador(data) : null
  }

  /** Vinculación ACEPTADA entre un club y un entrenador, o null. */
  async getAceptadaAsync(id_club, id_entrenador) {
    const { data, error } = await supabase
      .from(TABLA)
      .select('id, id_club, id_entrenador')
      .eq('id_club', id_club)
      .eq('id_entrenador', id_entrenador)
      .eq('estado', 'ACEPTADO')
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async crearAsync({ id_club, id_entrenador, origen }) {
    const { data, error } = await supabase
      .from(TABLA)
      .insert({ id_club, id_entrenador, origen, estado: 'PENDIENTE' })
      .select(SELECT_SOLICITUD)
      .single()
    if (error) throw new Error(error.message)
    return this.#normalizarFotoEntrenador(data)
  }

  /** Reabre una solicitud RECHAZADA como PENDIENTE (evita duplicar filas del mismo par). */
  async reabrirAsync(id, origen) {
    const { data, error } = await supabase
      .from(TABLA)
      .update({ origen, estado: 'PENDIENTE', fecha_creacion: new Date().toISOString(), fecha_respuesta: null })
      .eq('id', id)
      .select(SELECT_SOLICITUD)
      .single()
    if (error) throw new Error(error.message)
    return this.#normalizarFotoEntrenador(data)
  }

  async actualizarEstadoAsync(id, estado) {
    const { data, error } = await supabase
      .from(TABLA)
      .update({ estado, fecha_respuesta: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_SOLICITUD)
      .single()
    if (error) throw new Error(error.message)
    return this.#normalizarFotoEntrenador(data)
  }

  async eliminarAsync(id) {
    const { error } = await supabase.from(TABLA).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  /** Solicitudes PENDIENTES de un club (recibidas: origen ENTRENADOR / enviadas: origen CLUB). */
  async listarPendientesDeClubAsync(id_club, origen) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_SOLICITUD)
      .eq('id_club', id_club)
      .eq('estado', 'PENDIENTE')
      .eq('origen', origen)
      .order('fecha_creacion', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(s => this.#normalizarFotoEntrenador(s))
  }

  /** Solicitudes PENDIENTES de un entrenador (recibidas: origen CLUB / enviadas: origen ENTRENADOR). */
  async listarPendientesDeEntrenadorAsync(id_entrenador, origen) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_SOLICITUD)
      .eq('id_entrenador', id_entrenador)
      .eq('estado', 'PENDIENTE')
      .eq('origen', origen)
      .order('fecha_creacion', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(s => this.#normalizarFotoEntrenador(s))
  }

  /** Entrenadores con vinculación ACEPTADA, con sus deportes. */
  async listarEntrenadoresDelClubAsync(id_club) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(`
        id, fecha_respuesta,
        entrenadores (
          identrenador, idusuario, nombre, apellido, fotoperfil, titulo, experiencia,
          entrenadoresxdeportes ( deportes ( iddeporte, deporte ) )
        )
      `)
      .eq('id_club', id_club)
      .eq('estado', 'ACEPTADO')
      .order('fecha_respuesta', { ascending: false })
    if (error) throw new Error(error.message)

    return (data || []).filter(r => r.entrenadores).map(r => {
      const { entrenadoresxdeportes, ...e } = r.entrenadores
      this.#normalizarFotoEntrenador({ entrenadores: e })
      return {
        idvinculacion: r.id,
        desde: r.fecha_respuesta,
        ...e,
        deportes: (entrenadoresxdeportes || []).map(x => x.deportes).filter(Boolean)
      }
    })
  }

  /** Marca entrenadores.tieneclub. Si la columna no existe no interrumpe el flujo. */
  async setTieneClubAsync(identrenador, valor) {
    const { error } = await supabase
      .from('entrenadores')
      .update({ tieneclub: valor })
      .eq('identrenador', identrenador)
    if (error) console.error('[vinculaciones] No se pudo actualizar tieneclub:', error.message)
  }
}

export default VinculacionesRepository
