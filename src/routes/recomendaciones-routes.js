import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import { verificarToken } from '../middlewares/auth-middleware.js'
import recomendacionesService from '../services/recomendaciones-service.js'

const router = Router()

router.use(verificarToken)

// GET /api/recomendaciones?limite=3 → perfiles al azar que comparten deporte con el usuario
router.get('/', async (req, res) => {
  try {
    const { idusuario, tipousuario } = req.usuario
    const resultado = await recomendacionesService.getRecomendaciones(idusuario, tipousuario, req.query.limite)
    res.status(StatusCodes.OK).json(resultado)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
