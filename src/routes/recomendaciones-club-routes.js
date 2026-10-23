import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import RecomendacionesClubService from '../services/recomendaciones-club-service.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new RecomendacionesClubService()

const responder = (fn, status = StatusCodes.OK) => async (req, res) => {
  try {
    res.status(status).json(await fn(req))
  } catch (error) {
    if (!error.status) console.error('[RECOMENDACIONES CLUB ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// POST /api/recomendaciones-club — el entrenador recomienda jugadores a su club { idjugadores: [], identrenamiento?, nota? }
router.post('/', verificarToken, requiereRol('entrenador'),
  responder((req) => service.recomendar(req.usuario, req.body || {}), StatusCodes.CREATED))

// GET /api/recomendaciones-club/enviadas — recomendaciones hechas por el entrenador logueado
router.get('/enviadas', verificarToken, requiereRol('entrenador'),
  responder((req) => service.enviadas(req.usuario)))

// GET /api/recomendaciones-club/recibidas — recomendaciones recibidas por el club logueado
router.get('/recibidas', verificarToken, requiereRol('club'),
  responder((req) => service.recibidas(req.usuario)))

// PATCH /api/recomendaciones-club/:id { estado: 'CONTACTADO' | 'DESCARTADA' }
router.patch('/:id', verificarToken, requiereRol('club'),
  responder((req) => service.actualizarEstado(req.usuario, req.params.id, req.body?.estado)))

export default router
