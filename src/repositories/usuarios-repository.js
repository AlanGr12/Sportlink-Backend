import supabase from '../configs/supabase-config.js'
import Usuario from '../entities/usuario.js'

class UsuariosRepository {

  async getByEmailAsync(email) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async getByIdAsync(idusuario) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('idusuario', idusuario)
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async crearUsuarioAsync(email, contraseña, tipousuario) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        email,
        contraseña,
        tipousuario
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Actualiza la contraseña de un usuario (usado para migrar texto plano → bcrypt).
   */
  async actualizarContrasenia(idusuario, hashNuevo) {
    const { error } = await supabase
      .from('usuarios')
      .update({ contraseña: hashNuevo })
      .eq('idusuario', idusuario)

    if (error) throw new Error(error.message)
  }

  /**
   * Actualiza la biografía de un usuario en public.usuarios.
   */
  async actualizarBiografiaAsync(idusuario, biografia) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update({
          biografia,
          updatedat: new Date().toISOString()
        })
        .eq('idusuario', idusuario)
        .select()
        .single()

      if (error) {
        // Fallback en caso de que la columna updatedat no exista en la tabla
        if (error.message && (error.message.includes('updatedat') || error.code === '42703')) {
          const { data: retryData, error: retryError } = await supabase
            .from('usuarios')
            .update({ biografia })
            .eq('idusuario', idusuario)
            .select()
            .single()

          if (retryError) throw new Error(retryError.message)
          return retryData
        }
        throw new Error(error.message)
      }

      return data
    } catch (err) {
      throw err
    }
  }

  /**
   * Sube una foto de perfil al bucket 'fotoPerfiles' y devuelve su URL pública.
   */
  async subirFotoPerfilAsync(archivo, carpeta) {
    const nombreSeguro = archivo.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nombreUnico = `${carpeta}/${Date.now()}-${nombreSeguro}`

    const { error } = await supabase.storage
      .from('fotoPerfiles')
      .upload(nombreUnico, archivo.buffer, { contentType: archivo.mimetype })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage
      .from('fotoPerfiles')
      .getPublicUrl(nombreUnico)

    return data.publicUrl
  }

  /**
   * Actualiza fotoperfil en la tabla de rol (jugadores / entrenadores / clubes).
   */
  async actualizarFotoPerfilAsync(idusuario, tipousuario, url) {
    const tablas = { jugador: 'jugadores', entrenador: 'entrenadores', club: 'clubes' }
    const tabla = tablas[tipousuario]
    if (!tabla) throw { status: 400, message: 'Tipo de usuario no soporta foto de perfil' }

    const { data, error } = await supabase
      .from(tabla)
      .update({ fotoperfil: url })
      .eq('idusuario', idusuario)
      .select('fotoperfil')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async getPerfilByUsuarioAsync(idusuario, tipousuario) {
    let tabla = ''
    if (tipousuario === 'jugador') tabla = 'jugadores'
    else if (tipousuario === 'entrenador') tabla = 'entrenadores'
    else if (tipousuario === 'club') tabla = 'clubes'
    else return null

    const { data, error } = await supabase
      .from(tabla)
      .select('fotoperfil, nombre')
      .eq('idusuario', idusuario)
      .single()

    if (error) return null
    return data
  }

  async getPerfilCompletoByUsuarioAsync(idusuario, tipousuario) {
    let tabla = ''
    if (tipousuario === 'jugador') tabla = 'jugadores'
    else if (tipousuario === 'entrenador') tabla = 'entrenadores'
    else if (tipousuario === 'club') tabla = 'clubes'
    else return null

    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('idusuario', idusuario)
      .single()

    if (error) return null
    return data
  }

}

export default UsuariosRepository