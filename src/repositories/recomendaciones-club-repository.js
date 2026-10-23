import supabase from '../configs/supabase-config.js'

const TABLA = 'recomendaciones_jugador_club'

const SELECT_RECOMENDACION = `
  id, id_club, id_entrenador, id_jugador, id_entrenamiento, nota, estado, fecha_creacion, fecha_respuesta,
  jugadores ( idjugador, idusuario, nombre, apellido, fotoperfil, deportes ( deporte ) ),
  entrenadores ( identrenador, idusuario, nombre, apellido, fotoperfil ),
  entrenamientos ( identrenamientos, titulo ),
  clubes ( idclub, idusuario, nombre )
`

class RecomendacionesClubRepository {

  #normalizarFotoEntrenador(r) {
    const e = r?.entrenadores
    if (e?.fotoperfil && !e.fotoperfil.startsWith('http')) {
      e.fotoperfil = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPerfiles/entrenadores/${e.fotoperfil}`
    }
    return r
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase.from(TABLA).select(SELECT_RECOMENDACION).eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? this.#normalizarFotoEntrenador(data) : null
  }

  async listarDeClubAsync(id_club) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_RECOMENDACION)
      .eq('id_club', id_club)
      .order('fecha_creacion', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(r => this.#normalizarFotoEntrenador(r))
  }

  async listarDeEntrenadorAsync(id_entrenador) {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_RECOMENDACION)
      .eq('id_entrenador', id_entrenador)
      .order('fecha_creacion', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(r => this.#normalizarFotoEntrenador(r))
  }

  /** Ids de jugadores con una recomendación vigente (no descartada) en el club. */
  async getJugadoresVigentesAsync(id_club, idsJugador) {
    if (!idsJugador.length) return new Set()
    const { data, error } = await supabase
      .from(TABLA)
      .select('id_jugador')
      .eq('id_club', id_club)
      .neq('estado', 'DESCARTADA')
      .in('id_jugador', idsJugador)
    if (error) throw new Error(error.message)
    return new Set((data || []).map(r => r.id_jugador))
  }

  async crearMuchasAsync(filas) {
    if (!filas.length) return []
    const { data, error } = await supabase.from(TABLA).insert(filas).select('id, id_jugador')
    if (error) throw new Error(error.message)
    return data || []
  }

  async actualizarEstadoAsync(id, estado) {
    const { data, error } = await supabase
      .from(TABLA)
      .update({ estado, fecha_respuesta: new Date().toISOString() })
      .eq('id', id)
      .select('id, estado, fecha_respuesta')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  /** Ids de jugador (idjugador) inscriptos en algún entrenamiento del entrenador, dentro de la lista pedida. */
  async getJugadoresInscriptosConEntrenadorAsync(identrenador, idsJugador) {
    if (!idsJugador.length) return new Set()
    const { data, error } = await supabase
      .from('inscripcionesentrenamientos')
      .select('idjugadorinscripto, entrenamientos!inner ( identrenador )')
      .eq('entrenamientos.identrenador', identrenador)
      .in('idjugadorinscripto', idsJugador)
    if (error) throw new Error(error.message)
    return new Set((data || []).map(i => i.idjugadorinscripto))
  }
}

export default RecomendacionesClubRepository
