import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { verificarToken } from '../middlewares/auth-middleware.js'
import adjuntosService from '../services/adjuntos-service.js'

const router = Router()

router.use(verificarToken)

const manejar = (fn) => async (req, res) => {
  try {
    res.status(StatusCodes.OK).json(await fn(req))
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// GET /api/adjuntos/mios → eventos que puedo adjuntar (club: pruebas y empleos; entrenador: entrenamientos)
router.get('/mios', manejar((req) => adjuntosService.getMios(req.usuario.idusuario, req.usuario.tipousuario)))

// GET /api/adjuntos/:tipo/:id → detalle normalizado (tipo: PRUEBA | ENTRENAMIENTO | EMPLEO)
router.get('/:tipo/:id', manejar((req) => adjuntosService.getDetalle(req.params.tipo, req.params.id)))

export default router
