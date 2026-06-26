import PruebasRepository from '../repositories/pruebas-repository.js'
import JugadoresRepository from '../repositories/jugadores-repository.js'


class PruebaXJugador {
  constructor() {
    this.repository = new PruebasRepository()
    this.jugadoresRepository = new JugadoresRepository()
  }

  async getAllDeporteAsync(idJugador) {
    const jugador = await this.jugadoresRepository.getByIdAsync(idJugador)
    if (!jugador) throw { status: 404, message: 'Jugador no encontrado' }
    return await this.repository.getAllDeporteAsync(jugador)
  }
}

  export default PruebaXJugador