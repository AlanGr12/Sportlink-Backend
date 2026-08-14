/**
 * src/utils/resolver-autor.js
 *
 * Utilidad compartida para resolver el perfil público de un usuario
 * (nombre, fotoperfil, tipousuario) dado su idusuario.
 *
 * Usada por publicaciones-repository y comentarios-publicacion-repository
 * para evitar duplicar la misma lógica de resolución de perfiles.
 */

import supabase from '../configs/supabase-config.js'

/**
 * Resuelve el autor de cualquier entidad (publicación, comentario, etc.)
 * obteniendo nombre y fotoperfil desde la tabla de perfil correspondiente
 * según el tipousuario del usuario.
 *
 * @param {number} idusuario
 * @returns {{ idusuario, tipousuario, nombre, fotoperfil }}
 */
export async function resolverAutor(idusuario) {
  // 1. Obtener tipousuario de la tabla usuarios
  const { data: usuario, error: errUsuario } = await supabase
    .from('usuarios')
    .select('tipousuario')
    .eq('idusuario', idusuario)
    .single()

  if (errUsuario || !usuario) {
    return { idusuario, nombre: 'Usuario', fotoperfil: null, tipousuario: 'jugador' }
  }

  const tipousuario = usuario.tipousuario

  // 2. Mapear tipousuario → tabla de perfil
  let tabla = ''
  if (tipousuario === 'jugador')    tabla = 'jugadores'
  else if (tipousuario === 'entrenador') tabla = 'entrenadores'
  else if (tipousuario === 'club')  tabla = 'clubes'

  let nombre     = 'Usuario'
  let fotoperfil = null

  // 3. Obtener nombre y fotoperfil de la tabla de perfil
  if (tabla) {
    const { data: perfilData } = await supabase
      .from(tabla)
      .select('nombre, fotoperfil')
      .eq('idusuario', idusuario)
      .single()

    if (perfilData) {
      if (perfilData.nombre) nombre = perfilData.nombre
      fotoperfil = perfilData.fotoperfil
    }
  }

  return { idusuario, tipousuario, nombre, fotoperfil }
}
