import ClubesRepository from '../repositories/clubes-repository.js'
import UsuariosRepository from '../repositories/usuarios-repository.js'

class ClubesService {
  constructor() {
    this.repository = new ClubesRepository()
    this.usuariosRepository = new UsuariosRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const club = await this.repository.getByIdAsync(id)
    if (!club) throw { status: 404, message: `No se encontró el club con id ${id}` }
    return club
  }

  async registrarClubAsync(data, archivo) {

  if (!data.email || !data.contrasenia) {
    throw {
      status: 400,
      message: 'Email y contraseña son obligatorios para registrar un club'
    }
  }

  if (!data.deportes || data.deportes.length === 0) {
    throw {
      status: 400,
      message: 'Debe seleccionar al menos un deporte'
    }
  }

  let urlFoto = null

  if (archivo) {
    urlFoto = await this.repository.subirFotoPerfilAsync(archivo)
  }

  const usuario = await this.usuariosRepository.crearUsuarioAsync(
    data.email,
    data.contrasenia,
    'club'
  )

  const club = await this.repository.crearClubAsync(
    usuario.idusuario,
    data.nombre,
    data.ubicacion,
    data.descripcion,
    urlFoto
  )

  for (const iddeporte of data.deportes) {
    await this.repository.asignarDeporteAsync(
      club.idclub,
      iddeporte
    )
  }

  return club
}

}

export default ClubesService