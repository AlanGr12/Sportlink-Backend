import supabase from '../configs/supabase-config.js'
import Entrevista from '../entities/entrevista.js'

class EntrevistasRepository {

  async getAllByInscripcionAsync(idinscripcion) {
    const { data, error } = await supabase
      .from('entrevistas')
      .select(`
        *,
        inscripcionesempleo (
          idinsripcion,
          identrenador,
          idempleo,
          estado,
          contratado,
          entrenadores ( identrenador, nombre, apellido, fotoperfil ),
          empleo ( idempleo, nombre, clubes ( idclub, nombre ) )
        )
      `)
      .eq('idinscripcion', idinscripcion)

    if (error) throw new Error(error.message)

    return (data || []).map(e => new Entrevista(e))
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('entrevistas')
      .select(`
        *,
        inscripcionesempleo (
          idinsripcion,
          identrenador,
          idempleo,
          estado,
          contratado,
          entrenadores ( identrenador, nombre, apellido, fotoperfil ),
          empleo ( idempleo, nombre, clubes ( idclub, nombre ) )
        )
      `)
      .eq('identrevista', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    return new Entrevista(data)
  }

  async crearEntrevista({ idinscripcion, fecha, horainicio, horafin, ubicacion, comentarios }) {
    const { data, error } = await supabase
      .from('entrevistas')
      .insert({
        idinscripcion,
        fecha,
        horainicio: horainicio || null,
        horafin: horafin || null,
        ubicacion: ubicacion || null,
        comentarios: comentarios || null,
        estado: 'PENDIENTE',
        puntaje: null
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new Entrevista(data)
  }

  async actualizarEntrevista(id, campos) {
    const updates = {}
    const permitidos = ['fecha', 'horainicio', 'horafin', 'ubicacion', 'comentarios', 'puntaje', 'estado']
    
    permitidos.forEach(p => {
      if (campos[p] !== undefined) {
        updates[p] = campos[p]
      }
    })

    updates.updatedat = new Date().toISOString()

    const { data, error } = await supabase
      .from('entrevistas')
      .update(updates)
      .eq('identrevista', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new Entrevista(data)
  }
}

export default EntrevistasRepository
