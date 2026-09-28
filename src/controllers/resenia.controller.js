import { StatusCodes } from 'http-status-codes'
import reseniaService from '../services/resenia.service.js'

class ReseniaController {

  /**
   * POST /api/resenias
   * Crea una nueva reseña para un club o entrenador.
   * Valida body requerido: estrellitas (1-5), textoopinion no vacío y destinatario válido.
   */
  async crearResenia(req, res) {
    try {
      const {
        idjugador: idjugadorBody,
        idclub,
        identrenador,
        tipo,
        id,
        idprueba,
        identrenamiento,
        estrellitas,
        textoopinion
      } = req.body || {}

      // 1. Resolver idjugador: desde la sesión autenticada o desde el body
      let idjugador = idjugadorBody ? Number(idjugadorBody) : null

      if (req.usuario) {
        if (req.usuario.tipousuario && req.usuario.tipousuario.toLowerCase() !== 'jugador' && !idjugador) {
          return res.status(StatusCodes.FORBIDDEN).json({
            error: 'Acceso denegado',
            detail: 'Solo los usuarios con rol de jugador pueden calificar clubes o entrenadores.'
          })
        }

        const idJugadorSesion = await reseniaService.obtenerIdJugadorPorUsuario(req.usuario.idusuario)
        if (!idJugadorSesion && !idjugador) {
          return res.status(StatusCodes.NOT_FOUND).json({
            error: 'Perfil no encontrado',
            detail: 'No se encontró el perfil de jugador correspondiente al usuario autenticado.'
          })
        }

        idjugador = idJugadorSesion || idjugador
      }

      if (!idjugador || isNaN(idjugador) || idjugador <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Datos requeridos faltantes',
          detail: 'El idjugador es obligatorio o debe contar con una sesión activa de jugador.'
        })
      }

      // 2. Resolver destinatario (acepta idclub/identrenador o formato { tipo, id })
      let clubDestino = idclub
      let entrenadorDestino = identrenador

      if (!clubDestino && !entrenadorDestino && tipo && id) {
        const tipoNorm = String(tipo).toLowerCase().trim()
        if (tipoNorm === 'club') clubDestino = id
        else if (tipoNorm === 'entrenador') entrenadorDestino = id
      }

      // 3. Validar estrellitas requeridas
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

      // 4. Validar texto de opinión
      if (!textoopinion || typeof textoopinion !== 'string' || textoopinion.trim() === '') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Opinión inválida',
          detail: 'El campo "textoopinion" es obligatorio y no puede estar vacío.'
        })
      }

      // 5. Llamar al servicio para procesar la creación y validaciones de negocio
      const nuevaResenia = await reseniaService.crearResenia({
        idjugador,
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
   * Recibe tipo ('club' | 'entrenador') e id por params o query.
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
   * Valida si el usuario en sesión (jugador) está en condiciones de calificar al club o entrenador.
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

      // Resolver idjugador a partir de req.usuario (sesión) o query de respaldo
      let idjugador = null

      if (req.usuario) {
        if (req.usuario.tipousuario && req.usuario.tipousuario.toLowerCase() !== 'jugador') {
          return res.status(StatusCodes.OK).json({
            puedeCalificar: false,
            yaCalifico: false,
            eventosPasados: [],
            motivo: 'Solo los usuarios con rol de jugador pueden calificar a clubes o entrenadores.'
          })
        }

        idjugador = await reseniaService.obtenerIdJugadorPorUsuario(req.usuario.idusuario)
        if (!idjugador) {
          return res.status(StatusCodes.NOT_FOUND).json({
            error: 'Jugador no encontrado',
            detail: 'No se encontró un perfil de jugador asociado al usuario en sesión.'
          })
        }
      } else if (req.query.idjugador) {
        idjugador = Number(req.query.idjugador)
      } else {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          error: 'No autenticado',
          detail: 'Se requiere iniciar sesión como jugador para verificar la habilitación de reseña.'
        })
      }

      const resultado = await reseniaService.verificarPuedeCalificar({
        idjugador,
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
