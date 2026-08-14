import InscripcionesEntrenamientosRepository from '../repositories/inscripcionesentrenamientos-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'
import EntrenamientosRepository from '../repositories/entrenamientos-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'
import supabase from '../configs/supabase-config.js'
import chatRepository from '../repositories/chat-repository.js'

class InscripcionesEntrenamientosService {
  constructor() {
    this.repository = new InscripcionesEntrenamientosRepository()
    this.jugadoresRepo = new JugadoresRepository()
    this.calendarioService = new CalendarioEventosService()
  }

  async getAllAsync(identrenamiento = null) {
    return await this.repository.getAllAsync(identrenamiento)
  }

  async getByIdAsync(id) {
    const ins = await this.repository.getByIdAsync(id)
    if (!ins) throw { status: 404, message: `No se encontró la inscripción con id ${id}` }
    return ins
  }

  async crearInscripcion(data, idusuario) {
    const { identrenamiento, identrenamientos, idjugador, idjugadorinscripto } = data || {}

    // Aceptar ambos nombres de campo para conveniencia (identrenamiento o identrenamientos)
    const entrenamientoId = identrenamiento || identrenamientos
    const jugadorId = idjugador || idjugadorinscripto

    if (!entrenamientoId) throw { status: 400, message: 'El id del entrenamiento es obligatorio' }
    if (!jugadorId) throw { status: 400, message: 'El id del jugador es obligatorio' }

    const existe = await this.repository.isInscrito(entrenamientoId, jugadorId)
    if (existe) throw { status: 400, message: 'El jugador ya está inscripto en este entrenamiento' }

    const ins = await this.repository.crearInscripcion(entrenamientoId, jugadorId)

    // Intentar crear evento en calendario para el entrenamiento
    try {
      const jugador = await this.jugadoresRepo.getByIdAsync(jugadorId)
      const entrenamientosRepo = new EntrenamientosRepository()
      const entrenamiento = await entrenamientosRepo.getByIdAsync(identrenamiento)
      if (jugador) {
        // obtener horario principal para el entrenamiento (si existe)
        const { data: horarios, error: horarioErr } = await supabase
          .from('horarioentrenamiento')
          .select('*')
          .eq('identrenamiento', identrenamiento)
          .limit(1)

        if (horarioErr) throw horarioErr

        const horario = Array.isArray(horarios) && horarios.length > 0 ? horarios[0] : null

        await this.calendarioService.crearEvento({
          idusuario: jugador.idusuario,
          tipo: 'ENTRENAMIENTO',
          fecha: entrenamiento ? entrenamiento.fechaentr : null,
          horainicio: horario ? horario.horainicio : null,
          horafin: horario ? horario.horafin : null,
          idprueba: null,
          identrenamiento: entrenamientoId,
          idinscripcionempleo: null
        })
      }
    } catch (evtErr) {
      console.error('Error creando evento de calendario para inscripción a entrenamiento:', evtErr.message || evtErr)
    }

    // Agregar al jugador al grupo de chat del entrenamiento (o crearlo — auto-reparación)
    try {
      const idusuarioJugador = idusuario ? Number(idusuario) : null
      if (idusuarioJugador) {
        console.log(`[DEBUG CHAT] Valor de entrenamientoId original: ${entrenamientoId} (tipo: ${typeof entrenamientoId})`)
        console.log(`[DEBUG CHAT] Llamando a buscarConversacionPorEvento con: { identrenamiento: ${Number(entrenamientoId)} }`)
        
        let idconv = await chatRepository.buscarConversacionPorEvento({ identrenamiento: Number(entrenamientoId) })
        console.log(`[DEBUG CHAT] Resultado idconv: ${idconv}`)

        if (idconv) {
          await chatRepository.agregarParticipante(idconv, idusuarioJugador)
        } else {
          console.warn(`[inscripcionesentrenamientos-service] ADVERTENCIA: Grupo de chat no encontrado para identrenamiento=${entrenamientoId}. Creando ahora (auto-reparación)...`)
          
          let nombreCreador = 'Entrenador'
          const entrenamientosRepo = new EntrenamientosRepository()
          const entrenamientoInfo = await entrenamientosRepo.getByIdAsync(Number(entrenamientoId))
          if (entrenamientoInfo) {
            const entrenador = await supabase
              .from('entrenadores')
              .select('nombre, apellido')
              .eq('identrenador', entrenamientoInfo.identrenador)
              .single()
              .then(res => res.data)
            if (entrenador) {
               nombreCreador = `${entrenador.nombre} ${entrenador.apellido}`.trim()
            }
          }

          const idusuarioCreador = await chatRepository.buscarCreadorEvento({ identrenamiento: Number(entrenamientoId) })
          const participantes = idusuarioCreador
            ? [...new Set([Number(idusuarioCreador), idusuarioJugador])]
            : [idusuarioJugador]
          await chatRepository.crearConversacionRPC(
            'GRUPAL',
            `${nombreCreador} - Entrenamiento`,
            null,
            null, Number(entrenamientoId), null,
            participantes,
            idusuarioCreador ? Number(idusuarioCreador) : null
          )
        }
      }
    } catch (errChat) {
      console.error('[inscripcionesentrenamientos-service] Error en chat al inscribirse a entrenamiento:', errChat.message)
    }

    return ins
  }

  async borrarInscripcion(identrenamiento, idusuario) {
    if (!identrenamiento) throw { status: 400, message: 'El id del entrenamiento es obligatorio' }

    const { data: jugadorData, error: errJugador } = await supabase
      .from('jugadores')
      .select('idjugador')
      .eq('idusuario', idusuario)
      .single()

    if (errJugador || !jugadorData) {
      throw { status: 404, message: 'Jugador no encontrado para este usuario' }
    }

    const idjugador = jugadorData.idjugador

    const existe = await this.repository.isInscrito(identrenamiento, idjugador)
    if (!existe) throw { status: 400, message: 'El jugador no está inscripto en este entrenamiento' }

    await this.repository.borrarInscripcion(identrenamiento, idjugador)

    // Borrar evento de calendario
    try {
      await supabase
        .from('calendarioeventos')
        .delete()
        .eq('idusuario', idusuario)
        .eq('tipo', 'ENTRENAMIENTO')
        .eq('identrenamiento', identrenamiento)
    } catch (evtErr) {
      console.error('Error eliminando evento de calendario:', evtErr.message || evtErr)
    }

    // Remover al jugador del grupo de chat
    try {
      const idconv = await chatRepository.buscarConversacionPorEvento({ identrenamiento: Number(identrenamiento) })
      if (idconv) {
         await supabase
           .from('participantes_conversacion')
           .delete()
           .eq('idconversacion', idconv)
           .eq('idusuario', idusuario)
      }
    } catch (errChat) {
      console.error('Error eliminando de chat:', errChat.message)
    }

    return { message: 'Inscripción eliminada exitosamente' }
  }
}

export default InscripcionesEntrenamientosService
