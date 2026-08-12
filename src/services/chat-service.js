import chatRepository from '../repositories/chat-repository.js'

class ChatService {
  /**
   * Obtiene la lista de conversaciones del usuario autenticado
   */
  async obtenerConversacionesUsuario(idusuario) {
    const conversaciones = await chatRepository.obtenerConversacionesUsuario(idusuario)
    
    // Enriquecer con el conteo de no leídos
    const conversacionesConNoLeidos = await Promise.all(
      conversaciones.map(async (conv) => {
        const noleidos = await chatRepository.obtenerConteoNoLeidos(conv.idconversacion, idusuario)
        return { ...conv, noleidos }
      })
    )
    
    return conversacionesConNoLeidos
  }

  /**
   * Abre o recupera un chat privado 1 a 1.
   * Valida regla de negocio: no duplicar conversaciones privadas entre los mismos 2 usuarios.
   */
  async obtenerOMantenerConversacionPrivada(idusuarioEmisor, idusuarioReceptor) {
    if (Number(idusuarioEmisor) === Number(idusuarioReceptor)) {
      throw new Error('No puedes crear una conversación privada contigo mismo.')
    }

    // 1. Buscar si ya existe la conversacion
    const convExistente = await chatRepository.buscarConversacionPrivada(idusuarioEmisor, idusuarioReceptor)
    if (convExistente) {
      return convExistente
    }

    // 2. Si no existe, crear nueva conversacion con ambos participantes
    const participantes = [Number(idusuarioEmisor), Number(idusuarioReceptor)]
    const nuevaConv = await chatRepository.crearConversacionRPC(
      'PRIVADA',
      null, // nombre
      null, // foto
      null, null, null, // eventos
      participantes
    )

    return nuevaConv
  }

  /**
   * Crea un grupo asociado (opcionalmente) a un evento (prueba, entrenamiento, empleo)
   */
  async crearConversacionGrupal(idusuarioCreador, nombre, foto, idprueba, identrenamiento, idempleo, arrayParticipantesIniciales) {
    if (!nombre || nombre.trim() === '') {
      throw new Error('El nombre de la conversación grupal es obligatorio.')
    }

    // Asegurarse de que el creador esté en los participantes y que no haya duplicados (cast a Number)
    const participantesNumericos = [...arrayParticipantesIniciales, idusuarioCreador].map(id => Number(id))
    const participantesSet = new Set(participantesNumericos)
    const participantes = Array.from(participantesSet)

    if (participantes.length < 2) {
      throw new Error('Un grupo debe tener al menos 2 participantes.')
    }

    const nuevaConv = await chatRepository.crearConversacionRPC(
      'GRUPAL',
      nombre,
      foto,
      idprueba,
      identrenamiento,
      idempleo,
      participantes
    )

    return nuevaConv
  }

  /**
   * Historial de mensajes de una conversación, validando que el usuario pertenezca
   */
  async listarMensajes(idconversacion, idusuario, limite = 50, offset = 0) {
    // 1. Validar que el usuario pertenece al chat
    const esPart = await chatRepository.esParticipante(idconversacion, idusuario)
    if (!esPart) {
      throw new Error('Acceso denegado. No perteneces a esta conversación.')
    }

    // Pasamos idusuario para calcular el flag 'leido'
    return await chatRepository.obtenerMensajes(idconversacion, idusuario, limite, offset)
  }

  /**
   * Marca los mensajes de una conversación como leídos por un usuario
   */
  async marcarLeido(idconversacion, idusuario) {
    const esPart = await chatRepository.esParticipante(idconversacion, idusuario)
    if (!esPart) {
      throw new Error('Acceso denegado. No perteneces a esta conversación.')
    }
    await chatRepository.marcarMensajesComoLeidos(idconversacion, idusuario)
  }

  /**
   * Envía un mensaje a una conversación, validando pertenencia y contenido.
   * Actualiza el updatedat de la conversación al finalizar.
   */
  async enviarMensaje(idconversacion, idusuarioemisor, contenido, tipomensaje = 'TEXTO') {
    // 1. Validar que contenido no esté vacío si es de texto
    if (tipomensaje === 'TEXTO' && (!contenido || contenido.trim() === '')) {
      throw new Error('El contenido del mensaje no puede estar vacío.')
    }

    // 2. Validar que el usuario pertenece a la conversación
    const esPart = await chatRepository.esParticipante(idconversacion, idusuarioemisor)
    if (!esPart) {
      throw new Error('Acceso denegado. No perteneces a esta conversación.')
    }

    // 3. Insertar el mensaje
    const mensajeCreado = await chatRepository.insertarMensaje(idconversacion, idusuarioemisor, contenido, tipomensaje)

    // 4. Actualizar el updatedat de la conversación (no importa si falla o no es 100% atómico con el insert del msg para propósitos de chat, pero actualiza el orden)
    try {
      await chatRepository.actualizarUpdatedAtConversacion(idconversacion)
    } catch (err) {
      console.warn(`[chat-service] Error actualizando updatedat para conversacion ${idconversacion}: ${err.message}`)
    }

    return mensajeCreado
  }

  /**
   * Edita el contenido de un mensaje
   */
  async editarMensaje(idconversacion, idusuarioemisor, idmensaje, contenido) {
    if (!contenido || contenido.trim() === '') {
      throw new Error('El contenido del mensaje no puede estar vacío.')
    }
    const esPart = await chatRepository.esParticipante(idconversacion, idusuarioemisor)
    if (!esPart) {
      throw new Error('Acceso denegado. No perteneces a esta conversación.')
    }
    return await chatRepository.actualizarMensaje(idmensaje, contenido)
  }

  /**
   * Elimina un mensaje
   */
  async eliminarMensaje(idconversacion, idusuarioemisor, idmensaje) {
    const esPart = await chatRepository.esParticipante(idconversacion, idusuarioemisor)
    if (!esPart) {
      throw new Error('Acceso denegado. No perteneces a esta conversación.')
    }
    await chatRepository.eliminarMensaje(idmensaje)
  }
}

export default new ChatService()
