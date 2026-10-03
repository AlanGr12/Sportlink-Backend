import EntrenamientosRepository from '../repositories/entrenamientos-repository.js'
import EntrenadoresRepository from '../repositories/entrenadores-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'
import chatRepository from '../repositories/chat-repository.js'

class EntrenamientosService {
  constructor() {
    this.repository = new EntrenamientosRepository()
    this.entrenadoresRepo = new EntrenadoresRepository()
    this.calendarioService = new CalendarioEventosService()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getEntrenamientosAsync() {
    return await this.getAllAsync()
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

  async getEntrenamientoByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async crearEntrenamiento(data, archivo, idusuario) {
    const {
      iddeporte,
      identrenador,
      precio,
      cantidad,
      titulo,
      imagen,
      ubicacion,
      fechaentr,
      horainicio,
      horafin,
      estado,
      descripcion,
      genero,
      nivel,
      direccion,
      latitud,
      longitud
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

    // Validar que la fecha no sea anterior a la fecha actual (no permitir fechas pasadas)
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const fechaEntrLimpia = String(fechaentr).substring(0, 10)
    if (fechaEntrLimpia < hoy) {
      throw { status: 400, message: 'La fecha del entrenamiento no puede ser anterior a la fecha actual' }
    }

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

    const dir = (direccion !== undefined && direccion !== null && direccion !== '') ? direccion : null
    const lat = (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : (latitud ?? null)
    const lng = (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : (longitud ?? null)

    const entrenamiento = await this.repository.crearEntrenamiento(
      iddeporte,
      identrenador,
      precio,
      cantidad,
      titulo,
      imagenUrl,
      ubicacion,
      fechaentr,
      horainicio,
      horafin,
      estadoBool,
      descripcion,
      genero,
      nivel,
      dir,
      lat,
      lng
    )

    // Intentar crear evento en el calendario del entrenador (no interrumpe si falla)
    try {
      const entrenador = await this.entrenadoresRepo.getByIdAsync(Number(identrenador))
      if (entrenador) {
        await this.calendarioService.crearEvento({
          idusuario:       entrenador.idusuario,
          tipo:            'ENTRENAMIENTO',
          fecha:           fechaentr,
          horainicio:      horainicio || null,
          horafin:         horafin || null,
          idprueba:        null,
          identrenamiento: entrenamiento.identrenamientos,
          idinscripcionempleo: null,
          titulo:          titulo,
          descripcion:     descripcion
        })
      }
    } catch (evtErr) {
      console.error('Error creando evento de calendario para entrenamiento:', evtErr.message || evtErr)
    }

    // Crear grupo de chat para el entrenamiento (no interrumpe si falla)
    try {
      const idusuarioAdmin = idusuario ? Number(idusuario) : null
      
      const entrenador = await this.entrenadoresRepo.getByIdAsync(Number(identrenador))
      const nombreEntrenador = entrenador ? `${entrenador.nombre} ${entrenador.apellido}`.trim() : 'Entrenador'

      await chatRepository.crearConversacionRPC(
        'GRUPAL',
        `${nombreEntrenador} - Entrenamiento`,
        null,
        null,
        entrenamiento.identrenamientos,  // PK del entrenamiento recien creado
        null,
        idusuarioAdmin ? [idusuarioAdmin] : [],
        idusuarioAdmin
      )
    } catch (errChat) {
      console.error('[entrenamientos-service] Error creando grupo de chat para entrenamiento:', errChat.message)
    }

    return entrenamiento
  }

  async crearEntrenamientoAsync(data, archivo, idusuario) {
    return await this.crearEntrenamiento(data, archivo, idusuario)
  }

  async insertarAsync(data, archivo, idusuario) {
    return await this.crearEntrenamiento(data, archivo, idusuario)
  }

  async editarEntrenamiento(id, data, archivo, idusuario) {
    const {
      iddeporte, identrenador, precio, cantidad, titulo, imagen,
      ubicacion, fechaentr, horainicio, horafin, estado, descripcion,
      genero, nivel, direccion, latitud, longitud
    } = data || {}

    if (fechaentr) {
      const d = new Date()
      const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const fechaEntrLimpia = String(fechaentr).substring(0, 10)
      if (fechaEntrLimpia < hoy) {
        throw { status: 400, message: 'La fecha del entrenamiento no puede ser anterior a la fecha actual' }
      }
    }

    let estadoBool = undefined
    if (estado !== undefined) {
      if (typeof estado !== 'boolean') {
        const s = String(estado).toLowerCase()
        if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
      }
      estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'
    }

    let imagenUrl = imagen
    if (archivo) {
      imagenUrl = await this.repository.subirImagenEntrenamientoAsync(archivo)
    }

    const updates = {
      iddeporte: iddeporte ? Number(iddeporte) : undefined,
      identrenador: identrenador ? Number(identrenador) : undefined,
      precio: precio ? Number(precio) : undefined,
      cantidad: cantidad ? Number(cantidad) : undefined,
      titulo,
      imagen: imagenUrl,
      ubicacion,
      fechaentr,
      horainicio,
      horafin,
      estado: estadoBool,
      descripcion,
      genero,
      nivel,
      ...(direccion !== undefined && {
        direccion: (direccion !== '' && direccion !== null) ? direccion : null
      }),
      ...(latitud !== undefined && {
        latitud: (latitud !== '' && latitud !== null) ? Number(latitud) : null
      }),
      ...(longitud !== undefined && {
        longitud: (longitud !== '' && longitud !== null) ? Number(longitud) : null
      })
    }

    const entrenamiento = await this.repository.editarEntrenamiento(id, updates)
    if (!entrenamiento) throw { status: 404, message: `No se pudo editar el entrenamiento ${id}` }

    return entrenamiento
  }

  async editarEntrenamientoAsync(id, data, archivo, idusuario) {
    return await this.editarEntrenamiento(id, data, archivo, idusuario)
  }

  async actualizarEntrenamientoAsync(id, data, archivo, idusuario) {
    return await this.editarEntrenamiento(id, data, archivo, idusuario)
  }
}

export default EntrenamientosService
