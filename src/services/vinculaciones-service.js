import VinculacionesRepository from '../repositories/vinculaciones-repository.js'
import NotificacionesService from './notificaciones-service.js'

const nombreEntrenador = (e) => [e?.nombre, e?.apellido].filter(Boolean).join(' ').trim() || 'Un entrenador'

class VinculacionesService {
  constructor() {
    this.repository = new VinculacionesRepository()
    this.notificaciones = new NotificacionesService()
  }

  // ── Resolución de la identidad a partir del token ───────────────────────────

  async #clubDelUsuario(usuario) {
    const club = await this.repository.getClubPorUsuarioAsync(usuario.idusuario)
    if (!club) throw { status: 403, message: 'Tu cuenta no tiene un club asociado.' }
    return club
  }

  async #entrenadorDelUsuario(usuario) {
    const entrenador = await this.repository.getEntrenadorPorUsuarioAsync(usuario.idusuario)
    if (!entrenador) throw { status: 403, message: 'Tu cuenta no tiene un perfil de entrenador.' }
    return entrenador
  }

  // ── Altas ───────────────────────────────────────────────────────────────────

  /**
   * Crea la solicitud (o reabre una rechazada) validando duplicados y que el
   * entrenador no pertenezca ya a otro club.
   */
  async #crear({ club, entrenador, origen }) {
    const aceptada = await this.repository.getAceptadaDeEntrenadorAsync(entrenador.identrenador)
    if (aceptada) {
      const mismoClub = Number(aceptada.id_club) === Number(club.idclub)
      throw {
        status: 409,
        message: mismoClub
          ? 'Ya están vinculados.'
          : origen === 'ENTRENADOR'
            ? 'Ya pertenecés a un club. Desvinculate antes de solicitar unirte a otro.'
            : 'Este entrenador ya pertenece a otro club.'
      }
    }

    const previa = await this.repository.getPorParAsync(club.idclub, entrenador.identrenador)
    if (previa?.estado === 'PENDIENTE') {
      throw {
        status: 409,
        message: previa.origen === origen
          ? 'Ya hay una solicitud pendiente.'
          : origen === 'ENTRENADOR'
            ? 'Este club ya te envió una invitación. Revisá tus solicitudes pendientes para aceptarla.'
            : 'Este entrenador ya solicitó unirse a tu club. Revisá las solicitudes pendientes para aceptarla.'
      }
    }

    return previa?.estado === 'RECHAZADO'
      ? await this.repository.reabrirAsync(previa.id, origen)
      : await this.repository.crearAsync({ id_club: club.idclub, id_entrenador: entrenador.identrenador, origen })
  }

  /** Un entrenador solicita unirse a un club. */
  async solicitar(usuario, { id_club }) {
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    if (!id_club) throw { status: 400, message: 'El club es obligatorio.' }

    const club = await this.repository.getClubPorIdAsync(Number(id_club))
    if (!club) throw { status: 404, message: 'No se encontró el club.' }
    if (String(club.estado || 'PENDIENTE').toUpperCase() !== 'APROBADO') {
      throw { status: 403, message: 'Este club todavía no está habilitado para recibir solicitudes.' }
    }

    const solicitud = await this.#crear({ club, entrenador, origen: 'ENTRENADOR' })

    await this.notificaciones.notificar({
      id_usuario: club.idusuario,
      titulo: 'Nueva solicitud de entrenador',
      mensaje: `${nombreEntrenador(entrenador)} quiere unirse a tu club.`,
      tipo: 'SISTEMA',
      enlace: `/perfil/${club.idusuario}`
    })
    return solicitud
  }

  /** Un club invita a un entrenador. */
  async invitar(usuario, { id_entrenador }) {
    const club = await this.#clubDelUsuario(usuario)
    if (!id_entrenador) throw { status: 400, message: 'El entrenador es obligatorio.' }

    const entrenador = await this.repository.getEntrenadorPorIdAsync(Number(id_entrenador))
    if (!entrenador) throw { status: 404, message: 'No se encontró el entrenador.' }

    const solicitud = await this.#crear({ club, entrenador, origen: 'CLUB' })

    await this.notificaciones.notificar({
      id_usuario: entrenador.idusuario,
      titulo: 'Invitación de un club',
      mensaje: `${club.nombre} te invitó a formar parte de su club.`,
      tipo: 'SISTEMA',
      enlace: `/perfil/${club.idusuario}`
    })
    return solicitud
  }

  // ── Respuesta / baja ────────────────────────────────────────────────────────

  /** Acepta o rechaza una solicitud. Solo puede responder quien la recibió. */
  async responder(usuario, id, estado) {
    const nuevoEstado = String(estado || '').toUpperCase()
    if (!['ACEPTADO', 'RECHAZADO'].includes(nuevoEstado)) {
      throw { status: 400, message: 'El estado debe ser ACEPTADO o RECHAZADO.' }
    }

    const solicitud = await this.repository.getByIdAsync(Number(id))
    if (!solicitud) throw { status: 404, message: 'No se encontró la solicitud.' }
    if (solicitud.estado !== 'PENDIENTE') throw { status: 409, message: 'Esta solicitud ya fue respondida.' }

    const receptor = solicitud.origen === 'ENTRENADOR' ? solicitud.clubes : solicitud.entrenadores
    if (Number(receptor?.idusuario) !== Number(usuario.idusuario)) {
      throw { status: 403, message: 'No podés responder esta solicitud.' }
    }

    if (nuevoEstado === 'ACEPTADO') {
      const aceptada = await this.repository.getAceptadaDeEntrenadorAsync(solicitud.id_entrenador)
      if (aceptada) throw { status: 409, message: 'El entrenador ya pertenece a un club.' }
    }

    const actualizada = await this.repository.actualizarEstadoAsync(solicitud.id, nuevoEstado)
    if (nuevoEstado === 'ACEPTADO') {
      await this.repository.setTieneClubAsync(solicitud.id_entrenador, true)
    }

    // Aviso al emisor de la solicitud
    const emisor = solicitud.origen === 'ENTRENADOR' ? solicitud.entrenadores : solicitud.clubes
    const quienResponde = solicitud.origen === 'ENTRENADOR' ? solicitud.clubes?.nombre : nombreEntrenador(solicitud.entrenadores)
    const aceptado = nuevoEstado === 'ACEPTADO'
    await this.notificaciones.notificar({
      id_usuario: emisor?.idusuario,
      titulo: aceptado ? 'Vinculación aceptada' : 'Vinculación rechazada',
      mensaje: solicitud.origen === 'ENTRENADOR'
        ? `${quienResponde} ${aceptado ? 'aceptó tu solicitud. Ya sos parte del club.' : 'rechazó tu solicitud.'}`
        : `${quienResponde} ${aceptado ? 'aceptó tu invitación y ya forma parte de tu club.' : 'rechazó tu invitación.'}`,
      tipo: 'SISTEMA',
      enlace: `/perfil/${solicitud.clubes?.idusuario}`
    })

    return actualizada
  }

  /**
   * Cancela una solicitud pendiente (quien la envió) o elimina una vinculación activa
   * (cualquiera de las dos partes). Un administrador también puede hacerlo.
   */
  async desvincular(usuario, id) {
    const solicitud = await this.repository.getByIdAsync(Number(id))
    if (!solicitud) throw { status: 404, message: 'No se encontró la vinculación.' }

    const esClub = Number(solicitud.clubes?.idusuario) === Number(usuario.idusuario)
    const esEntrenador = Number(solicitud.entrenadores?.idusuario) === Number(usuario.idusuario)
    if (!esClub && !esEntrenador && usuario.es_admin !== true) {
      throw { status: 403, message: 'No tenés permiso sobre esta vinculación.' }
    }

    if (solicitud.estado === 'PENDIENTE') {
      const emisorEsClub = solicitud.origen === 'CLUB'
      if (usuario.es_admin !== true && (emisorEsClub ? !esClub : !esEntrenador)) {
        throw { status: 403, message: 'Solo quien envió la solicitud puede cancelarla. Podés rechazarla.' }
      }
    }

    await this.repository.eliminarAsync(solicitud.id)

    if (solicitud.estado === 'ACEPTADO') {
      await this.repository.setTieneClubAsync(solicitud.id_entrenador, false)
      const avisarA = esClub ? solicitud.entrenadores : solicitud.clubes
      await this.notificaciones.notificar({
        id_usuario: avisarA?.idusuario,
        titulo: 'Vinculación finalizada',
        mensaje: esClub
          ? `${solicitud.clubes?.nombre} finalizó la vinculación con vos.`
          : `${nombreEntrenador(solicitud.entrenadores)} se desvinculó de tu club.`,
        tipo: 'SISTEMA',
        enlace: `/perfil/${solicitud.clubes?.idusuario}`
      })
    }
    return { message: solicitud.estado === 'PENDIENTE' ? 'Solicitud cancelada.' : 'Vinculación finalizada.' }
  }

  // ── Consultas ───────────────────────────────────────────────────────────────

  /** Solicitudes pendientes del usuario logueado: { recibidas, enviadas }. */
  async pendientes(usuario) {
    if (String(usuario.tipousuario).toLowerCase() === 'club') {
      const club = await this.#clubDelUsuario(usuario)
      return {
        recibidas: await this.repository.listarPendientesDeClubAsync(club.idclub, 'ENTRENADOR'),
        enviadas: await this.repository.listarPendientesDeClubAsync(club.idclub, 'CLUB')
      }
    }
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    return {
      recibidas: await this.repository.listarPendientesDeEntrenadorAsync(entrenador.identrenador, 'CLUB'),
      enviadas: await this.repository.listarPendientesDeEntrenadorAsync(entrenador.identrenador, 'ENTRENADOR')
    }
  }

  /** Estado de la relación del entrenador logueado con un club: { estado, id, origen } */
  async estadoConClub(usuario, id_club) {
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    const previa = await this.repository.getPorParAsync(Number(id_club), entrenador.identrenador)
    const otroClub = await this.repository.getAceptadaDeEntrenadorAsync(entrenador.identrenador)
    return {
      estado: previa && previa.estado !== 'RECHAZADO' ? previa.estado : null,
      id: previa && previa.estado !== 'RECHAZADO' ? previa.id : null,
      origen: previa?.origen ?? null,
      // true si ya pertenece a un club distinto al consultado
      tieneOtroClub: !!otroClub && Number(otroClub.id_club) !== Number(id_club)
    }
  }

  /** Club al que pertenece el entrenador logueado (o null). */
  async obtenerClubDelEntrenador(usuario) {
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    const v = await this.repository.getAceptadaDeEntrenadorAsync(entrenador.identrenador)
    return v ? { idvinculacion: v.id, ...v.clubes } : null
  }

  /** Entrenadores vinculados del club logueado. */
  async misEntrenadores(usuario) {
    const club = await this.#clubDelUsuario(usuario)
    return await this.repository.listarEntrenadoresDelClubAsync(club.idclub)
  }

  /** Entrenadores vinculados de un club cualquiera (lectura pública). */
  async obtenerEntrenadoresDelClub(id_club) {
    return await this.repository.listarEntrenadoresDelClubAsync(Number(id_club))
  }
}

export default VinculacionesService
