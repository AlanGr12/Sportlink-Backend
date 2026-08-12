import supabase from '../configs/supabase-config.js'

class PublicacionesRepository {
  /**
   * Resuelve el autor de una publicación obteniendo su nombre y fotoperfil
   * basándose en su tipousuario.
   */
  async #resolverAutor(idusuario) {
    // Primero obtener el tipousuario de la tabla usuarios
    const { data: usuario, error: errUsuario } = await supabase
      .from('usuarios')
      .select('tipousuario')
      .eq('idusuario', idusuario)
      .single()

    if (errUsuario || !usuario) {
      return { idusuario, nombre: 'Usuario', fotoperfil: null, tipousuario: 'jugador' }
    }

    const tipousuario = usuario.tipousuario
    let tabla = ''
    if (tipousuario === 'jugador') tabla = 'jugadores'
    else if (tipousuario === 'entrenador') tabla = 'entrenadores'
    else if (tipousuario === 'club') tabla = 'clubes'

    let nombre = 'Usuario'
    let fotoperfil = null

    if (tabla) {
      const { data: perfilData } = await supabase
        .from(tabla)
        .select('nombre, fotoperfil')
        .eq('idusuario', idusuario)
        .single()
        
      if (perfilData) {
        if (perfilData.nombre) nombre = perfilData.nombre
        fotoperfil = perfilData.fotoperfil
      }
    }

    return {
      idusuario,
      tipousuario,
      nombre,
      fotoperfil
    }
  }

  /**
   * Resuelve la entidad referenciada (Prueba, Entrenamiento, Empleo) para publicaciones no normales
   */
  async #resolverReferencia(pub) {
    if (pub.tipopublicacion === 'NORMAL') return null

    if (pub.tipopublicacion === 'PRUEBA' && pub.idprueba) {
      const { data } = await supabase
        .from('pruebas')
        .select('categoria, zona, fechaprueba')
        .eq('idprueba', pub.idprueba)
        .single()
      return data || null
    }

    if (pub.tipopublicacion === 'ENTRENAMIENTO' && pub.identrenamiento) {
      const { data } = await supabase
        .from('entrenamientos')
        .select('titulo, ubicacion, fecha')
        .eq('identrenamientos', pub.identrenamiento)
        .single()
      return data || null
    }

    if (pub.tipopublicacion === 'EMPLEO' && pub.idempleo) {
      const { data } = await supabase
        .from('empleo')
        .select('titulo, ubicacion, modalidad')
        .eq('idempleo', pub.idempleo)
        .single()
      return data || null
    }

    return null
  }

  /**
   * Enriquece una publicación cruda de la BD con su autor y referencia.
   */
  async #enriquecerPublicacion(pub) {
    const autor = await this.#resolverAutor(pub.idusuario)
    const referencia = await this.#resolverReferencia(pub)

    return {
      idpublicacion: pub.idpublicacion,
      autor,
      contenido: pub.contenido,
      tipopublicacion: pub.tipopublicacion,
      imagen: pub.imagen,
      createdat: pub.createdat,
      updatedat: pub.updatedat,
      referencia
    }
  }

  async getAllAsync(page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await supabase
      .from('publicaciones')
      .select('*', { count: 'exact' })
      .order('createdat', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    // Resolver N+1 para autores y referencias
    const publicacionesEnriquecidas = await Promise.all(
      (data || []).map(pub => this.#enriquecerPublicacion(pub))
    )

    return {
      publicaciones: publicacionesEnriquecidas,
      page,
      totalPaginas: count ? Math.ceil(count / limit) : 0,
      totalItems: count || 0
    }
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('idpublicacion', id)
      .single()

    if (error && error.code === 'PGRST116') return null // No encontrado
    if (error) throw new Error(error.message)

    return await this.#enriquecerPublicacion(data)
  }

  async getRawByIdAsync(id) {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('idpublicacion', id)
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)

    return data
  }

  async crearPublicacionAsync(publicacionData) {
    const { data, error } = await supabase
      .from('publicaciones')
      .insert({
        idusuario: publicacionData.idusuario,
        contenido: publicacionData.contenido,
        tipopublicacion: publicacionData.tipopublicacion || 'NORMAL',
        idprueba: publicacionData.idprueba || null,
        identrenamiento: publicacionData.identrenamiento || null,
        idempleo: publicacionData.idempleo || null,
        imagen: publicacionData.imagen || null
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    
    return await this.#enriquecerPublicacion(data)
  }

  async actualizarPublicacionAsync(id, contenido) {
    const { data, error } = await supabase
      .from('publicaciones')
      .update({ 
        contenido, 
        updatedat: new Date().toISOString() 
      })
      .eq('idpublicacion', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    
    return await this.#enriquecerPublicacion(data)
  }

  async eliminarPublicacionAsync(id) {
    const { error } = await supabase
      .from('publicaciones')
      .delete()
      .eq('idpublicacion', id)

    if (error) throw new Error(error.message)
  }

  async subirImagenPublicacionAsync(archivo) {
    const nombreUnico = `publicaciones/${Date.now()}-${archivo.originalname.replace(/\\s+/g, '_')}`

    const { error } = await supabase.storage
      .from('fotoPublicaciones')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('fotoPublicaciones')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }
}

export default new PublicacionesRepository()
