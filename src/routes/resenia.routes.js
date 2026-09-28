import { Router } from 'express'
import jwt from 'jsonwebtoken'
import reseniaController from '../controllers/resenia.controller.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET

/**
 * Middleware de autenticación flexible:
 * Si el cliente envía header "Authorization: Bearer <token>", valida la firma JWT
 * y asigna el payload a req.usuario.
 * Si el token es inválido o expiró, retorna 401 inmediatamente.
 * Si no se proporciona header de autorización, continúa al controlador permitiendo
 * resolución alternativa por idjugador (en body/query) o respuesta 401 si se requiere sesión.
 */
function autenticacionFlexible(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    req.usuario = decoded
    next()
  } catch (err) {
    const esExpirado = err.name === 'TokenExpiredError'
    return res.status(401).json({
      error: esExpirado ? 'Token expirado' : 'Token inválido',
      detail: err.message
    })
  }
}

/**
 * GET /api/resenias/verificar/:tipo/:id
 * Endpoint de consulta para habilitar el modal/botón de reseña en el frontend.
 * IMPORTANTE: Debe ir antes de /:tipo/:id para evitar colisión de rutas en Express.
 */
router.get('/verificar/:tipo/:id', autenticacionFlexible, reseniaController.verificarHabilitacion)

/**
 * GET /api/resenias/:tipo/:id
 * Lista las reseñas y métricas del club o entrenador (:tipo = club | entrenador).
 * Ruta pública accesible sin autenticación.
 */
router.get('/:tipo/:id', reseniaController.obtenerResenias)

/**
 * POST /api/resenias
 * Crea una nueva reseña para el club o entrenador especificado.
 */
router.post('/', autenticacionFlexible, reseniaController.crearResenia)

export default router
