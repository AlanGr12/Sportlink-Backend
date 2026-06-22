import supabase from '../configs/supabase-config.js'
import InscripcionEntrenamiento from '../entities/inscripcionentrenamiento.js'

class InscripcionesEntrenamientosRepository {
  async getAllAsync() {
    const { data, error } = await supabase
      .from('inscripcionesentrenamientos')
      .select('*')

    if (error) throw new Error(error.message)

    return (data || []).map(i => new InscripcionEntrenamiento(i))
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
