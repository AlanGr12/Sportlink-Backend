import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { verificarToken } from '../middlewares/auth-middleware.js'
import seguidoresService from '../services/seguidores-service.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(verificarToken)

const manejar = (fn) => async (req, res) => {
  try {
    const resultado = await fn(req)
    res.status(StatusCodes.OK).json(resultado)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// GET /api/seguidores/mis-seguidos → [idusuario, ...] de las cuentas que sigo
// (declarada antes de /:idusuario para que no la capture)
router.get('/mis-seguidos', manejar((req) => seguidoresService.getMisSeguidosIds(req.usuario.idusuario)))

// GET /api/seguidores/:idusuario → { seguidores, seguidos, siguiendo }
router.get('/:idusuario', manejar((req) => seguidoresService.getEstado(req.params.idusuario, req.usuario.idusuario)))

// POST /api/seguidores/:idusuario → seguir (solo clubes y entrenadores)
router.post('/:idusuario', manejar((req) => seguidoresService.seguir(req.params.idusuario, req.usuario.idusuario)))

// DELETE /api/seguidores/:idusuario → dejar de seguir
router.delete('/:idusuario', manejar((req) => seguidoresService.dejarDeSeguir(req.params.idusuario, req.usuario.idusuario)))

export default router
