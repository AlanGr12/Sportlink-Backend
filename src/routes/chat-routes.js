import express from 'express'
import { verificarToken } from '../middlewares/auth-middleware.js'
import chatController from '../controllers/chat-controller.js'

const router = express.Router()

// Todas las rutas de chat requieren autenticación
router.use(verificarToken)

// Listar conversaciones del usuario autenticado
router.get('/', chatController.getConversaciones)

// Crear o recuperar conversación 1 a 1
router.post('/privada', chatController.postConversacionPrivada)

// Crear conversación grupal
router.post('/grupal', chatController.postConversacionGrupal)

// Listar mensajes de una conversación
router.get('/:idconversacion/mensajes', chatController.getMensajes)

// Enviar un mensaje a una conversación
router.post('/:idconversacion/mensajes', chatController.postMensaje)

// Marcar mensajes como leídos en una conversación
router.post('/:idconversacion/leer', chatController.postMarcarLeido)

export default router
