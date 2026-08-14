import supabase from '../configs/supabase-config.js'

class LikesPublicacionRepository {

  /**
   * Da like idempotente.
   * Usa upsert con ignoreDuplicates para que una PK duplicada
   * (idpublicacion, idusuario) no tire error — simplemente no hace nada.
   */
  async darLikeAsync(idpublicacion, idusuario) {
    const { error } = await supabase
      .from('likes_publicacion')
      .upsert(
        { idpublicacion: Number(idpublicacion), idusuario: Number(idusuario) },
        { onConflict: 'idpublicacion,idusuario', ignoreDuplicates: true }
      )
    if (error) throw new Error(error.message)
  }

  /**
   * Saca like idempotente.
   * Postgres no tira error si la fila no existe — DELETE de 0 filas es OK.
   */
  async sacarLikeAsync(idpublicacion, idusuario) {
    const { error } = await supabase
      .from('likes_publicacion')
      .delete()
      .eq('idpublicacion', Number(idpublicacion))
      .eq('idusuario', Number(idusuario))
    if (error) throw new Error(error.message)
  }

  /**
   * Total de likes de UNA publicación específica.
   * Usado en la respuesta inmediata de POST/DELETE like.
   */
  async getTotalLikesAsync(idpublicacion) {
    const { count, error } = await supabase
      .from('likes_publicacion')
      .select('*', { count: 'exact', head: true })
      .eq('idpublicacion', Number(idpublicacion))
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  /**
   * Batch: obtiene likes count + likes del usuario para múltiples publicaciones.
   * Una sola query a la BD en vez de N queries individuales.
   *
   * @param {number[]} ids - array de idpublicacion
   * @param {number|null} idusuario - para determinar usuarioDioLike
   * @returns {{
   *   likesCount: Record<number, number>,
   *   likedByUser: Set<number>
   * }}
   */
  async getBatchAsync(ids, idusuario = null) {
    if (!ids || ids.length === 0) {
      return { likesCount: {}, likedByUser: new Set() }
    }

    const { data, error } = await supabase
      .from('likes_publicacion')
      .select('idpublicacion, idusuario')
      .in('idpublicacion', ids)

    if (error) throw new Error(error.message)

    const likesCount  = {}
    const likedByUser = new Set()

    for (const row of (data || [])) {
      const id = row.idpublicacion
      likesCount[id] = (likesCount[id] || 0) + 1
      if (idusuario && Number(row.idusuario) === Number(idusuario)) {
        likedByUser.add(id)
      }
    }

    return { likesCount, likedByUser }
  }
}

export default new LikesPublicacionRepository()
