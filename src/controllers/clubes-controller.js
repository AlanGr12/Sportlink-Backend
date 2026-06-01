import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import ClubesService from '../services/clubes-service.js'

const router = Router()
const service = new ClubesService()

// GET /api/clubes
router.get('/', async (req, res) => {
  try {
    const clubes = await service.getAllAsync()
    res.status(StatusCodes.OK).json(clubes)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/clubes/:id
router.get('/:id', async (req, res) => {
  try {
    const club = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(club)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/clubes/registro
router.post('/registro', async (req, res) => {
  try {
    const club = await service.registrarClubAsync(req.body)
    res.status(StatusCodes.CREATED).json(club)
  } catch (error) {
    res
      .status(error.status || StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message })
  }
})

export default router