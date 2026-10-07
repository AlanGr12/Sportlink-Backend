import supabase from '../configs/supabase-config.js'

class RecomendacionesRepository {

  /** Deportes (iddeporte[]) del perfil del usuario según su tipo. */
  async getDeportesDelUsuarioAsync(idusuario, tipousuario) {
    if (tipousuario === 'jugador') {
      const { data, error } = await supabase
        .from('jugadores')
        .select('iddeporte')
        .eq('idusuario', idusuario)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data?.iddeporte ? [data.iddeporte] : []
    }

    if (tipousuario === 'entrenador') {
      const { data, error } = await supabase
        .from('entrenadores')
        .select('entrenadoresxdeportes(iddeporte)')
        .eq('idusuario', idusuario)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.entrenadoresxdeportes || []).map(r => r.iddeporte)
    }

    if (tipousuario === 'club') {
      const { data, error } = await supabase
        .from('clubes')
        .select('clubesxdeportes(iddeporte)')
        .eq('idusuario', idusuario)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.clubesxdeportes || []).map(r => r.iddeporte)
    }

    return []
  }

  /** Entrenadores que practican alguno de los deportes dados (una fila por entrenador x deporte). */
  async getEntrenadoresPorDeportesAsync(iddeportes) {
    const { data, error } = await supabase
      .from('entrenadoresxdeportes')
      .select('deportes(deporte), entrenadores(idusuario, nombre, apellido, fotoperfil)')
      .in('iddeporte', iddeportes)
    if (error) throw new Error(error.message)
    return (data || [])
      .filter(r => r.entrenadores)
      .map(r => ({
        idusuario: r.entrenadores.idusuario,
        nombre: `${r.entrenadores.nombre} ${r.entrenadores.apellido}`.trim(),
        fotoperfil: r.entrenadores.fotoperfil,
        tipousuario: 'entrenador',
        deporte: r.deportes?.deporte,
      }))
  }

  /** Clubes que tienen alguno de los deportes dados (una fila por club x deporte). */
  async getClubesPorDeportesAsync(iddeportes) {
    const { data, error } = await supabase
      .from('clubesxdeportes')
      .select('deportes(deporte), clubes(idusuario, nombre, fotoperfil)')
      .in('iddeporte', iddeportes)
    if (error) throw new Error(error.message)
    return (data || [])
      .filter(r => r.clubes)
      .map(r => ({
        idusuario: r.clubes.idusuario,
        nombre: r.clubes.nombre,
        fotoperfil: r.clubes.fotoperfil,
        tipousuario: 'club',
        deporte: r.deportes?.deporte,
      }))
  }
}

export default new RecomendacionesRepository()
