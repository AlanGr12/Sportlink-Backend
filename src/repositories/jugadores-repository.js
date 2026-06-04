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
  fotoperfil,
  descripcion
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
      fotoperfil,
      descripcion
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return new Jugador(data)
}

  async subirFotoPerfilAsync(archivo) {
    const nombreUnico = `jugadores/${Date.now()}-${archivo.originalname}`

    const { error } = await supabase.storage
      .from('fotoPerfiles')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('fotoPerfiles')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }

}

export default JugadoresRepository
