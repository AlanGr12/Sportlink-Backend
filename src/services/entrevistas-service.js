import EntrevistasRepository from '../repositories/entrevistas-repository.js'
import InscripcionesEmpleoRepository from '../repositories/inscripcionesempleo-repository.js'
import CalendarioEventosService from './calendarioeventos-service.js'

class EntrevistasService {
  constructor() {
    this.repository = new EntrevistasRepository()
    this.inscripcionesRepo = new InscripcionesEmpleoRepository()
    this.calendarioService = new CalendarioEventosService()
  }

  async getAllByInscripcionAsync(idinscripcion) {
    if (!idinscripcion) throw { status: 400, message: 'El id de inscripción es obligatorio' }
    return await this.repository.getAllByInscripcionAsync(idinscripcion)
  }

  async getByIdAsync(id) {
    const entrevista = await this.repository.getByIdAsync(id)
    if (!entrevista) throw { status: 404, message: `No se encontró la entrevista con id ${id}` }
    return entrevista
  }

  #validarPuntaje(puntaje) {
    if (puntaje !== undefined && puntaje !== null) {
      const pVal = Number(puntaje)
      if (isNaN(pVal) || pVal < 1 || pVal > 10) {
        throw { status: 400, message: 'El puntaje debe ser un número entero entre 1 y 10' }
      }
    }
  }

  async crearEntrevista(data) {
    const { idinscripcion, fecha, horainicio, horafin, ubicacion, comentarios } = data || {}

    if (!idinscripcion) throw { status: 400, message: 'El id de inscripción es obligatorio' }
    if (!fecha) throw { status: 400, message: 'La fecha es obligatoria' }

    const entrevista = await this.repository.crearEntrevista({
      idinscripcion,
      fecha,
      horainicio,
      horafin,
      ubicacion,
      comentarios
    })

    // Intentar crear evento en calendario de forma asincrónica (no bloquear la respuesta)
    try {
      const inscripcion = await this.inscripcionesRepo.getByIdAsync(idinscripcion)
      if (inscripcion && inscripcion.entrenador) {
        const idusuario = inscripcion.entrenador.idusuario
        const empleoNombre = inscripcion.empleo ? inscripcion.empleo.nombre : 'Empleo'
        const clubNombre = (inscripcion.empleo && inscripcion.empleo.clubes) ? inscripcion.empleo.clubes.nombre : 'Club'
        
        await this.calendarioService.crearEvento({
          idusuario: idusuario,
          tipo: 'ENTREVISTA',
          fecha: fecha,
          horainicio: horainicio || null,
          horafin: horafin || null,
          idprueba: null,
          identrenamiento: null,
          idinscripcionempleo: idinscripcion,
          titulo: `Entrevista: ${empleoNombre} — ${clubNombre}`,
          descripcion: ubicacion ? `Ubicación: ${ubicacion}` : null,
          imagen: null
        })
      }
    } catch (evtErr) {
      console.error('Error creando evento de calendario para entrevista:', evtErr.message || evtErr)
    }

    return entrevista
  }

  async actualizarEntrevista(id, campos) {
    // Validar existencia
    await this.getByIdAsync(id)
    if (campos) {
      this.#validarPuntaje(campos.puntaje)
    }
    return await this.repository.actualizarEntrevista(id, campos)
  }
}

export default EntrevistasService
