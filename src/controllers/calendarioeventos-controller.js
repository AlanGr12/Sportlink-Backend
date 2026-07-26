import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import CalendarioEventosService from '../services/calendarioeventos-service.js'
import ClubesRepository from '../repositories/clubes-repository.js'
import { verificarToken } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new CalendarioEventosService()
const clubesRepo = new ClubesRepository()

// Todas las rutas del calendario requieren JWT válido
router.use(verificarToken)

/**
 * Para el rol Club, el frontend puede enviar ?idclub=N además del JWT.
 * El JWT da el idusuario genérico; el idclub permite resolver eventos
 * asociados al perfil de negocio del club.
 * Retorna el idusuario de negocio del club, o null si no se pudo resolver.
 */
async function resolverUsuarioPorClub(idclub) {
  const parsed = Number(idclub)
  if (isNaN(parsed) || parsed <= 0) return null
  const club = await clubesRepo.getByIdAsync(parsed)
  if (!club) return null
  const uid = Number(club.idusuario)
  return (!isNaN(uid) && uid > 0) ? uid : null
}

/** Responde 401 de forma consistente */
function sinAutenticacion(res, detalle = '') {
  console.warn(`[Calendario] 401 Sin autenticación${detalle ? ': ' + detalle : ''}`)
  return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'No autenticado', detail: detalle })
}

// ── GET /api/calendario ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // req.usuario viene del JWT verificado por el middleware
    let idUsuario = req.usuario.idusuario

    // Si el cliente es un Club y envía ?idclub, resolver el idusuario por la tabla clubes
    // (permite que el frontend use idclub como referencia de negocio sin exponer idusuario)
    if (req.query.idclub) {
      console.log(`[GET /api/calendario] Detectado ?idclub=${req.query.idclub}, resolviendo idusuario...`)
      const idPorClub = await resolverUsuarioPorClub(req.query.idclub)
      if (idPorClub) {
        // Solo sobreescribir si el idusuario del token coincide con el del club (seguridad)
        if (idPorClub === idUsuario) {
          idUsuario = idPorClub
        } else {
          console.warn(`[GET /api/calendario] idclub=${req.query.idclub} pertenece a idusuario=${idPorClub} pero el token es de idusuario=${idUsuario}`)
        }
      }
    }

    console.log(`[GET /api/calendario] Respondiendo eventos para idusuario=${idUsuario}`)

    const eventos = await service.getByUsuario(idUsuario)

    const mapped = (eventos || []).map(e => ({
      idEvento:            e.idevento            || null,
      tipo:                e.tipo,
      fecha:               e.fecha,
      horaInicio:          e.horainicio           || null,
      horaFin:             e.horafin              || null,
      idPrueba:            e.idprueba             || null,
      idEntrenamiento:     e.identrenamiento      || null,
      idInscripcionEmpleo: e.idinscripcionempleo  || null,
      titulo:              e.titulo               || null,
      descripcion:         e.descripcion          || null,
      imagen:              e.imagen               || null,
      _datosPrueba:        e._datosPrueba         || null,
    }))

    console.log(`[GET /api/calendario] Respondiendo ${mapped.length} evento(s) para usuario ${idUsuario}`)
    res.status(StatusCodes.OK).json(mapped)
  } catch (error) {
    console.error('[GET /api/calendario] Error 500:', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// ── POST /api/calendario ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const idUsuario = req.usuario.idusuario
    console.log(`[POST /api/calendario] idusuario=${idUsuario}`)

    const {
      tipo            = 'PERSONALIZADO',
      fecha,
      horainicio      = null,
      horafin         = null,
      idprueba        = null,
      identrenamiento = null,
      idinscripcionempleo = null,
      titulo          = null,
      descripcion     = null,
      imagen          = null,
    } = req.body

    if (!fecha) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'El campo fecha es obligatorio' })
    }

    const evento = await service.crearEvento({
      idusuario: idUsuario,
      tipo, fecha, horainicio, horafin,
      idprueba, identrenamiento, idinscripcionempleo,
      titulo, descripcion, imagen,
    })

    res.status(StatusCodes.CREATED).json({
      idEvento:    evento.idevento,
      tipo:        evento.tipo,
      fecha:       evento.fecha,
      horaInicio:  evento.horainicio,
      horaFin:     evento.horafin,
      titulo:      evento.titulo,
      descripcion: evento.descripcion,
      imagen:      evento.imagen,
    })
  } catch (error) {
    console.error('[POST /api/calendario] Error:', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// ── PUT /api/calendario/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const idUsuario = req.usuario.idusuario
    const idEvento = Number(req.params.id)

    if (isNaN(idEvento) || idEvento <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'ID de evento inválido' })
    }

    const { fecha, horainicio, horafin, titulo, descripcion, imagen } = req.body

    const evento = await service.editarEvento(idEvento, idUsuario, {
      fecha, horainicio, horafin, titulo, descripcion, imagen
    })

    res.status(StatusCodes.OK).json({
      idEvento:    evento.idevento,
      tipo:        evento.tipo,
      fecha:       evento.fecha,
      horaInicio:  evento.horainicio,
      titulo:      evento.titulo,
      descripcion: evento.descripcion,
      imagen:      evento.imagen,
    })
  } catch (error) {
    console.error('[PUT /api/calendario] Error:', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// ── DELETE /api/calendario/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const idUsuario = req.usuario.idusuario
    const idEvento = Number(req.params.id)

    if (isNaN(idEvento) || idEvento <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'ID de evento inválido' })
    }

    await service.eliminarEvento(idEvento, idUsuario)
    res.status(StatusCodes.OK).json({ ok: true, idEvento })
  } catch (error) {
    console.error('[DELETE /api/calendario] Error:', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
