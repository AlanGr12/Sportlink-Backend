import { StatusCodes } from 'http-status-codes'
import publicacionesService from '../services/publicaciones-service.js'

class PublicacionesController {
  async getPublicaciones(req, res) {
    try {
      const { page, limit } = req.query
      const result = await publicacionesService.getPublicaciones(page, limit)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async getPublicacionById(req, res) {
    try {
      const publicacion = await publicacionesService.getPublicacionById(req.params.id)
      res.status(StatusCodes.OK).json(publicacion)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async postPublicacion(req, res) {
    try {
      const publicacion = await publicacionesService.crearPublicacion(
        req.body,
        req.file,
        req.usuario.idusuario
      )
      res.status(StatusCodes.CREATED).json(publicacion)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async putPublicacion(req, res) {
    try {
      const { contenido, quitarImagen } = req.body
      const publicacion = await publicacionesService.actualizarPublicacion(
        req.params.id,
        req.usuario.idusuario,
        contenido,
        req.file || null,
        quitarImagen === 'true' || quitarImagen === true
      )
      res.status(StatusCodes.OK).json(publicacion)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  async deletePublicacion(req, res) {
    try {
      await publicacionesService.eliminarPublicacion(req.params.id, req.usuario.idusuario)
      res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }
}

export default new PublicacionesController()