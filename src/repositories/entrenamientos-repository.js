import supabase from '../configs/supabase-config.js'
import Entrenamiento from '../entities/entrenamiento.js'

class EntrenamientosRepository {

  // Convierte el nombre de archivo en URL pública completa de Supabase.
  // Si ya es una URL completa (comienza con http) la deja igual.
  // Mismo patrón que #normalizarImagen en pruebas-repository.
  #normalizarImagen(e) {
    if (e.imagen && !e.imagen.startsWith('http')) {
      e.imagen = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoEntrenamientos/${e.imagen}`
    }
    return e
  }

  async getAllAsync() {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(`
        *,
        deportes ( iddeporte, deporte ),
        entrenadores ( identrenador, nombre )
      `)

    if (error) throw new Error(error.message)

    return data.map(e => new Entrenamiento(this.#normalizarImagen(e)))
  }

  async getAllAsyncWithFilters(filters = {}) {
    let query = supabase
      .from('entrenamientos')
      .select(`
        *,
        deportes ( iddeporte, deporte ),
        entrenadores ( identrenador, nombre )
      `)

    if (filters.iddeporte) query = query.eq('iddeporte', filters.iddeporte)
    if (filters.identrenador) query = query.eq('identrenador', filters.identrenador)
    if (typeof filters.estado !== 'undefined') query = query.eq('estado', filters.estado)
    if (filters.fechaFrom) query = query.gte('fechaentr', filters.fechaFrom)
    if (filters.fechaTo) query = query.lte('fechaentr', filters.fechaTo)
    if (filters.titulo) query = query.ilike('titulo', `%${filters.titulo}%`)
    if (filters.ubicacion) query = query.ilike('ubicacion', `%${filters.ubicacion}%`)

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return data.map(e => new Entrenamiento(this.#normalizarImagen(e)))
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

    return new Entrenamiento(this.#normalizarImagen(data))
  }
  async getAllDeporteAsync(jugador) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(`
        *,
        deportes ( iddeporte, deporte ),
        entrenadores ( identrenador, nombre )
      `)
      .eq('iddeporte', jugador.iddeporte)

    if (error) throw new Error(error.message)
    if (!data) return []

    return data.map(e => new Entrenamiento(this.#normalizarImagen(e)))
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

    return new Entrenamiento(this.#normalizarImagen(data))
  }

  async subirImagenEntrenamientoAsync(archivo) {
    const nombreUnico = `entrenamientos/${Date.now()}-${archivo.originalname}`

    const { error } = await supabase.storage
      .from('fotoEntrenamientos')    // ← corregido: era 'fotoPruebas' por error
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) {
      console.error('[entrenamientos-repository] Error al subir imagen a fotoEntrenamientos:', error.message)
      throw new Error(error.message)
    }

    const { data } = supabase.storage
      .from('fotoEntrenamientos')
      .getPublicUrl(nombreUnico)

    console.log('[entrenamientos-repository] Imagen subida OK. URL pública:', data.publicUrl)
    return data.publicUrl
  }
}

export default EntrenamientosRepository
