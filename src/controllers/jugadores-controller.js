import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import JugadoresService from '../services/jugadores-service.js'
import multer from 'multer'

const router = Router()
const service = new JugadoresService()

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

router.post('/registro', upload.single('fotoperfil'), async (req, res) => {
  try {
    const jugador = await service.registrarJugadorAsync(req.body, req.file)

    res.status(StatusCodes.CREATED).json(jugador)

  } catch (error) {
    res
      .status(error.status || StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message })
  }
})

export default router
