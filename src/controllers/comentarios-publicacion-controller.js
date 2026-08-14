import { StatusCodes } from 'http-status-codes'
import comentariosService from '../services/comentarios-publicacion-service.js'

class ComentariosPublicacionController {

  // GET /api/publicaciones/:id/comentarios
  async getComentarios(req, res) {
    try {
      const comentarios = await comentariosService.getComentarios(req.params.id)
      res.status(StatusCodes.OK).json(comentarios)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  // POST /api/publicaciones/:id/comentarios
  async postComentario(req, res) {
    try {
      const { contenido } = req.body
      const comentario = await comentariosService.crearComentario(
        req.params.id,
        req.usuario.idusuario,
        contenido
      )
      res.status(StatusCodes.CREATED).json(comentario)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  // PUT /api/comentarios/:id
  async putComentario(req, res) {
    try {
      const { contenido } = req.body
      const comentario = await comentariosService.actualizarComentario(
        req.params.id,
        req.usuario.idusuario,
        contenido
      )
      res.status(StatusCodes.OK).json(comentario)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  // DELETE /api/comentarios/:id
  async deleteComentario(req, res) {
    try {
      await comentariosService.eliminarComentario(req.params.id, req.usuario.idusuario)
      res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }
}

export default new ComentariosPublicacionController()
