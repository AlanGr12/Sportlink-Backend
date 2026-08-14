import supabase from '../configs/supabase-config.js'
import { resolverAutor } from '../utils/resolver-autor.js'

class ComentariosPublicacionRepository {

  /**
   * Enriquece un comentario crudo con los datos del autor.
   */
  async #enriquecerComentario(comentario) {
    const autor = await resolverAutor(comentario.idusuario)
    return {
      idcomentario:  comentario.idcomentario,
      idpublicacion: comentario.idpublicacion,
      autor,
      contenido:  comentario.contenido,
      createdat:  comentario.createdat,
      updatedat:  comentario.updatedat
    }
  }

  /**
   * Lista de comentarios de una publicación, ordenados ASC (conversación).
   * Tope defensivo de 100 comentarios para esta fase.
   */
  async getByPublicacionAsync(idpublicacion) {
    const { data, error } = await supabase
      .from('comentarios_publicacion')
      .select('*')
      .eq('idpublicacion', Number(idpublicacion))
      .order('createdat', { ascending: true })
      .limit(100)

    if (error) throw new Error(error.message)

    return await Promise.all((data || []).map(c => this.#enriquecerComentario(c)))
  }

  /**
   * Batch: devuelve { [idpublicacion]: count } para múltiples publicaciones.
   * Una sola query plana en vez de N queries individuales.
   *
   * @param {number[]} ids
   * @returns {Record<number, number>}
   */
  async getComentariosBatchAsync(ids) {
    if (!ids || ids.length === 0) return {}

    const { data, error } = await supabase
      .from('comentarios_publicacion')
      .select('idpublicacion')
      .in('idpublicacion', ids)

    if (error) throw new Error(error.message)

    const counts = {}
    for (const row of (data || [])) {
      const id = row.idpublicacion
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }

  /**
   * Comentario crudo (sin enriquecer) — para ownership checks.
   */
  async getRawByIdAsync(id) {
    const { data, error } = await supabase
      .from('comentarios_publicacion')
      .select('*')
      .eq('idcomentario', Number(id))
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)

    return data
  }

  /**
   * Crea un comentario y retorna el objeto enriquecido (con autor).
   */
  async crearComentarioAsync(idpublicacion, idusuario, contenido) {
    const { data, error } = await supabase
      .from('comentarios_publicacion')
      .insert({
        idpublicacion: Number(idpublicacion),
        idusuario:     Number(idusuario),
        contenido
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return await this.#enriquecerComentario(data)
  }

  /**
   * Actualiza el contenido de un comentario.
   * Devuelve solo los campos editables (no re-resuelve el autor).
   */
  async actualizarComentarioAsync(id, contenido) {
    const { data, error } = await supabase
      .from('comentarios_publicacion')
      .update({
        contenido,
        updatedat: new Date().toISOString()
      })
      .eq('idcomentario', Number(id))
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      idcomentario:  data.idcomentario,
      idpublicacion: data.idpublicacion,
      contenido:     data.contenido,
      updatedat:     data.updatedat
    }
  }

  /**
   * Elimina un comentario.
   */
  async eliminarComentarioAsync(id) {
    const { error } = await supabase
      .from('comentarios_publicacion')
      .delete()
      .eq('idcomentario', Number(id))

    if (error) throw new Error(error.message)
  }
}

export default new ComentariosPublicacionRepository()
