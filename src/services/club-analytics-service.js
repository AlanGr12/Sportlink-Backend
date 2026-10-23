import ClubAnalyticsRepository from '../repositories/club-analytics-repository.js'
import { aFecha, haPasado, porcentaje, promedio, contarPor, desdeRango, armarCsv } from './analytics-utils.js'

class ClubAnalyticsService {
  constructor() {
    this.repository = new ClubAnalyticsRepository()
  }

  /**
   * Resuelve el club a consultar: el club dueño de la sesión o, para administradores, el idclub pedido.
   */
  async resolverClub(usuario, idclubSolicitado) {
    if (usuario.es_admin === true && idclubSolicitado) {
      const club = await this.repository.getClubAsync(Number(idclubSolicitado))
      if (!club) throw { status: 404, message: 'No se encontró el club.' }
      return club
    }
    const club = await this.repository.getClubPorUsuarioAsync(usuario.idusuario)
    if (!club) {
      throw usuario.es_admin === true
        ? { status: 400, message: 'Indicá el club a consultar con el parámetro idclub.' }
        : { status: 403, message: 'Tu cuenta no tiene un club asociado.' }
    }
    return club
  }

  async obtenerEstadisticas(club, rango = 'historico') {
    const desde = desdeRango(rango)
    const idclub = club.idclub

    const [pruebasRaw, entrenamientosRaw, vinculados] = await Promise.all([
      this.repository.getPruebasAsync(idclub, desde),
      this.repository.getEntrenamientosAsync(idclub, desde),
      this.repository.getEntrenadoresVinculadosAsync(idclub),
    ])

    const idsPrueba = pruebasRaw.map(p => p.idprueba)
    const idsEntr = entrenamientosRaw.map(e => e.identrenamientos)

    const [inscPrueba, inscEntr, esperaPrueba, esperaEntr, resenias] = await Promise.all([
      this.repository.getInscripcionesPruebaAsync(idsPrueba),
      this.repository.getInscripcionesEntrenamientoAsync(idsEntr),
      this.repository.getListaEsperaPruebasAsync(idsPrueba),
      this.repository.getListaEsperaEntrenamientosAsync(idsEntr),
      this.repository.getResumenReseniasAsync(vinculados.map(v => v.identrenador)),
    ])

    const inscPorPrueba = contarPor(inscPrueba, 'idprueba')
    const inscPorEntr = contarPor(inscEntr, 'identrenamiento')
    const esperaPorPrueba = contarPor(esperaPrueba, 'id_prueba')
    const esperaPorEntr = contarPor(esperaEntr, 'id_entrenamiento')

    // ── Pruebas ─────────────────────────────────────────────────────────────
    const hoy = aFecha(new Date())
    const pruebas = pruebasRaw.map(p => {
      const inscriptos = inscPorPrueba.get(p.idprueba) || 0
      const cupo = Number(p.cupo) || 0
      const finalizada = haPasado(p.fechaprueba, p.horafin)
      const cerradaPorFecha = !!p.fechacierre && String(p.fechacierre).substring(0, 10) < hoy
      const abierta = !finalizada && p.estado !== false && !cerradaPorFecha
      return {
        idprueba: p.idprueba,
        deporte: p.deportes?.deporte || null,
        categoria: p.categoria || null,
        genero: p.genero || null,
        zona: p.zona || null,
        fechaprueba: p.fechaprueba,
        cupo,
        inscriptos,
        listaEspera: esperaPorPrueba.get(p.idprueba) || 0,
        ocupacion: porcentaje(inscriptos, cupo),
        finalizada,
        abierta,
      }
    })

    // Desglose de postulantes por categoría, género y deporte
    const desglosar = (clave) => {
      const m = new Map()
      for (const p of pruebas) {
        const k = p[clave] || 'Sin especificar'
        const a = m.get(k) || { clave: k, pruebas: 0, inscriptos: 0, cupo: 0, listaEspera: 0 }
        a.pruebas += 1
        a.inscriptos += p.inscriptos
        a.cupo += p.cupo
        a.listaEspera += p.listaEspera
        m.set(k, a)
      }
      return [...m.values()].sort((a, b) => b.inscriptos - a.inscriptos)
    }

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
        entrenador: e.entrenadores
          ? { identrenador: e.entrenadores.identrenador, idusuario: e.entrenadores.idusuario, nombre: e.entrenadores.nombre, apellido: e.entrenadores.apellido }
          : null,
        cupo,
        inscriptos,
        listaEspera: esperaPorEntr.get(e.identrenamientos) || 0,
        ocupacion: porcentaje(inscriptos, cupo),
        precio,
        // Estimación: no existe un registro de pagos, se asume que cada inscripto abona el precio publicado
        ingresosEstimados: precio * inscriptos,
        estado: finalizado ? 'FINALIZADO' : e.estado === false ? 'INACTIVO' : 'ACTIVO',
      }
    })

    // ── Entrenadores vinculados ─────────────────────────────────────────────
    const jugadoresPorEntrenador = new Map()
    const entrenamientosPorEntrenador = new Map()
    const entrPorId = new Map(entrenamientosRaw.map(e => [e.identrenamientos, e]))
    for (const e of entrenamientosRaw) {
      entrenamientosPorEntrenador.set(e.identrenador, (entrenamientosPorEntrenador.get(e.identrenador) || 0) + 1)
    }
    for (const i of inscEntr) {
      const idEntrenador = entrPorId.get(i.identrenamiento)?.identrenador
      if (idEntrenador == null) continue
      if (!jugadoresPorEntrenador.has(idEntrenador)) jugadoresPorEntrenador.set(idEntrenador, new Set())
      jugadoresPorEntrenador.get(idEntrenador).add(i.idjugadorinscripto)
    }

    const entrenadores = vinculados.map(v => {
      const r = resenias[v.identrenador]
      return {
        idvinculacion: v.idvinculacion,
        identrenador: v.identrenador,
        idusuario: v.idusuario,
        nombre: v.nombre,
        apellido: v.apellido,
        fotoperfil: v.fotoperfil || null,
        deportes: (v.deportes || []).map(d => d.deporte),
        entrenamientos: entrenamientosPorEntrenador.get(v.identrenador) || 0,
        alumnos: jugadoresPorEntrenador.get(v.identrenador)?.size || 0,
        calificacion: r ? Math.round(r.promedio * 10) / 10 : null,
        totalResenias: r?.total || 0,
      }
    }).sort((a, b) => b.alumnos - a.alumnos)

    // ── Resumen general ─────────────────────────────────────────────────────
    const jugadoresUnicos = new Set([
      ...inscPrueba.map(i => i.idjugador),
      ...inscEntr.map(i => i.idjugadorinscripto),
    ])
    const ocupacionesPruebas = pruebas.map(p => p.ocupacion).filter(o => o !== null)
    const ocupacionesEntr = entrenamientos.map(e => e.ocupacion).filter(o => o !== null)

    return {
      club: { idclub: club.idclub, nombre: club.nombre },
      rango,
      desde,
      generadoEn: new Date().toISOString(),
      resumen: {
        jugadoresUnicos: jugadoresUnicos.size,
        entrenadoresVinculados: vinculados.length,
        ocupacionPromedio: promedio([...ocupacionesPruebas, ...ocupacionesEntr]),
        pruebas: {
          total: pruebas.length,
          activas: pruebas.filter(p => p.abierta).length,
          finalizadas: pruebas.filter(p => p.finalizada).length,
          inscriptos: pruebas.reduce((s, p) => s + p.inscriptos, 0),
          cupoTotal: pruebas.reduce((s, p) => s + p.cupo, 0),
          listaEspera: pruebas.reduce((s, p) => s + p.listaEspera, 0),
          ocupacionPromedio: promedio(ocupacionesPruebas),
        },
        entrenamientos: {
          total: entrenamientos.length,
          activos: entrenamientos.filter(e => e.estado === 'ACTIVO').length,
          finalizados: entrenamientos.filter(e => e.estado === 'FINALIZADO').length,
          inscriptos: entrenamientos.reduce((s, e) => s + e.inscriptos, 0),
          cupoTotal: entrenamientos.reduce((s, e) => s + e.cupo, 0),
          listaEspera: entrenamientos.reduce((s, e) => s + e.listaEspera, 0),
          ocupacionPromedio: promedio(ocupacionesEntr),
          ingresosEstimados: entrenamientos.reduce((s, e) => s + e.ingresosEstimados, 0),
        },
      },
      pruebas,
      desglosePruebas: {
        porCategoria: desglosar('categoria'),
        porGenero: desglosar('genero'),
        porDeporte: desglosar('deporte'),
      },
      entrenamientos,
      entrenadores,
    }
  }

  // ── Exportación CSV ───────────────────────────────────────────────────────

  async exportarCsv(club, rango = 'historico', tipo = 'entrenamientos') {
    const e = await this.obtenerEstadisticas(club, rango)
    const nombre = (n) => [n?.nombre, n?.apellido].filter(Boolean).join(' ')

    const tablas = {
      entrenamientos: {
        columnas: ['Título', 'Deporte', 'Fecha', 'Entrenador', 'Cupo', 'Inscriptos', 'Lista de espera', 'Ocupación (%)', 'Precio', 'Ingresos estimados', 'Estado'],
        filas: e.entrenamientos.map(x => [x.titulo, x.deporte, String(x.fechaentr).substring(0, 10), nombre(x.entrenador), x.cupo, x.inscriptos, x.listaEspera, x.ocupacion, x.precio, x.ingresosEstimados, x.estado]),
      },
      pruebas: {
        columnas: ['Deporte', 'Categoría', 'Género', 'Zona', 'Fecha', 'Cupo', 'Inscriptos', 'Lista de espera', 'Ocupación (%)', 'Estado'],
        filas: e.pruebas.map(x => [x.deporte, x.categoria, x.genero, x.zona, String(x.fechaprueba).substring(0, 10), x.cupo, x.inscriptos, x.listaEspera, x.ocupacion, x.finalizada ? 'FINALIZADA' : x.abierta ? 'ABIERTA' : 'CERRADA']),
      },
      entrenadores: {
        columnas: ['Entrenador', 'Deportes', 'Entrenamientos', 'Alumnos', 'Calificación', 'Reseñas'],
        filas: e.entrenadores.map(x => [nombre(x), x.deportes.join(' / '), x.entrenamientos, x.alumnos, x.calificacion, x.totalResenias]),
      },
    }
    const t = tablas[tipo]
    if (!t) throw { status: 400, message: 'El tipo debe ser entrenamientos, pruebas o entrenadores.' }

    return armarCsv(club.nombre || 'club', tipo, rango, t.columnas, t.filas, 'club')
  }
}

export default ClubAnalyticsService
