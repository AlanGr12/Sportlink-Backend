import InscripcionesPruebaRepository from '../repositories/inscripcionesprueba-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'
import PruebasRepository from '../repositories/pruebas-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'
import chatRepository from '../repositories/chat-repository.js'

class InscripcionesPruebaService {
  constructor() {
    this.repository = new InscripcionesPruebaRepository()
    this.jugadoresRepo = new JugadoresRepository()
    this.pruebasRepo = new PruebasRepository()
    this.calendarioService = new CalendarioEventosService()
  }

  async getAllAsync(idprueba = null) {
    return await this.repository.getAllAsync(idprueba)
  }

  async getByIdAsync(id) {
    const ins = await this.repository.getByIdAsync(id)
    if (!ins) throw { status: 404, message: `No se encontró la inscripción con id ${id}` }
    return ins
  }

  async crearInscripcion(data, idusuario) {
    const { idjugador, idprueba } = data || {}

    if (!idjugador) throw { status: 400, message: 'El id del jugador es obligatorio' }
    if (!idprueba) throw { status: 400, message: 'El id de la prueba es obligatorio' }

    const existe = await this.repository.isInscrito(idjugador, idprueba)
    if (existe) throw { status: 400, message: 'El jugador ya está inscripto en esta prueba' }

    const ins = await this.repository.crearInscripcion(idjugador, idprueba)

    // Intentar crear evento en calendario (no romper la inscripción si falla)
    try {
      const jugador = await this.jugadoresRepo.getByIdAsync(idjugador)
      const prueba = await this.pruebasRepo.getByIdAsync(idprueba)
      if (jugador && prueba) {
        await this.calendarioService.crearEvento({
          idusuario: jugador.idusuario,
          tipo: 'PRUEBA',
          fecha: prueba.fechaprueba,
          horainicio: prueba.horainicio,
          horafin: prueba.horafin,
          idprueba: idprueba,
          identrenamiento: null,
          idinscripcionempleo: null
        })
      }
    } catch (evtErr) {
      console.error('Error creando evento de calendario para inscripción a prueba:', evtErr.message || evtErr)
    }

    // Agregar al jugador al grupo de chat de la prueba (o crearlo si no existe — auto-reparación)
    try {
      const idusuarioJugador = idusuario ? Number(idusuario) : null
      if (idusuarioJugador) {
        let idconv = await chatRepository.buscarConversacionPorEvento({ idprueba: Number(idprueba) })

        if (idconv) {
          // El grupo existe: agregar al jugador como participante (upsert, no duplica)
          await chatRepository.agregarParticipante(idconv, idusuarioJugador)
        } else {
          // Fallback: el grupo no fue creado cuando se creó la prueba → auto-reparar
          console.warn(`[inscripcionesprueba-service] Grupo de chat no encontrado para idprueba=${idprueba}. Creando ahora...`)
          
          let nombreCreador = 'Club'
          const pruebaInfo = await this.pruebasRepo.getByIdAsync(Number(idprueba))
          if (pruebaInfo) {
            const club = await this.jugadoresRepo.supabase
              .from('clubes')
              .select('nombre')
              .eq('idclub', pruebaInfo.idclub)
              .single()
              .then(res => res.data)
            if (club && club.nombre) {
               nombreCreador = club.nombre
            }
          }

          const idusuarioCreador = await chatRepository.buscarCreadorEvento({ idprueba: Number(idprueba) })
          const participantes = idusuarioCreador
            ? [...new Set([Number(idusuarioCreador), idusuarioJugador])]
            : [idusuarioJugador]
          await chatRepository.crearConversacionRPC(
            'GRUPAL',
            `${nombreCreador} - Prueba`,
            null,
            Number(idprueba), null, null,
            participantes,
            idusuarioCreador ? Number(idusuarioCreador) : null
          )
        }
      }
    } catch (errChat) {
      console.error('[inscripcionesprueba-service] Error en chat al inscribirse a prueba:', errChat.message)
    }

    return ins
  }
}

export default InscripcionesPruebaService
