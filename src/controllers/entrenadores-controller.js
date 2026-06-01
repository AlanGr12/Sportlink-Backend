import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrenadoresService from '../services/entrenadores-service.js'

const router = Router()
const service = new EntrenadoresService()

// GET /api/entrenadores
router.get('/', async (req, res) => {
  try {
    const entrenadores = await service.getAllAsync()
    res.status(StatusCodes.OK).json(entrenadores)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/entrenadores/:id
router.get('/:id', async (req, res) => {
  try {
    const entrenador = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(entrenador)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

router.post('/registro', async (req, res) => {
  try {

    const entrenador = await service.registrarEntrenadorAsync(req.body)

    res.status(StatusCodes.CREATED).json(entrenador)

  } catch (error) {
    res
      .status(error.status || StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message })
  }
})


export default router