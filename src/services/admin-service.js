import adminRepository from '../repositories/admin-repository.js'
import notificacionesService from './notificaciones-service.js'
import moderacionService from './moderacion-service.js'
import publicacionesService from './publicaciones-service.js'

class AdminService {

  async getKPIs() {
    return await adminRepository.getKPIsAsync()
  }

  async getClubesModeracion({ estado }) {
    return await adminRepository.getClubesModeracionAsync({ estado })
  }

  async actualizarEstadoClub(idclub, estado, adminUsuario) {
    if (!idclub) throw { status: 400, message: 'ID de club requerido' }
    const estadoNorm = String(estado || '').toUpperCase()

    if (!['APROBADO', 'RECHAZADO', 'PENDIENTE'].includes(estadoNorm)) {
      throw { status: 400, message: 'El estado debe ser APROBADO, RECHAZADO o PENDIENTE' }
    }

    const clubActualizado = await adminRepository.actualizarEstadoClubAsync(Number(idclub), estadoNorm)

    // Notificar al club en la plataforma
    if (clubActualizado?.idusuario) {
      const aprobado = estadoNorm === 'APROBADO'
      await notificacionesService.notificar({
        id_usuario: clubActualizado.idusuario,
        titulo: aprobado ? '¡Tu club ha sido aprobado!' : 'Resolución sobre tu cuenta de club',
        mensaje: aprobado
          ? `Felicitaciones, ${clubActualizado.nombre}. Tu cuenta de club ha sido verificada y aprobada por el equipo de SportLink. Ya podés publicar pruebas y empleos en la plataforma.`
          : `Tu solicitud para el club ${clubActualizado.nombre} no ha sido aprobada en esta oportunidad. Si creés que se trata de un error, por favor contactá a soporte.`,
        tipo: 'SISTEMA',
        enlace: '/perfil'
      })
    }

    return clubActualizado
  }

  async getUsuarios(params) {
    return await adminRepository.getUsuariosAsync(params)
  }

  async toggleAdminUsuario(idusuario, es_admin, adminActual) {
    const id = Number(idusuario)
    if (!id) throw { status: 400, message: 'ID de usuario requerido' }
    if (Number(adminActual?.idusuario) === id && !es_admin) {
      throw { status: 400, message: 'No podés revocar tus propios permisos de administrador.' }
    }
    return await adminRepository.toggleAdminUsuarioAsync(id, es_admin)
  }

  async eliminarUsuario(idusuario, adminActual) {
    return await moderacionService.eliminarUsuario(idusuario, adminActual)
  }

  async getPublicaciones(params) {
    return await adminRepository.getPublicacionesAsync(params)
  }

  async eliminarPublicacion(idpublicacion, adminActual) {
    const id = Number(idpublicacion)
    if (!id) throw { status: 400, message: 'ID de publicación requerido' }
    return await publicacionesService.eliminarPublicacion(id, adminActual.idusuario, true)
  }

  async getEventos(params) {
    return await adminRepository.getEventosAsync(params)
  }
}

export default new AdminService()
