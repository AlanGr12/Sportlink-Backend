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



  async crearJugadorAsync(
  idusuario,
  nombre,
  apellido,
  iddeporte,
  telefono,
  fechanacimiento,
  ubicacion,
  genero,
  fotoperfil
) {
  const { data, error } = await supabase
    .from('jugadores')
    .insert({
      idusuario,
      nombre,
      apellido,
      iddeporte,
      telefono,
      fechanacimiento,
      ubicacion,
      genero,
      fotoperfil:null
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return new Jugador(data)
}

}

export default JugadoresRepository
