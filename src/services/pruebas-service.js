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

  async crearPrueba(idclub, iddeporte, cupo, horainicio, horafin, estado,
                  descripcion, imagen, categoria, zona, genero,
                  fechaprueba, fechacierre) {

  if (!idclub)      throw { status: 400, message: 'El club es obligatorio' }
  if (!iddeporte)   throw { status: 400, message: 'El deporte es obligatorio' }
  if (!cupo)        throw { status: 400, message: 'El cupo es obligatorio' }
  if (!horainicio)  throw { status: 400, message: 'La hora de inicio es obligatoria' }
  if (!horafin)     throw { status: 400, message: 'La hora de fin es obligatoria' }
  if (!descripcion) throw { status: 400, message: 'La descripción es obligatoria' }
  if (!imagen)      throw { status: 400, message: 'La imagen es obligatoria' }
  if (!categoria)   throw { status: 400, message: 'La categoría es obligatoria' }
  if (!zona)        throw { status: 400, message: 'La zona es obligatoria' }
  if (!genero)      throw { status: 400, message: 'El género es obligatorio' }
  if (!fechaprueba) throw { status: 400, message: 'La fecha de prueba es obligatoria' }
  if (!fechacierre) throw { status: 400, message: 'La fecha de cierre es obligatoria' }
  
   
  const existe = await this.repository.existePrueba(idclub, iddeporte, fechaprueba,categoria,genero)
  if (existe) throw { status: 400, message: 'Ya existe una prueba para ese club, deporte y fecha' }


  return await this.repository.crearPrueba(
    idclub, iddeporte, cupo, horainicio, horafin, estado,
    descripcion, imagen, categoria, zona, genero,
    fechaprueba, fechacierre
  )
}
}

export default PruebasService