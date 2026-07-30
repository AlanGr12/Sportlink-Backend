import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import InscripcionesEmpleoService from '../services/inscripcionesempleo-service.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'
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

// POST /api/inscripcionesempleo/postularse — Solo entrenadores pueden postularse a empleos
router.post('/postularse', verificarToken, requiereRol('entrenador'), upload.single('cv'), async (req, res) => {
  try {
    const ins = await service.postularse(req.body, req.file, req.usuario.idusuario)
    res.status(StatusCodes.CREATED).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/inscripcionesempleo/:id/estado — Solo clubes pueden cambiar el estado de una postulación
router.put('/:id/estado', verificarToken, requiereRol('club'), async (req, res) => {
  try {
    const ins = await service.actualizarEstado(req.params.id, req.body.estado)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/inscripcionesempleo/:id/contratar — Solo clubes pueden marcar como contratado
router.put('/:id/contratar', verificarToken, requiereRol('club'), async (req, res) => {
  try {
    const ins = await service.marcarContratado(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
