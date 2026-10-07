import PublicacionesRepository from '../repositories/publicaciones-repository.js'
import adjuntosService from './adjuntos-service.js'

class PublicacionesService {

  async getPublicaciones(page = 1, limit = 20, idusuario = null, targetUserId = null) {
    page  = parseInt(page)  || 1
    limit = parseInt(limit) || 20

    if (page  < 1)           page  = 1
    if (limit < 1 || limit > 100) limit = 20

    return await PublicacionesRepository.getAllAsync(page, limit, idusuario, targetUserId)
  }

  async getPublicacionById(id, idusuario = null) {
    const publicacion = await PublicacionesRepository.getByIdAsync(id, idusuario)
    if (!publicacion) {
      throw { status: 404, message: 'Publicación no encontrada' }
    }
    return publicacion
  }

  async crearPublicacion(data, archivo, idusuario, tipousuario) {
    const {
      contenido = '',
      tipopublicacion = 'NORMAL',
      idprueba,
      identrenamiento,
      idempleo,
      imagen
    } = data

    if (!['NORMAL', 'PRUEBA', 'ENTRENAMIENTO', 'EMPLEO'].includes(tipopublicacion)) {
      throw { status: 400, message: 'Tipo de publicación inválido' }
    }

    // Con un evento adjunto el texto es opcional
    if (tipopublicacion === 'NORMAL' && contenido.trim() === '') {
      throw { status: 400, message: 'El contenido es obligatorio' }
    }

    const referencias = { PRUEBA: idprueba, ENTRENAMIENTO: identrenamiento, EMPLEO: idempleo }
    const idsPresentes = Object.entries(referencias).filter(([, v]) => v)

    if (tipopublicacion === 'NORMAL') {
      if (idsPresentes.length > 0) {
        throw { status: 400, message: 'Una publicación NORMAL no puede tener referencias' }
      }
    } else {
      if (!referencias[tipopublicacion]) {
        throw { status: 400, message: `Falta el evento a adjuntar para el tipo ${tipopublicacion}` }
      }
      if (idsPresentes.length > 1) {
        throw { status: 400, message: `No se permiten referencias incompatibles para ${tipopublicacion}` }
      }
      // Club → sus pruebas y empleos; entrenador → sus entrenamientos
      await adjuntosService.validarPropio(tipopublicacion, referencias[tipopublicacion], idusuario, tipousuario)
    }

    let imagenUrl = imagen || null
    if (archivo) {
      imagenUrl = await PublicacionesRepository.subirImagenPublicacionAsync(archivo)
    }

    const nuevaPublicacion = {
      idusuario,
      contenido:       contenido.trim(),
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

  async eliminarPublicacion(id, idusuario, esAdmin = false) {
    const pub = await PublicacionesRepository.getRawByIdAsync(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    if (!esAdmin && Number(pub.idusuario) !== Number(idusuario)) {
      throw { status: 403, message: 'No tienes permiso para eliminar esta publicación' }
    }

    await PublicacionesRepository.eliminarPublicacionAsync(id)
  }
}

export default new PublicacionesService()