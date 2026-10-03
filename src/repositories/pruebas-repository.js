import supabase from '../configs/supabase-config.js'
import Prueba from '../entities/prueba.js'

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

const SELECT_PRUEBA_QUERY = `
  *,
  clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
  deportes ( iddeporte, deporte )
`

class PruebasRepository {

  //"Este método verifica si la imagen es solo el nombre del archivo y, si es así, la convierte automáticamente en la URL pública de Supabase; si ya es una URL completa, la deja igual."
  #normalizarImagen(p) {
    if (p.imagen && !p.imagen.startsWith('http')) {
      p.imagen = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPruebas/${p.imagen}`
    }
    return p
  }

  async getAllAsync() {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('pruebas')
      .select(SELECT_PRUEBA_QUERY)
      .gte('fechaprueba', hoy)
      .order('fechaprueba', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || [])
      .filter(p => !haPasado(p.fechaprueba, p.horafin))
      .map(p => new Prueba(this.#normalizarImagen(p)))
  }

  async getAllPruebasAsync() {
    return await this.getAllAsync()
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('pruebas')
      .select(SELECT_PRUEBA_QUERY)
      .eq('idprueba', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Prueba(this.#normalizarImagen(data))
  }

  async getPruebaByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async getAllDeporteAsync(jugador) {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('pruebas')
      .select(SELECT_PRUEBA_QUERY)
      .eq('iddeporte', jugador.iddeporte)
      .gte('fechaprueba', hoy)
      .order('fechaprueba', { ascending: true })

    if (error) throw new Error(error.message)
    if (!data) return []

    return (data || [])
      .filter(p => !haPasado(p.fechaprueba, p.horafin))
      .map(p => new Prueba(this.#normalizarImagen(p)))
  }

  async crearPrueba(...args) {
    let params
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      params = args[0]
    } else {
      const [
        idclub, iddeporte, cupo, horainicio, horafin, estado,
        descripcion, imagen, categoria, zona, genero,
        fechaprueba, fechacierre, direccion, latitud, longitud
      ] = args
      params = {
        idclub, iddeporte, cupo, horainicio, horafin, estado,
        descripcion, imagen, categoria, zona, genero,
        fechaprueba, fechacierre, direccion, latitud, longitud
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
      .from('pruebas')
      .insert({
        idclub: params.idclub,
        iddeporte: params.iddeporte,
        cupo: params.cupo,
        horainicio: params.horainicio,
        horafin: params.horafin,
        estado: params.estado,
        descripcion: params.descripcion,
        imagen: params.imagen,
        categoria: params.categoria,
        zona: params.zona,
        genero: params.genero,
        fechaprueba: params.fechaprueba,
        fechacierre: params.fechacierre,
        direccion: dir,
        latitud: lat,
        longitud: lng
      })
      .select(SELECT_PRUEBA_QUERY)
      .single()

    if (error) throw new Error(error.message)

    return new Prueba(this.#normalizarImagen(data))
  }

  async crearPruebaAsync(...args) {
    return await this.crearPrueba(...args)
  }

  async insertarAsync(...args) {
    return await this.crearPrueba(...args)
  }

  async actualizarPruebaAsync(id, updates = {}) {
    const permitidos = [
      'idclub', 'iddeporte', 'cupo', 'horainicio', 'horafin',
      'estado', 'descripcion', 'imagen', 'categoria', 'zona',
      'genero', 'fechaprueba', 'fechacierre', 'direccion', 'latitud', 'longitud'
    ]

    const dataToUpdate = {}
    for (const p of permitidos) {
      if (updates[p] !== undefined) {
        dataToUpdate[p] = updates[p]
      }
    }

    if (dataToUpdate.latitud !== undefined) {
      dataToUpdate.latitud = (dataToUpdate.latitud !== null && dataToUpdate.latitud !== '')
        ? Number(dataToUpdate.latitud)
        : null
    }

    if (dataToUpdate.longitud !== undefined) {
      dataToUpdate.longitud = (dataToUpdate.longitud !== null && dataToUpdate.longitud !== '')
        ? Number(dataToUpdate.longitud)
        : null
    }

    if (dataToUpdate.direccion !== undefined) {
      dataToUpdate.direccion = (dataToUpdate.direccion !== '' && dataToUpdate.direccion !== null)
        ? dataToUpdate.direccion
        : null
    }

    const { data, error } = await supabase
      .from('pruebas')
      .update(dataToUpdate)
      .eq('idprueba', id)
      .select(SELECT_PRUEBA_QUERY)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Prueba(this.#normalizarImagen(data))
  }

  async actualizarPrueba(id, updates) {
    return await this.actualizarPruebaAsync(id, updates)
  }

  async existePrueba(idclub, iddeporte, fechaprueba, categoria, genero) {
    const { data, error } = await supabase
      .from('pruebas')
      .select('idprueba')
      .eq('idclub', idclub)
      .eq('iddeporte', iddeporte)
      .eq('fechaprueba', fechaprueba)
      .eq('categoria', categoria)
      .eq('genero', genero)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)

    return !!data
  }

  async subirFotoPruebaAsync(archivo) {
    const nombreUnico = `pruebas/${Date.now()}-${archivo.originalname}`

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

export default PruebasRepository