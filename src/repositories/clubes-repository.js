import supabase from '../configs/supabase-config.js'
import Club from '../entities/club.js'

const SELECT_CLUB_QUERY = `
  *,
  direccion,
  latitud,
  longitud,
  clubesxdeportes (
    deportes ( iddeporte, deporte )
  )
`

class ClubesRepository {
  async getAllAsync() {
    const { data, error } = await supabase
      .from('clubes')
      .select(SELECT_CLUB_QUERY)

    if (error) throw new Error(error.message)

    return (data || []).map(c => new Club({
      ...c,
      deportes: c.clubesxdeportes ? c.clubesxdeportes.map(cxd => cxd.deportes) : []
    }))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('clubes')
      .select(SELECT_CLUB_QUERY)
      .eq('idclub', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Club({
      ...data,
      deportes: data.clubesxdeportes ? data.clubesxdeportes.map(cxd => cxd.deportes) : []
    })
  }

  async getClubByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async obtenerPerfilAsync(id) {
    let { data, error } = await supabase
      .from('clubes')
      .select(SELECT_CLUB_QUERY)
      .eq('idclub', id)
      .maybeSingle()

    if (!data && !error) {
      const res = await supabase
        .from('clubes')
        .select(SELECT_CLUB_QUERY)
        .eq('idusuario', id)
        .maybeSingle()
      data = res.data
      error = res.error
    }

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Club({
      ...data,
      deportes: data.clubesxdeportes ? data.clubesxdeportes.map(cxd => cxd.deportes) : []
    })
  }

  async crearClubAsync(...args) {
    let params
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      params = args[0]
    } else {
      const [idusuario, nombre, ubicacion, descripcion, fotoperfil, direccion, latitud, longitud] = args
      params = { idusuario, nombre, ubicacion, descripcion, fotoperfil, direccion, latitud, longitud }
    }

    const { data, error } = await supabase
      .from('clubes')
      .insert({
        idusuario: params.idusuario,
        nombre: params.nombre,
        ubicacion: params.ubicacion,
        descripcion: params.descripcion,
        fotoperfil: params.fotoperfil,
        direccion: params.direccion !== undefined && params.direccion !== '' ? params.direccion : null,
        latitud: (params.latitud !== undefined && params.latitud !== null && params.latitud !== '') ? Number(params.latitud) : null,
        longitud: (params.longitud !== undefined && params.longitud !== null && params.longitud !== '') ? Number(params.longitud) : null
      })
      .select(`
        *,
        direccion,
        latitud,
        longitud
      `)
      .single()

    if (error) throw new Error(error.message)

    return new Club(data)
  }

  async actualizarPerfilClubAsync(id, updates = {}) {
    const dataToUpdate = {}
    if (updates.nombre !== undefined) dataToUpdate.nombre = updates.nombre
    if (updates.ubicacion !== undefined) dataToUpdate.ubicacion = updates.ubicacion
    if (updates.descripcion !== undefined) dataToUpdate.descripcion = updates.descripcion
    if (updates.fotoperfil !== undefined) dataToUpdate.fotoperfil = updates.fotoperfil

    // Manejo defensivo de direccion, latitud y longitud
    if (updates.direccion !== undefined) {
      dataToUpdate.direccion = updates.direccion !== '' ? updates.direccion : null
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

    let { data, error } = await supabase
      .from('clubes')
      .update(dataToUpdate)
      .eq('idclub', id)
      .select(SELECT_CLUB_QUERY)
      .maybeSingle()

    if (!data && !error) {
      const retry = await supabase
        .from('clubes')
        .update(dataToUpdate)
        .eq('idusuario', id)
        .select(SELECT_CLUB_QUERY)
        .maybeSingle()
      data = retry.data
      error = retry.error
    }

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Club({
      ...data,
      deportes: data.clubesxdeportes ? data.clubesxdeportes.map(cxd => cxd.deportes) : []
    })
  }

  async updateClubAsync(id, updates) {
    return await this.actualizarPerfilClubAsync(id, updates)
  }

  async asignarDeporteAsync(idclub, iddeporte) {
    const { error } = await supabase
      .from('clubesxdeportes')
      .insert({
        idclub,
        iddeporte
      })

    if (error) throw new Error(error.message)
  }

  async subirFotoPerfilAsync(archivo) {
    const nombreUnico = `clubes/${Date.now()}-${archivo.originalname}`

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

export default ClubesRepository