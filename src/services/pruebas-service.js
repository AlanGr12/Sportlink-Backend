import PruebasRepository from '../repositories/pruebas-repository.js'
import ClubesRepository from '../repositories/clubes-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'
import chatRepository from '../repositories/chat-repository.js'

class PruebasService {
  constructor() {
    this.repository = new PruebasRepository()
    this.clubesRepo = new ClubesRepository()
    this.calendarioService = new CalendarioEventosService()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getAllPruebasAsync() {
    return await this.getAllAsync()
  }

  async getByIdAsync(id) {
    const prueba = await this.repository.getByIdAsync(id)
    if (!prueba) throw { status: 404, message: `No se encontró la prueba con id ${id}` }
    return prueba
  }

  async getPruebaByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async crearPrueba(data, archivo, idusuario) {
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
      fechacierre,
      direccion,
      latitud,
      longitud
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

    if (!imagenUrl)   throw { status: 400, message: 'La imagen es obligatoria' }
    if (!categoria)   throw { status: 400, message: 'La categoría es obligatoria' }
    if (!zona)        throw { status: 400, message: 'La zona es obligatoria' }
    if (!genero)      throw { status: 400, message: 'El género es obligatorio' }
    if (!fechaprueba) throw { status: 400, message: 'La fecha de prueba es obligatoria' }
    if (!fechacierre) throw { status: 400, message: 'La fecha de cierre es obligatoria' }

    // Validar que las fechas no sean anteriores a la fecha actual (no permitir fechas pasadas)
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const fechaPruebaLimpia = String(fechaprueba).substring(0, 10)
    const fechaCierreLimpia = String(fechacierre).substring(0, 10)

    if (fechaPruebaLimpia < hoy) {
      throw { status: 400, message: 'La fecha de la prueba no puede ser anterior a la fecha actual' }
    }
    if (fechaCierreLimpia < hoy) {
      throw { status: 400, message: 'La fecha de cierre de inscripción no puede ser anterior a la fecha actual' }
    }
    if (fechaCierreLimpia > fechaPruebaLimpia) {
      throw { status: 400, message: 'La fecha de cierre de inscripción no puede ser posterior a la fecha de la prueba' }
    }

    // Validar estrictamente que 'estado' sea booleano o las cadenas 'true'/'false'
    if (typeof estado !== 'boolean') {
      if (estado == null) throw { status: 400, message: 'El estado debe ser true o false' }
      const s = String(estado).toLowerCase()
      if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
    }

    const estadoBool = typeof estado === 'boolean' ? estado : String(estado).toLowerCase() === 'true'

    const existe = await this.repository.existePrueba(idclub, iddeporte, fechaprueba, categoria, genero)
    if (existe) throw { status: 400, message: 'Ya existe una prueba para ese club, deporte y fecha' }

    const dir = direccion ?? null
    const lat = (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : (latitud ?? null)
    const lng = (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : (longitud ?? null)

    const prueba = await this.repository.crearPrueba(
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
      fechacierre,
      dir,
      lat,
      lng
    )

    // Intentar crear evento en el calendario del Club (no interrumpe si falla)
    try {
      const club = await this.clubesRepo.getByIdAsync(Number(idclub))
      if (club) {
        const deporteNombre = prueba.deporte?.deporte || 'Deporte'
        await this.calendarioService.crearEvento({
          idusuario:           club.idusuario,
          tipo:                'PRUEBA',
          fecha:               fechaprueba,
          horainicio:          horainicio,
          horafin:             horafin,
          idprueba:            prueba.idprueba,
          identrenamiento:     null,
          idinscripcionempleo: null,
          titulo:              `Prueba: ${deporteNombre} — ${club.nombre}`,
          descripcion:         descripcion
        })
      }
    } catch (evtErr) {
      console.error('Error creando evento de calendario para prueba:', evtErr.message || evtErr)
    }

    // Crear grupo de chat para la prueba (no interrumpe si falla)
    try {
      const idusuarioAdmin = idusuario ? Number(idusuario) : null
      
      // Obtener nombre del club
      const club = await this.clubesRepo.getByIdAsync(Number(idclub))
      const nombreClub = club ? club.nombre : 'Club'

      await chatRepository.crearConversacionRPC(
        'GRUPAL',
        `${nombreClub} - Prueba: ${categoria || 'General'}`,
        null,
        prueba.idprueba,
        null,
        null,
        idusuarioAdmin ? [idusuarioAdmin] : [],
        idusuarioAdmin
      )
    } catch (errChat) {
      console.error('[pruebas-service] Error creando grupo de chat para prueba:', errChat.message)
    }

    return prueba
  }

  async crearPruebaAsync(data, archivo, idusuario) {
    return await this.crearPrueba(data, archivo, idusuario)
  }

  async insertarAsync(data, archivo, idusuario) {
    return await this.crearPrueba(data, archivo, idusuario)
  }

  async actualizarPruebaAsync(id, data, archivo, idusuario) {
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
      fechacierre,
      direccion,
      latitud,
      longitud
    } = data || {}

    if (fechaprueba) {
      const d = new Date()
      const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const fechaPruebaLimpia = String(fechaprueba).substring(0, 10)
      if (fechaPruebaLimpia < hoy) {
        throw { status: 400, message: 'La fecha de la prueba no puede ser anterior a la fecha actual' }
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
      imagenUrl = await this.repository.subirFotoPruebaAsync(archivo)
    }

    const updates = {
      ...(idclub !== undefined && { idclub: Number(idclub) }),
      ...(iddeporte !== undefined && { iddeporte: Number(iddeporte) }),
      ...(cupo !== undefined && { cupo: Number(cupo) }),
      ...(horainicio !== undefined && { horainicio }),
      ...(horafin !== undefined && { horafin }),
      ...(estadoBool !== undefined && { estado: estadoBool }),
      ...(descripcion !== undefined && { descripcion }),
      ...(imagenUrl !== undefined && { imagen: imagenUrl }),
      ...(categoria !== undefined && { categoria }),
      ...(zona !== undefined && { zona }),
      ...(genero !== undefined && { genero }),
      ...(fechaprueba !== undefined && { fechaprueba }),
      ...(fechacierre !== undefined && { fechacierre }),
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

    const prueba = await this.repository.actualizarPruebaAsync(id, updates)
    if (!prueba) throw { status: 404, message: `No se encontró la prueba con id ${id}` }

    return prueba
  }

  async actualizarPrueba(id, data, archivo, idusuario) {
    return await this.actualizarPruebaAsync(id, data, archivo, idusuario)
  }
}

export default PruebasService