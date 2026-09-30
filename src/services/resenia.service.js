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
   * Crea una reseña en la base de datos tras validar los campos de negocio
   * y que no exista una reseña anterior.
   *
   * @param {Object} params
   * @param {number|null} [params.idjugador]
   * @param {number|null} [params.identrenador_autor]
   * @param {number|null} [params.idusuario]
   * @param {string|null} [params.tipousuario]
   * @param {number|null} [params.idclub]
   * @param {number|null} [params.identrenador]
   * @param {number|null} [params.idprueba]
   * @param {number|null} [params.identrenamiento]
   * @param {number} params.estrellitas - Entero del 1 al 5
   * @param {string} params.textoopinion - Opinión no vacía
   * @param {string|null} [params.rolAutor]
   */
  async crearResenia({
    idjugador,
    identrenador_autor,
    idusuario,
    tipousuario,
    idclub,
    identrenador,
    idprueba = null,
    identrenamiento = null,
    estrellitas,
    textoopinion,
    rolAutor
  }) {
    // 1. Resolver autor (jugador o entrenador)
    const rol = (rolAutor || tipousuario || '').toLowerCase().trim()
    let jugadorId = idjugador ? Number(idjugador) : null
    let entrenadorAutorId = identrenador_autor ? Number(identrenador_autor) : null

    if (idusuario && !jugadorId && !entrenadorAutorId) {
      if (rol === 'entrenador') {
        const ent = await this.repository.getEntrenadorByUsuarioIdAsync(idusuario)
        entrenadorAutorId = ent ? ent.identrenador : null
      } else {
        const jug = await this.repository.getJugadorByUsuarioIdAsync(idusuario)
        jugadorId = jug ? jug.idjugador : null
      }
    }

    // Si el usuario es entrenador, mapear su ID a identrenador_autor. Si es jugador, mapearlo a idjugador.
    if (rol === 'entrenador' && !entrenadorAutorId && jugadorId) {
      entrenadorAutorId = jugadorId
      jugadorId = null
    }

    if (!jugadorId && !entrenadorAutorId) {
      throw {
        status: 400,
        message: 'Debe especificarse un autor válido (idjugador o identrenador_autor).'
      }
    }

    // 2. Validar constraint de exclusión: solo idclub O identrenador destinatario
    const { idclub: clubId, identrenador: entrenadorId, tipo, destinatarioId } = this.#validarDestinatario(idclub, identrenador)

    // Un entrenador solo puede calificar a un club, no a otro entrenador
    if (entrenadorAutorId && tipo === 'entrenador') {
      throw {
        status: 403,
        message: 'Un entrenador no puede calificar a otro entrenador.'
      }
    }

    // Validar auto-reseña
    if (tipo === 'entrenador' && entrenadorAutorId && Number(entrenadorAutorId) === Number(destinatarioId)) {
      throw {
        status: 400,
        message: 'No puedes calificarte a ti mismo.'
      }
    }

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

    // 5. Validar que no haya calificado previamente (capturando el 409 Conflict)
    const yaExiste = await this.repository.verificarExisteReseniaAsync({
      idjugador: jugadorId,
      identrenador_autor: entrenadorAutorId,
      tipo,
      id: destinatarioId
    })

    if (yaExiste) {
      throw {
        status: 409,
        message: `Ya has calificado a este ${tipo}. No se permite enviar más de una reseña.`
      }
    }

    // 6. Validar IDs de prueba o entrenamiento (opcionales, explícitamente null si no aplican)
    const pruebaId = idprueba ? Number(idprueba) : null
    const entrenamientoId = identrenamiento ? Number(identrenamiento) : null

    // 7. Insertar en base de datos mediante el repositorio
    try {
      const nuevaResenia = await this.repository.crearReseniaAsync({
        idjugador: jugadorId,
        identrenador_autor: entrenadorAutorId,
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
          message: `Ya existe una reseña previa para este ${tipo}.`
        }
      }
      throw error
    }
  }

  /**
   * Obtiene las reseñas por destinatario (club o entrenador) ordenadas por fecha descendente.
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
   * Valida si un usuario (jugador o entrenador) puede calificar a un club o entrenador:
   * - Si tipo === 'club': lo pueden calificar jugadores o entrenadores.
   * - Si tipo === 'entrenador': lo pueden calificar jugadores.
   * - No se exige asistencia a eventos previos (puedeCalificar: true si no calificó antes y no es el dueño del perfil).
   * - Si participó en eventos pasados, se envían en eventosPasados de forma opcional.
   */
  async verificarPuedeCalificar({
    idjugador,
    identrenador_autor,
    idusuario,
    tipousuario,
    tipo,
    id
  }) {
    const tipoNormalizado = (tipo || '').toLowerCase().trim()
    if (tipoNormalizado !== 'club' && tipoNormalizado !== 'entrenador') {
      throw { status: 400, message: 'El tipo debe ser "club" o "entrenador".' }
    }

    const entidadId = Number(id)
    if (!id || isNaN(entidadId) || entidadId <= 0) {
      throw { status: 400, message: 'El ID de la entidad es obligatorio y debe ser un número válido.' }
    }

    // Resolver autor (jugador o entrenador)
    let jugadorId = idjugador ? Number(idjugador) : null
    let entrenadorAutorId = identrenador_autor ? Number(identrenador_autor) : null
    const rol = (tipousuario || '').toLowerCase().trim()

    if (idusuario && !jugadorId && !entrenadorAutorId) {
      if (rol === 'entrenador') {
        const ent = await this.repository.getEntrenadorByUsuarioIdAsync(idusuario)
        entrenadorAutorId = ent ? ent.identrenador : null
      } else {
        const jug = await this.repository.getJugadorByUsuarioIdAsync(idusuario)
        jugadorId = jug ? jug.idjugador : null
      }
    }

    // Validar reglas de rol
    const esAutorEntrenador = Boolean(entrenadorAutorId || rol === 'entrenador')
    const esAutorJugador = Boolean(jugadorId || rol === 'jugador')

    if (tipoNormalizado === 'entrenador' && esAutorEntrenador) {
      return {
        puedeCalificar: false,
        yaCalifico: false,
        eventosPasados: [],
        motivo: 'Un entrenador no puede calificar a otro entrenador.'
      }
    }

    if (!esAutorJugador && !esAutorEntrenador) {
      return {
        puedeCalificar: false,
        yaCalifico: false,
        eventosPasados: [],
        motivo: 'Rol no autorizado para calificar.'
      }
    }

    // Validar auto-reseña
    if (tipoNormalizado === 'entrenador' && entrenadorAutorId && Number(entrenadorAutorId) === entidadId) {
      return {
        puedeCalificar: false,
        yaCalifico: false,
        eventosPasados: [],
        motivo: 'No puedes calificarte a ti mismo.'
      }
    }

    // 1. Verificar si ya calificó previamente (duplicado)
    const yaCalifico = await this.repository.verificarExisteReseniaAsync({
      idjugador: jugadorId,
      identrenador_autor: entrenadorAutorId,
      tipo: tipoNormalizado,
      id: entidadId
    })

    // 2. Obtener eventos pasados completados si es jugador (puramente opcional)
    let eventosPasados = []
    if (jugadorId) {
      try {
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
      } catch {
        eventosPasados = []
      }
    }

    // 3. No exigir asistencia a eventos previos: puedeCalificar es true si no ha calificado antes
    const puedeCalificar = !yaCalifico

    return {
      puedeCalificar,
      yaCalifico,
      eventosPasados: eventosPasados || []
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

  /**
   * Resuelve el identrenador para un idusuario dado.
   */
  async obtenerIdEntrenadorPorUsuario(idusuario) {
    if (!idusuario) return null
    const ent = await this.repository.getEntrenadorByUsuarioIdAsync(idusuario)
    return ent ? ent.identrenador : null
  }
}

export { ReseniaService }
export default new ReseniaService()
