import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import PruebasService from '../services/pruebas-service.js'
import PruebaXJugador from '../services/pruebaxjugador.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'
import ListaEsperaService from '../services/lista-espera-service.js'
import moderacionService from '../services/moderacion-service.js'
import multer from 'multer'

const router = Router()
const service = new PruebasService()
const service2 = new PruebaXJugador()

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

// GET /api/pruebas
router.get('/', async (req, res) => {
  try {
    const pruebas = await service.getAllAsync()
    res.status(StatusCodes.OK).json(pruebas)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/pruebas/deporte
router.get('/deporte', async (req, res) => {
  try {
    const idJugador = req.query.idJugador || req.query.id
    if (!idJugador) throw { status: 400, message: 'El id del jugador es obligatorio' }
    const pruebasDeporte = await service2.getAllDeporteAsync(idJugador)
    res.status(StatusCodes.OK).json(pruebasDeporte)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

const handlerCrearPrueba = async (req, res) => {
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

    const prueba = await service.crearPrueba(payload, req.file, req.usuario.idusuario)
    res.status(StatusCodes.OK).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// POST /api/pruebas/crearPrueba — Solo clubes pueden crear pruebas
router.post('/crearPrueba', verificarToken, requiereRol('club'), upload.single('imagen'), handlerCrearPrueba)

// POST /api/pruebas — Alias estándar REST
router.post('/', verificarToken, requiereRol('club'), upload.single('imagen'), handlerCrearPrueba)

// ── Lista de espera (/api/pruebas/:id/lista-espera) — solo jugadores ──
const listaEspera = new ListaEsperaService('prueba')
const handlerListaEspera = (accion) => async (req, res) => {
  try {
    const result = await listaEspera[accion](req.params.id, req.usuario.idusuario)
    res.status(accion === 'anotarse' ? StatusCodes.CREATED : StatusCodes.OK).json(result)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}
router.post('/:id/lista-espera', verificarToken, requiereRol('jugador'), handlerListaEspera('anotarse'))
router.delete('/:id/lista-espera', verificarToken, requiereRol('jugador'), handlerListaEspera('salir'))
router.get('/:id/lista-espera/posicion', verificarToken, requiereRol('jugador'), handlerListaEspera('obtenerPosicion'))

// GET /api/pruebas/:id
router.get('/:id', async (req, res) => {
  try {
    const prueba = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

const handlerActualizarPrueba = async (req, res) => {
  try {
    const idPrueba = Number(req.params.id)
    if (isNaN(idPrueba) || idPrueba <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'ID inválido' })
    }

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
      ...(direccion !== undefined && { direccion: direccion === '' ? null : direccion }),
      ...(latitud !== undefined && { latitud: latitud === '' ? null : latitud }),
      ...(longitud !== undefined && { longitud: longitud === '' ? null : longitud }),
    }

    const prueba = await service.actualizarPruebaAsync(idPrueba, payload, req.file, req.usuario?.idusuario)
    res.status(StatusCodes.OK).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
}

// PUT /api/pruebas/:id — Actualización de prueba
router.put('/:id', verificarToken, requiereRol('club'), upload.single('imagen'), handlerActualizarPrueba)

// PUT /api/pruebas/actualizarPrueba/:id — Alias
router.put('/actualizarPrueba/:id', verificarToken, requiereRol('club'), upload.single('imagen'), handlerActualizarPrueba)

// DELETE /api/pruebas/:id — dueño del recurso o administrador
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    await moderacionService.eliminarPrueba(req.params.id, req.usuario)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router