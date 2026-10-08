import supabase from '../configs/supabase-config.js'

class AdminRepository {

  /**
   * Métricas y analíticas globales del sistema
   */
  async getKPIsAsync() {
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Usuarios: total, desglose por tipo y nuevos en 30 días
    const [
      { count: totalUsuarios, error: errUsuarios },
      { data: usuariosTipos, error: errTipos },
      { count: nuevosUsuarios30d, error: errNuevos30d }
    ] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }),
      supabase.from('usuarios').select('tipousuario'),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).gte('createdat', hace30Dias)
    ])

    if (errUsuarios) console.error('[admin-kpi] errUsuarios:', errUsuarios.message)
    if (errTipos) console.error('[admin-kpi] errTipos:', errTipos.message)
    if (errNuevos30d) console.error('[admin-kpi] errNuevos30d:', errNuevos30d.message)

    const desgloseUsuarios = {
      jugadores: 0,
      entrenadores: 0,
      clubes: 0,
      otros: 0
    }

    ;(usuariosTipos || []).forEach(u => {
      const rol = (u.tipousuario || '').toLowerCase()
      if (rol === 'jugador') desgloseUsuarios.jugadores++
      else if (rol === 'entrenador') desgloseUsuarios.entrenadores++
      else if (rol === 'club') desgloseUsuarios.clubes++
      else desgloseUsuarios.otros++
    })

    // 2. Publicaciones
    const { count: totalPublicaciones, error: errPub } = await supabase
      .from('publicaciones')
      .select('*', { count: 'exact', head: true })
    if (errPub) console.error('[admin-kpi] errPub:', errPub.message)

    // 3. Pruebas y sus inscripciones
    const [
      { count: totalPruebas, error: errPruebasTot },
      { count: pruebasActivas, error: errPruebasAct },
      { count: totalInscripcionesPruebas, error: errInscPruebas }
    ] = await Promise.all([
      supabase.from('pruebas').select('*', { count: 'exact', head: true }),
      supabase.from('pruebas').select('*', { count: 'exact', head: true }).eq('estado', true),
      supabase.from('inscripcionesprueba').select('*', { count: 'exact', head: true })
    ])

    if (errPruebasTot) console.error('[admin-kpi] errPruebasTot:', errPruebasTot.message)
    if (errPruebasAct) console.error('[admin-kpi] errPruebasAct:', errPruebasAct.message)
    if (errInscPruebas) console.error('[admin-kpi] errInscPruebas:', errInscPruebas.message)

    // 4. Entrenamientos y sus inscripciones
    const [
      { count: totalEntrenamientos, error: errEntrTot },
      { count: entrenamientosActivos, error: errEntrAct },
      { count: totalInscripcionesEntr, error: errInscEntr }
    ] = await Promise.all([
      supabase.from('entrenamientos').select('*', { count: 'exact', head: true }),
      supabase.from('entrenamientos').select('*', { count: 'exact', head: true }).eq('estado', true),
      supabase.from('inscripcionesentrenamientos').select('*', { count: 'exact', head: true })
    ])

    if (errEntrTot) console.error('[admin-kpi] errEntrTot:', errEntrTot.message)
    if (errEntrAct) console.error('[admin-kpi] errEntrAct:', errEntrAct.message)
    if (errInscEntr) console.error('[admin-kpi] errInscEntr:', errInscEntr.message)

    // 5. Clubes pendientes de moderación
    const [
      { count: clubesPendientes, error: errClubPend },
      { count: clubesAprobados, error: errClubApr },
      { count: clubesRechazados, error: errClubRech }
    ] = await Promise.all([
      supabase.from('clubes').select('*', { count: 'exact', head: true }).or('estado.eq.PENDIENTE,estado.is.null'),
      supabase.from('clubes').select('*', { count: 'exact', head: true }).eq('estado', 'APROBADO'),
      supabase.from('clubes').select('*', { count: 'exact', head: true }).eq('estado', 'RECHAZADO')
    ])

    if (errClubPend) console.error('[admin-kpi] errClubPend:', errClubPend.message)

    return {
      usuarios: {
        total: totalUsuarios || 0,
        nuevosUltimos30Dias: nuevosUsuarios30d || 0,
        desglose: desgloseUsuarios,
      },
      publicaciones: {
        total: totalPublicaciones || 0,
      },
      pruebas: {
        total: totalPruebas || 0,
        activas: pruebasActivas || 0,
        inactivas: Math.max(0, (totalPruebas || 0) - (pruebasActivas || 0)),
        inscripciones: totalInscripcionesPruebas || 0,
      },
      entrenamientos: {
        total: totalEntrenamientos || 0,
        activos: entrenamientosActivos || 0,
        inactivos: Math.max(0, (totalEntrenamientos || 0) - (entrenamientosActivos || 0)),
        inscripciones: totalInscripcionesEntr || 0,
      },
      clubes: {
        pendientes: clubesPendientes || 0,
        aprobados: clubesAprobados || 0,
        rechazados: clubesRechazados || 0,
      }
    }
  }

  /**
   * Obtiene la lista de clubes para moderación según su estado
   */
  async getClubesModeracionAsync({ estado = 'PENDIENTE' } = {}) {
    let query = supabase
      .from('clubes')
      .select(`
        idclub,
        idusuario,
        nombre,
        ubicacion,
        direccion,
        latitud,
        longitud,
        fotoperfil,
        descripcion,
        estado,
        usuarios!clubes_idusuario_fkey (
          idusuario,
          email,
          createdat,
          es_admin
        ),
        clubesxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)

    if (estado) {
      const estadoNorm = estado.toUpperCase()
      if (estadoNorm === 'PENDIENTE') {
        query = query.or('estado.eq.PENDIENTE,estado.is.null')
      } else {
        query = query.eq('estado', estadoNorm)
      }
    }

    query = query.order('idclub', { ascending: false })

    const { data, error } = await query
    if (error) {
      // Fallback si la foreign key con alias tiene otro nombre
      console.warn('[admin-repo] Fallback consulta clubes sin alias FK:', error.message)
      const { data: fallbackData, error: fbError } = await supabase
        .from('clubes')
        .select(`
          *,
          usuarios ( idusuario, email, createdat ),
          clubesxdeportes ( deportes ( iddeporte, deporte ) )
        `)
      if (fbError) throw new Error(fbError.message)
      return (fallbackData || []).map(c => ({
        ...c,
        email: c.usuarios?.email || null,
        createdat: c.usuarios?.createdat || null,
        deportes: (c.clubesxdeportes || []).map(d => d.deportes?.deporte).filter(Boolean),
        estado: c.estado || 'PENDIENTE'
      }))
    }

    return (data || []).map(c => ({
      idclub: c.idclub,
      idusuario: c.idusuario,
      nombre: c.nombre,
      ubicacion: c.ubicacion,
      direccion: c.direccion,
      latitud: c.latitud,
      longitud: c.longitud,
      fotoperfil: c.fotoperfil,
      descripcion: c.descripcion,
      estado: c.estado || 'PENDIENTE',
      email: c.usuarios?.email || null,
      createdat: c.usuarios?.createdat || null,
      deportes: (c.clubesxdeportes || []).map(d => d.deportes?.deporte).filter(Boolean)
    }))
  }

  /**
   * Actualiza el estado de aprobación de un club
   */
  async actualizarEstadoClubAsync(idclub, nuevoEstado) {
    const estado = nuevoEstado.toUpperCase()
    const { data, error } = await supabase
      .from('clubes')
      .update({ estado })
      .eq('idclub', idclub)
      .select('idclub, idusuario, nombre, estado, fotoperfil')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Obtiene listado paginado y filtrable de usuarios
   */
  async getUsuariosAsync({ page = 1, limit = 15, search = '', rol = '' } = {}) {
    const offset = (page - 1) * limit

    let query = supabase
      .from('usuarios')
      .select('idusuario, email, tipousuario, biografia, es_admin, createdat', { count: 'exact' })

    if (search && search.trim()) {
      query = query.ilike('email', `%${search.trim()}%`)
    }

    if (rol && rol.trim()) {
      query = query.ilike('tipousuario', rol.trim())
    }

    query = query.order('idusuario', { ascending: false }).range(offset, offset + limit - 1)

    const { data: usuarios, count, error } = await query
    if (error) throw new Error(error.message)

    // Enriquecer cada usuario con el nombre y foto de su entidad
    const idUsuarios = (usuarios || []).map(u => u.idusuario)

    const [
      { data: jugadores },
      { data: entrenadores },
      { data: clubes }
    ] = await Promise.all([
      supabase.from('jugadores').select('idusuario, nombre, apellido, fotoperfil').in('idusuario', idUsuarios),
      supabase.from('entrenadores').select('idusuario, nombre, apellido, fotoperfil').in('idusuario', idUsuarios),
      supabase.from('clubes').select('idusuario, nombre, fotoperfil, estado').in('idusuario', idUsuarios)
    ])

    const jugadorMap = new Map((jugadores || []).map(j => [j.idusuario, j]))
    const entrenadorMap = new Map((entrenadores || []).map(e => [e.idusuario, e]))
    const clubMap = new Map((clubes || []).map(c => [c.idusuario, c]))

    const enriquecidos = (usuarios || []).map(u => {
      const j = jugadorMap.get(u.idusuario)
      const e = entrenadorMap.get(u.idusuario)
      const c = clubMap.get(u.idusuario)

      let nombre = null
      let fotoperfil = null
      let estadoClub = null

      if (j) {
        nombre = [j.nombre, j.apellido].filter(Boolean).join(' ')
        fotoperfil = j.fotoperfil
      } else if (e) {
        nombre = [e.nombre, e.apellido].filter(Boolean).join(' ')
        fotoperfil = e.fotoperfil
      } else if (c) {
        nombre = c.nombre
        fotoperfil = c.fotoperfil
        estadoClub = c.estado || 'PENDIENTE'
      }

      return {
        ...u,
        nombre: nombre || u.email,
        fotoperfil,
        estadoClub
      }
    })

    return {
      usuarios: enriquecidos,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  /**
   * Cambia el flag es_admin de un usuario
   */
  async toggleAdminUsuarioAsync(idusuario, es_admin) {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ es_admin: Boolean(es_admin) })
      .eq('idusuario', idusuario)
      .select('idusuario, email, tipousuario, es_admin')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Listado de publicaciones con datos para moderación
   */
  async getPublicacionesAsync({ page = 1, limit = 15, search = '' } = {}) {
    const offset = (page - 1) * limit

    let query = supabase
      .from('publicaciones')
      .select(`
        idpublicacion,
        idusuario,
        contenido,
        imagen,
        tipopublicacion,
        idprueba,
        identrenamiento,
        idempleo,
        createdat,
        usuarios ( idusuario, email, tipousuario )
      `, { count: 'exact' })

    if (search && search.trim()) {
      query = query.ilike('contenido', `%${search.trim()}%`)
    }

    query = query.order('idpublicacion', { ascending: false }).range(offset, offset + limit - 1)

    const { data: publicaciones, count, error } = await query
    if (error) throw new Error(error.message)

    return {
      publicaciones: publicaciones || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  /**
   * Explorador de eventos (Pruebas y Entrenamientos)
   */
  async getEventosAsync({ tipo = 'PRUEBAS', page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit
    const esPrueba = tipo.toUpperCase() === 'PRUEBAS'

    if (esPrueba) {
      const { data, count, error } = await supabase
        .from('pruebas')
        .select(`
          idprueba,
          categoria,
          zona,
          fechaprueba,
          horainicio,
          horafin,
          cupo,
          estado,
          imagen,
          clubes ( idclub, nombre, fotoperfil ),
          deportes ( deporte )
        `, { count: 'exact' })
        .order('idprueba', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new Error(error.message)

      return {
        eventos: (data || []).map(p => ({
          id: p.idprueba,
          tipo: 'PRUEBA',
          titulo: `Prueba ${p.categoria || ''}`,
          organizador: p.clubes?.nombre,
          organizadorFoto: p.clubes?.fotoperfil,
          fecha: p.fechaprueba,
          ubicacion: p.zona,
          deporte: p.deportes?.deporte,
          cupo: p.cupo,
          activo: p.estado !== false,
          imagen: p.imagen
        })),
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / limit)
      }
    } else {
      const { data, count, error } = await supabase
        .from('entrenamientos')
        .select(`
          identrenamientos,
          titulo,
          ubicacion,
          fechaentr,
          cupo,
          precio,
          nivel,
          estado,
          imagen,
          entrenadores ( identrenador, nombre, apellido, fotoperfil ),
          deportes ( deporte )
        `, { count: 'exact' })
        .order('identrenamientos', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new Error(error.message)

      return {
        eventos: (data || []).map(e => ({
          id: e.identrenamientos,
          tipo: 'ENTRENAMIENTO',
          titulo: e.titulo || 'Entrenamiento',
          organizador: [e.entrenadores?.nombre, e.entrenadores?.apellido].filter(Boolean).join(' '),
          organizadorFoto: e.entrenadores?.fotoperfil,
          fecha: e.fechaentr,
          ubicacion: e.ubicacion,
          deporte: e.deportes?.deporte,
          cupo: e.cupo,
          precio: e.precio,
          nivel: e.nivel,
          activo: e.estado !== false,
          imagen: e.imagen
        })),
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  }
}

export default new AdminRepository()
