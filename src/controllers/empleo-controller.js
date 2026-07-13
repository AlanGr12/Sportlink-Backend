import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EmpleoService from '../services/empleo-service.js'

const router = Router()
const service = new EmpleoService()

// GET /api/empleo
router.get('/', async (req, res) => {
  try {
    const empleos = await service.getAllAsync()
    res.status(StatusCodes.OK).json(empleos)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/empleo/club/:idclub
router.get('/club/:idclub', async (req, res) => {
  try {
    const empleos = await service.getAllByClubAsync(req.params.idclub)
    res.status(StatusCodes.OK).json(empleos)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/empleo/crearEmpleo
router.post('/crearEmpleo', async (req, res) => {
  try {
    const empleo = await service.crearEmpleo(req.body)
    res.status(StatusCodes.OK).json(empleo)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/empleo/:id
router.get('/:id', async (req, res) => {
  try {
    const empleo = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(empleo)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router