import supabase from '../configs/supabase-config.js'
import Prueba from '../entities/prueba.js'

function haPasado(fechaStr, horaFinStr) {
  if (!fechaStr) return false
  const d = new Date()
  const hoyStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const fechaLimpia = String(fechaStr).substring(0, 10)
  if (fechaLimpia < hoyStr) return true
  if (fechaLimpia > hoyStr) return false
  if (horaFinStr) {
    const horaActual = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const horaFin = String(horaFinStr).substring(0, 5)
    if (horaFin && horaFin < horaActual) return true
  }
  return false
}

class PruebasRepository {

  //"Este método verifica si la imagen es solo el nombre del archivo y, si es así, la convierte automáticamente en la URL pública de Supabase; si ya es una URL completa, la deja igual."
  #normalizarImagen(p) {
    if (p.imagen && !p.imagen.startsWith('http')) {
      p.imagen = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPruebas/${p.imagen}`
    }
    return p
  }

  async getAllAsync() {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('pruebas')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .gte('fechaprueba', hoy)
      .order('fechaprueba', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || [])
      .filter(p => !haPasado(p.fechaprueba, p.horafin))
      .map(p => new Prueba(this.#normalizarImagen(p)))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('pruebas')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .eq('idprueba', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Prueba(this.#normalizarImagen(data))
  }

  async getAllDeporteAsync(jugador) {
    const d = new Date()
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { data, error } = await supabase
      .from('pruebas')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .eq('iddeporte', jugador.iddeporte)
      .gte('fechaprueba', hoy)
      .order('fechaprueba', { ascending: true })

    if (error) throw new Error(error.message)
    if (!data) return []

    return (data || [])
      .filter(p => !haPasado(p.fechaprueba, p.horafin))
      .map(p => new Prueba(this.#normalizarImagen(p)))
  }

  async crearPrueba(idclub, iddeporte, cupo, horainicio, horafin, estado,
                  descripcion, imagen, categoria, zona, genero,
                  fechaprueba, fechacierre) {

  const { data, error } = await supabase
    .from('pruebas')
    .insert({
      idclub,
      iddeporte,
      cupo,
      horainicio,
      horafin,
      estado,
      descripcion,
      imagen,
      categoria,
      zona,
      genero,
      fechaprueba,
      fechacierre
    })
    .select(`
      *,
      clubes ( idclub, nombre, fotoperfil, ubicacion ),
      deportes ( iddeporte, deporte )
    `)
    .single()

  if (error) throw new Error(error.message)

  return new Prueba(data)
}

async existePrueba(idclub, iddeporte, fechaprueba,categoria,genero) {
  const { data, error } = await supabase
    .from('pruebas')
    .select('idprueba')
    .eq('idclub', idclub)
    .eq('iddeporte', iddeporte)
    .eq('fechaprueba', fechaprueba)
    .eq('categoria',categoria)
    .eq('genero',genero)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)

  return !!data
}

async subirFotoPruebaAsync(archivo) {
  const nombreUnico = `pruebas/${Date.now()}-${archivo.originalname}`

  const { error } = await supabase.storage
    .from('fotoPruebas')
    .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage
    .from('fotoPruebas')
    .getPublicUrl(nombreUnico)

  return data.publicUrl
}
}

export default PruebasRepository