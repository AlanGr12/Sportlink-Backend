import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import UsuariosService from '../services/usuarios-service.js'
import { verificarToken, esAdmin } from '../middlewares/auth-middleware.js'
import moderacionService from '../services/moderacion-service.js'
import multer from 'multer'

const router = Router()
const service = new UsuariosService()

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

// POST /api/login
// Pública — valida credenciales y devuelve { token, perfil }
router.post('/', async (req, res) => {
  const { email, contraseña } = req.body
  try {
    const resultado = await service.loginAsync(email, contraseña)
    res.status(StatusCodes.OK).json(resultado)
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      ...(error.codigo && { codigo: error.codigo }),
      mensaje: error.message,
      error: error.message
    })
  }
})

// PUT /api/login/perfil/biografia
// Protegida con JWT — el usuario autenticado actualiza su biografía
router.put('/perfil/biografia', verificarToken, async (req, res) => {
  const idusuario = req.usuario?.idusuario
  if (!idusuario) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Usuario no autenticado' })
  }

  const { biografia } = req.body
  try {
    const usuarioActualizado = await service.actualizarBiografiaAsync(idusuario, biografia)
    res.status(StatusCodes.OK).json({
      mensaje: 'Biografía actualizada correctamente',
      biografia: usuarioActualizado?.biografia ?? biografia,
      usuario: usuarioActualizado
    })
  } catch (error) {
    console.error('[ACTUALIZAR BIOGRAFIA ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/login/perfil/foto
// Protegida con JWT — el usuario autenticado cambia su foto de perfil (multipart, campo "foto")
// IMPORTANTE: debe declararse antes de PUT /perfil/:idusuario
router.put('/perfil/foto', verificarToken, (req, res) => {
  upload.single('foto')(req, res, async (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar los 5 MB' : err.message
      return res.status(StatusCodes.BAD_REQUEST).json({ error: mensaje })
    }

    const { idusuario, tipousuario } = req.usuario || {}
    if (!idusuario) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Usuario no autenticado' })
    }

    try {
      const fotoperfil = await service.actualizarFotoPerfilAsync(idusuario, tipousuario, req.file)
      res.status(StatusCodes.OK).json({ mensaje: 'Foto de perfil actualizada correctamente', fotoperfil })
    } catch (error) {
      console.error('[ACTUALIZAR FOTO ERROR]', error)
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  })
})

// GET /api/login/perfil/:idusuario
// Protegida con JWT — consulta de perfil con biografia incluida
router.get('/perfil/:idusuario', verificarToken, async (req, res) => {
  const { idusuario } = req.params
  try {
    const perfil = await service.getPerfilCompletoAsync(Number(idusuario), req.usuario)
    res.status(StatusCodes.OK).json(perfil)
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// PUT /api/login/perfil/:idusuario
// Protegida con JWT — actualiza perfil validando que el usuario sea el dueño
router.put('/perfil/:idusuario', verificarToken, async (req, res) => {
  const idToken = req.usuario?.idusuario
  const { idusuario } = req.params

  if (Number(idToken) !== Number(idusuario)) {
    return res.status(StatusCodes.FORBIDDEN).json({ error: 'No tienes permiso para actualizar este perfil' })
  }

  const { biografia } = req.body
  try {
    const usuarioActualizado = await service.actualizarBiografiaAsync(Number(idusuario), biografia)
    res.status(StatusCodes.OK).json({
      mensaje: 'Perfil actualizado correctamente',
      biografia: usuarioActualizado?.biografia ?? biografia,
      usuario: usuarioActualizado
    })
  } catch (error) {
    console.error('[ACTUALIZAR PERFIL ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// DELETE /api/usuarios/:id — solo administradores (montado en /api/usuarios en server.js)
export const usuariosAdminRouter = Router()
usuariosAdminRouter.delete('/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    await moderacionService.eliminarUsuario(req.params.id, req.usuario)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    console.error('[ELIMINAR USUARIO ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router