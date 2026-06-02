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


// ver su falta validar el email

 async crearUsuarioAsync(email,contraseña,tipousuario){
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

} 

export default UsuariosRepository
 