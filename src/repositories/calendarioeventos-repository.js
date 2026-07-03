import supabase from '../configs/supabase-config.js'
import CalendarioEvento from '../entities/calendarioevento.js'

class CalendarioEventosRepository {
  async crearEvento({ idusuario, tipo, fecha, horainicio, horafin, idprueba = null, identrenamiento = null, idinscripcionempleo = null }) {
    const { data, error } = await supabase
      .from('calendarioeventos')
      .insert({ idusuario, tipo, fecha, horainicio, horafin, idprueba, identrenamiento, idinscripcionempleo })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new CalendarioEvento(data)
  }

  async getByUsuario(idusuario) {
    const { data, error } = await supabase
      .from('calendarioeventos')
      .select('*')
      .eq('idusuario', idusuario)
      .order('fecha', { ascending: true })
      .order('horainicio', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map(d => new CalendarioEvento(d))
  }
}

export default CalendarioEventosRepository
