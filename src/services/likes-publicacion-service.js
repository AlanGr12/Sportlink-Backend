import LikesRepository from '../repositories/likes-publicacion-repository.js'
import PublicacionesRepository from '../repositories/publicaciones-repository.js'

class LikesPublicacionService {

  /**
   * Da like a una publicación (idempotente).
   * Verifica que la publicación exista antes de insertar.
   *
   * @returns {{ liked: true, totalLikes: number }}
   */
  async darLike(idpublicacion, idusuario) {
    const pub = await PublicacionesRepository.getRawByIdAsync(idpublicacion)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    await LikesRepository.darLikeAsync(idpublicacion, idusuario)
    const totalLikes = await LikesRepository.getTotalLikesAsync(idpublicacion)

    return { liked: true, totalLikes }
  }

  /**
   * Saca el like de una publicación (idempotente).
   * Si el usuario no había dado like, no tira error.
   *
   * @returns {{ liked: false, totalLikes: number }}
   */
  async sacarLike(idpublicacion, idusuario) {
    const pub = await PublicacionesRepository.getRawByIdAsync(idpublicacion)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    await LikesRepository.sacarLikeAsync(idpublicacion, idusuario)
    const totalLikes = await LikesRepository.getTotalLikesAsync(idpublicacion)

    return { liked: false, totalLikes }
  }
}

export default new LikesPublicacionService()
