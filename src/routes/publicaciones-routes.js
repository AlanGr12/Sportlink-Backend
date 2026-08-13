import { Router } from 'express'
import multer from 'multer'
import PublicacionesController from '../controllers/publicaciones-controller.js'
import { verificarToken } from '../middlewares/auth-middleware.js'

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

// Todos los endpoints protegidos
router.use(verificarToken)

router.get('/', PublicacionesController.getAll)
router.get('/:id', PublicacionesController.getById)
router.post('/', upload.single('imagen'), PublicacionesController.create)
router.put('/:id', PublicacionesController.update)
router.delete('/:id', PublicacionesController.delete)

export default router
