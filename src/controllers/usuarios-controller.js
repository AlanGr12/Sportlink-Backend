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

// GET /api/login/perfil/:idusuario
// Protegida con JWT — el usuario solo puede consultar su propio perfil
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

export default router