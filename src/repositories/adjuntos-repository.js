import supabase from '../configs/supabase-config.js'

// Eventos que se pueden adjuntar (publicaciones del feed y mensajes) normalizados a un único formato:
//   { tipo, id, titulo, subtitulo, imagen, fecha, ruta, idusuarioDuenio }

const SELECT_PRUEBA = 'idprueba, categoria, zona, imagen, fechaprueba, estado, clubes(idusuario, nombre), deportes(deporte)'
const SELECT_ENTRENAMIENTO = 'identrenamientos, titulo, ubicacion, imagen, fechaentr, precio, nivel, estado, entrenadores(idusuario), deportes(deporte)'
const SELECT_EMPLEO = 'idempleo, nombre, horasreq, fechapublicacion, estado, clubes(idusuario, nombre, fotoperfil), deportes(deporte)'

const urlStorage = (bucket, imagen) => {
  if (!imagen) return null
  return imagen.startsWith('http') ? imagen : `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${imagen}`
}

const unir = (...partes) => partes.filter(Boolean).join(' · ')

const normalizarPrueba = (p) => {
  const club = p.clubes?.nombre
  let zona = p.zona || ''
  if (club && zona.toLowerCase().startsWith(club.toLowerCase())) {
    zona = zona.slice(club.length).replace(/^[\s,·-]+/, '')
  }
  return {
    tipo: 'PRUEBA',
    id: p.idprueba,
    titulo: unir(`Prueba de ${p.deportes?.deporte || 'deporte'}`, p.categoria),
    subtitulo: unir(club, zona),
    imagen: urlStorage('fotoPruebas', p.imagen),
    fecha: p.fechaprueba,
    ruta: `/pruebas/${p.idprueba}`,
    activo: p.estado !== false,
    idusuarioDuenio: p.clubes?.idusuario ?? null,
  }
}

const normalizarEntrenamiento = (e) => ({
  tipo: 'ENTRENAMIENTO',
  id: e.identrenamientos,
  titulo: e.titulo || 'Entrenamiento',
  subtitulo: unir(e.deportes?.deporte, e.ubicacion, e.nivel, e.precio != null ? `$${e.precio}` : null),
  imagen: urlStorage('fotoEntrenamientos', e.imagen),
  fecha: e.fechaentr,
  ruta: `/entrenamientos/${e.identrenamientos}`,
  activo: e.estado !== false,
  idusuarioDuenio: e.entrenadores?.idusuario ?? null,
})

const normalizarEmpleo = (e) => ({
  tipo: 'EMPLEO',
  id: e.idempleo,
  titulo: e.nombre || 'Empleo',
  subtitulo: unir(e.clubes?.nombre, e.deportes?.deporte, e.horasreq ? `${e.horasreq} hs` : null),
  imagen: e.clubes?.fotoperfil || null,
  fecha: e.fechapublicacion,
  ruta: `/empleos/${e.idempleo}`,
  activo: e.estado !== false,
  idusuarioDuenio: e.clubes?.idusuario ?? null,
})

const CONFIG = {
  PRUEBA:        { tabla: 'pruebas',        pk: 'idprueba',         select: SELECT_PRUEBA,        normalizar: normalizarPrueba },
  ENTRENAMIENTO: { tabla: 'entrenamientos', pk: 'identrenamientos', select: SELECT_ENTRENAMIENTO, normalizar: normalizarEntrenamiento },
  EMPLEO:        { tabla: 'empleo',         pk: 'idempleo',         select: SELECT_EMPLEO,        normalizar: normalizarEmpleo },
}

class AdjuntosRepository {

  esTipoValido(tipo) {
    return Object.hasOwn(CONFIG, tipo)
  }

  /** Un evento normalizado, o null si no existe. */
  async getAsync(tipo, id) {
    const cfg = CONFIG[tipo]
    if (!cfg) return null
    const { data, error } = await supabase
      .from(cfg.tabla)
      .select(cfg.select)
      .eq(cfg.pk, id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? cfg.normalizar(data) : null
  }

  /** Pruebas y empleos activos de un club (por idusuario del club). */
  async getDeClubAsync(idusuario) {
    const { data: club, error } = await supabase
      .from('clubes')
      .select('idclub')
      .eq('idusuario', idusuario)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!club) return []

    const [pruebas, empleos] = await Promise.all([
      supabase.from('pruebas').select(SELECT_PRUEBA).eq('idclub', club.idclub).eq('estado', true).order('fechaprueba', { ascending: false }),
      supabase.from('empleo').select(SELECT_EMPLEO).eq('idclub', club.idclub).eq('estado', true).order('fechapublicacion', { ascending: false }),
    ])
    if (pruebas.error) throw new Error(pruebas.error.message)
    if (empleos.error) throw new Error(empleos.error.message)

    return [
      ...(pruebas.data || []).map(normalizarPrueba),
      ...(empleos.data || []).map(normalizarEmpleo),
    ]
  }

  /** Entrenamientos activos de un entrenador (por idusuario del entrenador). */
  async getDeEntrenadorAsync(idusuario) {
    const { data: entrenador, error } = await supabase
      .from('entrenadores')
      .select('identrenador')
      .eq('idusuario', idusuario)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!entrenador) return []

    const { data, error: errorEntr } = await supabase
      .from('entrenamientos')
      .select(SELECT_ENTRENAMIENTO)
      .eq('identrenador', entrenador.identrenador)
      .eq('estado', true)
      .order('fechaentr', { ascending: false })
    if (errorEntr) throw new Error(errorEntr.message)

    return (data || []).map(normalizarEntrenamiento)
  }
}

export default new AdjuntosRepository()
