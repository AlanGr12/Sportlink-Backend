import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrenadoresService from '../services/entrenadores-service.js'
import multer from 'multer'

const router = Router()
const service = new EntrenadoresService()

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

router.post('/registro', upload.single('fotoperfil'), async (req, res) => {
  try {

    const entrenador = await service.registrarEntrenadorAsync(req.body, req.file)

    res.status(StatusCodes.CREATED).json(entrenador)

  } catch (error) {
    res
      .status(error.status || StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message })
  }
})


export default router