import supabase from '../configs/supabase-config.js'
import { resolverAutor } from '../utils/resolver-autor.js'
import LikesRepository from './likes-publicacion-repository.js'
import ComentariosRepository from './comentarios-publicacion-repository.js'
import SeguidoresRepository from './seguidores-repository.js'
import AdjuntosRepository from './adjuntos-repository.js'

class PublicacionesRepository {

  // ── Helpers privados ─────────────────────────────────────────────────────

  /**
   * Resuelve el evento adjunto (Prueba, Entrenamiento, Empleo) en el formato normalizado de adjuntos.
   */
  async #resolverReferencia(pub) {
    const ids = { PRUEBA: pub.idprueba, ENTRENAMIENTO: pub.identrenamiento, EMPLEO: pub.idempleo }
    const id = ids[pub.tipopublicacion]
    if (!id) return null
    try {
      const { idusuarioDuenio, ...evento } = (await AdjuntosRepository.getAsync(pub.tipopublicacion, id)) || {}
      return evento.id ? evento : null
    } catch {
      return null
    }
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

  /**
   * Página del feed con las publicaciones de las cuentas seguidas primero (más recientes
   * primero dentro de cada grupo) y el resto después. Paginación por offset sobre la
   * lista virtual [seguidos..., resto...].
   */
  async #getPaginaSeguidosPrimero(seguidos, from, to) {
    const noSeguidos = `(${seguidos.join(',')})`
    const cantidad = to - from + 1

    const contar = async (q) => {
      const { count, error } = await q
      if (error) throw new Error(error.message)
      return count || 0
    }

    const [totalSeguidos, totalResto] = await Promise.all([
      contar(supabase.from('publicaciones').select('idpublicacion', { count: 'exact', head: true }).in('idusuario', seguidos)),
      contar(supabase.from('publicaciones').select('idpublicacion', { count: 'exact', head: true }).not('idusuario', 'in', noSeguidos)),
    ])

    let filas = []
    if (from < totalSeguidos) {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .in('idusuario', seguidos)
        .order('createdat', { ascending: false })
        .range(from, Math.min(to, totalSeguidos - 1))
      if (error) throw new Error(error.message)
      filas = data || []
    }

    const faltan = cantidad - filas.length
    if (faltan > 0) {
      const desde = Math.max(0, from - totalSeguidos)
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .not('idusuario', 'in', noSeguidos)
        .order('createdat', { ascending: false })
        .range(desde, desde + faltan - 1)
      if (error) throw new Error(error.message)
      filas = filas.concat(data || [])
    }

    return { data: filas, count: totalSeguidos + totalResto }
  }

  // ── Queries públicas ──────────────────────────────────────────────────────

  /**
   * Lista paginada de publicaciones enriquecidas con likes/comentarios.
   *
   * @param {number} page
   * @param {number} limit
   * @param {number|null} idusuario - del JWT, para calcular usuarioDioLike
   * @param {number|null} targetUserId - opcional, para filtrar publicaciones por autor
   */
  async getAllAsync(page = 1, limit = 20, idusuario = null, targetUserId = null) {
    const from = (page - 1) * limit
    const to   = from + limit - 1

    // Feed general (sin filtrar por autor): las cuentas que sigo van primero
    let seguidos = []
    if (!targetUserId && idusuario) {
      try {
        seguidos = await SeguidoresRepository.getSeguidosIdsAsync(idusuario)
      } catch (err) {
        // Si la tabla seguidores aún no existe, el feed sigue funcionando en orden cronológico
        console.warn('[publicaciones] No se pudieron leer los seguidos:', err.message)
      }
    }

    let data, count
    if (seguidos.length > 0) {
      ({ data, count } = await this.#getPaginaSeguidosPrimero(seguidos, from, to))
    } else {
      let query = supabase
        .from('publicaciones')
        .select('*', { count: 'exact' })

      if (targetUserId) {
        query = query.eq('idusuario', targetUserId)
      }

      const res = await query
        .order('createdat', { ascending: false })
        .range(from, to)

      if (res.error) throw new Error(res.error.message)
      data = res.data
      count = res.count
    }

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
    // Limpia dependencias por si la BD no tiene ON DELETE CASCADE
    await supabase.from('comentarios_publicacion').delete().eq('idpublicacion', id)
    await supabase.from('likes_publicacion').delete().eq('idpublicacion', id)

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