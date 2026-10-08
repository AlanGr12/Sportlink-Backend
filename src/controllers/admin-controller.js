import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import verificarAdmin from '../middlewares/verificarAdmin.js'
import adminService from '../services/admin-service.js'

const router = Router()

// Todas las rutas de administración están protegidas estrictamente con verificarAdmin
router.use(verificarAdmin)

const responder = (fn) => async (req, res) => {
  try {
    const data = await fn(req)
    res.status(StatusCodes.OK).json(data)
  } catch (error) {
    console.error('[ADMIN CONTROLLER ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message || 'Error interno' })
  }
}

// ── B. Métricas y KPIs ──────────────────────────────────────
// GET /api/admin/kpis
router.get('/kpis', responder(() => adminService.getKPIs()))

// ── C. Gestión y Moderación de Clubes ───────────────────────
// GET /api/admin/clubes?estado=PENDIENTE | APROBADO | RECHAZADO
router.get('/clubes', responder((req) => adminService.getClubesModeracion({ estado: req.query.estado })))

// PATCH /api/admin/clubes/:idclub/estado  Body: { estado: 'APROBADO' | 'RECHAZADO' }
router.patch('/clubes/:idclub/estado', async (req, res) => {
  try {
    const { estado } = req.body
    const club = await adminService.actualizarEstadoClub(req.params.idclub, estado, req.usuario)
    res.status(StatusCodes.OK).json({ mensaje: `Club actualizado a ${estado}`, club })
  } catch (error) {
    console.error('[ADMIN PATCH CLUB ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message || 'Error actualizando estado del club' })
  }
})

// ── D. Explorador de Usuarios ───────────────────────────────
// GET /api/admin/usuarios?page=1&limit=15&search=&rol=
router.get('/usuarios', responder((req) => adminService.getUsuarios({
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 15,
  search: req.query.search || '',
  rol: req.query.rol || ''
})))

// PATCH /api/admin/usuarios/:id/admin  Body: { es_admin: boolean }
router.patch('/usuarios/:id/admin', async (req, res) => {
  try {
    const { es_admin } = req.body
    const usuario = await adminService.toggleAdminUsuario(req.params.id, es_admin, req.usuario)
    res.status(StatusCodes.OK).json({ mensaje: 'Permisos de usuario actualizados', usuario })
  } catch (error) {
    console.error('[ADMIN TOGGLE ADMIN ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message || 'Error actualizando permisos' })
  }
})

// DELETE /api/admin/usuarios/:id
router.delete('/usuarios/:id', async (req, res) => {
  try {
    await adminService.eliminarUsuario(req.params.id, req.usuario)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    console.error('[ADMIN DELETE USUARIO ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message || 'Error eliminando usuario' })
  }
})

// ── E. Moderación de Publicaciones ──────────────────────────
// GET /api/admin/publicaciones?page=1&limit=15&search=
router.get('/publicaciones', responder((req) => adminService.getPublicaciones({
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 15,
  search: req.query.search || ''
})))

// DELETE /api/admin/publicaciones/:id
router.delete('/publicaciones/:id', async (req, res) => {
  try {
    await adminService.eliminarPublicacion(req.params.id, req.usuario)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    console.error('[ADMIN DELETE PUBLICACION ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message || 'Error eliminando publicación' })
  }
})

// ── F. Explorador de Actividades (Pruebas y Entrenamientos) ───
// GET /api/admin/eventos?tipo=PRUEBAS | ENTRENAMIENTOS&page=1&limit=15
router.get('/eventos', responder((req) => adminService.getEventos({
  tipo: req.query.tipo || 'PRUEBAS',
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 15
})))

export default router
