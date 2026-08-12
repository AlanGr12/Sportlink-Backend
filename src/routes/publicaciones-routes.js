import { Router } from 'express'
import multer from 'multer'
import { verificarToken } from '../middlewares/auth-middleware.js'
import publicacionesController from '../controllers/publicaciones-controller.js'

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

// Todas las rutas de publicaciones requieren estar autenticadas
router.use(verificarToken)

router.get('/', publicacionesController.getPublicaciones)
router.get('/:id', publicacionesController.getPublicacionById)
router.post('/', upload.single('imagen'), publicacionesController.postPublicacion)
router.put('/:id', publicacionesController.putPublicacion)
router.delete('/:id', publicacionesController.deletePublicacion)

export default router
