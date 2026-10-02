import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import UsuariosService from '../services/usuarios-service.js'
import { verificarToken } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new UsuariosService()

// POST /api/login
// Pública — valida credenciales y devuelve { token, perfil }
router.post('/', async (req, res) => {
  const { email, contraseña } = req.body
  try {
    const resultado = await service.loginAsync(email, contraseña)
    res.status(StatusCodes.OK).json(resultado)
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
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

// GET /api/login/perfil/:idusuario
// Protegida con JWT — consulta de perfil con biografia incluida
router.get('/perfil/:idusuario', verificarToken, async (req, res) => {
  const { idusuario } = req.params
  try {
    const perfil = await service.getPerfilCompletoAsync(Number(idusuario))
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

export default router