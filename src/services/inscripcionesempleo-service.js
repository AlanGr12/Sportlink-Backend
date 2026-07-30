import InscripcionesEmpleoRepository from '../repositories/inscripcionesempleo-repository.js'
import supabase from '../configs/supabase-config.js'
import chatRepository from '../repositories/chat-repository.js'

class InscripcionesEmpleoService {
  constructor() {
    this.repository = new InscripcionesEmpleoRepository()
  }

  async getAllAsync(idempleo = null) {
    return await this.repository.getAllAsync(idempleo)
  }

  async getByIdAsync(id) {
    const ins = await this.repository.getByIdAsync(id)
    if (!ins) throw { status: 404, message: `No se encontró la inscripción con id ${id}` }
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

    // Agregar al entrenador al grupo de chat del empleo (o crearlo — auto-reparación)
    try {
      const idusuarioEntrenador = idusuario ? Number(idusuario) : null
      if (idusuarioEntrenador) {
        let idconv = await chatRepository.buscarConversacionPorEvento({ idempleo: Number(idempleo) })

        if (idconv) {
          await chatRepository.agregarParticipante(idconv, idusuarioEntrenador)
        } else {
          console.warn(`[inscripcionesempleo-service] Grupo de chat no encontrado para idempleo=${idempleo}. Creando ahora...`)
          const idusuarioCreador = await chatRepository.buscarCreadorEvento({ idempleo: Number(idempleo) })
          const participantes = idusuarioCreador
            ? [...new Set([Number(idusuarioCreador), idusuarioEntrenador])]
            : [idusuarioEntrenador]
          await chatRepository.crearConversacionRPC(
            'GRUPAL',
            `Empleo #${idempleo}`,
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

  async actualizarEstado(id, estado) {
    if (estado === undefined || estado === null) {
      throw { status: 400, message: 'El estado es obligatorio' }
    }
    
    let estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'
    return await this.repository.actualizarEstado(id, estadoBool)
  }

  async marcarContratado(id) {
    // Verificar que exista
    const ins = await this.getByIdAsync(id)
    return await this.repository.marcarContratado(id)
  }
}

export default InscripcionesEmpleoService
