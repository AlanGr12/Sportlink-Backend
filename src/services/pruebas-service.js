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

  async getByIdAsync(id) {
    const prueba = await this.repository.getByIdAsync(id)
    if (!prueba) throw { status: 404, message: `No se encontró la prueba con id ${id}` }
    return prueba
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
    fechacierre
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
      `${nombreClub} - Prueba`,
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
}

export default PruebasService