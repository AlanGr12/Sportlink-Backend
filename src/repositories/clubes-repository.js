import supabase from '../configs/supabase-config.js'
import Club from '../entities/club.js'

class ClubesRepository {
  async getAllAsync() {
    const { data, error } = await supabase
      .from('clubes')
      .select(`
        *,
        clubesxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)

    if (error) throw new Error(error.message)

    return data.map(c => new Club({
      ...c,
      deportes: c.clubesxdeportes.map(cxd => cxd.deportes)
    }))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('clubes')
      .select(`
        *,
        clubesxdeportes (
          deportes ( iddeporte, deporte )
        )
      `)
      .eq('idclub', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Club({
      ...data,
      deportes: data.clubesxdeportes.map(cxd => cxd.deportes)
    })
  }

  async crearClubAsync(idusuario, nombre, ubicacion, fotoperfil) {
    const { data, error } = await supabase
      .from('clubes')
      .insert({
        idusuario,
        nombre,
        ubicacion,
        fotoperfil
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new Club(data)
  }

  async asignarDeporteAsync(idclub, iddeporte) {
    const { error } = await supabase
      .from('clubesxdeportes')
      .insert({
        idclub,
        iddeporte
      })

    if (error) throw new Error(error.message)
  }
}

export default ClubesRepository