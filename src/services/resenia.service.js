import reseniaRepository from '../repositories/resenia.repository.js'

class ReseniaService {
  constructor() {
    this.repository = reseniaRepository
  }

  /**
   * Valida la exclusión mutua de destinatario: debe tener idclub O identrenador, nunca ambos ni ninguno.
   */
  #validarDestinatario(idclub, identrenador) {
    const tieneClub = idclub !== undefined && idclub !== null && String(idclub).trim() !== ''
    const tieneEntrenador = identrenador !== undefined && identrenador !== null && String(identrenador).trim() !== ''

    if ((tieneClub && tieneEntrenador) || (!tieneClub && !tieneEntrenador)) {
      throw {
        status: 400,
        message: 'Debe especificar exactamente un destinatario: idclub o identrenador, pero no ambos ni ninguno.'
      }
    }

    const clubNum = tieneClub ? Number(idclub) : null
    const entNum = tieneEntrenador ? Number(identrenador) : null

    if (tieneClub && (isNaN(clubNum) || clubNum <= 0)) {
      throw { status: 400, message: 'El idclub debe ser un número entero positivo.' }
    }

    if (tieneEntrenador && (isNaN(entNum) || entNum <= 0)) {
      throw { status: 400, message: 'El identrenador debe ser un número entero positivo.' }
    }

