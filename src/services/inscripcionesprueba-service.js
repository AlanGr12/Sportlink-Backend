import InscripcionesPruebaRepository from '../repositories/inscripcionesprueba-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'
import PruebasRepository from '../repositories/pruebas-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'

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

  async crearInscripcion(data) {
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

    return ins
  }
}

export default InscripcionesPruebaService
