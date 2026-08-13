import supabase from '../configs/supabase-config.js'
import { v4 as uuidv4 } from 'uuid'

class PublicacionesRepository {
  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit
    const { data, error, count } = await supabase
      .from('publicaciones')
      .select('*', { count: 'exact' })
      .order('createdat', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)
    return { data, totalItems: count }
  }

  async getById(idpublicacion) {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('idpublicacion', idpublicacion)
      .single()

    if (error && error.code === 'PGRST116') return null // No results
    if (error) throw new Error(error.message)
    return data
  }

  async create(publicacion) {
    const { data, error } = await supabase
      .from('publicaciones')
      .insert([publicacion])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async update(idpublicacion, dataToUpdate) {
    const { data, error } = await supabase
      .from('publicaciones')
      .update(dataToUpdate)
      .eq('idpublicacion', idpublicacion)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async delete(idpublicacion) {
    const { error } = await supabase
      .from('publicaciones')
      .delete()
      .eq('idpublicacion', idpublicacion)

    if (error) throw new Error(error.message)
  }

  async uploadImage(fileBuffer, mimeType) {
    const fileName = `${uuidv4()}.${mimeType.split('/')[1]}`
    const { data, error } = await supabase.storage
      .from('fotoPublicaciones')
      .upload(fileName, fileBuffer, { contentType: mimeType, upsert: false })

    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = supabase.storage
      .from('fotoPublicaciones')
      .getPublicUrl(fileName)

    return publicUrl
  }

  // Métodos para validar existencia y ownership
  async getPruebaOwner(idprueba) {
    const { data, error } = await supabase
      .from('pruebas')
      .select('idprueba, clubes(idusuario)')
      .eq('idprueba', idprueba)
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data?.clubes?.idusuario || null
  }

  async getEntrenamientoOwner(identrenamiento) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select('identrenamientos, entrenadores(idusuario)')
      .eq('identrenamientos', identrenamiento)
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data?.entrenadores?.idusuario || null
  }

  async getEmpleoOwner(idempleo) {
    const { data, error } = await supabase
      .from('empleo')
      .select('idempleo, clubes(idusuario)')
      .eq('idempleo', idempleo)
      .single()

    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data?.clubes?.idusuario || null
  }

  // Métodos para resolver autor y referencia
  async getAutor(idusuario) {
    const { data: usuario, error: uErr } = await supabase
      .from('usuarios')
      .select('tipousuario')
      .eq('idusuario', idusuario)
      .single()

    if (uErr || !usuario) return { idusuario, nombre: 'Usuario Desconocido' }

    const tipo = usuario.tipousuario
    let tabla = ''
    if (tipo === 'jugador') tabla = 'jugadores'
    else if (tipo === 'entrenador') tabla = 'entrenadores'
    else if (tipo === 'club') tabla = 'clubes'

    if (!tabla) return { idusuario, tipousuario: tipo }

    const { data: perfil, error: pErr } = await supabase
      .from(tabla)
      .select('nombre, fotoperfil' + (tipo !== 'club' ? ', apellido' : ''))
      .eq('idusuario', idusuario)
      .single()

    if (pErr || !perfil) return { idusuario, tipousuario: tipo }

    const nombreCompleto = tipo === 'club' 
      ? perfil.nombre 
      : `${perfil.nombre || ''} ${perfil.apellido || ''}`.trim()

    return {
      idusuario,
      nombre: nombreCompleto,
      fotoperfil: perfil.fotoperfil,
      tipousuario: tipo
    }
  }

  async getReferenciaPrueba(idprueba) {
    const { data, error } = await supabase
      .from('pruebas')
      .select('idprueba, categoria, zona, fechaprueba, fechacierre, horainicio, horafin, genero, cupo, descripcion, imagen, idclub, iddeporte')
      .eq('idprueba', idprueba)
      .single()
    return error ? null : data
  }

  async getReferenciaEntrenamiento(identrenamiento) {
    const { data, error } = await supabase
      .from('entrenamientos')
      .select('identrenamientos, titulo, ubicacion, fechaentr, precio, cantidad, descripcion, genero, nivel, imagen, iddeporte, identrenador')
      .eq('identrenamientos', identrenamiento)
      .single()
    return error ? null : data
  }

  async getReferenciaEmpleo(idempleo) {
    const { data, error } = await supabase
      .from('empleo')
      .select('idempleo, nombre, horasreq, habilidadesreq, acercaempleo, fechapublicacion, estado, idclub, iddeporte')
      .eq('idempleo', idempleo)
      .single()
    return error ? null : data
  }
}

export default new PublicacionesRepository()
