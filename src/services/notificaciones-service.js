import NotificacionesRepository from '../repositories/notificaciones-repository.js'

export const TIPOS_NOTIFICACION = ['LISTA_ESPERA', 'PRUEBA', 'ENTRENAMIENTO', 'EMPLEO', 'CHAT', 'SISTEMA', 'LIKE', 'COMENTARIO', 'SEGUIDOR', 'RECORDATORIO']

class NotificacionesService {
  constructor() {
    this.repository = new NotificacionesRepository()
  }

  async obtenerPorUsuario(idusuario) {
    return await this.repository.obtenerPorUsuario(idusuario)
  }

  async obtenerContadorNoLeidas(idusuario) {
    return { count: await this.repository.obtenerContadorNoLeidas(idusuario) }
  }

  async marcarComoLeida(idNotificacion, idusuario) {
    const id = Number(idNotificacion)
    if (!Number.isInteger(id) || id <= 0) throw { status: 400, message: 'Id de notificación inválido' }

    const notif = await this.repository.marcarComoLeida(id, idusuario)
    if (!notif) throw { status: 404, message: 'Notificación no encontrada' }
    return notif
  }

  async marcarTodasComoLeidas(idusuario) {
    await this.repository.marcarTodasComoLeidas(idusuario)
    return { message: 'Notificaciones marcadas como leídas' }
  }

  /**
   * Helper reutilizable para disparar notificaciones desde otros servicios.
   * Nunca lanza: una notificación fallida no debe romper la operación que la originó.
   */
  async notificar({ id_usuario, titulo, mensaje, tipo = 'SISTEMA', enlace = null }) {
    try {
      if (!id_usuario || !titulo || !mensaje) return null
      const tipoValido = TIPOS_NOTIFICACION.includes(tipo) ? tipo : 'SISTEMA'
      return await this.repository.crearNotificacion({ id_usuario, titulo, mensaje, tipo: tipoValido, enlace })
    } catch (err) {
      console.error('[notificaciones] Error creando notificación:', err.message || err)
      return null
    }
  }

  notificarPromocionListaEspera({ id_usuario, nombreActividad, tipoActividad, idActividad }) {
    const ruta = tipoActividad === 'prueba' ? 'pruebas' : 'entrenamientos'
    return this.notificar({
      id_usuario,
      titulo: '¡Cupo liberado!',
      mensaje: `Se liberó un cupo y has sido promovido e inscripto automáticamente a ${nombreActividad}.`,
      tipo: 'LISTA_ESPERA',
      enlace: `/${ruta}/${idActividad}`
    })
  }

  notificarEntrevistaProgramada({ id_usuario, empleo, club, fecha }) {
    return this.notificar({
      id_usuario,
      titulo: 'Entrevista programada',
      mensaje: `${club} programó una entrevista para ${empleo}${fecha ? ` el ${fecha}` : ''}.`,
      tipo: 'EMPLEO',
      enlace: '/calendario'
    })
  }

  notificarContratacion({ id_usuario, empleo, club }) {
    return this.notificar({
      id_usuario,
      titulo: '¡Fuiste contratado!',
      mensaje: `${club} te seleccionó para ${empleo}.`,
      tipo: 'EMPLEO',
      enlace: '/empleos'
    })
  }
}

export default NotificacionesService