    return {
      idclub: clubNum,
      identrenador: entNum,
      tipo: tieneClub ? 'club' : 'entrenador',
      destinatarioId: tieneClub ? clubNum : entNum
    }
  }

  /**
   * Crea una reseña en la base de datos tras validar los campos de negocio,
   * la participación previa y que no exista una reseña anterior.
   *
   * @param {Object} params
   * @param {number} params.idjugador
   * @param {number|null} [params.idclub]
   * @param {number|null} [params.identrenador]
   * @param {number|null} [params.idprueba]
   * @param {number|null} [params.identrenamiento]
   * @param {number} params.estrellitas - Entero del 1 al 5
   * @param {string} params.textoopinion - Opinión no vacía
   */
  async crearResenia({
    idjugador,
    idclub,
    identrenador,
    idprueba = null,
    identrenamiento = null,
    estrellitas,
    textoopinion
  }) {
    // 1. Validar jugador
    const jugadorId = Number(idjugador)
    if (!idjugador || isNaN(jugadorId) || jugadorId <= 0) {
      throw { status: 400, message: 'El id del jugador es obligatorio y debe ser un número válido.' }
    }

    // 2. Validar constraint de exclusión: solo idclub O identrenador
    const { idclub: clubId, identrenador: entrenadorId, tipo, destinatarioId } = this.#validarDestinatario(idclub, identrenador)

    // 3. Validar estrellitas (entero entre 1 y 5)
    const numEstrellas = Number(estrellitas)
    if (
      estrellitas === undefined ||
      estrellitas === null ||
      !Number.isInteger(numEstrellas) ||
      numEstrellas < 1 ||
      numEstrellas > 5
    ) {
      throw { status: 400, message: 'La calificación es obligatoria y debe ser un número entero entre 1 y 5 estrellitas.' }
    }

    // 4. Validar texto de opinión
    if (!textoopinion || typeof textoopinion !== 'string' || textoopinion.trim() === '') {
      throw { status: 400, message: 'El texto de opinión es obligatorio y no puede estar vacío.' }
    }

    // 5. Validar si el jugador está habilitado para calificar (participó en evento finalizado y no calificó previamente)
    const habilitacion = await this.verificarPuedeCalificar({
      idjugador: jugadorId,
      tipo,
      id: destinatarioId
    })

    if (habilitacion.yaCalifico) {
      throw {
        status: 409,
        message: `Ya has calificado a este ${tipo}. No se permite enviar más de una reseña.`
      }
    }

    if (!habilitacion.puedeCalificar) {
      throw {
        status: 403,
        message: `No estás habilitado para calificar a este ${tipo}. Debes haber completado al menos ${tipo === 'club' ? 'una prueba' : 'un entrenamiento'} finalizado.`
      }
    }

    // 6. Validar IDs de prueba o entrenamiento si fueron provistos
    const pruebaId = idprueba ? Number(idprueba) : null
    const entrenamientoId = identrenamiento ? Number(identrenamiento) : null

    // 7. Insertar en base de datos mediante el repositorio
    try {
      const nuevaResenia = await this.repository.crearReseniaAsync({
        idjugador: jugadorId,
        idclub: clubId,
        identrenador: entrenadorId,
        idprueba: pruebaId,
        identrenamiento: entrenamientoId,
        estrellitas: numEstrellas,
        textoopinion: textoopinion.trim()
      })

      return nuevaResenia
    } catch (error) {
      // Manejar error de índice único en caso de concurrencia
      if (error.code === '23505' || error.status === 409) {
        throw {
          status: 409,
          message: `Ya existe una reseña de este jugador para este ${tipo}.`
        }
      }
      throw error
    }
  }

  /**
   * Obtiene las reseñas por destinatario (club o entrenador) ordenadas por fecha descendente.
   *
   * @param {Object} params
   * @param {'club'|'entrenador'} params.tipo
   * @param {number} params.id
   */
  async obtenerReseniasPorDestinatario({ tipo, id }) {
    const tipoNormalizado = (tipo || '').toLowerCase().trim()
    if (tipoNormalizado !== 'club' && tipoNormalizado !== 'entrenador') {
      throw { status: 400, message: 'El tipo debe ser "club" o "entrenador".' }
    }

    const entidadId = Number(id)
    if (!id || isNaN(entidadId) || entidadId <= 0) {
      throw { status: 400, message: 'El ID del destinatario es obligatorio y debe ser un número entero positivo.' }
    }

    return await this.repository.getByDestinatarioAsync({
      tipo: tipoNormalizado,
      id: entidadId
    })
  }

  /**
   * Obtiene el promedio de estrellitas (1 decimal) y total de reseñas para un club o entrenador.
   *
   * @param {Object} params
   * @param {'club'|'entrenador'} params.tipo
   * @param {number} params.id
   */
  async obtenerPromedioYEstadisticas({ tipo, id }) {
    const tipoNormalizado = (tipo || '').toLowerCase().trim()
    if (tipoNormalizado !== 'club' && tipoNormalizado !== 'entrenador') {
      throw { status: 400, message: 'El tipo debe ser "club" o "entrenador".' }
    }

    const entidadId = Number(id)
    if (!id || isNaN(entidadId) || entidadId <= 0) {
      throw { status: 400, message: 'El ID del destinatario es obligatorio y debe ser un número entero positivo.' }
    }

    return await this.repository.getPromedioYEstadisticasAsync({
      tipo: tipoNormalizado,
      id: entidadId
    })
  }

  /**
   * Valida si un jugador puede calificar a un club o entrenador:
   * - Si tipo === 'club': verifica si participó en alguna prueba finalizada (fechaprueba < NOW()).
   * - Si tipo === 'entrenador': verifica si participó en un entrenamiento finalizado (fechaentr < NOW()).
   * - Verifica si el jugador ya dejó una reseña previa para esa entidad.
   *
   * @param {Object} params
   * @param {number} params.idjugador
   * @param {'club'|'entrenador'} params.tipo
   * @param {number} params.id
   * @returns {Promise<{ puedeCalificar: boolean, yaCalifico: boolean, eventosPasados: Array }>}
   */
  async verificarPuedeCalificar({ idjugador, tipo, id }) {
    const jugadorId = Number(idjugador)
    if (!idjugador || isNaN(jugadorId) || jugadorId <= 0) {
      throw { status: 400, message: 'El idjugador es obligatorio y debe ser un número válido.' }
    }

    const tipoNormalizado = (tipo || '').toLowerCase().trim()
    if (tipoNormalizado !== 'club' && tipoNormalizado !== 'entrenador') {
      throw { status: 400, message: 'El tipo debe ser "club" o "entrenador".' }
    }

    const entidadId = Number(id)
    if (!id || isNaN(entidadId) || entidadId <= 0) {
      throw { status: 400, message: 'El ID de la entidad es obligatorio y debe ser un número válido.' }
    }

    // 1. Verificar si ya calificó previamente
    const yaCalifico = await this.repository.verificarExisteReseniaAsync({
      idjugador: jugadorId,
      tipo: tipoNormalizado,
      id: entidadId
    })

    // 2. Obtener eventos pasados en los que participó
    let eventosPasados = []
    if (tipoNormalizado === 'club') {
      eventosPasados = await this.repository.getEventosPasadosClubAsync({
        idjugador: jugadorId,
        idclub: entidadId
      })
    } else {
      eventosPasados = await this.repository.getEventosPasadosEntrenadorAsync({
        idjugador: jugadorId,
        identrenador: entidadId
      })
    }

    // 3. Puede calificar solo si no calificó antes y tiene al menos un evento pasado
    const puedeCalificar = !yaCalifico && eventosPasados.length > 0

    return {
      puedeCalificar,
      yaCalifico,
      eventosPasados
    }
  }

  /**
   * Resuelve el idjugador para un idusuario dado.
   */
  async obtenerIdJugadorPorUsuario(idusuario) {
    if (!idusuario) return null
    const jugador = await this.repository.getJugadorByUsuarioIdAsync(idusuario)
    return jugador ? jugador.idjugador : null
  }
}

export { ReseniaService }
export default new ReseniaService()
