import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import UsuariosService from '../services/usuarios-service.js'

const router = Router()
const service = new UsuariosService()


router.post('/', async (req, res) => {
    const { email, contraseña } = req.body
  try {
    const usuario = await service.loginAsync(email,contraseña) 
    res.status(StatusCodes.OK).json(usuario)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})


router.get('/perfil/:idusuario', async (req, res) => {
  const { idusuario } = req.params
  try {
    const perfil = await service.getPerfilCompletoAsync(Number(idusuario))
    res.status(StatusCodes.OK).json(perfil)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router