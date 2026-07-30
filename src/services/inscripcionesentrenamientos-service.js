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
    const { identrenamiento, idjugador, idjugadorinscripto } = data || {}

    // aceptar ambos nombres de campo para conveniencia
    const jugadorId = idjugador || idjugadorinscripto

    if (!identrenamiento) throw { status: 400, message: 'El id del entrenamiento es obligatorio' }
    if (!jugadorId) throw { status: 400, message: 'El id del jugador es obligatorio' }

    const existe = await this.repository.isInscrito(identrenamiento, jugadorId)
    if (existe) throw { status: 400, message: 'El jugador ya está inscripto en este entrenamiento' }

    const ins = await this.repository.crearInscripcion(identrenamiento, jugadorId)

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
          identrenamiento: identrenamiento,
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
        let idconv = await chatRepository.buscarConversacionPorEvento({ identrenamiento: Number(identrenamiento) })

        if (idconv) {
          await chatRepository.agregarParticipante(idconv, idusuarioJugador)
        } else {
          console.warn(`[inscripcionesentrenamientos-service] Grupo de chat no encontrado para identrenamiento=${identrenamiento}. Creando ahora...`)
          const idusuarioCreador = await chatRepository.buscarCreadorEvento({ identrenamiento: Number(identrenamiento) })
          const participantes = idusuarioCreador
            ? [...new Set([Number(idusuarioCreador), idusuarioJugador])]
            : [idusuarioJugador]
          await chatRepository.crearConversacionRPC(
            'GRUPAL',
            `Entrenamiento #${identrenamiento}`,
            null,
            null, Number(identrenamiento), null,
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
}

export default InscripcionesEntrenamientosService
