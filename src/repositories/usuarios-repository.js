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