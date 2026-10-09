import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import NotificacionesService from '../services/notificaciones-service.js'
import { verificarToken } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new NotificacionesService()

const responder = (fn) => async (req, res) => {
  try {
    const result = await fn(req)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// GET /api/notificaciones — notificaciones del usuario autenticado
router.get('/', verificarToken, responder((req) => service.obtenerPorUsuario(req.usuario.idusuario)))

// GET /api/notificaciones/no-leidas/count — { count }
router.get('/no-leidas/count', verificarToken, responder((req) => service.obtenerContadorNoLeidas(req.usuario.idusuario)))

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', verificarToken, responder((req) => service.marcarTodasComoLeidas(req.usuario.idusuario)))

// PATCH /api/notificaciones/:id/leer
router.patch('/:id/leer', verificarToken, responder((req) => service.marcarComoLeida(req.params.id, req.usuario.idusuario)))

// DELETE /api/notificaciones/:id
router.delete('/:id', verificarToken, responder((req) => service.eliminarNotificacion(req.params.id, req.usuario.idusuario)))

export default router
