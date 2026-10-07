import supabase from '../configs/supabase-config.js'
import Empleo from '../entities/empleo.js'

class EmpleoRepository {

  async getAllAsync() {
    const { data, error } = await supabase
      .from('empleo')
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
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
        clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
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
        clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
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

  /** idusuario del club dueño del empleo; undefined si el empleo no existe. */
  async getIdUsuarioDuenioAsync(idempleo) {
    const { data, error } = await supabase
      .from('empleo')
      .select('idempleo, clubes ( idusuario )')
      .eq('idempleo', idempleo)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return undefined
    return data.clubes?.idusuario ?? null
  }

  async existeOtroEmpleo(idclub, iddeporte, nombre, idexcluir) {
    const { data, error } = await supabase
      .from('empleo')
      .select('idempleo')
      .eq('idclub', idclub)
      .eq('iddeporte', iddeporte)
      .eq('nombre', nombre)
      .neq('idempleo', idexcluir)
      .limit(1)

    if (error) throw new Error(error.message)
    return Array.isArray(data) && data.length > 0
  }

  async actualizarEmpleoAsync(id, campos) {
    const { data, error } = await supabase
      .from('empleo')
      .update({ ...campos, updatedat: new Date().toISOString() })
      .eq('idempleo', id)
      .select(`
        *,
        clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
        deportes ( iddeporte, deporte )
      `)
      .single()

    if (error) throw new Error(error.message)
    return new Empleo(data)
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
        clubes ( idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud ),
        deportes ( iddeporte, deporte )
      `)
      .single()

    if (error) throw new Error(error.message)

    return new Empleo(data)
  }
}

export default EmpleoRepository