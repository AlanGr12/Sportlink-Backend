import repo from '../repositories/publicaciones-repository.js'

class PublicacionesService {
  async getAll(page = 1, limit = 20) {
    const { data, totalItems } = await repo.getAll(page, limit)
    
    // N+1 resolution
    const publicaciones = await Promise.all(data.map(async (pub) => {
      const autor = await repo.getAutor(pub.idusuario)
      let referencia = null

      if (pub.tipopublicacion === 'PRUEBA' && pub.idprueba) {
        referencia = await repo.getReferenciaPrueba(pub.idprueba)
      } else if (pub.tipopublicacion === 'ENTRENAMIENTO' && pub.identrenamiento) {
        referencia = await repo.getReferenciaEntrenamiento(pub.identrenamiento)
      } else if (pub.tipopublicacion === 'EMPLEO' && pub.idempleo) {
        referencia = await repo.getReferenciaEmpleo(pub.idempleo)
      }

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
    }))

    return {
      publicaciones,
      page,
      limit,
      totalPaginas: Math.ceil(totalItems / limit),
      totalItems
    }
  }

  async getById(id) {
    const pub = await repo.getById(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }

    const autor = await repo.getAutor(pub.idusuario)
    let referencia = null

    if (pub.tipopublicacion === 'PRUEBA' && pub.idprueba) {
      referencia = await repo.getReferenciaPrueba(pub.idprueba)
    } else if (pub.tipopublicacion === 'ENTRENAMIENTO' && pub.identrenamiento) {
      referencia = await repo.getReferenciaEntrenamiento(pub.identrenamiento)
    } else if (pub.tipopublicacion === 'EMPLEO' && pub.idempleo) {
      referencia = await repo.getReferenciaEmpleo(pub.idempleo)
    }

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

  async create(data, file, idusuario) {
    const { contenido, tipopublicacion = 'NORMAL', idprueba, identrenamiento, idempleo } = data

    if (!contenido) {
      throw { status: 400, message: 'El contenido es obligatorio' }
    }

    // Validación de referencias incompatibles
    if (tipopublicacion === 'NORMAL' && (idprueba || identrenamiento || idempleo)) {
      throw { status: 400, message: 'Una publicación NORMAL no debe tener referencias' }
    }
    if (tipopublicacion === 'PRUEBA' && (!idprueba || identrenamiento || idempleo)) {
      throw { status: 400, message: 'Una publicación PRUEBA debe tener solo idprueba' }
    }
    if (tipopublicacion === 'ENTRENAMIENTO' && (idprueba || !identrenamiento || idempleo)) {
      throw { status: 400, message: 'Una publicación ENTRENAMIENTO debe tener solo identrenamiento' }
    }
    if (tipopublicacion === 'EMPLEO' && (idprueba || identrenamiento || !idempleo)) {
      throw { status: 400, message: 'Una publicación EMPLEO debe tener solo idempleo' }
    }

    // Validación de Existencia y Ownership
    if (tipopublicacion === 'PRUEBA') {
      const ownerId = await repo.getPruebaOwner(idprueba)
      if (ownerId === null) throw { status: 404, message: 'La prueba no existe' }
      if (ownerId !== idusuario) throw { status: 403, message: 'No tienes permiso para publicar esta prueba' }
    } else if (tipopublicacion === 'ENTRENAMIENTO') {
      const ownerId = await repo.getEntrenamientoOwner(identrenamiento)
      if (ownerId === null) throw { status: 404, message: 'El entrenamiento no existe' }
      if (ownerId !== idusuario) throw { status: 403, message: 'No tienes permiso para publicar este entrenamiento' }
    } else if (tipopublicacion === 'EMPLEO') {
      const ownerId = await repo.getEmpleoOwner(idempleo)
      if (ownerId === null) throw { status: 404, message: 'El empleo no existe' }
      if (ownerId !== idusuario) throw { status: 403, message: 'No tienes permiso para publicar este empleo' }
    }

    let imageUrl = null
    if (file) {
      imageUrl = await repo.uploadImage(file.buffer, file.mimetype)
    }

    const publicacionToCreate = {
      idusuario,
      contenido,
      tipopublicacion,
      idprueba: idprueba || null,
      identrenamiento: identrenamiento || null,
      idempleo: idempleo || null,
      imagen: imageUrl
    }

    const created = await repo.create(publicacionToCreate)
    return this.getById(created.idpublicacion)
  }

  async update(id, data, idusuario) {
    const pub = await repo.getById(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }
    if (pub.idusuario !== idusuario) throw { status: 403, message: 'No tienes permiso para editar esta publicación' }

    if (data.idusuario || data.tipopublicacion || data.idprueba || data.identrenamiento || data.idempleo) {
        throw { status: 400, message: 'Solo se puede modificar el contenido' }
    }

    if (!data.contenido) {
        throw { status: 400, message: 'El contenido es obligatorio' }
    }

    const dataToUpdate = {
      contenido: data.contenido,
      updatedat: new Date().toISOString()
    }

    const updated = await repo.update(id, dataToUpdate)
    return this.getById(updated.idpublicacion)
  }

  async delete(id, idusuario) {
    const pub = await repo.getById(id)
    if (!pub) throw { status: 404, message: 'Publicación no encontrada' }
    if (pub.idusuario !== idusuario) throw { status: 403, message: 'No tienes permiso para eliminar esta publicación' }

    await repo.delete(id)
  }
}

export default new PublicacionesService()
