import supabase from '../configs/supabase-config.js'

class NotificacionesRepository {
  async crearNotificacion({ id_usuario, titulo, mensaje, tipo = 'SISTEMA', enlace = null, clave = null }) {
    const fila = { id_usuario, titulo, mensaje, tipo, enlace }
    // La columna "clave" solo se envía si se usa (así nada cambia para las notificaciones sin clave)
    if (clave) fila.clave = clave

    const { data, error } = await supabase
      .from('notificaciones')
      .insert(fila)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async crearMuchas(filas) {
    if (!filas || filas.length === 0) return []
    const { data, error } = await supabase.from('notificaciones').insert(filas).select()
    if (error) throw new Error(error.message)
    return data || []
  }

  async getPorClave(id_usuario, clave) {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('id_usuario', id_usuario)
      .eq('clave', clave)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /** Crea la notificación solo si el usuario no tiene ya una con esa clave (envíos de una sola vez). */
  async crearSiNoExiste({ id_usuario, clave, ...resto }) {
    if (await this.getPorClave(id_usuario, clave)) return null
    return await this.crearNotificacion({ id_usuario, clave, ...resto })
  }

  /**
   * Notificación acumulativa: una sola por (usuario, clave) cuyo texto se va actualizando.
   *  - cantidad <= 0  → se elimina
   *  - existe         → se actualiza el texto; si `reactivar`, vuelve a quedar no leída y sube al tope
   *  - no existe      → se crea
   */
  async sincronizarAcumulativa({ id_usuario, clave, cantidad, titulo, mensaje, tipo, enlace, reactivar = true }) {
    const existente = await this.getPorClave(id_usuario, clave)

    if (cantidad <= 0) {
      if (existente) {
        const { error } = await supabase.from('notificaciones').delete().eq('id', existente.id)
        if (error) throw new Error(error.message)
      }
      return null
    }

    if (!existente) {
      return await this.crearNotificacion({ id_usuario, titulo, mensaje, tipo, enlace, clave })
    }

    const cambios = { titulo, mensaje }
    if (reactivar) {
      cambios.leido = false
      cambios.fecha_creacion = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('notificaciones')
      .update(cambios)
      .eq('id', existente.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async obtenerPorUsuario(id_usuario, limite = 50) {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('id_usuario', id_usuario)
      .order('fecha_creacion', { ascending: false })
      .limit(limite)

    if (error) throw new Error(error.message)
    return data || []
  }

  async obtenerContadorNoLeidas(id_usuario) {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('id_usuario', id_usuario)
      .eq('leido', false)

    if (error) throw new Error(error.message)
    return count || 0
  }

  // Devuelve la notificación actualizada, o null si no existe / no es del usuario
  async marcarComoLeida(id_notificacion, id_usuario) {
    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id', id_notificacion)
      .eq('id_usuario', id_usuario)
      .select()

    if (error) throw new Error(error.message)
    return data?.[0] || null
  }

  async marcarTodasComoLeidas(id_usuario) {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id_usuario', id_usuario)
      .eq('leido', false)

    if (error) throw new Error(error.message)
    return true
  }
}

export default NotificacionesRepository
