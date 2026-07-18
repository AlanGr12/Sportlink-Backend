import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import CalendarioEventosService from '../services/calendarioeventos-service.js'
import ClubesRepository from '../repositories/clubes-repository.js'

const router = Router()
const service = new CalendarioEventosService()
const clubesRepo = new ClubesRepository()

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extrae el idusuario desde múltiples fuentes posibles del request.
 * Orden de prioridad:
 *   1. req.user (si hay middleware de sesión/JWT configurado)
 *   2. Header 'x-user-id' (normalizado a minúsculas por Express/Node)
 *   3. Query param ?userId=
 *
 * Retorna un Number > 0 o null si no se pudo resolver.
 */
function resolverUsuario(req) {
  // 1. Sesión/JWT (si se implementa en el futuro)
  if (req.user?.idusuario) return Number(req.user.idusuario)
  if (req.user?.id)        return Number(req.user.id)

  // 2. Header personalizado — Express normaliza todos los headers a minúsculas
  //    El frontend envía 'X-User-Id' pero Express lo recibe como 'x-user-id'
  const headerRaw = req.headers['x-user-id']
  if (headerRaw !== undefined && headerRaw !== '' && headerRaw !== 'undefined' && headerRaw !== 'null') {
    const parsed = Number(headerRaw)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  // 3. Query param de fallback (idusuario directo)
  const queryRaw = req.query.userId || req.query.idusuario
  if (queryRaw !== undefined && queryRaw !== '') {
    const parsed = Number(queryRaw)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  // Nota: ?idclub se resuelve de forma asíncrona directamente en el handler GET
  return null
}

/**
 * Resuelve el idusuario a partir de un idclub de negocio.
 * Retorna Number > 0 si el club existe, o null en caso contrario.
 */
async function resolverUsuarioPorClub(idclub) {
  const parsed = Number(idclub)
  if (isNaN(parsed) || parsed <= 0) return null
  const club = await clubesRepo.getByIdAsync(parsed)
  if (!club) return null
  const uid = Number(club.idusuario)
  return (!isNaN(uid) && uid > 0) ? uid : null
}

/** Responde 401 de forma elegante cuando no hay usuario identificado */
function sinAutenticacion(res, detalle = '') {
  console.warn(`[Calendario] 401 Sin autenticación${detalle ? ': ' + detalle : ''}`)
  return res.status(StatusCodes.UNAUTHORIZED).json({
    error:  'No autenticado',
    detail: 'Incluí el header X-User-Id con el idusuario del usuario en sesión.',
  })
}

// ── GET /api/calendario ───────────────────────────────────────────────────────
// Devuelve eventos propios del usuario + pruebas automáticas de inscripciones
router.get('/', async (req, res) => {
  try {
    // Intentar resolver idusuario directo primero
    let idUsuario = resolverUsuario(req)

    // Si no vino x-user-id / userId, intentar resolver por idclub (rol Club)
    if (!idUsuario && req.query.idclub) {
      console.log(`[GET /api/calendario] Detectado ?idclub=${req.query.idclub}, resolviendo idusuario...`)
      idUsuario = await resolverUsuarioPorClub(req.query.idclub)
      if (!idUsuario) {
        return res.status(StatusCodes.NOT_FOUND).json({
          error: `No se encontró el club con idclub=${req.query.idclub} o no tiene idusuario asociado.`
        })
      }
      console.log(`[GET /api/calendario] idclub=${req.query.idclub} → idusuario resuelto: ${idUsuario}`)
    }

    console.log(`[GET /api/calendario] x-user-id raw="${req.headers['x-user-id']}" → idUsuario resuelto: ${idUsuario}`)

    if (!idUsuario) return sinAutenticacion(res, `header recibido: "${req.headers['x-user-id']}"`)

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
      // _datosPrueba: campo extra adjuntado por el repository para pruebas automáticas
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
// Crea un evento personalizado. Si viene imagen en base64, la sube al bucket
// 'fotoCalendario' vía el repositorio y guarda la URL pública en la BD.
router.post('/', async (req, res) => {
  try {
    const idUsuario = resolverUsuario(req)
    console.log(`[POST /api/calendario] idUsuario resuelto: ${idUsuario}`)

    if (!idUsuario) return sinAutenticacion(res)

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
      imagen          = null,   // puede ser: data URL base64 | URL pública | null
    } = req.body

    if (!fecha) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'El campo fecha es obligatorio' })
    }

    const evento = await service.crearEvento({
      idusuario: idUsuario,
      tipo,
      fecha,
      horainicio,
      horafin,
      idprueba,
      identrenamiento,
      idinscripcionempleo,
      titulo,
      descripcion,
      imagen,   // el repository detecta si es base64 y lo sube al storage
    })

    res.status(StatusCodes.CREATED).json({
      idEvento:    evento.idevento,
      tipo:        evento.tipo,
      fecha:       evento.fecha,
      horaInicio:  evento.horainicio,
      horaFin:     evento.horafin,
      titulo:      evento.titulo,
      descripcion: evento.descripcion,
      imagen:      evento.imagen,   // URL pública del bucket (o null)
    })
  } catch (error) {
    console.error('[POST /api/calendario] Error:', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// ── PUT /api/calendario/:id ───────────────────────────────────────────────────
// Edita un evento personalizado (solo si es del usuario autenticado)
router.put('/:id', async (req, res) => {
  try {
    const idUsuario = resolverUsuario(req)
    console.log(`[PUT /api/calendario/${req.params.id}] idUsuario resuelto: ${idUsuario}`)

    if (!idUsuario) return sinAutenticacion(res)

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
// Borra un evento personalizado. Solo puede hacerlo el dueño.
router.delete('/:id', async (req, res) => {
  try {
    const idUsuario = resolverUsuario(req)
    console.log(`[DELETE /api/calendario/${req.params.id}] idUsuario resuelto: ${idUsuario}`)

    if (!idUsuario) return sinAutenticacion(res)

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
