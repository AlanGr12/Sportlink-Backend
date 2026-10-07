import InscripcionesEmpleoRepository from '../repositories/inscripcionesempleo-repository.js'
import supabase from '../configs/supabase-config.js'
import chatRepository from '../repositories/chat-repository.js'
import EmpleoRepository from '../repositories/empleo-repository.js'
import NotificacionesService from './notificaciones-service.js'
import eventos from './notificaciones-eventos-service.js'

class InscripcionesEmpleoService {
  constructor() {
    this.repository = new InscripcionesEmpleoRepository()
    this.notificaciones = new NotificacionesService()
    this.empleoRepository = new EmpleoRepository()
  }

  // Solo el club dueño de la vacante (o un admin) gestiona sus postulaciones
  async #verificarClubDuenio(idinscripcion, usuario) {
    const ins = await this.getByIdAsync(idinscripcion)
    const duenio = await this.empleoRepository.getIdUsuarioDuenioAsync(ins.idempleo)
    if (usuario?.es_admin !== true && Number(duenio) !== Number(usuario?.idusuario)) {
      throw { status: 403, message: 'No tienes permiso para gestionar esta postulación' }
    }
    return ins
  }

  // ¿Puede este usuario ver la postulación? Admin: todas. Club: las de sus vacantes.
  // Entrenador: las propias. Cualquier otro rol: ninguna.
  #puedeVer(ins, usuario) {
    if (usuario?.es_admin === true) return true
    const tipo = String(usuario?.tipousuario || '').toLowerCase()
    const idusuario = Number(usuario?.idusuario)
    if (tipo === 'club') return Number(ins.empleo?.clubes?.idusuario) === idusuario
    if (tipo === 'entrenador') return Number(ins.entrenador?.idusuario) === idusuario
    return false
  }

  async getAllAsync(idempleo = null, usuario = null) {
    const lista = await this.repository.getAllAsync(idempleo)
    return usuario ? lista.filter(ins => this.#puedeVer(ins, usuario)) : lista
  }

  async getByIdAsync(id, usuario = null) {
    const ins = await this.repository.getByIdAsync(id)
    if (!ins) throw { status: 404, message: `No se encontró la inscripción con id ${id}` }
    if (usuario && !this.#puedeVer(ins, usuario)) {
      throw { status: 403, message: 'No tienes permiso para ver esta postulación' }
    }
    return ins
  }

  async postularse(data, archivo, idusuario) {
    const { identrenador, idempleo } = data || {}

    if (!identrenador) throw { status: 400, message: 'El id del entrenador es obligatorio' }
    if (!idempleo) throw { status: 400, message: 'El id del empleo es obligatorio' }

    const existe = await this.repository.isInscrito(identrenador, idempleo)
    if (existe) throw { status: 400, message: 'El entrenador ya está postulado a este empleo' }

    let cvUrl = null
    if (archivo) {
      cvUrl = await this.repository.subirCvAsync(archivo)
      
      // Actualizar la columna 'cv' en la tabla de entrenadores
      const { error: updateError } = await supabase
        .from('entrenadores')
        .update({ cv: cvUrl })
        .eq('identrenador', identrenador)

      if (updateError) {
        console.error('Error al actualizar el CV del entrenador:', updateError.message)
        // No bloqueamos la postulación si falló actualizar el perfil, pero lanzamos error de storage si fue crítico
      }
    }

    const ins = await this.repository.crearInscripcion(identrenador, idempleo)

    // Avisar al club de la nueva postulación (no bloquea)
    eventos.postulacionEmpleo(idempleo, identrenador)

    // Agregar al entrenador al grupo de chat del empleo (o crearlo — auto-reparación)
    try {
      const idusuarioEntrenador = idusuario ? Number(idusuario) : null
      if (idusuarioEntrenador) {
        let idconv = await chatRepository.buscarConversacionPorEvento({ idempleo: Number(idempleo) })

        if (idconv) {
          await chatRepository.agregarParticipante(idconv, idusuarioEntrenador)
        } else {
          console.warn(`[inscripcionesempleo-service] Grupo de chat no encontrado para idempleo=${idempleo}. Creando ahora...`)
          
          let nombreCreador = 'Club'
          const empleoInfo = await this.repository.getByIdAsync(Number(idempleo))
          if (empleoInfo) {
            const club = await supabase
              .from('clubes')
              .select('nombre')
              .eq('idclub', empleoInfo.idclub)
              .single()
              .then(res => res.data)
            if (club && club.nombre) {
               nombreCreador = club.nombre
            }
          }

          const nombreEmpleo = empleoInfo?.nombre || 'Empleo'
          const idusuarioCreador = await chatRepository.buscarCreadorEvento({ idempleo: Number(idempleo) })
          const participantes = idusuarioCreador
            ? [...new Set([Number(idusuarioCreador), idusuarioEntrenador])]
            : [idusuarioEntrenador]
          await chatRepository.crearConversacionRPC(
            'GRUPAL',
            `${nombreCreador} - Empleo: ${nombreEmpleo}`,
            null,
            null, null, Number(idempleo),
            participantes,
            idusuarioCreador ? Number(idusuarioCreador) : null
          )
        }
      }
    } catch (errChat) {
      console.error('[inscripcionesempleo-service] Error en chat al postularse a empleo:', errChat.message)
    }

    return ins
  }

  async actualizarEstado(id, estado, usuario) {
    await this.#verificarClubDuenio(id, usuario)
    if (estado === undefined || estado === null) {
      throw { status: 400, message: 'El estado es obligatorio' }
    }
    
    let estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'
    return await this.repository.actualizarEstado(id, estadoBool)
  }

  async preseleccionar(id, valor, usuario) {
    await this.#verificarClubDuenio(id, usuario)
    return await this.repository.actualizarPreseleccion(id, valor === true || String(valor).toLowerCase() === 'true')
  }

  async marcarContratado(id, usuario) {
    const ins = await this.#verificarClubDuenio(id, usuario)
    const resultado = await this.repository.marcarContratado(id)

    if (ins?.entrenador?.idusuario) {
      await this.notificaciones.notificarContratacion({
        id_usuario: ins.entrenador.idusuario,
        empleo: ins.empleo?.nombre || 'un empleo',
        club: ins.empleo?.clubes?.nombre || 'Un club'
      })
    }
    return resultado
  }
}

export default InscripcionesEmpleoService
