import supabase from '../configs/supabase-config.js'
import ListaEsperaRepository from '../repositories/lista-espera-repository.js'
import PruebasRepository from '../repositories/pruebas-repository.js'
import EntrenamientosRepository from '../repositories/entrenamientos-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'
import chatRepository from '../repositories/chat-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'
import NotificacionesService from './notificaciones-service.js'

class ListaEsperaService {
  /** @param {'prueba'|'entrenamiento'} tipo */
  constructor(tipo) {
    this.tipo = tipo
    this.repository = new ListaEsperaRepository(tipo)
    this.actividadRepo = tipo === 'prueba' ? new PruebasRepository() : new EntrenamientosRepository()
    this.jugadoresRepo = new JugadoresRepository()
    this.calendarioService = new CalendarioEventosService()
    this.notificaciones = new NotificacionesService()
  }

  async #resolverJugador(idusuario) {
    const { data, error } = await supabase
      .from('jugadores')
      .select('idjugador')
      .eq('idusuario', idusuario)
      .single()

    if (error || !data) throw { status: 404, message: 'Jugador no encontrado para este usuario' }
    return data.idjugador
  }

  async #getActividad(idActividad) {
    let actividad = null
    try {
      actividad = await this.actividadRepo.getByIdAsync(idActividad)
    } catch {
      actividad = null
    }
    if (!actividad) throw { status: 404, message: `No se encontró ${this.tipo === 'prueba' ? 'la prueba' : 'el entrenamiento'}` }
    return actividad
  }

  #capacidad(actividad) {
    return Number(this.tipo === 'prueba' ? actividad.cupo : actividad.cantidad) || 0
  }

  async anotarse(idActividad, idusuario) {
    idActividad = Number(idActividad)
    const idJugador = await this.#resolverJugador(idusuario)
    const actividad = await this.#getActividad(idActividad)

    const capacidad = this.#capacidad(actividad)
    const inscriptos = await this.repository.contarInscriptos(idActividad)
    if (capacidad <= 0 || inscriptos < capacidad) {
      throw { status: 400, message: 'Todavía hay cupos disponibles, podés inscribirte directamente' }
    }

    if (await this.repository.estaInscripto(idActividad, idJugador)) {
      throw { status: 400, message: `Ya estás inscripto en ${this.tipo === 'prueba' ? 'esta prueba' : 'este entrenamiento'}` }
    }
    if (await this.repository.estaEnLista(idActividad, idJugador)) {
      throw { status: 400, message: 'Ya estás en la lista de espera' }
    }

    await this.repository.anotarseEnListaEspera(idActividad, idJugador)
    return this.#estado(idActividad, idJugador)
  }

  async salir(idActividad, idusuario) {
    idActividad = Number(idActividad)
    const idJugador = await this.#resolverJugador(idusuario)

    if (!(await this.repository.estaEnLista(idActividad, idJugador))) {
      throw { status: 400, message: 'No estás en la lista de espera' }
    }
    await this.repository.salirDeListaEspera(idActividad, idJugador)
    return { enLista: false, posicion: null, total: await this.repository.contarLista(idActividad) }
  }

  async obtenerPosicion(idActividad, idusuario) {
    idActividad = Number(idActividad)
    const idJugador = await this.#resolverJugador(idusuario)
    return this.#estado(idActividad, idJugador)
  }

  async #estado(idActividad, idJugador) {
    const posicion = await this.repository.obtenerPosicionEnLista(idActividad, idJugador)
    return {
      enLista: posicion !== null,
      posicion,
      total: await this.repository.contarLista(idActividad)
    }
  }

  /**
   * Llamar después de liberar un lugar confirmado. Si hay cupo y alguien esperando,
   * lo promueve. Nunca lanza: un fallo acá no debe romper la cancelación original.
   */
  async promoverSiguiente(idActividad) {
    try {
      idActividad = Number(idActividad)
      const actividad = await this.#getActividad(idActividad)
      const capacidad = this.#capacidad(actividad)
      if (capacidad > 0 && (await this.repository.contarInscriptos(idActividad)) >= capacidad) return null

      const idJugadorPromovido = await this.repository.promoverSiguiente(idActividad)
      if (!idJugadorPromovido) return null

      await this.#efectosPromocion(idActividad, idJugadorPromovido, actividad)
      console.log(`[lista-espera] Jugador ${idJugadorPromovido} promovido en ${this.tipo} ${idActividad}`)
      return idJugadorPromovido
    } catch (err) {
      console.error(`[lista-espera] Error promoviendo siguiente en ${this.tipo}:`, err.message || err)
      return null
    }
  }

  // Evento de calendario y grupo de chat del jugador promovido (mejor esfuerzo)
  async #efectosPromocion(idActividad, idJugador, actividad) {
    const esPrueba = this.tipo === 'prueba'
    try {
      const jugador = await this.jugadoresRepo.getByIdAsync(idJugador)
      if (!jugador) return

      const nombreActividad = esPrueba
        ? `la prueba de ${actividad.club?.nombre || 'un club'}${actividad.categoria ? ` (${actividad.categoria})` : ''}`
        : `el entrenamiento ${actividad.titulo || ''}`.trim()
      await this.notificaciones.notificarPromocionListaEspera({
        id_usuario: jugador.idusuario,
        nombreActividad,
        tipoActividad: this.tipo,
        idActividad
      })

      await this.calendarioService.crearEvento({
        idusuario: jugador.idusuario,
        tipo: esPrueba ? 'PRUEBA' : 'ENTRENAMIENTO',
        fecha: esPrueba ? actividad.fechaprueba : actividad.fechaentr,
        horainicio: actividad.horainicio,
        horafin: actividad.horafin,
        idprueba: esPrueba ? idActividad : null,
        identrenamiento: esPrueba ? null : idActividad,
        idinscripcionempleo: null
      })

      const idconv = await chatRepository.buscarConversacionPorEvento(
        esPrueba ? { idprueba: idActividad } : { identrenamiento: idActividad }
      )
      if (idconv) await chatRepository.agregarParticipante(idconv, Number(jugador.idusuario))
    } catch (err) {
      console.error('[lista-espera] Error en efectos de promoción:', err.message || err)
    }
  }
}

export default ListaEsperaService
