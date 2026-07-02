import supabase from '../configs/supabase-config.js'
import InscripcionPrueba from '../entities/inscripcionprueba.js'

class InscripcionesPruebaRepository {
  async getAllAsync(idprueba = null) {
    let query = supabase
      .from('inscripcionesprueba')
      .select(`
        *,
        jugadores (
          *,
          deportes ( deporte )
        )
      `)

    if (idprueba) {
      query = query.eq('idprueba', idprueba)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map(i => {
      const ins = new InscripcionPrueba(i)
      ins.jugador = i.jugadores || i.jugador // Attach the joined players relation robustly
      return ins
    })
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('inscripcionesprueba')
      .select('*')
      .eq('idinscripcionesprueba', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new InscripcionPrueba(data)
  }

  async isInscrito(idjugador, idprueba) {
    const { data, error } = await supabase
      .from('inscripcionesprueba')
      .select('*')
      .eq('idjugador', idjugador)
      .eq('idprueba', idprueba)
      .limit(1)

    if (error) throw new Error(error.message)

    return Array.isArray(data) && data.length > 0
  }

  async crearInscripcion(idjugador, idprueba) {
    const { data, error } = await supabase
      .from('inscripcionesprueba')
      .insert({ idjugador, idprueba })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new InscripcionPrueba(data)
  }
}

export default InscripcionesPruebaRepository
