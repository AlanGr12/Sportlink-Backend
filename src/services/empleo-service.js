import EmpleoRepository from '../repositories/empleo-repository.js'

class EmpleoService {
  constructor() {
    this.repository = new EmpleoRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const empleo = await this.repository.getByIdAsync(id)
    if (!empleo) throw { status: 404, message: `No se encontró el empleo con id ${id}` }
    return empleo
  }

  async getAllByClubAsync(idclub) {
    if (!idclub) throw { status: 400, message: 'El id del club es obligatorio' }
    return await this.repository.getAllByClubAsync(idclub)
  }

  async crearEmpleo(data) {
    const {
      idclub,
      iddeporte,
      nombre,
      horasreq,
      habilidadesreq,
      acercaempleo,
      estado
    } = data || {}

    if (!idclub)    throw { status: 400, message: 'El club es obligatorio' }
    if (!iddeporte) throw { status: 400, message: 'El deporte es obligatorio' }
    if (!nombre)    throw { status: 400, message: 'El nombre de la vacante es obligatorio' }

    // Validar estrictamente que 'estado' sea booleano o las cadenas 'true'/'false' (por defecto activo)
    let estadoBool = true
    if (estado !== undefined && estado !== null) {
      if (typeof estado !== 'boolean') {
        const s = String(estado).toLowerCase()
        if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
        estadoBool = s === 'true'
      } else {
        estadoBool = estado
      }
    }

    const existe = await this.repository.existeEmpleo(idclub, iddeporte, nombre)
    if (existe) throw { status: 400, message: 'Ya existe una vacante con ese nombre para ese club y deporte' }

    return await this.repository.crearEmpleo(
      idclub,
      iddeporte,
      nombre,
      horasreq,
      habilidadesreq,
      acercaempleo,
      estadoBool
    )
  }
}

export default EmpleoService