import supabase from '../configs/supabase-config.js'
import InscripcionEmpleo from '../entities/inscripcionempleo.js'

class InscripcionesEmpleoRepository {

  #normalizarFotoPerfil(e) {
    if (e && e.fotoperfil && !e.fotoperfil.startsWith('http')) {
      e.fotoperfil = `${process.env.SUPABASE_URL}/storage/v1/object/public/fotoPerfiles/entrenadores/${e.fotoperfil}`
    }
    return e
  }

  async getAllAsync(idempleo = null) {
    let query = supabase
      .from('inscripcionesempleo')
      .select(`
        *,
        entrenadores (
          *,
          entrenadoresxdeportes (
            deportes ( iddeporte, deporte )
          )
        ),
        empleo (
          *,
          clubes ( idclub, nombre, fotoperfil, ubicacion ),
          deportes ( iddeporte, deporte )
        )
      `)

    if (idempleo) {
      query = query.eq('idempleo', idempleo)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map(i => {
      if (i.entrenadores) {
        this.#normalizarFotoPerfil(i.entrenadores)
        if (Array.isArray(i.entrenadores.entrenadoresxdeportes)) {
          i.entrenadores.deportes = i.entrenadores.entrenadoresxdeportes.map(exd => exd.deportes)
        }
      }
      const ins = new InscripcionEmpleo(i)
      return ins
    })
  }

  async getByIdAsync(id) {
    const { data, error } = await supabase
      .from('inscripcionesempleo')
      .select(`
        *,
        entrenadores (
          *,
          entrenadoresxdeportes (
            deportes ( iddeporte, deporte )
          )
        ),
        empleo (
          *,
          clubes ( idclub, nombre, fotoperfil, ubicacion ),
          deportes ( iddeporte, deporte )
        )
      `)
      .eq('idinsripcion', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return null

    if (data.entrenadores) {
      this.#normalizarFotoPerfil(data.entrenadores)
      if (Array.isArray(data.entrenadores.entrenadoresxdeportes)) {
        data.entrenadores.deportes = data.entrenadores.entrenadoresxdeportes.map(exd => exd.deportes)
      }
    }

    return new InscripcionEmpleo(data)
  }

  async isInscrito(identrenador, idempleo) {
    const { data, error } = await supabase
      .from('inscripcionesempleo')
      .select('idinsripcion')
      .eq('identrenador', identrenador)
      .eq('idempleo', idempleo)
      .limit(1)

    if (error) throw new Error(error.message)

    return Array.isArray(data) && data.length > 0
  }

  async crearInscripcion(identrenador, idempleo) {
    const { data, error } = await supabase
      .from('inscripcionesempleo')
      .insert({
        identrenador,
        idempleo,
        estado: true,
        contratado: false,
        fechainscripcion: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new InscripcionEmpleo(data)
  }

  async actualizarEstado(id, estado) {
    const { data, error } = await supabase
      .from('inscripcionesempleo')
      .update({ estado })
      .eq('idinsripcion', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new InscripcionEmpleo(data)
  }

  async marcarContratado(id) {
    const { data, error } = await supabase
      .from('inscripcionesempleo')
      .update({ contratado: true })
      .eq('idinsripcion', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return new InscripcionEmpleo(data)
  }

  async subirCvAsync(archivo) {
    const nombreUnico = `cv/${Date.now()}-${archivo.originalname}`

    const { error } = await supabase.storage
      .from('cvEntrenadores')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('cvEntrenadores')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }
}

export default InscripcionesEmpleoRepository
