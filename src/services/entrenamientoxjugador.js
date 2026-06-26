import EntrenamientosRepository from '../repositories/entrenamientos-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'


class EntrenamientoXJugador {
  constructor() {
    this.repository = new EntrenamientosRepository()
    this.jugadoresRepository = new JugadoresRepository()
  }

  async getAllDeporteAsync(idJugador) {
    const jugador = await this.jugadoresRepository.getByIdAsync(idJugador)
    if (!jugador) throw { status: 404, message: 'Jugador no encontrado' }
    return await this.repository.getAllDeporteAsync(jugador)
  }
}

  export default EntrenamientoXJugador