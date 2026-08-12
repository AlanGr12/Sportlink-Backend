import chatService from '../services/chat-service.js'
import { StatusCodes } from 'http-status-codes'

class ChatController {
  
  // GET /api/conversaciones
  async getConversaciones(req, res) {
    try {
      const idusuario = req.usuario.idusuario
      const conversaciones = await chatService.obtenerConversacionesUsuario(idusuario)
      res.status(StatusCodes.OK).json(conversaciones)
    } catch (err) {
      console.error('[chat-controller] getConversaciones error:', err)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Error al obtener conversaciones',
        detail: err.message
      })
    }
  }

  // POST /api/conversaciones/privada
  async postConversacionPrivada(req, res) {
    try {
      const idusuarioEmisor = req.usuario.idusuario
      const { idusuarioReceptor } = req.body

      if (!idusuarioReceptor) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Faltan parámetros',
          detail: 'Se requiere idusuarioReceptor'
        })
      }

      const conversacion = await chatService.obtenerOMantenerConversacionPrivada(idusuarioEmisor, idusuarioReceptor)
      res.status(StatusCodes.OK).json(conversacion)
    } catch (err) {
      console.error('[chat-controller] postConversacionPrivada error:', err)
      
      const status = err.message.includes('No puedes crear') 
        ? StatusCodes.BAD_REQUEST 
        : StatusCodes.INTERNAL_SERVER_ERROR

      res.status(status).json({
        error: 'Error al crear o recuperar conversación privada',
        detail: err.message
      })
    }
  }

  // POST /api/conversaciones/grupal
  async postConversacionGrupal(req, res) {
    try {
      const idusuarioCreador = req.usuario.idusuario
      const { nombre, foto, idprueba, identrenamiento, idempleo, participantes } = req.body

      if (!participantes || !Array.isArray(participantes)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Faltan parámetros',
          detail: 'Se requiere un arreglo de participantes'
        })
      }

      const conversacion = await chatService.crearConversacionGrupal(
        idusuarioCreador, 
        nombre, 
        foto, 
        idprueba, 
        identrenamiento, 
        idempleo, 
        participantes
      )

      res.status(StatusCodes.CREATED).json(conversacion)
    } catch (err) {
      console.error('[chat-controller] postConversacionGrupal error:', err)
      
      const status = err.message.includes('obligatorio') || err.message.includes('al menos 2')
        ? StatusCodes.BAD_REQUEST 
        : StatusCodes.INTERNAL_SERVER_ERROR

      res.status(status).json({
        error: 'Error al crear conversación grupal',
        detail: err.message
      })
    }
  }

  // GET /api/conversaciones/:idconversacion/mensajes
  async getMensajes(req, res) {
    try {
      const idusuario = req.usuario.idusuario
      const { idconversacion } = req.params
      const { limite = 50, offset = 0 } = req.query

      const mensajes = await chatService.listarMensajes(Number(idconversacion), idusuario, parseInt(limite), parseInt(offset))
      res.status(StatusCodes.OK).json(mensajes)
    } catch (err) {
      console.error('[chat-controller] getMensajes error:', err)
      
      const status = err.message.includes('Acceso denegado')
        ? StatusCodes.FORBIDDEN
        : StatusCodes.INTERNAL_SERVER_ERROR

      res.status(status).json({
        error: 'Error al obtener mensajes',
        detail: err.message
      })
    }
  }

  // POST /api/conversaciones/:idconversacion/mensajes
  async postMensaje(req, res) {
    try {
      const idusuarioemisor = req.usuario.idusuario
      const { idconversacion } = req.params
      const { contenido, tipomensaje } = req.body

      const mensaje = await chatService.enviarMensaje(Number(idconversacion), idusuarioemisor, contenido, tipomensaje)
      res.status(StatusCodes.CREATED).json(mensaje)
    } catch (err) {
      console.error('[chat-controller] postMensaje error:', err)
      
      let status = StatusCodes.INTERNAL_SERVER_ERROR
      if (err.message.includes('Acceso denegado')) status = StatusCodes.FORBIDDEN
      if (err.message.includes('vacío')) status = StatusCodes.BAD_REQUEST

      res.status(status).json({
        error: 'Error al enviar mensaje',
        detail: err.message
      })
    }
  }

  // POST /api/conversaciones/:idconversacion/leer
  async postMarcarLeido(req, res) {
    try {
      const idusuario = req.usuario.idusuario
      const { idconversacion } = req.params

      await chatService.marcarLeido(Number(idconversacion), idusuario)
      res.status(StatusCodes.OK).json({ success: true })
    } catch (err) {
      console.error('[chat-controller] postMarcarLeido error:', err)
      
      const status = err.message.includes('Acceso denegado')
        ? StatusCodes.FORBIDDEN
        : StatusCodes.INTERNAL_SERVER_ERROR

      res.status(status).json({
        error: 'Error al marcar como leído',
        detail: err.message
      })
    }
  }

  // PUT /api/conversaciones/:idconversacion/mensajes/:idmensaje
  async putMensaje(req, res) {
    try {
      const idusuarioemisor = req.usuario.idusuario
      const { idconversacion, idmensaje } = req.params
      const { contenido } = req.body

      const mensaje = await chatService.editarMensaje(Number(idconversacion), idusuarioemisor, Number(idmensaje), contenido)
      res.status(StatusCodes.OK).json(mensaje)
    } catch (err) {
      console.error('[chat-controller] putMensaje error:', err)
      let status = StatusCodes.INTERNAL_SERVER_ERROR
      if (err.message.includes('Acceso denegado')) status = StatusCodes.FORBIDDEN
      if (err.message.includes('vacío')) status = StatusCodes.BAD_REQUEST

      res.status(status).json({
        error: 'Error al editar mensaje',
        detail: err.message
      })
    }
  }

  // DELETE /api/conversaciones/:idconversacion/mensajes/:idmensaje
  async deleteMensaje(req, res) {
    try {
      const idusuarioemisor = req.usuario.idusuario
      const { idconversacion, idmensaje } = req.params

      await chatService.eliminarMensaje(Number(idconversacion), idusuarioemisor, Number(idmensaje))
      res.status(StatusCodes.OK).json({ success: true })
    } catch (err) {
      console.error('[chat-controller] deleteMensaje error:', err)
      let status = StatusCodes.INTERNAL_SERVER_ERROR
      if (err.message.includes('Acceso denegado')) status = StatusCodes.FORBIDDEN

      res.status(status).json({
        error: 'Error al eliminar mensaje',
        detail: err.message
      })
    }
  }
}

export default new ChatController()
