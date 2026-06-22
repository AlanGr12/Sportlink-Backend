import InscripcionesPruebaRepository from '../repositories/inscripcionesprueba-repository.js'

class InscripcionesPruebaService {
  constructor() {
    this.repository = new InscripcionesPruebaRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
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
    return ins
  }
}

export default InscripcionesPruebaService
