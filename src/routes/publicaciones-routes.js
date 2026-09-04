import { Router } from 'express'
import multer from 'multer'
import { verificarToken } from '../middlewares/auth-middleware.js'
import publicacionesController from '../controllers/publicaciones-controller.js'
import likesController from '../controllers/likes-publicacion-controller.js'
import comentariosController from '../controllers/comentarios-publicacion-controller.js'

const router = Router()

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

// ── Ruta pública (compartir) — SIN autenticación. Debe ir ANTES de router.use(verificarToken) ──
router.get('/compartir/:id', publicacionesController.getPublicacionPublica)

// Todas las rutas de abajo requieren autenticación
router.use(verificarToken)

// ── CRUD Publicaciones ────────────────────────────────────────────────────
router.get('/',    publicacionesController.getPublicaciones)
router.get('/:id', publicacionesController.getPublicacionById)
router.post('/',   upload.single('imagen'), publicacionesController.postPublicacion)
router.put('/:id', upload.single('imagen'), publicacionesController.putPublicacion)
router.delete('/:id', publicacionesController.deletePublicacion)

// ── Likes ─────────────────────────────────────────────────────────────────
router.post('/:id/like',   likesController.postLike)
router.delete('/:id/like', likesController.deleteLike)

// ── Comentarios (subrutas de una publicación) ─────────────────────────────
router.get('/:id/comentarios',  comentariosController.getComentarios)
router.post('/:id/comentarios', comentariosController.postComentario)

export default router