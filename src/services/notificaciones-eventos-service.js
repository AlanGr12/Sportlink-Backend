import supabase from '../configs/supabase-config.js'
import NotificacionesRepository from '../repositories/notificaciones-repository.js'

/**
 * Notificaciones disparadas por eventos de la plataforma.
 *
 * Todos los métodos son "mejor esfuerzo": nunca lanzan, para que una notificación fallida
 * no rompa la operación que la originó. Reciben solo ids y resuelven el resto acá.
 *
 * Tipos usados (columna notificaciones.tipo): EMPLEO, ENTRENAMIENTO, PRUEBA, LIKE,
 * COMENTARIO, SEGUIDOR, RECORDATORIO. LISTA_ESPERA sigue en notificaciones-service.js.
 */
class NotificacionesEventosService {
  constructor() {
    this.repository = new NotificacionesRepository()
  }

  // Ejecuta una función protegiendo al llamador
  async #seguro(nombre, fn) {
    try {
      await fn()
    } catch (err) {
      console.error(`[notificaciones-eventos] ${nombre}:`, err.message || err)
    }
  }

  #nombre(persona) {
    return [persona?.nombre, persona?.apellido].filter(Boolean).join(' ').trim()
  }

  #recortar(texto, max = 50) {
    const t = String(texto || '').replace(/\s+/g, ' ').trim()
    return t.length > max ? `${t.slice(0, max).trim()}…` : t
  }

  // ── EMPLEOS ────────────────────────────────────────────────────────────────

  /** Al club: un entrenador se postuló a su vacante. */
  postulacionEmpleo(idempleo, identrenador) {
    return this.#seguro('postulacionEmpleo', async () => {
      const [{ data: empleo }, { data: entrenador }] = await Promise.all([
        supabase.from('empleo').select('nombre, clubes ( idusuario )').eq('idempleo', idempleo).maybeSingle(),
        supabase.from('entrenadores').select('nombre, apellido').eq('identrenador', identrenador).maybeSingle(),
      ])
      const idClub = empleo?.clubes?.idusuario
      if (!idClub) return
      await this.repository.crearNotificacion({
        id_usuario: idClub,
        titulo: 'Nueva postulación',
        mensaje: `${this.#nombre(entrenador) || 'Un entrenador'} se postuló a la vacante "${empleo.nombre}".`,
        tipo: 'EMPLEO',
        enlace: '/empleos',
      })
    })
  }

  /** A los entrenadores postulados: la vacante fue eliminada. */
  vacanteEliminada({ nombreEmpleo, nombreClub, idsUsuarios }) {
    return this.#seguro('vacanteEliminada', async () => {
      const filas = [...new Set(idsUsuarios || [])].map((id_usuario) => ({
        id_usuario,
        titulo: 'Vacante eliminada',
        mensaje: `${nombreClub || 'El club'} eliminó la vacante "${nombreEmpleo}" a la que te habías postulado.`,
        tipo: 'EMPLEO',
        enlace: '/empleos',
      }))
      await this.repository.crearMuchas(filas)
    })
  }

  // ── ENTRENAMIENTOS ─────────────────────────────────────────────────────────

  /** Al entrenador: un deportista se anotó. */
  inscripcionEntrenamiento(identrenamiento, idjugador) {
    return this.#seguro('inscripcionEntrenamiento', async () => {
      const [{ data: entr }, { data: jugador }] = await Promise.all([
        supabase.from('entrenamientos').select('titulo, entrenadores ( idusuario )').eq('identrenamientos', identrenamiento).maybeSingle(),
        supabase.from('jugadores').select('nombre, apellido').eq('idjugador', idjugador).maybeSingle(),
      ])
      const idEntrenador = entr?.entrenadores?.idusuario
      if (!idEntrenador) return
      await this.repository.crearNotificacion({
        id_usuario: idEntrenador,
        titulo: 'Nuevo inscripto',
        mensaje: `${this.#nombre(jugador) || 'Un deportista'} se anotó a tu entrenamiento "${entr.titulo}".`,
        tipo: 'ENTRENAMIENTO',
        enlace: `/entrenamientos/${identrenamiento}`,
      })
    })
  }

  // ── PRUEBAS ────────────────────────────────────────────────────────────────

  /** Al club: un deportista se inscribió. */
  inscripcionPrueba(idprueba, idjugador) {
    return this.#seguro('inscripcionPrueba', async () => {
      const [{ data: prueba }, { data: jugador }] = await Promise.all([
        supabase.from('pruebas').select('categoria, clubes ( idusuario ), deportes ( deporte )').eq('idprueba', idprueba).maybeSingle(),
        supabase.from('jugadores').select('nombre, apellido').eq('idjugador', idjugador).maybeSingle(),
      ])
      const idClub = prueba?.clubes?.idusuario
      if (!idClub) return
      await this.repository.crearNotificacion({
        id_usuario: idClub,
        titulo: 'Nueva inscripción',
        mensaje: `${this.#nombre(jugador) || 'Un deportista'} se inscribió a tu prueba de ${prueba.deportes?.deporte || 'deporte'} (${prueba.categoria}).`,
        tipo: 'PRUEBA',
        enlace: `/pruebas/${idprueba}`,
      })
    })
  }

  // ── LISTA DE ESPERA (aviso al organizador) ─────────────────────────────────

  /** Al entrenador/club: alguien de la lista de espera pasó a estar inscripto. */
  promocionListaEspera(tipoActividad, idActividad, idjugador) {
    return this.#seguro('promocionListaEspera', async () => {
      const esPrueba = tipoActividad === 'prueba'
      const { data: jugador } = await supabase.from('jugadores').select('nombre, apellido').eq('idjugador', idjugador).maybeSingle()
      let idOrganizador, descripcion
      if (esPrueba) {
        const { data } = await supabase.from('pruebas').select('categoria, clubes ( idusuario )').eq('idprueba', idActividad).maybeSingle()
        idOrganizador = data?.clubes?.idusuario
        descripcion = `tu prueba (${data?.categoria})`
      } else {
        const { data } = await supabase.from('entrenamientos').select('titulo, entrenadores ( idusuario )').eq('identrenamientos', idActividad).maybeSingle()
        idOrganizador = data?.entrenadores?.idusuario
        descripcion = `tu entrenamiento "${data?.titulo}"`
      }
      if (!idOrganizador) return
      await this.repository.crearNotificacion({
        id_usuario: idOrganizador,
        titulo: 'Ingresó desde la lista de espera',
        mensaje: `${this.#nombre(jugador) || 'Un deportista'} fue inscripto desde la lista de espera a ${descripcion}.`,
        tipo: esPrueba ? 'PRUEBA' : 'ENTRENAMIENTO',
        enlace: `/${esPrueba ? 'pruebas' : 'entrenamientos'}/${idActividad}`,
      })
    })
  }

  // ── NUEVA PRUEBA / ENTRENAMIENTO → seguidores deportistas ─────────────────

  /** A los deportistas que siguen al club/entrenador que publicó. */
  nuevaActividad(tipoActividad, idActividad) {
    return this.#seguro('nuevaActividad', async () => {
      const esPrueba = tipoActividad === 'prueba'
      let idPublicador, mensaje
      if (esPrueba) {
        const { data } = await supabase.from('pruebas').select('categoria, clubes ( idusuario, nombre ), deportes ( deporte )').eq('idprueba', idActividad).maybeSingle()
        idPublicador = data?.clubes?.idusuario
        mensaje = `${data?.clubes?.nombre || 'Un club que seguís'} publicó una prueba de ${data?.deportes?.deporte || 'deporte'} (${data?.categoria}).`
      } else {
        const { data } = await supabase.from('entrenamientos').select('titulo, entrenadores ( idusuario, nombre, apellido )').eq('identrenamientos', idActividad).maybeSingle()
        idPublicador = data?.entrenadores?.idusuario
        mensaje = `${this.#nombre(data?.entrenadores) || 'Un entrenador que seguís'} publicó un nuevo entrenamiento: "${data?.titulo}".`
      }
      if (!idPublicador) return

      const { data: seguidores, error } = await supabase.from('seguidores').select('idseguidor').eq('idseguido', idPublicador)
      if (error) throw new Error(error.message)
      const ids = (seguidores || []).map((s) => s.idseguidor)
      if (ids.length === 0) return

      // Solo deportistas
      const { data: jugadores } = await supabase.from('usuarios').select('idusuario').in('idusuario', ids).eq('tipousuario', 'jugador')
      const filas = (jugadores || []).map((u) => ({
        id_usuario: u.idusuario,
        titulo: esPrueba ? 'Nueva prueba' : 'Nuevo entrenamiento',
        mensaje,
        tipo: esPrueba ? 'PRUEBA' : 'ENTRENAMIENTO',
        enlace: `/${esPrueba ? 'pruebas' : 'entrenamientos'}/${idActividad}`,
      }))
      await this.repository.crearMuchas(filas)
    })
  }

  // ── LIKES / COMENTARIOS / SEGUIDORES (acumulativas) ───────────────────────

  /** Recalcula la notificación de likes de una publicación (se llama al dar y al sacar like). */
  likes(idpublicacion, reactivar = true) {
    return this.#seguro('likes', async () => {
      const { data: pub } = await supabase.from('publicaciones').select('idusuario, contenido').eq('idpublicacion', idpublicacion).maybeSingle()
      if (!pub) return
      const { count, error } = await supabase
        .from('likes_publicacion')
        .select('idusuario', { count: 'exact', head: true })
        .eq('idpublicacion', idpublicacion)
        .neq('idusuario', pub.idusuario) // los likes propios no notifican
      if (error) throw new Error(error.message)
      const n = count || 0
      await this.repository.sincronizarAcumulativa({
        id_usuario: pub.idusuario,
        clave: `LIKES:${idpublicacion}`,
        cantidad: n,
        titulo: 'Me gusta en tu publicación',
        mensaje: `${n} ${n === 1 ? 'persona le dio' : 'personas le dieron'} me gusta a tu publicación "${this.#recortar(pub.contenido)}".`,
        tipo: 'LIKE',
        enlace: `/publicacion/${idpublicacion}`,
        reactivar,
      })
    })
  }

  /** Recalcula la notificación de comentarios de una publicación (al comentar y al borrar). */
  comentarios(idpublicacion, reactivar = true) {
    return this.#seguro('comentarios', async () => {
      const { data: pub } = await supabase.from('publicaciones').select('idusuario, contenido').eq('idpublicacion', idpublicacion).maybeSingle()
      if (!pub) return
      const { count, error } = await supabase
        .from('comentarios_publicacion')
        .select('idcomentario', { count: 'exact', head: true })
        .eq('idpublicacion', idpublicacion)
        .neq('idusuario', pub.idusuario) // los comentarios propios no notifican
      if (error) throw new Error(error.message)
      const n = count || 0
      await this.repository.sincronizarAcumulativa({
        id_usuario: pub.idusuario,
        clave: `COMENTARIOS:${idpublicacion}`,
        cantidad: n,
        titulo: 'Comentarios en tu publicación',
        mensaje: `Tu publicación "${this.#recortar(pub.contenido)}" tiene ${n} ${n === 1 ? 'comentario' : 'comentarios'}.`,
        tipo: 'COMENTARIO',
        enlace: `/publicacion/${idpublicacion}`,
        reactivar,
      })
    })
  }

  /** Recalcula la notificación de seguidores de una cuenta (al seguir y al dejar de seguir). */
  seguidores(idseguido, reactivar = true) {
    return this.#seguro('seguidores', async () => {
      const { count, error } = await supabase
        .from('seguidores')
        .select('idseguidor', { count: 'exact', head: true })
        .eq('idseguido', idseguido)
      if (error) throw new Error(error.message)
      const n = count || 0
      await this.repository.sincronizarAcumulativa({
        id_usuario: idseguido,
        clave: 'SEGUIDORES',
        cantidad: n,
        titulo: n === 1 ? 'Nuevo seguidor' : 'Nuevos seguidores',
        mensaje: n === 1 ? 'Tenés 1 seguidor.' : `Tenés ${n} seguidores.`,
        tipo: 'SEGUIDOR',
        enlace: `/perfil/${idseguido}`,
        reactivar,
      })
    })
  }
}

export default new NotificacionesEventosService()
