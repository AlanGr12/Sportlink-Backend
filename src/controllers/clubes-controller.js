import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import ClubesService from '../services/clubes-service.js'
import multer from 'multer'

const router = Router()
const service = new ClubesService()

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

// GET /api/clubes
router.get('/', async (req, res) => {
  try {
    const clubes = await service.getAllAsync()
    res.status(StatusCodes.OK).json(clubes)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/clubes/perfil/:id
router.get('/perfil/:id', async (req, res) => {
  try {
    const club = await service.obtenerPerfilAsync(req.params.id)
    res.status(StatusCodes.OK).json(club)
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
router.post('/registro', upload.single('fotoperfil'), async (req, res) => {
  try {
    const club = await service.registrarClubAsync(req.body, req.file)
    res.status(StatusCodes.CREATED).json(club)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

const handlerActualizarClub = async (req, res) => {
  try {
    const direccion = (req.body.direccion === '' || req.body.direccion === undefined || req.body.direccion === null)
      ? (req.body.direccion ?? null)
      : req.body.direccion

    const latitud = (req.body.latitud === '' || req.body.latitud === undefined || req.body.latitud === null)
      ? (req.body.latitud ?? null)
      : Number(req.body.latitud)

    const longitud = (req.body.longitud === '' || req.body.longitud === undefined || req.body.longitud === null)
      ? (req.body.longitud ?? null)
      : Number(req.body.longitud)

    const payload = {
      ...req.body,
      direccion: direccion === '' ? null : direccion,
      latitud: latitud === '' ? null : latitud,
      longitud: longitud === '' ? null : longitud
    }

    const club = await service.actualizarPerfilClubAsync(req.params.id, payload, req.file)
    res.status(StatusCodes.OK).json(club)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// PUT /api/clubes/:id
router.put('/:id', upload.single('fotoperfil'), handlerActualizarClub)

// PUT /api/clubes/perfil/:id
router.put('/perfil/:id', upload.single('fotoperfil'), handlerActualizarClub)

export default router