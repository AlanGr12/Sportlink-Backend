import RecomendacionesClubRepository from '../repositories/recomendaciones-club-repository.js'
import VinculacionesRepository from '../repositories/vinculaciones-repository.js'
import NotificacionesRepository from '../repositories/notificaciones-repository.js'

const ESTADOS_CLUB = ['CONTACTADO', 'DESCARTADA']
const MAX_NOTA = 500
const MAX_LOTE = 50

const nombre = (p) => [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim()

/**
 * Recomendaciones de jugadores: un entrenador le recomienda a su club vinculado
 * jugadores que se inscribieron en sus entrenamientos. El club las ve en su panel
 * y las marca como contactadas o descartadas.
 */
class RecomendacionesClubService {
  constructor() {
    this.repository = new RecomendacionesClubRepository()
    this.vinculaciones = new VinculacionesRepository()
    this.notificaciones = new NotificacionesRepository()
  }

  async #entrenadorDelUsuario(usuario) {
    const entrenador = await this.vinculaciones.getEntrenadorPorUsuarioAsync(usuario.idusuario)
    if (!entrenador) throw { status: 403, message: 'Tu cuenta no tiene un perfil de entrenador.' }
    return entrenador
  }

  async #clubDelUsuario(usuario) {
    const club = await this.vinculaciones.getClubPorUsuarioAsync(usuario.idusuario)
    if (!club) throw { status: 403, message: 'Tu cuenta no tiene un club asociado.' }
    return club
  }

  // Notificaciones "mejor esfuerzo": si fallan, la operación igual queda hecha
  async #notificar(fila) {
    try {
      await this.notificaciones.crearNotificacion(fila)
    } catch (err) {
      console.error('[recomendaciones-club] notificación:', err.message || err)
    }
  }

  /** El entrenador recomienda uno o varios jugadores a su club vinculado. */
  async recomendar(usuario, { idjugadores, identrenamiento, nota } = {}) {
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    const vinculacion = await this.vinculaciones.getAceptadaDeEntrenadorAsync(entrenador.identrenador)
    if (!vinculacion?.clubes) throw { status: 403, message: 'Para recomendar jugadores tenés que estar vinculado a un club.' }
    const club = vinculacion.clubes

    const ids = [...new Set((Array.isArray(idjugadores) ? idjugadores : [idjugadores]).map(Number).filter(n => Number.isInteger(n) && n > 0))]
    if (ids.length === 0) throw { status: 400, message: 'Elegí al menos un jugador.' }
    if (ids.length > MAX_LOTE) throw { status: 400, message: `Podés recomendar hasta ${MAX_LOTE} jugadores a la vez.` }

    const texto = String(nota || '').trim()
    if (texto.length > MAX_NOTA) throw { status: 400, message: `La nota puede tener hasta ${MAX_NOTA} caracteres.` }

    // Solo se pueden recomendar jugadores que pasaron por sus entrenamientos
    const inscriptos = await this.repository.getJugadoresInscriptosConEntrenadorAsync(entrenador.identrenador, ids)
    const ajenos = ids.filter(id => !inscriptos.has(id))
    if (ajenos.length === ids.length) throw { status: 403, message: 'Solo podés recomendar jugadores inscriptos en tus entrenamientos.' }

    const vigentes = await this.repository.getJugadoresVigentesAsync(club.idclub, ids)
    const aCrear = ids.filter(id => inscriptos.has(id) && !vigentes.has(id))

    const creadas = await this.repository.crearMuchasAsync(aCrear.map(id => ({
      id_club: club.idclub,
      id_entrenador: entrenador.identrenador,
      id_jugador: id,
      id_entrenamiento: identrenamiento ? Number(identrenamiento) : null,
      nota: texto || null,
    })))

    if (creadas.length > 0) {
      const n = creadas.length
      await this.#notificar({
        id_usuario: club.idusuario,
        titulo: 'Te recomendaron jugadores',
        mensaje: `${nombre(entrenador) || 'Un entrenador de tu staff'} te recomendó ${n === 1 ? 'un jugador' : `${n} jugadores`}.`,
        tipo: 'RECOMENDACION',
        enlace: '/club/backoffice?tab=recomendados',
      })
    }

    return {
      club: { idclub: club.idclub, nombre: club.nombre },
      creadas: creadas.length,
      omitidas: ids.length - creadas.length,
      yaRecomendados: ids.filter(id => vigentes.has(id)).length,
    }
  }

  /** Recomendaciones que hizo el entrenador logueado. */
  async enviadas(usuario) {
    const entrenador = await this.#entrenadorDelUsuario(usuario)
    return await this.repository.listarDeEntrenadorAsync(entrenador.identrenador)
  }

  /** Recomendaciones que recibió el club logueado. */
  async recibidas(usuario) {
    const club = await this.#clubDelUsuario(usuario)
    return await this.repository.listarDeClubAsync(club.idclub)
  }

  /** El club marca una recomendación como contactada o descartada. */
  async actualizarEstado(usuario, id, estado) {
    const club = await this.#clubDelUsuario(usuario)
    const estadoNuevo = String(estado || '').toUpperCase()
    if (!ESTADOS_CLUB.includes(estadoNuevo)) throw { status: 400, message: 'El estado debe ser CONTACTADO o DESCARTADA.' }

    const rec = await this.repository.getByIdAsync(Number(id))
    if (!rec || Number(rec.id_club) !== Number(club.idclub)) throw { status: 404, message: 'No se encontró la recomendación.' }
    if (rec.estado === estadoNuevo) return rec

    const actualizada = await this.repository.actualizarEstadoAsync(rec.id, estadoNuevo)

    if (rec.entrenadores?.idusuario) {
      const jugador = nombre(rec.jugadores) || 'el jugador'
      await this.#notificar({
        id_usuario: rec.entrenadores.idusuario,
        titulo: estadoNuevo === 'CONTACTADO' ? 'El club contactó a tu recomendado' : 'Recomendación revisada',
        mensaje: estadoNuevo === 'CONTACTADO'
          ? `${club.nombre} se contactó con ${jugador}.`
          : `${club.nombre} revisó tu recomendación de ${jugador} y por ahora no avanza.`,
        tipo: 'RECOMENDACION',
        enlace: '/entrenador/panel?tab=recomendaciones',
      })
    }

    return { ...rec, ...actualizada }
  }
}

export default RecomendacionesClubService
