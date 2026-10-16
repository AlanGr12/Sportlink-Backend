import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import ClubesService from '../services/clubes-service.js'
import multer from 'multer'
import { autenticacionOpcional, verificarToken } from '../middlewares/auth-middleware.js'
import ClubesRepository from '../repositories/clubes-repository.js'
import VinculacionesService from '../services/vinculaciones-service.js'
import ClubAnalyticsService from '../services/club-analytics-service.js'

const router = Router()
const service = new ClubesService()
const clubesRepository = new ClubesRepository()
const vinculacionesService = new VinculacionesService()
const analyticsService = new ClubAnalyticsService()

// Solo el club dueño del perfil (o un administrador) puede modificarlo
const soloDuenioDelClub = async (req, res, next) => {
  try {
    if (req.usuario.es_admin === true) return next()
    const club = await clubesRepository.getByIdAsync(req.params.id).catch(() => null)
    if (!club) return res.status(StatusCodes.NOT_FOUND).json({ error: 'No se encontró el club' })
    if (Number(club.idusuario) !== Number(req.usuario.idusuario)) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'No tenés permiso para modificar este club' })
    }
    next()
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

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
// ── Backoffice del club (estadísticas) ──────────────────────────────────────
// Declarado antes de las rutas /:id. Acceso: usuario de tipo club o administrador.
const soloClubOAdmin = (req, res, next) => {
  const esClub = String(req.usuario?.tipousuario || '').toLowerCase() === 'club'
  if (esClub || req.usuario?.es_admin === true) return next()
  res.status(StatusCodes.FORBIDDEN).json({ error: 'Acceso denegado. Solo los clubes pueden ver sus estadísticas.' })
}

// GET /api/clubes/backoffice/estadisticas?rango=mes|trimestre|historico[&idclub=N (solo admin)]
router.get('/backoffice/estadisticas', verificarToken, soloClubOAdmin, async (req, res) => {
  try {
    const club = await analyticsService.resolverClub(req.usuario, req.query.idclub)
    const datos = await analyticsService.obtenerEstadisticas(club, req.query.rango || 'historico')
    res.status(StatusCodes.OK).json(datos)
  } catch (error) {
    if (!error.status) console.error('[CLUB ESTADISTICAS ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/clubes/backoffice/exportar?tipo=entrenamientos|pruebas|entrenadores&rango=... — CSV
router.get('/backoffice/exportar', verificarToken, soloClubOAdmin, async (req, res) => {
  try {
    const club = await analyticsService.resolverClub(req.usuario, req.query.idclub)
    const { nombreArchivo, csv } = await analyticsService.exportarCsv(club, req.query.rango || 'historico', req.query.tipo || 'entrenamientos')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.status(StatusCodes.OK).send(csv)
  } catch (error) {
    if (!error.status) console.error('[CLUB EXPORTAR ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const clubes = await service.getAllAsync()
    res.status(StatusCodes.OK).json(clubes)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/clubes/perfil/:id
router.get('/perfil/:id', autenticacionOpcional, async (req, res) => {
  try {
    const club = await service.obtenerPerfilAsync(req.params.id, req.usuario)
    res.status(StatusCodes.OK).json(club)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/clubes/:id
router.get('/:id', autenticacionOpcional, async (req, res) => {
  try {
    const club = await service.getByIdAsync(req.params.id, req.usuario)
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

// GET /api/clubes/:id/entrenadores — entrenadores vinculados (estado ACEPTADO) del club
router.get('/:id/entrenadores', async (req, res) => {
  try {
    res.status(StatusCodes.OK).json(await vinculacionesService.obtenerEntrenadoresDelClub(req.params.id))
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/clubes/:id
router.put('/:id', verificarToken, soloDuenioDelClub, upload.single('fotoperfil'), handlerActualizarClub)

// PUT /api/clubes/perfil/:id
router.put('/perfil/:id', verificarToken, soloDuenioDelClub, upload.single('fotoperfil'), handlerActualizarClub)

export default router