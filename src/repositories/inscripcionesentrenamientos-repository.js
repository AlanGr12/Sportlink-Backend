import supabase from '../configs/supabase-config.js'
import InscripcionEntrenamiento from '../entities/inscripcionentrenamiento.js'

class InscripcionesEntrenamientosRepository {
  async getAllAsync(identrenamiento = null) {
    let query = supabase
      .from('inscripcionesentrenamientos')
      .select(`
        *,
        jugadores (
          *,
          deportes ( deporte )
        )
      `)

    if (identrenamiento) {
      query = query.eq('identrenamiento', identrenamiento)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map(i => {
      const ins = new InscripcionEntrenamiento(i)
      ins.jugador = i.jugadores || i.jugador
      return ins
    })
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('inscripcionesentrenamientos')
      .select('*')
      .eq('idinscripcionesentr', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new InscripcionEntrenamiento(data)
  }

  async isInscrito(identrenamiento, idjugador) {
    const { data, error } = await supabase
      .from('inscripcionesentrenamientos')
      .select('*')
      .eq('identrenamiento', identrenamiento)
      .eq('idjugadorinscripto', idjugador)
      .limit(1)

    if (error) throw new Error(error.message)

    return Array.isArray(data) && data.length > 0
  }

  async borrarInscripcion(identrenamiento, idjugador) {
    const { error } = await supabase
      .from('inscripcionesentrenamientos')
      .delete()
      .eq('identrenamiento', identrenamiento)
      .eq('idjugadorinscripto', idjugador)

    if (error) throw new Error(error.message)
    return true
  }

  async crearInscripcion(identrenamiento, idjugador) {
    const { data, error } = await supabase
      .from('inscripcionesentrenamientos')
      .insert({ identrenamiento, idjugadorinscripto: idjugador })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new InscripcionEntrenamiento(data)
  }
}

export default InscripcionesEntrenamientosRepository
