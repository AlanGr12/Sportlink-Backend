import ClubAnalyticsRepository from '../repositories/club-analytics-repository.js'
import VinculacionesRepository from '../repositories/vinculaciones-repository.js'
import RecomendacionesClubRepository from '../repositories/recomendaciones-club-repository.js'
import { haPasado, porcentaje, promedio, contarPor, desdeRango, armarCsv } from './analytics-utils.js'

const nombre = (p) => [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim()

/**
 * Panel del entrenador: métricas de sus entrenamientos y de sus alumnos.
 * Reutiliza las consultas del panel del club.
 */
class EntrenadorAnalyticsService {
  constructor() {
    this.repository = new ClubAnalyticsRepository()
    this.vinculaciones = new VinculacionesRepository()
    this.recomendaciones = new RecomendacionesClubRepository()
  }

  /** El entrenador dueño de la sesión o, para administradores, el identrenador pedido. */
  async resolverEntrenador(usuario, identrenadorSolicitado) {
    if (usuario.es_admin === true && identrenadorSolicitado) {
      const entrenador = await this.vinculaciones.getEntrenadorPorIdAsync(Number(identrenadorSolicitado))
      if (!entrenador) throw { status: 404, message: 'No se encontró el entrenador.' }
      return entrenador
    }
    const entrenador = await this.vinculaciones.getEntrenadorPorUsuarioAsync(usuario.idusuario)
    if (!entrenador) {
      throw usuario.es_admin === true
        ? { status: 400, message: 'Indicá el entrenador a consultar con el parámetro identrenador.' }
        : { status: 403, message: 'Tu cuenta no tiene un perfil de entrenador.' }
    }
    return entrenador
  }

  async obtenerEstadisticas(entrenador, rango = 'historico') {
    const desde = desdeRango(rango)
    const identrenador = entrenador.identrenador

    const [entrenamientosRaw, vinculacion, resenias] = await Promise.all([
      this.repository.getEntrenamientosDeEntrenadorAsync(identrenador, desde),
      this.vinculaciones.getAceptadaDeEntrenadorAsync(identrenador),
      this.repository.getResumenReseniasAsync([identrenador]),
    ])
    const club = vinculacion?.clubes ? { idclub: vinculacion.clubes.idclub, nombre: vinculacion.clubes.nombre } : null

    const idsEntr = entrenamientosRaw.map(e => e.identrenamientos)
    const [inscEntr, esperaEntr] = await Promise.all([
      this.repository.getInscripcionesConJugadorAsync(idsEntr),
      this.repository.getListaEsperaEntrenamientosAsync(idsEntr),
    ])

    const inscPorEntr = contarPor(inscEntr, 'identrenamiento')
    const alumnosPorEntr = new Map()
    for (const i of inscEntr) {
      if (!alumnosPorEntr.has(i.identrenamiento)) alumnosPorEntr.set(i.identrenamiento, [])
      alumnosPorEntr.get(i.identrenamiento).push(i.idjugadorinscripto)
    }
    const esperaPorEntr = contarPor(esperaEntr, 'id_entrenamiento')

    // ── Entrenamientos ──────────────────────────────────────────────────────
    const entrenamientos = entrenamientosRaw.map(e => {
      const inscriptos = inscPorEntr.get(e.identrenamientos) || 0
      const cupo = Number(e.cantidad) || 0
      const precio = Number(e.precio) || 0
      const finalizado = haPasado(e.fechaentr, e.horafin)
      return {
        identrenamientos: e.identrenamientos,
        titulo: e.titulo,
        deporte: e.deportes?.deporte || null,
        fechaentr: e.fechaentr,
        horainicio: e.horainicio || null,
        horafin: e.horafin || null,
        club: e.clubes ? { idclub: e.clubes.idclub, nombre: e.clubes.nombre } : null,
        cupo,
        inscriptos,
        listaEspera: esperaPorEntr.get(e.identrenamientos) || 0,
        ocupacion: porcentaje(inscriptos, cupo),
        precio,
        // Estimación: no existe un registro de pagos, se asume que cada inscripto abona el precio publicado
        ingresosEstimados: precio * inscriptos,
        estado: finalizado ? 'FINALIZADO' : e.estado === false ? 'INACTIVO' : 'ACTIVO',
        // idjugador de los inscriptos; el detalle de cada uno está en `alumnos`
        idsAlumnos: alumnosPorEntr.get(e.identrenamientos) || [],
      }
    })

    // ── Alumnos ─────────────────────────────────────────────────────────────
    const fechaPorEntr = new Map(entrenamientosRaw.map(e => [e.identrenamientos, e.fechaentr]))
    const alumnosMap = new Map()
    for (const i of inscEntr) {
      const j = i.jugadores
      if (!j) continue
      const a = alumnosMap.get(j.idjugador) || {
        idjugador: j.idjugador,
        idusuario: j.idusuario,
        nombre: j.nombre,
        apellido: j.apellido,
        fotoperfil: j.fotoperfil || null,
        deporte: j.deportes?.deporte || null,
        entrenamientos: 0,
        ultimoEntrenamiento: null,
      }
      a.entrenamientos += 1
      const fecha = fechaPorEntr.get(i.identrenamiento)
      if (fecha && (!a.ultimoEntrenamiento || fecha > a.ultimoEntrenamiento)) a.ultimoEntrenamiento = fecha
      alumnosMap.set(j.idjugador, a)
    }
    // Si las recomendaciones no responden (p. ej. falta la tabla), las estadísticas igual se muestran
    const vigentes = club
      ? await this.recomendaciones.getJugadoresVigentesAsync(club.idclub, [...alumnosMap.keys()]).catch((err) => {
        console.error('[entrenador-analytics] recomendaciones:', err.message || err)
        return new Set()
      })
      : new Set()
    const alumnos = [...alumnosMap.values()]
      .map(a => ({ ...a, recomendado: vigentes.has(a.idjugador) }))
      .sort((a, b) => b.entrenamientos - a.entrenamientos || String(b.ultimoEntrenamiento).localeCompare(String(a.ultimoEntrenamiento)))

    // ── Reparto por deporte ─────────────────────────────────────────────────
    const deportes = new Map()
    for (const e of entrenamientos) {
      const k = e.deporte || 'Sin especificar'
      const d = deportes.get(k) || { clave: k, entrenamientos: 0, inscriptos: 0 }
      d.entrenamientos += 1
      d.inscriptos += e.inscriptos
      deportes.set(k, d)
    }

    const ocupaciones = entrenamientos.map(e => e.ocupacion).filter(o => o !== null)
    const r = resenias[identrenador]

    return {
      entrenador: { identrenador, nombre: entrenador.nombre, apellido: entrenador.apellido },
      club,
      rango,
      desde,
      generadoEn: new Date().toISOString(),
      resumen: {
        total: entrenamientos.length,
        activos: entrenamientos.filter(e => e.estado === 'ACTIVO').length,
        finalizados: entrenamientos.filter(e => e.estado === 'FINALIZADO').length,
        inscriptos: entrenamientos.reduce((s, e) => s + e.inscriptos, 0),
        cupoTotal: entrenamientos.reduce((s, e) => s + e.cupo, 0),
        listaEspera: entrenamientos.reduce((s, e) => s + e.listaEspera, 0),
        ocupacionPromedio: promedio(ocupaciones),
        ingresosEstimados: entrenamientos.reduce((s, e) => s + e.ingresosEstimados, 0),
        alumnosUnicos: alumnos.length,
        alumnosQueRepiten: alumnos.filter(a => a.entrenamientos >= 2).length,
        // Las reseñas son históricas: no dependen del período elegido
        calificacion: r ? Math.round(r.promedio * 10) / 10 : null,
        totalResenias: r?.total || 0,
      },
      entrenamientos,
      alumnos,
      porDeporte: [...deportes.values()].sort((a, b) => b.inscriptos - a.inscriptos),
    }
  }

  async exportarCsv(entrenador, rango = 'historico', tipo = 'entrenamientos') {
    const e = await this.obtenerEstadisticas(entrenador, rango)

    const tablas = {
      entrenamientos: {
        columnas: ['Título', 'Deporte', 'Fecha', 'Club', 'Cupo', 'Inscriptos', 'Lista de espera', 'Ocupación (%)', 'Precio', 'Ingresos estimados', 'Estado'],
        filas: e.entrenamientos.map(x => [x.titulo, x.deporte, String(x.fechaentr).substring(0, 10), x.club?.nombre, x.cupo, x.inscriptos, x.listaEspera, x.ocupacion, x.precio, x.ingresosEstimados, x.estado]),
      },
      alumnos: {
        columnas: ['Alumno', 'Deporte', 'Entrenamientos', 'Último entrenamiento', 'Recomendado al club'],
        filas: e.alumnos.map(x => [nombre(x), x.deporte, x.entrenamientos, x.ultimoEntrenamiento ? String(x.ultimoEntrenamiento).substring(0, 10) : '', x.recomendado ? 'Sí' : 'No']),
      },
    }
    const t = tablas[tipo]
    if (!t) throw { status: 400, message: 'El tipo debe ser entrenamientos o alumnos.' }

    return armarCsv(nombre(entrenador), tipo, rango, t.columnas, t.filas, 'entrenador')
  }
}

export default EntrenadorAnalyticsService
