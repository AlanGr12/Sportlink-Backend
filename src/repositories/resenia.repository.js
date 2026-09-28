import supabase from '../configs/supabase-config.js'
import Resenia from '../entities/resenia.js'

/**
 * Normaliza la URL de una foto de perfil si se guardó como nombre de archivo relativo.
 */
function normalizarFotoPerfil(foto) {
  if (!foto) return null
  if (foto.startsWith('http')) return foto
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPerfiles/${foto}`
}

/**
 * Determina si un evento (prueba o entrenamiento) ya finalizó en función de su fecha y hora.
 */
function esEventoPasado(fecha, horafin = null, horainicio = null) {
  if (!fecha) return false
  const now = new Date()

  // Si la fecha ya contiene marca de tiempo completa (ISO o string con hora)
  if (typeof fecha === 'string' && (fecha.includes('T') || fecha.includes(' '))) {
    const d = new Date(fecha)
    if (!isNaN(d.getTime())) {
      return d < now
    }
  }

  const fechaStr = typeof fecha === 'string' ? fecha.split('T')[0] : new Date(fecha).toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  if (fechaStr < todayStr) return true
  if (fechaStr > todayStr) return false

  // Es el día de hoy: verificar con el horario de fin o inicio si están disponibles
  const horaRef = horafin || horainicio
  if (horaRef && typeof horaRef === 'string') {
    const partes = horaRef.split(':').map(Number)
    const hora = partes[0]
    const min = partes[1] || 0
    if (!isNaN(hora)) {
      const horaActual = now.getHours()
      const minActual = now.getMinutes()
      if (hora < horaActual) return true
      if (hora === horaActual && min <= minActual) return true
      return false
    }
  }

  // Si es hoy sin hora fin especificada, se asume que no ha finalizado aún
  return false
}

class ReseniaRepository {

  /**
   * Inserta una reseña en la tabla public.resenias.
   * Maneja errores de constraint de exclusión y unicidad.
   */
  async crearReseniaAsync(data) {
    const payload = {
      idjugador: Number(data.idjugador),
      idclub: data.idclub ? Number(data.idclub) : null,
      identrenador: data.identrenador ? Number(data.identrenador) : null,
      idprueba: data.idprueba ? Number(data.idprueba) : null,
      identrenamiento: data.identrenamiento ? Number(data.identrenamiento) : null,
      estrellitas: Number(data.estrellitas),
      textoopinion: data.textoopinion.trim()
    }

    const { data: nuevaResenia, error } = await supabase
      .from('resenias')
      .insert(payload)
      .select(`
        *,
        jugadores (
          idjugador,
          nombre,
          apellido,
          fotoperfil
        )
      `)
      .single()

    if (error) {
      // Captura de violación de índice único (código PostgreSQL 23505)
      if (error.code === '23505' || (error.message && error.message.toLowerCase().includes('unique'))) {
        const dest = payload.idclub ? 'club' : 'entrenador'
        const uniqueError = new Error(`Ya existe una reseña de este jugador para este ${dest}.`)
        uniqueError.status = 409
        uniqueError.code = '23505'
        throw uniqueError
      }
      throw new Error(error.message)
    }

    const jugador = nuevaResenia.jugadores ? {
      idjugador: nuevaResenia.jugadores.idjugador,
      nombre: nuevaResenia.jugadores.nombre,
      apellido: nuevaResenia.jugadores.apellido,
      fotoperfil: normalizarFotoPerfil(nuevaResenia.jugadores.fotoperfil)
    } : null

    return new Resenia({
      ...nuevaResenia,
      jugador
    })
  }

  /**
   * Obtiene las reseñas filtradas por destinatario (club o entrenador)
   * incluyendo los datos del jugador autor (join) y ordenadas por createdat DESC.
   */
  async getByDestinatarioAsync({ tipo, id }) {
    let query = supabase
      .from('resenias')
      .select(`
        idresenia,
        idjugador,
        idclub,
        identrenador,
        idprueba,
        identrenamiento,
        estrellitas,
        textoopinion,
        createdat,
        updatedat,
        jugadores (
          idjugador,
          nombre,
          apellido,
          fotoperfil
        )
      `)
      .order('createdat', { ascending: false })

    if (tipo === 'club') {
      query = query.eq('idclub', Number(id))
    } else {
      query = query.eq('identrenador', Number(id))
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map(r => {
      const jugador = r.jugadores ? {
        idjugador: r.jugadores.idjugador,
        nombre: r.jugadores.nombre,
        apellido: r.jugadores.apellido,
        fotoperfil: normalizarFotoPerfil(r.jugadores.fotoperfil)
      } : null

      return new Resenia({
        ...r,
        jugador
      })
    })
  }

  /**
   * Calcula el promedio de estrellitas (a 1 decimal) y métricas totales de reseñas.
   */
  async getPromedioYEstadisticasAsync({ tipo, id }) {
    let query = supabase
      .from('resenias')
      .select('estrellitas')

    if (tipo === 'club') {
      query = query.eq('idclub', Number(id))
    } else {
      query = query.eq('identrenador', Number(id))
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const resenias = data || []
    const totalResenias = resenias.length

    if (totalResenias === 0) {
      return {
        promedio: 0,
        totalResenias: 0,
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }

    const suma = resenias.reduce((acc, curr) => acc + (Number(curr.estrellitas) || 0), 0)
    const promedio = Number((suma / totalResenias).toFixed(1))

    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of resenias) {
      const estrellas = Number(r.estrellitas)
      if (distribucion[estrellas] !== undefined) {
        distribucion[estrellas]++
      }
    }

    return {
      promedio,
      totalResenias,
      distribucion
    }
  }

  /**
   * Verifica si el jugador ya dejó una reseña previa para ese club o entrenador.
   */
  async verificarExisteReseniaAsync({ idjugador, tipo, id }) {
    let query = supabase
      .from('resenias')
      .select('idresenia, estrellitas, textoopinion, createdat')
      .eq('idjugador', Number(idjugador))

    if (tipo === 'club') {
      query = query.eq('idclub', Number(id))
    } else {
      query = query.eq('identrenador', Number(id))
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return Array.isArray(data) && data.length > 0
  }

  /**
   * Consulta las pruebas finalizadas de un club en las que el jugador estuvo inscripto.
   */
  async getEventosPasadosClubAsync({ idjugador, idclub }) {
    // 1. Intentar consulta con join relacional
    const { data: inscripciones, error: errJoin } = await supabase
      .from('inscripcionesprueba')
      .select(`
        idinscripcionesprueba,
        idprueba,
        pruebas (
          idprueba,
          idclub,
          fechaprueba,
          horainicio,
          horafin,
          categoria,
          descripcion,
          zona,
          estado
        )
      `)
      .eq('idjugador', Number(idjugador))

    let pruebasDelClub = []

    if (!errJoin && inscripciones) {
      pruebasDelClub = inscripciones
        .map(i => i.pruebas)
        .filter(p => p && Number(p.idclub) === Number(idclub))
    } else {
      // Fallback defensivo en caso de que el join no resuelva
      const { data: inscs } = await supabase
        .from('inscripcionesprueba')
        .select('idprueba')
        .eq('idjugador', Number(idjugador))

      const idsPruebas = (inscs || []).map(i => i.idprueba).filter(Boolean)
      if (idsPruebas.length > 0) {
        const { data: pruebas } = await supabase
          .from('pruebas')
          .select('idprueba, idclub, fechaprueba, horainicio, horafin, categoria, descripcion, zona, estado')
          .in('idprueba', idsPruebas)
          .eq('idclub', Number(idclub))

        pruebasDelClub = pruebas || []
      }
    }

    // Filtrar solo las que ya finalizaron (fechaprueba < NOW())
    return pruebasDelClub
      .filter(p => esEventoPasado(p.fechaprueba, p.horafin, p.horainicio))
      .map(p => ({
        tipo: 'prueba',
        idprueba: p.idprueba,
        idclub: p.idclub,
        titulo: p.categoria ? `Prueba ${p.categoria}` : `Prueba #${p.idprueba}`,
        fecha: p.fechaprueba,
        horainicio: p.horainicio || null,
        horafin: p.horafin || null,
        descripcion: p.descripcion || null
      }))
  }

  /**
   * Consulta los entrenamientos finalizados de un entrenador en los que el jugador estuvo inscripto.
   * En inscripcionesentrenamientos la columna de jugador es idjugadorinscripto.
   */
  async getEventosPasadosEntrenadorAsync({ idjugador, identrenador }) {
    // 1. Intentar consulta con join relacional
    const { data: inscripciones, error: errJoin } = await supabase
      .from('inscripcionesentrenamientos')
      .select(`
        idinscripcionesentr,
        identrenamiento,
        entrenamientos (
          identrenamientos,
          identrenador,
          titulo,
          fechaentr,
          horainicio,
          horafin,
          descripcion,
          estado
        )
      `)
      .eq('idjugadorinscripto', Number(idjugador))

    let entrenamientosDelEntrenador = []

    if (!errJoin && inscripciones) {
      entrenamientosDelEntrenador = inscripciones
        .map(i => i.entrenamientos)
        .filter(e => e && Number(e.identrenador) === Number(identrenador))
    } else {
      // Fallback defensivo
      const { data: inscs } = await supabase
        .from('inscripcionesentrenamientos')
        .select('identrenamiento')
        .eq('idjugadorinscripto', Number(idjugador))

      const idsEntr = (inscs || []).map(i => i.identrenamiento).filter(Boolean)
      if (idsEntr.length > 0) {
        const { data: entrenamientos } = await supabase
          .from('entrenamientos')
          .select('identrenamientos, identrenador, titulo, fechaentr, horainicio, horafin, descripcion, estado')
          .in('identrenamientos', idsEntr)
          .eq('identrenador', Number(identrenador))

        entrenamientosDelEntrenador = entrenamientos || []
      }
    }

    // Filtrar solo los que ya finalizaron (fechaentr < NOW())
    return entrenamientosDelEntrenador
      .filter(e => esEventoPasado(e.fechaentr, e.horafin, e.horainicio))
      .map(e => ({
        tipo: 'entrenamiento',
        identrenamiento: e.identrenamientos || e.identrenamiento,
        identrenador: e.identrenador,
        titulo: e.titulo || `Entrenamiento #${e.identrenamientos}`,
        fecha: e.fechaentr,
        horainicio: e.horainicio || null,
        horafin: e.horafin || null,
        descripcion: e.descripcion || null
      }))
  }

  /**
   * Resuelve el perfil de jugador a partir de un idusuario.
   */
  async getJugadorByUsuarioIdAsync(idusuario) {
    const { data, error } = await supabase
      .from('jugadores')
      .select('idjugador, idusuario, nombre, apellido, fotoperfil')
      .eq('idusuario', Number(idusuario))
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }
}

export default new ReseniaRepository()
