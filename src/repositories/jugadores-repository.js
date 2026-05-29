import supabase from '../configs/supabase-config.js'
import Jugador from '../entities/jugador.js'

class JugadoresRepository {

 async getAllAsync() {
  const { data, error } = await supabase
    .from('jugadores')
    .select(`*, deportes ( deporte )`)

  if (error) throw new Error(error.message)
  return data.map(j => new Jugador(j))
}

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        *,
        deportes ( deporte )
      `)
      .eq('idjugador', id)
      .single()

    if (error) throw new Error(error.message)

    return data ? new Jugador(data) : null
  }

}

export default JugadoresRepository
