import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import InscripcionesPruebaService from '../services/inscripcionesprueba-service.js'
import { verificarToken, requiereRol } from '../middlewares/auth-middleware.js'

const router = Router()
const service = new InscripcionesPruebaService()

// GET /api/inscripcionesprueba — Requiere autenticación
router.get('/', verificarToken, async (req, res) => {
  try {
    const { idprueba } = req.query
    const list = await service.getAllAsync(idprueba)
    res.status(StatusCodes.OK).json(list)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// POST /api/inscripcionesprueba — Solo jugadores pueden inscribirse a pruebas
router.post('/', verificarToken, requiereRol('jugador'), async (req, res) => {
  try {
    const ins = await service.crearInscripcion(req.body, req.usuario.idusuario)
    res.status(StatusCodes.CREATED).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// DELETE /api/inscripcionesprueba/:idprueba
router.delete('/:idprueba', verificarToken, requiereRol('jugador'), async (req, res) => {
  try {
    const idprueba = req.params.idprueba
    const result = await service.borrarInscripcion(idprueba, req.usuario.idusuario)
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/inscripcionesprueba/:id
router.get('/:id', async (req, res) => {
  try {
    const ins = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.OK).json(ins)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

export default router
