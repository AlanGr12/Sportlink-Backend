import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrenamientosService from '../services/entrenamientos-service.js'
import multer from 'multer'

const router = Router()
const service = new EntrenamientosService()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp']
    permitidos.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'))
  }
})

// GET /api/entrenamientos
router.get('/', async (req, res) => {
  try {
    // support optional filters via query string
    const hasFilters = Object.keys(req.query || {}).length > 0
    const list = hasFilters
      ? await service.getAllAsyncWithFilters(req.query)
      : await service.getAllAsync()
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/entrenamientos
router.post('/', upload.single('imagen'), async (req, res) => {
  try {
    const ent = await service.crearEntrenamiento(req.body, req.file)
    res.status(StatusCodes.CREATED).json(ent)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/entrenamientos/:id
router.get('/:id', async (req, res) => {
  try {
    const ent = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(ent)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
