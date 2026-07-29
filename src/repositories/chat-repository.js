import supabase from '../configs/supabase-config.js'

class ChatRepository {
  /**
   * Verifica si un usuario es participante de una conversación
   */
  async esParticipante(idconversacion, idusuario) {
    const { data, error } = await supabase
      .from('participantes_conversacion')
      .select('idconversacion')
      .eq('idconversacion', idconversacion)
      .eq('idusuario', idusuario)
      .single()

    if (error && error.code === 'PGRST116') {
      return false // No results
    }
    if (error) throw new Error(error.message)
    return !!data
  }

  /**
   * Busca si existe una conversación PRIVADA exacta entre dos usuarios
   */
  async buscarConversacionPrivada(idusuario1, idusuario2) {
    // Para buscar una conversacion privada entre user A y user B:
    // Buscamos las conversaciones de tipo PRIVADA donde participe A y B.
    // Como es privada, sólo tendrá 2 participantes, por lo que basta con encontrar la intersección.
    
    // 1. Obtener todas las conversaciones PRIVADAS de idusuario1
    const { data: convsUser1, error: err1 } = await supabase
      .from('participantes_conversacion')
      .select('idconversacion, conversaciones!inner(tipo)')
      .eq('idusuario', idusuario1)
      .eq('conversaciones.tipo', 'PRIVADA')

    if (err1) throw new Error(err1.message)

    if (!convsUser1 || convsUser1.length === 0) return null

    const idsConversacionesUser1 = convsUser1.map(c => c.idconversacion)

    // 2. Verificar si idusuario2 participa en alguna de esas
    const { data: conversacionComun, error: err2 } = await supabase
      .from('participantes_conversacion')
      .select('idconversacion')
      .eq('idusuario', idusuario2)
      .in('idconversacion', idsConversacionesUser1)
      .limit(1)

    if (err2) throw new Error(err2.message)

    if (conversacionComun && conversacionComun.length > 0) {
      // Retornar los detalles de esa conversación
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('idconversacion', conversacionComun[0].idconversacion)
        .single()
        
      if (error) throw new Error(error.message)
      return data
    }

    return null
  }

  /**
   * Llama a la función RPC para crear conversación + participantes atómicamente
   */
  async crearConversacionRPC(tipo, nombre, foto, idprueba, identrenamiento, idempleo, participantes) {
    const { data, error } = await supabase.rpc('crear_conversacion_con_participantes', {
      p_tipo: tipo,
      p_nombre: nombre || null,
      p_foto: foto || null,
      p_idprueba: idprueba ? Number(idprueba) : null,
      p_identrenamiento: identrenamiento ? Number(identrenamiento) : null,
      p_idempleo: idempleo ? Number(idempleo) : null,
      p_participantes: participantes
    })

    if (error) throw new Error(error.message)
    
    // RPC retorna el UUID de la conversacion
    const idconversacion = data

    // Devolvemos el objeto conversación creado
    const { data: conv, error: errConv } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('idconversacion', idconversacion)
      .single()

    if (errConv) throw new Error(errConv.message)
    return conv
  }

  /**
   * Obtiene la lista de conversaciones de un usuario ordenadas por updatedat DESC.
   */
  async obtenerConversacionesUsuario(idusuario) {
    const { data, error } = await supabase
      .from('participantes_conversacion')
      .select(`
        idconversacion,
        conversaciones (
          idconversacion, tipo, nombre, foto, updatedat,
          participantes_conversacion ( idusuario, usuarios ( idusuario, tipousuario ) ),
          mensajes ( idmensaje, idusuarioemisor, contenido, tipomensaje, createdat )
        )
      `)
      .eq('idusuario', idusuario)
      // No podemos ordenar fácilmente a través de tablas anidadas en Supabase JS sin un RPC complejo,
      // así que las ordenaremos en JS. En Supabase JS las subqueries a veces se limitan.
      // Opcion mejor: hacer un order en el top level: pero aqui partimos de participantes_conversacion.

    if (error) throw new Error(error.message)

    // Formatear la data
    const resultados = data.map(pc => {
      const conv = pc.conversaciones
      // Obtener ultimo mensaje
      let ultimoMensaje = null
      if (conv.mensajes && conv.mensajes.length > 0) {
        // Ordenamos mensajes por fecha descending manualmente por si acaso, y agarramos el 0
        const sortedMensajes = conv.mensajes.sort((a,b) => new Date(b.createdat) - new Date(a.createdat))
        ultimoMensaje = sortedMensajes[0]
      }

      // Estructura de respuesta adaptada
      const output = {
        idconversacion: conv.idconversacion,
        tipo: conv.tipo,
        nombre: conv.nombre,
        foto: conv.foto,
        updatedat: conv.updatedat,
        ultimoMensaje
      }

      if (conv.tipo === 'PRIVADA') {
        // Buscar al 'otro' participante
        const otroParticipante = conv.participantes_conversacion.find(p => Number(p.idusuario) !== Number(idusuario))
        if (otroParticipante) {
          output.otroParticipante = {
            idusuario: otroParticipante.idusuario,
            // En un caso real haríamos join con jugadores/entrenadores/clubes para el nombre y foto,
            // Aquí enviamos el tipousuario basico
            tipousuario: otroParticipante.usuarios?.tipousuario
          }
        }
      } else {
        output.cantidadParticipantes = conv.participantes_conversacion ? conv.participantes_conversacion.length : 0
      }

      return output
    })

    // Ordenar por updatedat DESC
    return resultados.sort((a, b) => new Date(b.updatedat) - new Date(a.updatedat))
  }

  /**
   * Obtener historial de mensajes
   */
  async obtenerMensajes(idconversacion, limite = 50, offset = 0) {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('idconversacion', idconversacion)
      .eq('eliminado', false)
      .order('createdat', { ascending: false }) // Traemos los más recientes primero para paginar bien
      .range(offset, offset + limite - 1)

    if (error) throw new Error(error.message)
    
    // Luego los devolvemos en orden cronológico (los más viejos arriba en el chat)
    return data.reverse()
  }

  /**
   * Inserta un nuevo mensaje
   */
  async insertarMensaje(idconversacion, idusuarioemisor, contenido, tipomensaje = 'TEXTO') {
    const { data, error } = await supabase
      .from('mensajes')
      .insert({
        idconversacion,
        idusuarioemisor,
        contenido,
        tipomensaje,
        createdat: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Actualiza el updatedat de la conversación
   */
  async actualizarUpdatedAtConversacion(idconversacion) {
    const { error } = await supabase
      .from('conversaciones')
      .update({ updatedat: new Date().toISOString() })
      .eq('idconversacion', idconversacion)

    if (error) throw new Error(error.message)
  }
}

export default new ChatRepository()
