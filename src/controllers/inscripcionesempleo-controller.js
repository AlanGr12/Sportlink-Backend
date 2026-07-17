import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import InscripcionesEmpleoService from '../services/inscripcionesempleo-service.js'
import multer from 'multer'

const router = Router()
const service = new InscripcionesEmpleoService()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos PDF'))
    }
  }
})

// GET /api/inscripcionesempleo
router.get('/', async (req, res) => {
  try {
    const { idempleo } = req.query
    const list = await service.getAllAsync(idempleo)
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/inscripcionesempleo/:id
router.get('/:id', async (req, res) => {
  try {
    const ins = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/inscripcionesempleo/postularse
router.post('/postularse', upload.single('cv'), async (req, res) => {
  try {
    const ins = await service.postularse(req.body, req.file)
    res.status(StatusCodes.CREATED).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/inscripcionesempleo/:id/estado
router.put('/:id/estado', async (req, res) => {
  try {
    const ins = await service.actualizarEstado(req.params.id, req.body.estado)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/inscripcionesempleo/:id/contratar
router.put('/:id/contratar', async (req, res) => {
  try {
    const ins = await service.marcarContratado(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
