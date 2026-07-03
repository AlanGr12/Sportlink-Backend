import CalendarioEventosRepository from '../repositories/calendarioeventos-repository.js'

class CalendarioEventosService {
  constructor() {
    this.repository = new CalendarioEventosRepository()
  }

  async crearEvento(payload) {
    return await this.repository.crearEvento(payload)
  }

  async getByUsuario(idusuario) {
    return await this.repository.getByUsuario(idusuario)
  }
}

export default CalendarioEventosService
