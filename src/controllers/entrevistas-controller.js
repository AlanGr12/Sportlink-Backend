import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrevistasService from '../services/entrevistas-service.js'

const router = Router()
const service = new EntrevistasService()

// GET /api/entrevistas/inscripcion/:idinscripcion
router.get('/inscripcion/:idinscripcion', async (req, res) => {
  try {
    const list = await service.getAllByInscripcionAsync(req.params.idinscripcion)
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/entrevistas/:id
router.get('/:id', async (req, res) => {
  try {
    const entrevista = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(entrevista)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/entrevistas
router.post('/', async (req, res) => {
  try {
    const entrevista = await service.crearEntrevista(req.body)
    res.status(StatusCodes.CREATED).json(entrevista)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/entrevistas/:id
router.put('/:id', async (req, res) => {
  try {
    const entrevista = await service.actualizarEntrevista(req.params.id, req.body)
    res.status(StatusCodes.OK).json(entrevista)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
