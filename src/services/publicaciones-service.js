import PublicacionesRepository from '../repositories/publicaciones-repository.js'

class PublicacionesService {

  async getPublicaciones(page = 1, limit = 20, idusuario = null) {
    page  = parseInt(page)  || 1
    limit = parseInt(limit) || 20

    if (page  < 1)           page  = 1
    if (limit < 1 || limit > 100) limit = 20

    return await PublicacionesRepository.getAllAsync(page, limit, idusuario)
  }

  async getPublicacionById(id, idusuario = null) {
    const publicacion = await PublicacionesRepository.getByIdAsync(id, idusuario)
    if (!publicacion) {
      throw { status: 404, message: 'Publicación no encontrada' }
    }
    return publicacion
  }

  async crearPublicacion(data, archivo, idusuario) {
    const {
      contenido,
      tipopublicacion = 'NORMAL',
      idprueba,
      identrenamiento,
      idempleo,
      imagen
    } = data

    if (!contenido || contenido.trim() === '') {
      throw { status: 400, message: 'El contenido es obligatorio' }
    }

    if (!['NORMAL', 'PRUEBA', 'ENTRENAMIENTO', 'EMPLEO'].includes(tipopublicacion)) {
      throw { status: 400, message: 'Tipo de publicación inválido' }
    }

    if (tipopublicacion === 'NORMAL') {
      if (idprueba || identrenamiento || idempleo) {
        throw { status: 400, message: 'Una publicación NORMAL no puede tener referencias' }
      }
    }

    if (tipopublicacion === 'PRUEBA') {
      if (!idprueba) throw { status: 400, message: 'Se requiere idprueba para el tipo PRUEBA' }
      if (identrenamiento || idempleo) throw { status: 400, message: 'No se permiten referencias incompatibles para PRUEBA' }

      const owner = await PublicacionesRepository.getPruebaOwnerAsync(idprueba)
      if (!owner) throw { status: 404, message: 'La prueba no existe' }
      if (Number(owner.clubes?.idusuario) !== Number(idusuario)) {
        throw { status: 403, message: 'No tienes permiso para publicar esta prueba' }
      }
    }

    if (tipopublicacion === 'ENTRENAMIENTO') {
      if (!identrenamiento) throw { status: 400, message: 'Se requiere identrenamiento para el tipo ENTRENAMIENTO' }
      if (idprueba || idempleo) throw { status: 400, message: 'No se permiten referencias incompatibles para ENTRENAMIENTO' }

      const owner = await PublicacionesRepository.getEntrenamientoOwnerAsync(identrenamiento)
      if (!owner) throw { status: 404, message: 'El entrenamiento no existe' }
      if (Number(owner.entrenadores?.idusuario) !== Number(idusuario)) {
        throw { status: 403, message: 'No tienes permiso para publicar este entrenamiento' }
      }
    }

    if (tipopublicacion === 'EMPLEO') {
      if (!idempleo) throw { status: 400, message: 'Se requiere idempleo para el tipo EMPLEO' }
      if (idprueba || identrenamiento) throw { status: 400, message: 'No se permiten referencias incompatibles para EMPLEO' }

      const owner = await PublicacionesRepository.getEmpleoOwnerAsync(idempleo)
      if (!owner) throw { status: 404, message: 'El empleo no existe' }
      if (Number(owner.clubes?.idusuario) !== Number(idusuario)) {
        throw { status: 403, message: 'No tienes permiso para publicar este empleo' }
      }
    }

    let imagenUrl = imagen || null
    if (archivo) {
      imagenUrl = await PublicacionesRepository.subirImagenPublicacionAsync(archivo)
    }

    const nuevaPublicacion = {
      idusuario,
      contenido,
      tipopublicacion,
      idprueba:        tipopublicacion === 'PRUEBA'         ? Number(idprueba)        : null,
      identrenamiento: tipopublicacion === 'ENTRENAMIENTO'  ? Number(identrenamiento) : null,
      idempleo:        tipopublicacion === 'EMPLEO'         ? Number(idempleo)        : null,
      imagen:          imagenUrl
    }

    return await PublicacionesRepository.crearPublicacionAsync(nuevaPublicacion)
  }

  /**
   * @param {string|number} id
   * @param {number} idusuario
   * @param {string} contenido
   * @param {object|null} archivo      - multer file (imagen nueva)
   * @param {boolean} quitarImagen     - true → setear imagen = null
   */
  async actualizarPublicacion(id, idusuario, contenido, archivo = null, quitarImagen = false) {
    if (!contenido || contenido.trim() === '') {
      throw { status: 400, message: 'El contenido es obligatorio' }
    }

    const pub = await PublicacionesRepository.getRawByIdAsync(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    if (Number(pub.idusuario) !== Number(idusuario)) {
      throw { status: 403, message: 'No tienes permiso para editar esta publicación' }
    }

    // Resolver imagen: undefined = no tocar; null = borrar; string = actualizar
    let imagenUrl = undefined
    if (archivo) {
      imagenUrl = await PublicacionesRepository.subirImagenPublicacionAsync(archivo)
    } else if (quitarImagen) {
      imagenUrl = null
    }

    return await PublicacionesRepository.actualizarPublicacionAsync(id, contenido, imagenUrl, idusuario)
  }

  async eliminarPublicacion(id, idusuario) {
    const pub = await PublicacionesRepository.getRawByIdAsync(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    if (Number(pub.idusuario) !== Number(idusuario)) {
      throw { status: 403, message: 'No tienes permiso para eliminar esta publicación' }
    }

    await PublicacionesRepository.eliminarPublicacionAsync(id)
  }
}

export default new PublicacionesService()