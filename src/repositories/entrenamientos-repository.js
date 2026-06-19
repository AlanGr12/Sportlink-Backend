import supabase from '../configs/supabase-config.js'
import Entrenamiento from '../entities/entrenamiento.js'

class EntrenamientosRepository {
  async getAllAsync() {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(`
        *,
        deportes ( iddeporte, deporte ),
        entrenadores ( identrenador, nombre )
      `)

    if (error) throw new Error(error.message)

    return data.map(e => new Entrenamiento(e))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(`
        *,
        deportes ( iddeporte, deporte ),
        entrenadores ( identrenador, nombre )
      `)
      .eq('identrenamientos', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Entrenamiento(data)
  }

  async crearEntrenamiento(iddeporte, identrenador, precio, cantidad, titulo, imagen, ubicacion, fechaentr, estado, descripcion, genero, nivel) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .insert({
        iddeporte,
        identrenador,
        precio,
        cantidad,
        titulo,
        imagen,
        ubicacion,
        fechaentr,
        estado,
        descripcion,
        genero,
        nivel
      })
      .select(`*, deportes ( iddeporte, deporte ), entrenadores ( identrenador, nombre )`)
      .single()

    if (error) throw new Error(error.message)

    return new Entrenamiento(data)
  }

  async subirImagenEntrenamientoAsync(archivo) {
    const nombreUnico = `entrenamientos/${Date.now()}-${archivo.originalname}`

    const { error } = await supabase.storage
      .from('fotoPruebas')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('fotoPruebas')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }
}

export default EntrenamientosRepository
