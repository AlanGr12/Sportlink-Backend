import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import JugadoresService from '../services/jugadores-service.js'

const router = Router()
const service = new JugadoresService()

// GET /api/jugadores
router.get('/', async (req, res) => {
  try {
    const jugadores = await service.getAllAsync()
    res.status(StatusCodes.OK).json(jugadores)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/jugadores/:id
router.get('/:id', async (req, res) => {
  try {
    const jugador = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(jugador)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
