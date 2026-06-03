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
  console.log("BODY")
  console.log(req.body)

  console.log("FILE")
  console.log(req.file)

  try {
    const club = await service.registrarClubAsync(req.body, req.file)
    res.status(StatusCodes.CREATED).json(club)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router