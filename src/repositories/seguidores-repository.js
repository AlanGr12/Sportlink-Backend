import supabase from '../configs/supabase-config.js'

class SeguidoresRepository {

  async seguirAsync(idseguidor, idseguido) {
    // upsert + ignoreDuplicates: seguir dos veces es idempotente
    const { error } = await supabase
      .from('seguidores')
      .upsert({ idseguidor, idseguido }, { onConflict: 'idseguidor,idseguido', ignoreDuplicates: true })

    if (error) throw new Error(error.message)
  }

  async dejarDeSeguirAsync(idseguidor, idseguido) {
    const { error } = await supabase
      .from('seguidores')
      .delete()
      .eq('idseguidor', idseguidor)
      .eq('idseguido', idseguido)

    if (error) throw new Error(error.message)
  }

  async contarSeguidoresAsync(idusuario) {
    const { count, error } = await supabase
      .from('seguidores')
      .select('idseguidor', { count: 'exact', head: true })
      .eq('idseguido', idusuario)

    if (error) throw new Error(error.message)
    return count || 0
  }

  async contarSeguidosAsync(idusuario) {
    const { count, error } = await supabase
      .from('seguidores')
      .select('idseguido', { count: 'exact', head: true })
      .eq('idseguidor', idusuario)

    if (error) throw new Error(error.message)
    return count || 0
  }

  async estaSiguiendoAsync(idseguidor, idseguido) {
    const { data, error } = await supabase
      .from('seguidores')
      .select('idseguidor')
      .eq('idseguidor', idseguidor)
      .eq('idseguido', idseguido)
      .limit(1)

    if (error) throw new Error(error.message)
    return Array.isArray(data) && data.length > 0
  }

  /** idusuario de todas las cuentas que sigue `idseguidor`. */
  async getSeguidosIdsAsync(idseguidor) {
    const { data, error } = await supabase
      .from('seguidores')
      .select('idseguido')
      .eq('idseguidor', idseguidor)

    if (error) throw new Error(error.message)
    return (data || []).map(r => r.idseguido)
  }
}

export default new SeguidoresRepository()
