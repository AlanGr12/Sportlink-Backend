import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import InscripcionesPruebaService from '../services/inscripcionesprueba-service.js'

const router = Router()
const service = new InscripcionesPruebaService()

// GET /api/inscripcionesprueba
router.get('/', async (req, res) => {
  try {
    const list = await service.getAllAsync()
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/inscripcionesprueba
router.post('/', async (req, res) => {
  try {
    const ins = await service.crearInscripcion(req.body)
    res.status(StatusCodes.CREATED).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/inscripcionesprueba/:id
router.get('/:id', async (req, res) => {
  try {
    const ins = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
