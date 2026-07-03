import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import CalendarioEventosService from '../services/calendarioeventos-service.js'

const router = Router()
const service = new CalendarioEventosService()

// GET /api/calendario  -> eventos del usuario autenticado (usa header X-User-Id si no hay auth middleware)
router.get('/', async (req, res) => {
  try {
    const headerId = req.headers['x-user-id'] || req.headers['x-user-Id']
    const idUsuario = req.user?.idusuario || req.user?.id || (headerId ? Number(headerId) : null)
    if (!idUsuario) return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Usuario no identificado' })

    const eventos = await service.getByUsuario(idUsuario)
    const mapped = (eventos || []).map(e => ({
      idEvento: e.idevento,
      tipo: e.tipo,
      fecha: e.fecha,
      horaInicio: e.horainicio,
      horaFin: e.horafin,
      idPrueba: e.idprueba,
      idEntrenamiento: e.identrenamiento,
      idInscripcionEmpleo: e.idinscripcionempleo
    }))

    res.status(StatusCodes.OK).json(mapped)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
