import CalendarioEventosRepository from '../repositories/calendarioeventos-repository.js'

class CalendarioEventosService {
  constructor() {
    this.repository = new CalendarioEventosRepository()
  }

  // ── Crear evento personalizado ─────────────────────────────────────────────
  async crearEvento(payload) {
    return await this.repository.crearEvento(payload)
  }

  // ── Editar evento personalizado ────────────────────────────────────────────
  async editarEvento(idevento, idusuario, campos) {
    return await this.repository.editarEvento(idevento, idusuario, campos)
  }

  // ── Eliminar evento personalizado ──────────────────────────────────────────
  async eliminarEvento(idevento, idusuario) {
    return await this.repository.eliminarEvento(idevento, idusuario)
  }

  // ── Obtener todos los eventos del usuario (propios + pruebas automáticas) ──
  async getByUsuario(idusuario) {
    // 1. Eventos guardados manualmente en calendarioeventos
    const eventosPropios = await this.repository.getByUsuario(idusuario)

    // 2. Pruebas a las que el usuario (jugador) está inscrito
    let pruebasAutomaticas = []
    try {
      pruebasAutomaticas = await this.repository.getPruebasInscritasPorUsuario(idusuario)
    } catch {
      // Si el usuario no es jugador o falla la consulta, lo ignoramos
    }

    // 3. Entrevistas a las que el usuario (entrenador) está convocado
    let entrevistasAutomaticas = []
    try {
      entrevistasAutomaticas = await this.repository.getEntrevistasInscritasPorUsuario(idusuario)
    } catch {
      // Si el usuario no es entrenador o falla la consulta, lo ignoramos
    }

    // 4. Pruebas y Empleos publicados (club)
    let eventosClubAutomaticos = []
    try {
      eventosClubAutomaticos = await this.repository.getEventosClubPorUsuario(idusuario)
    } catch {
      // Si el usuario no es club o falla la consulta, lo ignoramos
    }

    // 5. Entrenamientos publicados (entrenador)
    let eventosEntrenadorAutomaticos = []
    try {
      eventosEntrenadorAutomaticos = await this.repository.getEntrenamientosPublicadosPorUsuario(idusuario)
    } catch {
      // Si el usuario no es entrenador o falla la consulta, lo ignoramos
    }

    // 5. Evitar duplicados: si ya existe un evento PRUEBA con el mismo idprueba
    //    o un evento ENTREVISTA con el mismo idinscripcionempleo en los eventos propios, no los agregamos dos veces.
    //    También evitamos agregar las pruebas/empleos publicados por el club si el club mismo (u otro proceso)
    //    los agregó manualmente.
    const idPruebasEnPropios = new Set(
      eventosPropios
        .filter(e => e.tipo === 'PRUEBA' && e.idprueba)
        .map(e => e.idprueba)
    )

    const pruebasSinDuplicar = pruebasAutomaticas.filter(
      p => !idPruebasEnPropios.has(p.idprueba)
    )

    const idInscripcionesEnPropios = new Set(
      eventosPropios
        .filter(e => e.tipo === 'ENTREVISTA' && e.idinscripcionempleo)
        .map(e => e.idinscripcionempleo)
    )

    const entrevistasSinDuplicar = entrevistasAutomaticas.filter(
      e => !idInscripcionesEnPropios.has(e.idinscripcionempleo)
    )

    // Para los del club, filtramos también (usando idprueba e idinscripcionempleo para empleos)
    const eventosClubSinDuplicar = eventosClubAutomaticos.filter(
      e => {
        if (e.tipo === 'PRUEBA' && e.idprueba) return !idPruebasEnPropios.has(e.idprueba)
        if (e.tipo === 'EMPLEO' && e.idinscripcionempleo) return !idInscripcionesEnPropios.has(e.idinscripcionempleo)
        return true
      }
    )

    // Para los del entrenador, deduplicar por identrenamiento respecto a eventosPropios
    const idEntrenamientosEnPropios = new Set(
      eventosPropios
        .filter(e => e.tipo === 'ENTRENAMIENTO' && e.identrenamiento)
        .map(e => e.identrenamiento)
    )
    const eventosEntrenadorSinDuplicar = eventosEntrenadorAutomaticos.filter(
      e => e.tipo === 'ENTRENAMIENTO' && e.identrenamiento
        ? !idEntrenamientosEnPropios.has(e.identrenamiento)
        : true
    )

    // 7. Merge y ordenar por fecha
    const todos = [...eventosPropios, ...pruebasSinDuplicar, ...entrevistasSinDuplicar, ...eventosClubSinDuplicar, ...eventosEntrenadorSinDuplicar]
    todos.sort((a, b) => {
      const fa = a.fecha || ''
      const fb = b.fecha || ''
      if (fa < fb) return -1
      if (fa > fb) return  1
      const ha = a.horainicio || ''
      const hb = b.horainicio || ''
      return ha < hb ? -1 : ha > hb ? 1 : 0
    })

    return todos
  }
}

export default CalendarioEventosService
