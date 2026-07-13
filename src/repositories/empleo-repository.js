import supabase from '../configs/supabase-config.js'
import Empleo from '../entities/empleo.js'

class EmpleoRepository {

  async getAllAsync() {
    const { data, error } = await supabase
      .from('empleo')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)

    if (error) throw new Error(error.message)

    return data.map(e => new Empleo(e))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('empleo')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .eq('idempleo', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Empleo(data)
  }

  async getAllByClubAsync(idclub) {
    const { data, error } = await supabase
      .from('empleo')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .eq('idclub', idclub)

    if (error) throw new Error(error.message)
    if (!data) return []

    return data.map(e => new Empleo(e))
  }

  async existeEmpleo(idclub, iddeporte, nombre) {
    const { data, error } = await supabase
      .from('empleo')
      .select('idempleo')
      .eq('idclub', idclub)
      .eq('iddeporte', iddeporte)
      .eq('nombre', nombre)
      .single()

    // PGRST116 = single() no encontró resultados -> no es un error real, solo no hay duplicado
    if (error && error.code !== 'PGRST116') throw new Error(error.message)

    return !!data
  }

  async crearEmpleo(idclub, iddeporte, nombre, horasreq, habilidadesreq,
                     acercaempleo, estado) {

    const { data, error } = await supabase
      .from('empleo')
      .insert({
        idclub,
        iddeporte,
        nombre,
        horasreq,
        habilidadesreq,
        acercaempleo,
        estado
      })
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion ),
        deportes ( iddeporte, deporte )
      `)
      .single()

    if (error) throw new Error(error.message)

    return new Empleo(data)
  }
}

export default EmpleoRepository