import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrenamientosService from '../services/entrenamientos-service.js'
import EntrenamientoXJugador from '../services/entrenamientoxjugador.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'
import multer from 'multer'

const router = Router()
const service = new EntrenamientosService()
const service2 = new EntrenamientoXJugador()

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

// GET /api/entrenamientos/deporte?idJugador=...
//ejemplo GET /api/entrenamientos/deporte?idJugador=5
router.get('/deporte', async (req, res) => {
  try {
    const idJugador = req.query.idJugador || req.query.id
    if (!idJugador) throw { status: 400, message: 'El id del jugador es obligatorio' }
    const entrenamientosDeporte = await service2.getAllDeporteAsync(idJugador)
    res.status(StatusCodes.OK).json(entrenamientosDeporte)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/entrenamientos/mios?identrenador=N — Solo el entrenador autenticado puede ver sus propios entrenamientos
router.get('/mios', verificarToken, requiereRol('entrenador'), async (req, res) => {
  try {
    const identrenador = req.query.identrenador
    if (!identrenador || isNaN(Number(identrenador))) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'El parámetro identrenador es obligatorio y debe ser numérico'
      })
    }
    // Fuerza el filtro: aunque vengan otros query params, identrenador no es negociable
    const filtros = { ...req.query, identrenador: Number(identrenador) }
    const list = await service.getAllAsyncWithFilters(filtros)
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/entrenamientos — Solo entrenadores pueden crear entrenamientos
router.post('/', verificarToken, requiereRol('entrenador'), upload.single('imagen'), async (req, res) => {
  try {
    const ent = await service.crearEntrenamiento(req.body, req.file, req.usuario.idusuario)
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