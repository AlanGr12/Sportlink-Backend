import supabase from '../configs/supabase-config.js'
import { resolverAutor } from '../utils/resolver-autor.js'
import LikesRepository from './likes-publicacion-repository.js'
import ComentariosRepository from './comentarios-publicacion-repository.js'

class PublicacionesRepository {

  // ── Helpers privados ─────────────────────────────────────────────────────

  /**
   * Resuelve la entidad referenciada (Prueba, Entrenamiento, Empleo)
   * para publicaciones que no son de tipo NORMAL.
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
        .select('identrenamientos, titulo, ubicacion, fechaentr, precio, nivel, genero')
        .eq('identrenamientos', pub.identrenamiento)
        .single()
      return data || null
    }

    if (pub.tipopublicacion === 'EMPLEO' && pub.idempleo) {
      const { data } = await supabase
        .from('empleo')
        .select('idempleo, nombre, horasreq, habilidadesreq, acercaempleo, fechapublicacion')
        .eq('idempleo', pub.idempleo)
        .single()
      return data || null
    }

    return null
  }

  /**
   * Enriquece una publicación cruda con autor, referencia, likes y comentarios.
   *
   * @param {object} pub       - fila cruda de la tabla publicaciones
   * @param {object|null} meta - datos precomputados de likes/comentarios:
   *   { likesCount: Record<id,number>, likedByUser: Set<number>, comentariosCount: Record<id,number> }
   *   Si es null, los campos de likes/comentarios quedan en 0/false (e.g. publicación recién creada).
   */
  async #enriquecerPublicacion(pub, meta = null) {
    // autor y referencia en paralelo
    const [autor, referencia] = await Promise.all([
      resolverAutor(pub.idusuario),
      this.#resolverReferencia(pub)
    ])

    const totalLikes       = meta?.likesCount?.[pub.idpublicacion]       ?? 0
    const totalComentarios = meta?.comentariosCount?.[pub.idpublicacion] ?? 0
    const usuarioDioLike   = meta?.likedByUser?.has(pub.idpublicacion)   ?? false

