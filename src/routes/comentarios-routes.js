import { Router } from 'express'
import { verificarToken } from '../middlewares/auth-middleware.js'
import comentariosController from '../controllers/comentarios-publicacion-controller.js'

const router = Router()

// Todas las rutas de comentarios requieren autenticación
router.use(verificarToken)

// PUT  /api/comentarios/:id  — editar comentario propio
router.put('/:id', comentariosController.putComentario)

// DELETE /api/comentarios/:id  — eliminar comentario propio
router.delete('/:id', comentariosController.deleteComentario)

export default router
