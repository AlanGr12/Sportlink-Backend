import supabase from '../configs/supabase-config.js'
import CalendarioEvento from '../entities/calendarioevento.js'

class CalendarioEventosRepository {

  // ── Subir imagen al bucket fotoCalendario ──────────────────────────────────
  // Acepta un data URL (data:image/png;base64,XXX) o ya una URL pública (la deja pasar)
  async #subirImagenAlStorage(imagenBase64) {
    if (!imagenBase64) return null

    // Si ya es una URL pública (no es data URL), la retornamos tal cual
    if (!imagenBase64.startsWith('data:')) return imagenBase64

    try {
      // Parsear el data URL: "data:<mime>;base64,<datos>"
      const matches = imagenBase64.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        console.warn('[Calendario] Formato de imagen no reconocido, se omite la subida')
        return null
      }

      const mimeType   = matches[1]                        // ej. "image/png"
      const base64Data = matches[2]                        // el contenido base64
      const extension  = mimeType.split('/')[1] || 'jpg'  // ej. "png"

      // Convertir base64 a Buffer binario
      const buffer = Buffer.from(base64Data, 'base64')

      // Nombre único en el bucket
      const nombreUnico = `calendario/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

      console.log('[Calendario] Subiendo imagen al bucket fotoCalendario:', nombreUnico, `(${buffer.length} bytes)`)

      // Subir al bucket 'fotoCalendario'
      const { error: errUpload } = await supabase.storage
        .from('fotoCalendario')
        .upload(nombreUnico, buffer, {
          contentType: mimeType,
          upsert:      false,
        })

      if (errUpload) {
        console.error('[Calendario] Error al subir imagen al storage:', errUpload)
        // No falla todo el flujo; el evento se crea sin imagen
        return null
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('fotoCalendario')
        .getPublicUrl(nombreUnico)

      console.log('[Calendario] Imagen subida exitosamente. URL:', urlData.publicUrl)
      return urlData.publicUrl

    } catch (err) {
      console.error('[Calendario] Excepción al procesar imagen:', err)
      return null
    }
  }

  // ── Crear evento ────────────────────────────────────────────────────────────
  async crearEvento({
    idusuario,
    tipo         = 'PERSONALIZADO',
    fecha,
    horainicio   = null,
    horafin      = null,
    idprueba     = null,
    identrenamiento     = null,
    idinscripcionempleo = null,
    titulo       = null,
    descripcion  = null,
    imagen       = null,
  }) {
    // Si viene imagen en base64, subirla al storage y obtener URL pública
    const imagenUrl = await this.#subirImagenAlStorage(imagen)

    // La tabla calendarioeventos tiene exactamente estas columnas:
    // idevento, idusuario, tipo, fecha, horainicio, horafin,
    // idprueba, identrenamiento, idinscripcionempleo,
    // titulo, descripcion, imagen, createdat, updatedat
    const payload = {
      idusuario,
      tipo,
      fecha,
    }

    // Sólo incluir opcionales si tienen valor real (evita errores de FK con null)
    if (horainicio          !== null && horainicio          !== undefined) payload.horainicio          = horainicio
    if (horafin             !== null && horafin             !== undefined) payload.horafin             = horafin
    if (idprueba            !== null && idprueba            !== undefined) payload.idprueba            = idprueba
    if (identrenamiento     !== null && identrenamiento     !== undefined) payload.identrenamiento     = identrenamiento
    if (idinscripcionempleo !== null && idinscripcionempleo !== undefined) payload.idinscripcionempleo = idinscripcionempleo
    if (titulo              !== null && titulo              !== undefined) payload.titulo              = titulo
    if (descripcion         !== null && descripcion         !== undefined) payload.descripcion         = descripcion
    // Guardar la URL pública (o null si no hay imagen)
    if (imagenUrl           !== null && imagenUrl           !== undefined) payload.imagen              = imagenUrl

    console.log('[Calendario] INSERT payload:', { ...payload, imagen: payload.imagen ?? null })

    const { data, error } = await supabase
      .from('calendarioeventos')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[Calendario] Error al crear evento:', error)
      throw new Error(error.message)
    }

    return new CalendarioEvento(data)
  }


  // ── Editar evento (solo PERSONALIZADO del mismo usuario) ───────────────────
  async editarEvento(idevento, idusuario, { fecha, horainicio, horafin, titulo, descripcion, imagen }) {
    // maybeSingle() nunca lanza, devuelve null si no encuentra
    const { data: actual, error: errLeer } = await supabase
      .from('calendarioeventos')
      .select('idevento, idusuario, tipo')
      .eq('idevento', idevento)
      .maybeSingle()

    if (errLeer) {
      console.error('[Calendario] Error al leer evento para editar:', errLeer)
      throw new Error(errLeer.message)
    }
    if (!actual) throw Object.assign(new Error('Evento no encontrado'), { status: 404 })
    if (Number(actual.idusuario) !== Number(idusuario))
      throw Object.assign(new Error('Sin permiso para editar este evento'), { status: 403 })
    if (actual.tipo !== 'PERSONALIZADO')
      throw Object.assign(new Error('Solo se pueden editar eventos personalizados'), { status: 403 })

    // Si viene imagen en base64, subirla al storage y obtener URL pública
    const imagenUrl = imagen !== undefined
      ? await this.#subirImagenAlStorage(imagen)
      : undefined

    const updates = {}
    if (fecha       !== undefined && fecha       !== null) updates.fecha       = fecha
    if (horainicio  !== undefined && horainicio  !== null) updates.horainicio  = horainicio
    if (horafin     !== undefined)                         updates.horafin     = horafin
    if (titulo      !== undefined)                         updates.titulo      = titulo
    if (descripcion !== undefined)                         updates.descripcion = descripcion
    // Usar la URL procesada en lugar del base64 original
    if (imagenUrl   !== undefined)                         updates.imagen      = imagenUrl

    const { data, error } = await supabase
      .from('calendarioeventos')
      .update(updates)
      .eq('idevento', idevento)
      .select()
      .single()

    if (error) {
      console.error('[Calendario] Error al editar evento:', error)
      throw new Error(error.message)
    }

    return new CalendarioEvento(data)
  }

  // ── Eliminar evento (solo PERSONALIZADO del mismo usuario) ─────────────────
  async eliminarEvento(idevento, idusuario) {
    // maybeSingle() evita el error PGRST116 de Supabase cuando no hay fila
    const { data: actual, error: errLeer } = await supabase
      .from('calendarioeventos')
      .select('idevento, idusuario, tipo')
      .eq('idevento', idevento)
      .maybeSingle()

    if (errLeer) {
      console.error('[Calendario] Error al leer evento para eliminar:', errLeer)
      throw new Error(errLeer.message)
    }
    if (!actual) throw Object.assign(new Error('Evento no encontrado'), { status: 404 })
    if (Number(actual.idusuario) !== Number(idusuario))
      throw Object.assign(new Error('Sin permiso para eliminar este evento'), { status: 403 })
    if (actual.tipo !== 'PERSONALIZADO')
      throw Object.assign(new Error('Solo se pueden eliminar eventos personalizados'), { status: 403 })

    const { error } = await supabase
      .from('calendarioeventos')
      .delete()
      .eq('idevento', idevento)

    if (error) {
      console.error('[Calendario] Error al eliminar evento:', error)
      throw new Error(error.message)
    }

    return true
  }

  // ── Obtener eventos propios del usuario ────────────────────────────────────
  async getByUsuario(idusuario) {
    console.log('[Calendario] getByUsuario idusuario =', idusuario)

    const { data, error } = await supabase
      .from('calendarioeventos')
      .select('*')
      .eq('idusuario', idusuario)
      .order('fecha',      { ascending: true })
      .order('horainicio', { ascending: true })

    if (error) {
      console.error('[Calendario] Error al obtener eventos propios:', error)
      throw new Error(error.message)
    }

    console.log('[Calendario] Eventos propios encontrados:', data?.length ?? 0)
    return (data || []).map(d => new CalendarioEvento(d))
  }

  // ── Pruebas inscritas del jugador (eventos automáticos) ────────────────────
  // Relación: usuarios → jugadores (idusuario) → inscripcionesprueba (idjugador)
  //           → pruebas (idprueba) → clubes + deportes
  async getPruebasInscritasPorUsuario(idusuario) {
    console.log('[Calendario] Buscando jugador para idusuario =', idusuario)

    // 1. Buscar el jugador — maybeSingle() no lanza si no existe
    const { data: jugadorData, error: errJugador } = await supabase
      .from('jugadores')
      .select('idjugador')
      .eq('idusuario', idusuario)
      .maybeSingle()

    if (errJugador) {
      console.error('[Calendario] Error al buscar jugador:', errJugador)
      // No propagamos: el usuario puede no ser jugador
      return []
    }

    if (!jugadorData) {
      console.log('[Calendario] El usuario', idusuario, 'no es jugador — sin pruebas automáticas')
      return []
    }

    const idjugador = jugadorData.idjugador
    console.log('[Calendario] idjugador encontrado:', idjugador)

    // 2. Inscripciones con JOIN a pruebas, clubes y deportes
    // Las columnas exactas de inscripcionesprueba: idinscripcionesprueba, idjugador, idprueba, fechainscripcion, estado
    // Las columnas exactas de pruebas: idprueba, idclub, iddeporte, cupo, horainicio, horafin, estado,
    //   descripcion, imagen, categoria, zona, genero, fechaprueba, fechacierre
    const { data: inscripciones, error: errInsc } = await supabase
      .from('inscripcionesprueba')
      .select(`
        idinscripcionesprueba,
        idjugador,
        idprueba,
        estado,
        fechainscripcion,
        pruebas (
          idprueba,
          fechaprueba,
          horainicio,
          horafin,
          descripcion,
          zona,
          imagen,
          categoria,
          genero,
          estado,
          clubes ( idclub, nombre, fotoperfil, ubicacion ),
          deportes ( iddeporte, deporte )
        )
      `)
      .eq('idjugador', idjugador)

    if (errInsc) {
      console.error('[Calendario] Error al obtener inscripciones:', errInsc)
      throw new Error(errInsc.message)
    }

    console.log('[Calendario] Inscripciones a pruebas encontradas:', inscripciones?.length ?? 0)

    // 3. Mapear a forma de evento automático
    return (inscripciones || [])
      .filter(i => i.pruebas) // ignorar si la FK está rota
      .map(i => {
        const p = i.pruebas

        // Normalizar URL de imagen
        let imagen = p.imagen || null
        if (imagen && !imagen.startsWith('http')) {
          imagen = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPruebas/${imagen}`
        }

        // _datosPrueba viaja como campo extra (no columna real de la tabla)
        // El controller lo serializará en el response
        const eventoObj = new CalendarioEvento({
          idevento:            null,
          idusuario,
          tipo:                'PRUEBA',
          fecha:               p.fechaprueba,
          horainicio:          p.horainicio,
          horafin:             p.horafin,
          idprueba:            p.idprueba,
          identrenamiento:     null,
          idinscripcionempleo: null,
          titulo:              `Prueba: ${p.deportes?.deporte || 'Deporte'} — ${p.clubes?.nombre || 'Club'}`,
          descripcion:         p.descripcion || null,
          imagen,
        })

        // Adjuntar datos extra para el panel del frontend
        eventoObj._datosPrueba = {
          idprueba:    p.idprueba,
          descripcion: p.descripcion,
          zona:        p.zona,
          categoria:   p.categoria,
          genero:      p.genero,
          estado:      p.estado,
          horainicio:  p.horainicio,
          horafin:     p.horafin,
          fechaprueba: p.fechaprueba,
          imagen,
          club:    p.clubes   || null,
          deporte: p.deportes || null,
        }

        return eventoObj
      })
  }
}

export default CalendarioEventosRepository
