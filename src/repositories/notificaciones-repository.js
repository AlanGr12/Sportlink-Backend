import supabase from '../configs/supabase-config.js'

class NotificacionesRepository {
  async crearNotificacion({ id_usuario, titulo, mensaje, tipo = 'SISTEMA', enlace = null }) {
    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ id_usuario, titulo, mensaje, tipo, enlace })
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
