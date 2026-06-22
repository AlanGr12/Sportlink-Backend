import InscripcionesEntrenamientosRepository from '../repositories/inscripcionesentrenamientos-repository.js'

class InscripcionesEntrenamientosService {
  constructor() {
    this.repository = new InscripcionesEntrenamientosRepository()
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
    const { identrenamiento, idjugador, idjugadorinscripto } = data || {}

    // aceptar ambos nombres de campo para conveniencia
    const jugadorId = idjugador || idjugadorinscripto

    if (!identrenamiento) throw { status: 400, message: 'El id del entrenamiento es obligatorio' }
    if (!jugadorId) throw { status: 400, message: 'El id del jugador es obligatorio' }

    const existe = await this.repository.isInscrito(identrenamiento, jugadorId)
    if (existe) throw { status: 400, message: 'El jugador ya está inscripto en este entrenamiento' }

    const ins = await this.repository.crearInscripcion(identrenamiento, jugadorId)
    return ins
  }
}

export default InscripcionesEntrenamientosService
