import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import PruebasService from '../services/pruebas-service.js'
import multer from 'multer'

const router = Router()
const service = new PruebasService()

// GET /api/pruebas
router.get('/', async (req, res) => {
  try {
    const pruebas = await service.getAllAsync()
    res.status(StatusCodes.OK).json(pruebas)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

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

router.post('/crearPrueba', upload.single('imagen'), async (req, res) => {
  try {
    const prueba = await service.crearPrueba(req.body, req.file)

    res.status(StatusCodes.OK).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/pruebas/:id
router.get('/:id', async (req, res) => {
  try {
    const prueba = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.CREATED).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }})

export default router