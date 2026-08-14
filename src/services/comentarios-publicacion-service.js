import ComentariosRepository from '../repositories/comentarios-publicacion-repository.js'
import PublicacionesRepository from '../repositories/publicaciones-repository.js'

class ComentariosPublicacionService {

  /**
   * Lista los comentarios de una publicación.
   * No verifica existencia de la publicación — el listado vacío es válido.
   */
  async getComentarios(idpublicacion) {
    return await ComentariosRepository.getByPublicacionAsync(idpublicacion)
  }

  /**
   * Crea un comentario.
   * Verifica que la publicación exista (404 si no).
   * El idusuario siempre viene del JWT, nunca del body.
   */
  async crearComentario(idpublicacion, idusuario, contenido) {
    if (!contenido || contenido.trim() === '') {
      throw { status: 400, message: 'El contenido del comentario es obligatorio' }
    }

    const pub = await PublicacionesRepository.getRawByIdAsync(idpublicacion)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    return await ComentariosRepository.crearComentarioAsync(idpublicacion, idusuario, contenido)
  }

  /**
   * Edita un comentario propio.
   * 404 si no existe, 403 si no es el autor.
   */
  async actualizarComentario(id, idusuario, contenido) {
    if (!contenido || contenido.trim() === '') {
      throw { status: 400, message: 'El contenido del comentario es obligatorio' }
    }

    const comentario = await ComentariosRepository.getRawByIdAsync(id)
    if (!comentario) throw { status: 404, message: 'Comentario no encontrado' }

    if (Number(comentario.idusuario) !== Number(idusuario)) {
      throw { status: 403, message: 'No tenés permiso para editar este comentario' }
    }

    return await ComentariosRepository.actualizarComentarioAsync(id, contenido)
  }

  /**
   * Elimina un comentario propio.
   * 404 si no existe, 403 si no es el autor.
   * (Moderación por autor de publicación: fase posterior)
   */
  async eliminarComentario(id, idusuario) {
    const comentario = await ComentariosRepository.getRawByIdAsync(id)
    if (!comentario) throw { status: 404, message: 'Comentario no encontrado' }

    if (Number(comentario.idusuario) !== Number(idusuario)) {
      throw { status: 403, message: 'No tenés permiso para eliminar este comentario' }
    }

    await ComentariosRepository.eliminarComentarioAsync(id)
  }
}

export default new ComentariosPublicacionService()
