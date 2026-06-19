import PruebasRepository from '../repositories/pruebas-repository.js'

class PruebasService {
  constructor() {
    this.repository = new PruebasRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const prueba = await this.repository.getByIdAsync(id)
    if (!prueba) throw { status: 404, message: `No se encontró la prueba con id ${id}` }
    return prueba
  }

  async crearPrueba(data, archivo) {

  const {
    idclub,
    iddeporte,
    cupo,
    horainicio,
    horafin,
    estado,
    descripcion,
    imagen,
    categoria,
    zona,
    genero,
    fechaprueba,
    fechacierre
  } = data || {}

  if (!idclub)      throw { status: 400, message: 'El club es obligatorio' }
  if (!iddeporte)   throw { status: 400, message: 'El deporte es obligatorio' }
  if (!cupo)        throw { status: 400, message: 'El cupo es obligatorio' }
  if (!horainicio)  throw { status: 400, message: 'La hora de inicio es obligatoria' }
  if (!horafin)     throw { status: 400, message: 'La hora de fin es obligatoria' }
  if (!descripcion) throw { status: 400, message: 'La descripción es obligatoria' }

  let imagenUrl = imagen
  if (archivo) {
    imagenUrl = await this.repository.subirFotoPruebaAsync(archivo)
  }

  if (!imagenUrl)      throw { status: 400, message: 'La imagen es obligatoria' }
  if (!categoria)   throw { status: 400, message: 'La categoría es obligatoria' }
  if (!zona)        throw { status: 400, message: 'La zona es obligatoria' }
  if (!genero)      throw { status: 400, message: 'El género es obligatorio' }
  if (!fechaprueba) throw { status: 400, message: 'La fecha de prueba es obligatoria' }
  if (!fechacierre) throw { status: 400, message: 'La fecha de cierre es obligatoria' }

  // Validar estrictamente que 'estado' sea booleano o las cadenas 'true'/'false'
  if (typeof estado !== 'boolean') {
    if (estado == null) throw { status: 400, message: 'El estado debe ser true o false' }
    const s = String(estado).toLowerCase()
    if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
  }

  const estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'

  const existe = await this.repository.existePrueba(idclub, iddeporte, fechaprueba, categoria, genero)
  if (existe) throw { status: 400, message: 'Ya existe una prueba para ese club, deporte y fecha' }

  return await this.repository.crearPrueba(
    idclub,
    iddeporte,
    cupo,
    horainicio,
    horafin,
    estadoBool,
    descripcion,
    imagenUrl,
    categoria,
    zona,
    genero,
    fechaprueba,
    fechacierre
  )
}
}

export default PruebasService