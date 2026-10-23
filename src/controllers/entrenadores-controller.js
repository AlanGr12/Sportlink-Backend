import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import EntrenadoresService from '../services/entrenadores-service.js'
import multer from 'multer'
import EntrenadorAnalyticsService from '../services/entrenador-analytics-service.js'
import { verificarToken } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new EntrenadoresService()
const analyticsService = new EntrenadorAnalyticsService()

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

// Solo entrenadores (o administradores) ven las estadísticas del panel
const soloEntrenadorOAdmin = (req, res, next) => {
  const esEntrenador = String(req.usuario?.tipousuario || '').toLowerCase() === 'entrenador'
  if (esEntrenador || req.usuario?.es_admin === true) return next()
  res.status(StatusCodes.FORBIDDEN).json({ error: 'Acceso denegado. Solo los entrenadores pueden ver su panel.' })
}

// GET /api/entrenadores/panel/estadisticas?rango=mes|trimestre|historico[&identrenador=N (solo admin)]
router.get('/panel/estadisticas', verificarToken, soloEntrenadorOAdmin, async (req, res) => {
  try {
    const entrenador = await analyticsService.resolverEntrenador(req.usuario, req.query.identrenador)
    const datos = await analyticsService.obtenerEstadisticas(entrenador, req.query.rango || 'historico')
    res.status(StatusCodes.OK).json(datos)
  } catch (error) {
    if (!error.status) console.error('[ENTRENADOR ESTADISTICAS ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/entrenadores/panel/exportar?tipo=entrenamientos|alumnos&rango=... — CSV
router.get('/panel/exportar', verificarToken, soloEntrenadorOAdmin, async (req, res) => {
  try {
    const entrenador = await analyticsService.resolverEntrenador(req.usuario, req.query.identrenador)
    const { nombreArchivo, csv } = await analyticsService.exportarCsv(entrenador, req.query.rango || 'historico', req.query.tipo || 'entrenamientos')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.status(StatusCodes.OK).send(csv)
  } catch (error) {
    if (!error.status) console.error('[ENTRENADOR EXPORTAR ERROR]', error)
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