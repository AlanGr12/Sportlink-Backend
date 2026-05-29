import EntrenadoresRepository from '../repositories/entrenadores-repository.js'

class EntrenadoresService {

  constructor() {
    this.repository = new EntrenadoresRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const entrenador = await this.repository.getByIdAsync(id)

    if (!entrenador) throw { status: 404, message: `No se encontró el entrenador con id ${id}` }

    return entrenador
  }

}

export default EntrenadoresService