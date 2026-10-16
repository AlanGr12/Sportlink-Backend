import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import VinculacionesService from '../services/vinculaciones-service.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new VinculacionesService()

const responder = (fn, status = StatusCodes.OK) => async (req, res) => {
  try {
    res.status(status).json(await fn(req))
  } catch (error) {
    if (!error.status) console.error('[VINCULACIONES ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// POST /api/vinculaciones/solicitar — un entrenador solicita unirse a un club { id_club }
router.post('/solicitar', verificarToken, requiereRol('entrenador'),
  responder((req) => service.solicitar(req.usuario, req.body || {}), StatusCodes.CREATED))

// POST /api/vinculaciones/invitar — un club invita a un entrenador { id_entrenador }
router.post('/invitar', verificarToken, requiereRol('club'),
  responder((req) => service.invitar(req.usuario, req.body || {}), StatusCodes.CREATED))

// GET /api/vinculaciones/pendientes — { recibidas, enviadas } del usuario logueado (club o entrenador)
router.get('/pendientes', verificarToken, requiereRol('club', 'entrenador'),
  responder((req) => service.pendientes(req.usuario)))

// GET /api/vinculaciones/mi-club — club vinculado del entrenador logueado (o null)
router.get('/mi-club', verificarToken, requiereRol('entrenador'),
  responder((req) => service.obtenerClubDelEntrenador(req.usuario)))

// GET /api/vinculaciones/mis-entrenadores — entrenadores vinculados del club logueado
router.get('/mis-entrenadores', verificarToken, requiereRol('club'),
  responder((req) => service.misEntrenadores(req.usuario)))

// GET /api/vinculaciones/estado/:idclub — relación del entrenador logueado con ese club
router.get('/estado/:idclub', verificarToken, requiereRol('entrenador'),
  responder((req) => service.estadoConClub(req.usuario, req.params.idclub)))

// PATCH /api/vinculaciones/:id/responder { estado: 'ACEPTADO' | 'RECHAZADO' }
router.patch('/:id/responder', verificarToken, requiereRol('club', 'entrenador'),
  responder((req) => service.responder(req.usuario, req.params.id, req.body?.estado)))

// DELETE /api/vinculaciones/:id — cancela una solicitud o desvincula
router.delete('/:id', verificarToken, requiereRol('club', 'entrenador', 'admin'),
  responder((req) => service.desvincular(req.usuario, req.params.id)))

export default router
