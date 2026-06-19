import EntrenamientosRepository from '../repositories/entrenamientos-repository.js'

class EntrenamientosService {
  constructor() {
    this.repository = new EntrenamientosRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getAllAsyncWithFilters(query) {
    const filters = {}

    if (query.iddeporte) filters.iddeporte = Number(query.iddeporte)
    if (query.identrenador) filters.identrenador = Number(query.identrenador)

    if (typeof query.estado !== 'undefined') {
      if (query.estado === 'true' || query.estado === 'false') {
        filters.estado = query.estado === 'true'
      } else if (typeof query.estado === 'boolean') {
        filters.estado = query.estado
      } else {
        throw { status: 400, message: 'El estado debe ser true o false' }
      }
    }

    if (query.fechaFrom) filters.fechaFrom = query.fechaFrom
    if (query.fechaTo) filters.fechaTo = query.fechaTo
    if (query.titulo) filters.titulo = query.titulo
    if (query.ubicacion) filters.ubicacion = query.ubicacion

    return await this.repository.getAllAsyncWithFilters(filters)
  }

  async getByIdAsync(id) {
    const ent = await this.repository.getByIdAsync(id)
    if (!ent) throw { status: 404, message: `No se encontró el entrenamiento con id ${id}` }
    return ent
  }

  async crearEntrenamiento(data, archivo) {
    const {
      iddeporte,
      identrenador,
      precio,
      cantidad,
      titulo,
      imagen,
      ubicacion,
      fechaentr,
      estado,
      descripcion,
      genero,
      nivel
    } = data || {}

    if (!iddeporte) throw { status: 400, message: 'El deporte es obligatorio' }
    if (!identrenador) throw { status: 400, message: 'El entrenador es obligatorio' }
    if (precio == null) throw { status: 400, message: 'El precio es obligatorio' }
    if (cantidad == null) throw { status: 400, message: 'La cantidad es obligatoria' }
    if (!titulo) throw { status: 400, message: 'El título es obligatorio' }
    if (!ubicacion) throw { status: 400, message: 'La ubicación es obligatoria' }
    if (!fechaentr) throw { status: 400, message: 'La fecha es obligatoria' }
    if (estado == null) throw { status: 400, message: 'El estado es obligatorio' }
    if (!descripcion) throw { status: 400, message: 'La descripción es obligatoria' }
    if (!genero) throw { status: 400, message: 'El género es obligatorio' }
    if (!nivel) throw { status: 400, message: 'El nivel es obligatorio' }

    // validar y convertir estado: aceptar booleano o 'true'/'false' strings
    if (typeof estado !== 'boolean') {
      const s = String(estado).toLowerCase()
      if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
    }
    const estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'

    let imagenUrl = imagen
    if (archivo) {
      imagenUrl = await this.repository.subirImagenEntrenamientoAsync(archivo)
    }

    if (!imagenUrl) throw { status: 400, message: 'La imagen es obligatoria' }

    return await this.repository.crearEntrenamiento(
      iddeporte,
      identrenador,
      precio,
      cantidad,
      titulo,
      imagenUrl,
      ubicacion,
      fechaentr,
      estadoBool,
      descripcion,
      genero,
      nivel
    )
  }
}

export default EntrenamientosService
