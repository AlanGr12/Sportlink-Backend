import service from '../services/publicaciones-service.js'
import { StatusCodes } from 'http-status-codes'

class PublicacionesController {
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const result = await service.getAll(page, limit)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async getById(req, res) {
    try {
      const result = await service.getById(req.params.id)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async create(req, res) {
    try {
      const result = await service.create(req.body, req.file, req.usuario.idusuario)
      res.status(StatusCodes.CREATED).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async update(req, res) {
    try {
      const result = await service.update(req.params.id, req.body, req.usuario.idusuario)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async delete(req, res) {
    try {
      await service.delete(req.params.id, req.usuario.idusuario)
      res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }
}

export default new PublicacionesController()
