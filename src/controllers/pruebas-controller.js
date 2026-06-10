import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'
import PruebasService from '../services/pruebas-service.js'

const router = Router()
const service = new PruebasService()

// GET /api/pruebas
router.get('/', async (req, res) => {
  try {
    const pruebas = await service.getAllAsync()
    res.status(StatusCodes.OK).json(pruebas)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

router.post('/crearPrueba', async (req, res) => {
    const {cupo,
horainicio,
 horafin,
 estado,
descripcion,
 imagen,
categoria,
 zona,
genero,
fechaprueba,
fechacierre,
createdat,
deporte } = req.body
  try {
    const prueba = await service.crearPrueba(cupo,
horainicio,
 horafin,
 estado,
descripcion,
 imagen,
categoria,
 zona,
genero,
fechaprueba,
fechacierre,
createdat,
deporte)
    res.status(StatusCodes.OK).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }
})

// GET /api/pruebas/:id
router.get('/:id', async (req, res) => {
  try {
    const prueba = await service.getByIdAsync(req.params.id)
    res.status(StatusCodes.CREATED).json(prueba)
  } catch (error) {
    res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
  }})

export default router