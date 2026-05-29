import JugadoresRepository from '../repositories/jugadores-repository.js'

class JugadoresService {

  constructor() {
    this.repository = new JugadoresRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const jugador = await this.repository.getByIdAsync(id)

    if (!jugador) throw { status: 404, message: `No se encontró el jugador con id ${id}` }

    return jugador
  }

}

export default JugadoresService
