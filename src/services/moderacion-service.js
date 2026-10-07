import moderacionRepository from '../repositories/moderacion-repository.js'
import EmpleoRepository from '../repositories/empleo-repository.js'
import UsuariosRepository from '../repositories/usuarios-repository.js'
import eventos from './notificaciones-eventos-service.js'

const usuariosRepository = new UsuariosRepository()
const esAdmin = (usuario) => usuario?.es_admin === true

class ModeracionService {

  async eliminarPrueba(id, usuario) {
    const duenio = await moderacionRepository.getDuenioPruebaAsync(id)
    if (duenio === undefined) throw { status: 404, message: 'Prueba no encontrada' }
    if (!esAdmin(usuario) && Number(duenio) !== Number(usuario.idusuario)) {
      throw { status: 403, message: 'No tienes permiso para eliminar esta prueba' }
    }
    await moderacionRepository.eliminarPruebaAsync(id)
  }

  async eliminarEmpleo(id, usuario) {
    const duenio = await new EmpleoRepository().getIdUsuarioDuenioAsync(id)
    if (duenio === undefined) throw { status: 404, message: 'Empleo no encontrado' }
    if (!esAdmin(usuario) && Number(duenio) !== Number(usuario.idusuario)) {
      throw { status: 403, message: 'No tienes permiso para eliminar esta vacante' }
    }
    const aviso = await moderacionRepository.getDatosAvisoEmpleoAsync(id)
    await moderacionRepository.eliminarEmpleoAsync(id)
    // Recién con la vacante eliminada se avisa a los entrenadores postulados
    eventos.vacanteEliminada(aviso)
  }

  async eliminarEntrenamiento(id, usuario) {
    const duenio = await moderacionRepository.getDuenioEntrenamientoAsync(id)
    if (duenio === undefined) throw { status: 404, message: 'Entrenamiento no encontrado' }
    if (!esAdmin(usuario) && Number(duenio) !== Number(usuario.idusuario)) {
      throw { status: 403, message: 'No tienes permiso para eliminar este entrenamiento' }
    }
    await moderacionRepository.eliminarEntrenamientoAsync(id)
  }

  async eliminarUsuario(id, usuario) {
    if (!esAdmin(usuario)) throw { status: 403, message: 'Acceso denegado. Se requieren permisos de administrador.' }
    if (Number(id) === Number(usuario.idusuario)) {
      throw { status: 400, message: 'No puedes eliminar tu propia cuenta de administrador' }
    }
    let objetivo
    try { objetivo = await usuariosRepository.getByIdAsync(id) } catch { objetivo = null }
    if (!objetivo) throw { status: 404, message: 'Usuario no encontrado' }
    if (objetivo.es_admin === true) throw { status: 403, message: 'No se puede eliminar a otro administrador' }
    await moderacionRepository.eliminarUsuarioAsync(Number(id), objetivo.tipousuario)
  }
}

export default new ModeracionService()
