import supabase from '../configs/supabase-config.js'
import Entrenamiento from '../entities/entrenamiento.js'

function haPasado(fechaStr, horaFinStr) {
  if (!fechaStr) return false
  const d = new Date()
  const hoyStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const fechaLimpia = String(fechaStr).substring(0, 10)
  if (fechaLimpia < hoyStr) return true
  if (fechaLimpia > hoyStr) return false
  if (horaFinStr) {
    const horaActual = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const horaFin = String(horaFinStr).substring(0, 5)
    if (horaFin && horaFin < horaActual) return true
  }
  return false
}

const SELECT_ENTRENAMIENTO_QUERY = `
  *,
  deportes ( iddeporte, deporte ),
  entrenadores ( identrenador, idusuario, nombre, apellido )
`

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
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(SELECT_ENTRENAMIENTO_QUERY)
      .gte('fechaentr', hoy)
      .order('fechaentr', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || [])
      .filter(e => !haPasado(e.fechaentr, e.horafin))
      .map(e => new Entrenamiento(this.#normalizarImagen(e)))
  }

  async getEntrenamientosAsync() {
    return await this.getAllAsync()
  }

  async getAllAsyncWithFilters(filters = {}) {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    let query = supabase
      .from('entrenamientos')
      .select(SELECT_ENTRENAMIENTO_QUERY)

    if (filters.iddeporte) query = query.eq('iddeporte', filters.iddeporte)
    if (filters.identrenador) query = query.eq('identrenador', filters.identrenador)
    if (typeof filters.estado !== 'undefined') query = query.eq('estado', filters.estado)
    
    // Si viene filtro fechaFrom y es posterior a hoy se usa, de lo contrario por defecto filtramos >= hoy
    if (filters.fechaFrom) {
      query = query.gte('fechaentr', filters.fechaFrom)
    } else {
      query = query.gte('fechaentr', hoy)
    }

    if (filters.fechaTo) query = query.lte('fechaentr', filters.fechaTo)
    if (filters.titulo) query = query.ilike('titulo', `%${filters.titulo}%`)
    if (filters.ubicacion) query = query.ilike('ubicacion', `%${filters.ubicacion}%`)

    query = query.order('fechaentr', { ascending: true })

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || [])
      .filter(e => !haPasado(e.fechaentr, e.horafin))
      .map(e => new Entrenamiento(this.#normalizarImagen(e)))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(SELECT_ENTRENAMIENTO_QUERY)
      .eq('identrenamientos', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Entrenamiento(this.#normalizarImagen(data))
  }

  async getEntrenamientoByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async getAllDeporteAsync(jugador) {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('entrenamientos')
      .select(SELECT_ENTRENAMIENTO_QUERY)
      .eq('iddeporte', jugador.iddeporte)
      .gte('fechaentr', hoy)
      .order('fechaentr', { ascending: true })

    if (error) throw new Error(error.message)
    if (!data) return []

    return (data || [])
      .filter(e => !haPasado(e.fechaentr, e.horafin))
      .map(e => new Entrenamiento(this.#normalizarImagen(e)))
  }

  async crearEntrenamiento(...args) {
    let params
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      params = args[0]
    } else {
      const [
        iddeporte, identrenador, precio, cantidad, titulo, imagen,
        ubicacion, fechaentr, horainicio, horafin, estado, descripcion,
        genero, nivel, direccion, latitud, longitud
      ] = args
      params = {
        iddeporte, identrenador, precio, cantidad, titulo, imagen,
        ubicacion, fechaentr, horainicio, horafin, estado, descripcion,
        genero, nivel, direccion, latitud, longitud
      }
    }

    const lat = (params.latitud !== undefined && params.latitud !== null && params.latitud !== '')
      ? Number(params.latitud)
      : null
    const lng = (params.longitud !== undefined && params.longitud !== null && params.longitud !== '')
      ? Number(params.longitud)
      : null
    const dir = (params.direccion !== undefined && params.direccion !== null && params.direccion !== '')
      ? params.direccion
      : null

    const { data, error } = await supabase
      .from('entrenamientos')
      .insert({
        iddeporte: params.iddeporte,
        identrenador: params.identrenador,
        precio: params.precio,
        cantidad: params.cantidad,
        titulo: params.titulo,
        imagen: params.imagen,
        ubicacion: params.ubicacion,
        fechaentr: params.fechaentr,
        horainicio: params.horainicio,
        horafin: params.horafin,
        estado: params.estado,
        descripcion: params.descripcion,
        genero: params.genero,
        nivel: params.nivel,
        direccion: dir,
        latitud: lat,
        longitud: lng
      })
      .select(SELECT_ENTRENAMIENTO_QUERY)
      .single()

    if (error) throw new Error(error.message)

    return new Entrenamiento(this.#normalizarImagen(data))
  }

  async crearEntrenamientoAsync(...args) {
    return await this.crearEntrenamiento(...args)
  }

  async insertarAsync(...args) {
    return await this.crearEntrenamiento(...args)
  }

  async editarEntrenamiento(id, updates = {}) {
    const permitidos = [
      'iddeporte', 'identrenador', 'precio', 'cantidad', 'titulo', 'imagen',
      'ubicacion', 'fechaentr', 'horainicio', 'horafin', 'estado', 'descripcion',
      'genero', 'nivel', 'direccion', 'latitud', 'longitud'
    ]
    const dataToUpdate = {}
    for (const p of permitidos) {
      if (updates[p] !== undefined && updates[p] !== null) {
        dataToUpdate[p] = updates[p]
      }
    }
    
    // Explicitly allow horainicio and horafin to be set to null if needed
    if (updates.horainicio === null) dataToUpdate.horainicio = null
    if (updates.horafin === null) dataToUpdate.horafin = null

    if (updates.direccion !== undefined) {
      dataToUpdate.direccion = (updates.direccion !== '' && updates.direccion !== null)
        ? updates.direccion
        : null
    }

    if (updates.latitud !== undefined) {
      dataToUpdate.latitud = (updates.latitud !== null && updates.latitud !== '')
        ? Number(updates.latitud)
        : null
    }

    if (updates.longitud !== undefined) {
      dataToUpdate.longitud = (updates.longitud !== null && updates.longitud !== '')
        ? Number(updates.longitud)
        : null
    }

    const { data, error } = await supabase
      .from('entrenamientos')
      .update(dataToUpdate)
      .eq('identrenamientos', id)
      .select(SELECT_ENTRENAMIENTO_QUERY)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Entrenamiento(this.#normalizarImagen(data))
  }

  async editarEntrenamientoAsync(id, updates) {
    return await this.editarEntrenamiento(id, updates)
  }

  async actualizarEntrenamientoAsync(id, updates) {
    return await this.editarEntrenamiento(id, updates)
  }

  async subirImagenEntrenamientoAsync(archivo) {
    const nombreUnico = `entrenamientos/${Date.now()}-${archivo.originalname}`

    const { error } = await supabase.storage
      .from('fotoEntrenamientos')
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
