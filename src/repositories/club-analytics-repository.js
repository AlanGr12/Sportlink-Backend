import supabase from '../configs/supabase-config.js'
import VinculacionesRepository from './vinculaciones-repository.js'

const PAGINA = 1000   // tope de filas por request en Supabase
const LOTE_IDS = 150  // ids por consulta .in() para no exceder el largo de la URL

/** Trae todas las filas de una consulta paginando con range(). */
async function traerTodo(construir) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await construir().range(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    filas.push(...(data || []))
    if (!data || data.length < PAGINA) break
  }
  return filas
}

/** Igual que traerTodo pero filtrando una columna por una lista grande de ids (en lotes). */
async function traerPorIds(ids, construir) {
  const filas = []
  for (let i = 0; i < ids.length; i += LOTE_IDS) {
    const lote = ids.slice(i, i + LOTE_IDS)
    filas.push(...await traerTodo(() => construir(lote)))
  }
  return filas
}

class ClubAnalyticsRepository {
  constructor() {
    this.vinculaciones = new VinculacionesRepository()
  }

  async getClubAsync(idclub) {
    return await this.vinculaciones.getClubPorIdAsync(idclub)
  }

  async getClubPorUsuarioAsync(idusuario) {
    return await this.vinculaciones.getClubPorUsuarioAsync(idusuario)
  }

  /** Pruebas del club cuya fecha es >= desde (YYYY-MM-DD) o todas si desde es null. */
  async getPruebasAsync(idclub, desde) {
    return await traerTodo(() => {
      let q = supabase
        .from('pruebas')
        .select('idprueba, cupo, estado, categoria, zona, genero, fechaprueba, fechacierre, horafin, deportes ( iddeporte, deporte )')
        .eq('idclub', idclub)
        .order('fechaprueba', { ascending: false })
      if (desde) q = q.gte('fechaprueba', desde)
      return q
    })
  }

  /** Entrenamientos respaldados por el club (id_club) con el entrenador asignado. */
  async getEntrenamientosAsync(idclub, desde) {
    return await traerTodo(() => {
      let q = supabase
        .from('entrenamientos')
        .select('identrenamientos, identrenador, titulo, precio, cantidad, estado, fechaentr, horafin, deportes ( iddeporte, deporte ), entrenadores ( identrenador, idusuario, nombre, apellido, fotoperfil )')
        .eq('id_club', idclub)
        .order('fechaentr', { ascending: false })
      if (desde) q = q.gte('fechaentr', desde)
      return q
    })
  }

  async getInscripcionesPruebaAsync(idsPrueba) {
    return await traerPorIds(idsPrueba, (lote) =>
      supabase.from('inscripcionesprueba').select('idinscripcionesprueba, idprueba, idjugador').in('idprueba', lote).order('idinscripcionesprueba'))
  }

  async getInscripcionesEntrenamientoAsync(idsEntrenamiento) {
    return await traerPorIds(idsEntrenamiento, (lote) =>
      supabase.from('inscripcionesentrenamientos').select('idinscripcionesentr, identrenamiento, idjugadorinscripto').in('identrenamiento', lote).order('idinscripcionesentr'))
  }

  async getListaEsperaPruebasAsync(idsPrueba) {
    return await traerPorIds(idsPrueba, (lote) =>
      supabase.from('lista_espera_pruebas').select('id, id_prueba, id_jugador').in('id_prueba', lote).order('id'))
  }

  async getListaEsperaEntrenamientosAsync(idsEntrenamiento) {
    return await traerPorIds(idsEntrenamiento, (lote) =>
      supabase.from('lista_espera_entrenamientos').select('id, id_entrenamiento, id_jugador').in('id_entrenamiento', lote).order('id'))
  }

  /** Entrenadores con vinculación ACEPTADA (con foto normalizada). */
  async getEntrenadoresVinculadosAsync(idclub) {
    return await this.vinculaciones.listarEntrenadoresDelClubAsync(idclub)
  }

  /** Promedio de estrellas y cantidad de reseñas recibidas por cada entrenador: { [identrenador]: { promedio, total } } */
  async getResumenReseniasAsync(idsEntrenador) {
    const filas = await traerPorIds(idsEntrenador, (lote) =>
      supabase.from('resenias').select('idresenia, identrenador, estrellitas').in('identrenador', lote).order('idresenia'))
    const acum = {}
    for (const r of filas) {
      const e = Number(r.estrellitas)
      if (!Number.isFinite(e)) continue
      const a = (acum[r.identrenador] ||= { suma: 0, total: 0 })
      a.suma += e
      a.total += 1
    }
    return Object.fromEntries(Object.entries(acum).map(([id, a]) => [id, { promedio: a.suma / a.total, total: a.total }]))
  }
}

export default ClubAnalyticsRepository
