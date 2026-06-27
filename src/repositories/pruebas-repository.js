import supabase from '../configs/supabase-config.js'
import Prueba from '../entities/prueba.js'

class PruebasRepository {

  //"Este método verifica si la imagen es solo el nombre del archivo y, si es así, la convierte automáticamente en la URL pública de Supabase; si ya es una URL completa, la deja igual."
  #normalizarImagen(p) {
    if (p.imagen && !p.imagen.startsWith('http')) {
      p.imagen = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPruebas/${p.imagen}`
    }
    return p
  }

  async getAllAsync() {
    const { data, error } = await supabase
      .from('pruebas')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)

    if (error) throw new Error(error.message)

    return data.map(p => new Prueba(this.#normalizarImagen(p)))
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
    const { data, error } = await supabase
      .from('pruebas')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .eq('iddeporte', jugador.iddeporte)

    if (error) throw new Error(error.message)
    if (!data) return []

    return data.map(p => new Prueba(this.#normalizarImagen(p)))
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


//El código PGRST116 es el que devuelve Supabase cuando el .single() no encuentra ningún resultado, que en este caso no es un error sino simplemente que no existe duplicado, por eso lo ignoramos

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