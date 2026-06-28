import supabase from '../configs/supabase-config.js'
import Entrenador from '../entities/entrenador.js'



class EntrenadoresRepository {

  //"Este método verifica si la foto de perfil es solo el nombre del archivo y, si es así, la convierte automáticamente en la URL pública de Supabase; si ya es una URL completa, la deja igual."
  #normalizarFotoPerfil(e) {
    if (e.fotoperfil && !e.fotoperfil.startsWith('http')) {
      e.fotoperfil = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPerfiles/entrenadores/${e.fotoperfil}`
    }
    return e
  }

  async getAllAsync() {
    const { data, error } = await supabase
      .from('entrenadores')
      .select(`
        *,
        entrenadoresxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)

    if (error) throw new Error(error.message)

    return data.map(e => {
      this.#normalizarFotoPerfil(e)
      return new Entrenador({
        ...e,
        deportes: e.entrenadoresxdeportes.map(exd => exd.deportes)
      })
    })
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('entrenadores')
      .select(`
        *,
        entrenadoresxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)
      .eq('identrenador', id)
      .single()

    if (error) throw new Error(error.message)

    if (!data) return null

    this.#normalizarFotoPerfil(data)

    return new Entrenador({
      ...data,
      deportes: data.entrenadoresxdeportes.map(exd => exd.deportes)
    })
  }

 async crearEntrenadorAsync(
  idusuario,
  nombre,
  apellido,
  telefono,
  fechanacimiento,
  ubicacion,
  genero,
  tieneclub,
  experiencia,
  titulo,
  fotoperfil,
  cv,
  descripcion
) {

  const { data, error } = await supabase
    .from('entrenadores')
    .insert({
      idusuario,
      nombre,
      apellido,
      telefono,
      fechanacimiento,
      ubicacion,
      genero,
      tieneclub,
      experiencia,
      titulo,
      fotoperfil,
      cv,
      descripcion
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return new Entrenador(data)
}

async subirFotoPerfilAsync(archivo) {
  const nombreUnico = `entrenadores/${Date.now()}-${archivo.originalname}`

  const { error } = await supabase.storage
    .from('fotoPerfiles')
    .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage
    .from('fotoPerfiles')
    .getPublicUrl(nombreUnico)

  return data.publicUrl
}

async asignarDeporteAsync(identrenador, iddeporte) {
  const { error } = await supabase
    .from('entrenadoresxdeportes')
    .insert({
      identrenador,
      iddeporte
    })

  if (error) throw new Error(error.message)
}

}

export default EntrenadoresRepository