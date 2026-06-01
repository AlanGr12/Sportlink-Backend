import supabase from '../configs/supabase-config.js'
import Entrenador from '../entities/entrenador.js'

class EntrenadoresRepository {

  async getAllAsync() {
    const { data, error } = await supabase
      .from('entrenadores')
      .select(`
        *,
        entrenadoresxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)

    if (error) throw new Error(error.message)

    return data.map(e => new Entrenador({
      ...e,
      deportes: e.entrenadoresxdeportes.map(exd => exd.deportes)
    }))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('entrenadores')
      .select(`
        *,
        entrenadoresxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)
      .eq('identrenador', id)
      .single()

    if (error) throw new Error(error.message)

    if (!data) return null

    return new Entrenador({
      ...data,
      deportes: data.entrenadoresxdeportes.map(exd => exd.deportes)
    })
  }

 async crearEntrenadorAsync(
  idusuario,
  nombre,
  apellido,
  telefono,
  fechanacimiento,
  ubicacion,
  genero,
  tieneclub,
  experiencia,
  titulo,
  fotoperfil,
  cv
) {

  const { data, error } = await supabase
    .from('entrenadores')
    .insert({
      idusuario,
      nombre,
      apellido,
      telefono,
      fechanacimiento,
      ubicacion,
      genero,
      tieneclub,
      experiencia,
      titulo,
      fotoperfil,
      cv
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return new Entrenador(data)
}

async asignarDeporteAsync(identrenador, iddeporte) {
  const { error } = await supabase
    .from('entrenadoresxdeportes')
    .insert({
      identrenador,
      iddeporte
    })

  if (error) throw new Error(error.message)

}

}

export default EntrenadoresRepository