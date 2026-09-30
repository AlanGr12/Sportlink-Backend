import { StatusCodes } from 'http-status-codes'
import reseniaService from '../services/resenia.service.js'

class ReseniaController {

  /**
   * POST /api/resenias
   * Crea una nueva reseña para un club o entrenador.
   * Admite autores Jugadores o Entrenadores (cuando califican a un Club).
   */
  async crearResenia(req, res) {
    try {
      const {
        idjugador: idjugadorBody,
        identrenador_autor: identrenadorAutorBody,
        idclub,
        identrenador,
        tipo,
        id,
        idprueba,
        identrenamiento,
        estrellitas,
        textoopinion,
        rolAutor: rolAutorBody
      } = req.body || {}

      let idjugador = idjugadorBody ? Number(idjugadorBody) : null
      let identrenador_autor = identrenadorAutorBody ? Number(identrenadorAutorBody) : null
      let tipousuario = rolAutorBody || (req.usuario ? req.usuario.tipousuario : null)

      // Resolver autor desde la sesión autenticada si está disponible
      if (req.usuario) {
        const rol = (req.usuario.tipousuario || '').toLowerCase()
        tipousuario = rol

        if (rol === 'entrenador') {
          const idEntrenadorSesion = await reseniaService.obtenerIdEntrenadorPorUsuario(req.usuario.idusuario)
          identrenador_autor = idEntrenadorSesion || identrenador_autor
        } else if (rol === 'jugador') {
          const idJugadorSesion = await reseniaService.obtenerIdJugadorPorUsuario(req.usuario.idusuario)
          idjugador = idJugadorSesion || idjugador
        }
      }

      if (!idjugador && !identrenador_autor) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Datos requeridos faltantes',
          detail: 'Debe especificarse idjugador o identrenador_autor, o contar con una sesión activa.'
        })
      }

      // Resolver destinatario (acepta idclub/identrenador o formato { tipo, id })
      let clubDestino = idclub
      let entrenadorDestino = identrenador

      if (!clubDestino && !entrenadorDestino && tipo && id) {
        const tipoNorm = String(tipo).toLowerCase().trim()
        if (tipoNorm === 'club') clubDestino = id
        else if (tipoNorm === 'entrenador') entrenadorDestino = id
      }

      // Validar estrellitas requeridas
      const estrellasNum = Number(estrellitas)
      if (
        estrellitas === undefined ||
        estrellitas === null ||
        !Number.isInteger(estrellasNum) ||
        estrellasNum < 1 ||
        estrellasNum > 5
      ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Calificación inválida',
          detail: 'El campo "estrellitas" es obligatorio y debe ser un número entero entre 1 y 5.'
        })
      }

      // Validar texto de opinión
      if (!textoopinion || typeof textoopinion !== 'string' || textoopinion.trim() === '') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Opinión inválida',
          detail: 'El campo "textoopinion" es obligatorio y no puede estar vacío.'
        })
      }

      // Llamar al servicio para procesar la creación y validaciones de negocio
      const nuevaResenia = await reseniaService.crearResenia({
        idjugador,
        identrenador_autor,
        idusuario: req.usuario?.idusuario,
        tipousuario,
        idclub: clubDestino,
        identrenador: entrenadorDestino,
        idprueba,
        identrenamiento,
        estrellitas: estrellasNum,
        textoopinion: textoopinion.trim()
      })

      return res.status(StatusCodes.CREATED).json(nuevaResenia)
    } catch (error) {
      console.error('[ReseniaController.crearResenia] Error:', error)
      const status = error.status || (error.code === '23505' ? StatusCodes.CONFLICT : StatusCodes.INTERNAL_SERVER_ERROR)
      return res.status(status).json({
        error: error.message || 'Error interno del servidor al crear la reseña.'
      })
    }
  }

  /**
   * GET /api/resenias/:tipo/:id
   * Lista las reseñas y métricas del club o entrenador.
   */
  async obtenerResenias(req, res) {
    try {
      const tipo = (req.params.tipo || req.query.tipo || '').toLowerCase().trim()
      const idRaw = req.params.id || req.query.id
      const id = Number(idRaw)

      if (tipo !== 'club' && tipo !== 'entrenador') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Parámetro inválido',
          detail: 'El parámetro "tipo" debe ser "club" o "entrenador".'
        })
      }

      if (!idRaw || isNaN(id) || id <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'ID inválido',
          detail: 'El ID del destinatario es obligatorio y debe ser un número entero positivo.'
        })
      }

      const [resenias, estadisticas] = await Promise.all([
        reseniaService.obtenerReseniasPorDestinatario({ tipo, id }),
        reseniaService.obtenerPromedioYEstadisticas({ tipo, id })
      ])

      return res.status(StatusCodes.OK).json({
        tipo,
        id,
        promedio: estadisticas.promedio,
        totalResenias: estadisticas.totalResenias,
        estadisticas,
        resenias
      })
    } catch (error) {
      console.error('[ReseniaController.obtenerResenias] Error:', error)
      return res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: error.message || 'Error interno al obtener las reseñas.'
      })
    }
  }

  /**
   * GET /api/resenias/verificar/:tipo/:id
   * Valida si el usuario en sesión (jugador o entrenador) está en condiciones de calificar al club o entrenador.
   */
  async verificarHabilitacion(req, res) {
    try {
      const tipo = (req.params.tipo || req.query.tipo || '').toLowerCase().trim()
      const idRaw = req.params.id || req.query.id
      const id = Number(idRaw)

      if (tipo !== 'club' && tipo !== 'entrenador') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Parámetro inválido',
          detail: 'El parámetro "tipo" debe ser "club" o "entrenador".'
        })
      }

      if (!idRaw || isNaN(id) || id <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'ID inválido',
          detail: 'El ID de la entidad a calificar debe ser un número entero positivo.'
        })
      }

      let idjugador = null
      let identrenador_autor = null
      let idusuario = null
      let tipousuario = (req.query.tipousuario || '').toLowerCase()

      if (req.usuario) {
        idusuario = req.usuario.idusuario
        tipousuario = (req.usuario.tipousuario || '').toLowerCase()

        if (tipousuario === 'entrenador') {
          identrenador_autor = await reseniaService.obtenerIdEntrenadorPorUsuario(idusuario)
        } else if (tipousuario === 'jugador') {
          idjugador = await reseniaService.obtenerIdJugadorPorUsuario(idusuario)
        }
      }

      if (!idjugador && req.query.idjugador) idjugador = Number(req.query.idjugador)
      if (!identrenador_autor && (req.query.identrenador || req.query.identrenador_autor)) {
        identrenador_autor = Number(req.query.identrenador || req.query.identrenador_autor)
      }
      if (!idusuario && req.query.idusuario) idusuario = Number(req.query.idusuario)
      if (!tipousuario && req.query.tipousuario) tipousuario = (req.query.tipousuario || '').toLowerCase()

      const resultado = await reseniaService.verificarPuedeCalificar({
        idjugador,
        identrenador_autor,
        idusuario,
        tipousuario,
        tipo,
        id
      })

      return res.status(StatusCodes.OK).json(resultado)
    } catch (error) {
      console.error('[ReseniaController.verificarHabilitacion] Error:', error)
      return res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: error.message || 'Error interno al verificar la habilitación.'
      })
    }
  }
}

const reseniaController = new ReseniaController()

export const crearResenia = reseniaController.crearResenia.bind(reseniaController)
export const obtenerResenias = reseniaController.obtenerResenias.bind(reseniaController)
export const verificarHabilitacion = reseniaController.verificarHabilitacion.bind(reseniaController)

export default reseniaController