    return {
      idpublicacion:    pub.idpublicacion,
      autor,
      contenido:        pub.contenido,
      tipopublicacion:  pub.tipopublicacion,
      imagen:           pub.imagen,
      createdat:        pub.createdat,
      updatedat:        pub.updatedat,
      referencia,
      totalLikes,
      totalComentarios,
      usuarioDioLike
    }
  }

  /**
   * Batch: 3 queries planas para obtener likes + comentarios de N publicaciones.
   * Evita el problema N+1 en el feed.
   *
   * @param {number[]} ids
   * @param {number|null} idusuario
   */
  async #fetchMeta(ids, idusuario = null) {
    if (!ids || ids.length === 0) {
      return { likesCount: {}, likedByUser: new Set(), comentariosCount: {} }
    }

    const [likesData, comentariosCount] = await Promise.all([
      LikesRepository.getBatchAsync(ids, idusuario),
      ComentariosRepository.getComentariosBatchAsync(ids)
    ])

    return {
      likesCount:       likesData.likesCount,
      likedByUser:      likesData.likedByUser,
      comentariosCount
    }
  }

  // ── Owner checks (para validación en services) ────────────────────────────

  async getPruebaOwnerAsync(idprueba) {
    const { data } = await supabase
      .from('pruebas')
      .select('clubes(idusuario)')
      .eq('idprueba', idprueba)
      .single()
    return data
  }

  async getEntrenamientoOwnerAsync(identrenamiento) {
    const { data } = await supabase
      .from('entrenamientos')
      .select('entrenadores(idusuario)')
      .eq('identrenamientos', identrenamiento)
      .single()
    return data
  }

  async getEmpleoOwnerAsync(idempleo) {
    const { data } = await supabase
      .from('empleo')
      .select('clubes(idusuario)')
      .eq('idempleo', idempleo)
      .single()
    return data
  }

  // ── Queries públicas ──────────────────────────────────────────────────────

  /**
   * Lista paginada de publicaciones enriquecidas con likes/comentarios.
   *
   * @param {number} page
   * @param {number} limit
   * @param {number|null} idusuario - del JWT, para calcular usuarioDioLike
   */
  async getAllAsync(page = 1, limit = 20, idusuario = null) {
    const from = (page - 1) * limit
    const to   = from + limit - 1

    const { data, count, error } = await supabase
      .from('publicaciones')
      .select('*', { count: 'exact' })
      .order('createdat', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    const ids  = (data || []).map(p => p.idpublicacion)
    const meta = await this.#fetchMeta(ids, idusuario)

    const publicacionesEnriquecidas = await Promise.all(
      (data || []).map(pub => this.#enriquecerPublicacion(pub, meta))
    )

    return {
      publicaciones: publicacionesEnriquecidas,
      page,
      totalPaginas: count ? Math.ceil(count / limit) : 0,
      totalItems:   count || 0
    }
  }

  /**
   * Publicación individual enriquecida.
   *
   * @param {number|string} id
   * @param {number|null} idusuario - del JWT, para calcular usuarioDioLike
   */
  async getByIdAsync(id, idusuario = null) {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('idpublicacion', id)
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)

    const meta = await this.#fetchMeta([data.idpublicacion], idusuario)
    return await this.#enriquecerPublicacion(data, meta)
  }

  /**
   * Fila cruda (sin enriquecer) — para ownership checks internos.
   */
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

  /**
   * Crea una publicación y retorna el objeto enriquecido.
   * La publicación recién creada siempre tiene 0 likes/comentarios.
   */
  async crearPublicacionAsync(publicacionData) {
    const { data, error } = await supabase
      .from('publicaciones')
      .insert({
        idusuario:       publicacionData.idusuario,
        contenido:       publicacionData.contenido,
        tipopublicacion: publicacionData.tipopublicacion || 'NORMAL',
        idprueba:        publicacionData.idprueba        || null,
        identrenamiento: publicacionData.identrenamiento || null,
        idempleo:        publicacionData.idempleo        || null,
        imagen:          publicacionData.imagen          || null
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // meta = null → totalLikes: 0, totalComentarios: 0, usuarioDioLike: false
    return await this.#enriquecerPublicacion(data, null)
  }

  /**
   * Actualiza una publicación y retorna el objeto enriquecido con likes/comentarios actuales.
   *
   * @param {string|number} id
   * @param {string} contenido
   * @param {string|null|undefined} imagenUrl
   *   - undefined: no tocar el campo imagen
   *   - null: borrar la imagen
   *   - string: URL de la nueva imagen
   * @param {number|null} idusuario - para calcular usuarioDioLike en el response
   */
  async actualizarPublicacionAsync(id, contenido, imagenUrl, idusuario = null) {
    const campos = {
      contenido,
      updatedat: new Date().toISOString()
    }

    if (imagenUrl !== undefined) {
      campos.imagen = imagenUrl
    }

    const { data, error } = await supabase
      .from('publicaciones')
      .update(campos)
      .eq('idpublicacion', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    const meta = await this.#fetchMeta([data.idpublicacion], idusuario)
    return await this.#enriquecerPublicacion(data, meta)
  }

  async eliminarPublicacionAsync(id) {
    const { error } = await supabase
      .from('publicaciones')
      .delete()
      .eq('idpublicacion', id)

    if (error) throw new Error(error.message)
  }

  async subirImagenPublicacionAsync(archivo) {
    // Limpia espacios del nombre original antes de armarlo (regex literal)
    const nombreLimpio = archivo.originalname.replace(/\s+/g, '_')
    const nombreUnico  = `publicaciones/${Date.now()}-${nombreLimpio}`

    const { error } = await supabase.storage
      .from('fotoPublicaciones')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(`[fotoPublicaciones] Error al subir imagen: ${error.message}`)

    const { data } = supabase.storage
      .from('fotoPublicaciones')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }
}

export default new PublicacionesRepository()