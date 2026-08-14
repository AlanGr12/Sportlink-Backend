import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import InscripcionesEntrenamientosService from '../services/inscripcionesentrenamientos-service.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new InscripcionesEntrenamientosService()

// GET /api/inscripcionesentrenamientos — Requiere autenticación
router.get('/', verificarToken, async (req, res) => {
  try {
    const identrenamiento = req.query.identrenamiento ? Number(req.query.identrenamiento) : null
    const list = await service.getAllAsync(identrenamiento)
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/inscripcionesentrenamientos — Solo jugadores pueden inscribirse a entrenamientos
router.post('/', verificarToken, requiereRol('jugador'), async (req, res) => {
  try {
    const ins = await service.crearInscripcion(req.body, req.usuario.idusuario)
    res.status(StatusCodes.CREATED).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// DELETE /api/inscripcionesentrenamientos/:identrenamiento
router.delete('/:identrenamiento', verificarToken, requiereRol('jugador'), async (req, res) => {
  try {
    const identrenamiento = req.params.identrenamiento
    const result = await service.borrarInscripcion(identrenamiento, req.usuario.idusuario)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/inscripcionesentrenamientos/:id
router.get('/:id', async (req, res) => {
  try {
    const ins = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
