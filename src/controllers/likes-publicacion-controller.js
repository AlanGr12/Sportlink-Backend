import { StatusCodes } from 'http-status-codes'
import likesService from '../services/likes-publicacion-service.js'

class LikesPublicacionController {

  // POST /api/publicaciones/:id/like
  async postLike(req, res) {
    try {
      const result = await likesService.darLike(req.params.id, req.usuario.idusuario)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }

  // DELETE /api/publicaciones/:id/like
  async deleteLike(req, res) {
    try {
      const result = await likesService.sacarLike(req.params.id, req.usuario.idusuario)
      res.status(StatusCodes.OK).json(result)
    } catch (error) {
      res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message })
    }
  }
}

export default new LikesPublicacionController()
