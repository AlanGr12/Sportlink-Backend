import EntrenadoresRepository from '../repositories/entrenadores-repository.js'
import UsuariosRepository from '../repositories/usuarios-repository.js'

class EntrenadoresService {

  constructor() {
    this.repository = new EntrenadoresRepository()
    this.usuariosRepository = new UsuariosRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const entrenador = await this.repository.getByIdAsync(id)

    if (!entrenador) {
      throw {
        status: 404,
        message: `No se encontró el entrenador con id ${id}`
      }
    }

    return entrenador
  }

  async registrarEntrenadorAsync(data, archivo) {
    let urlFoto = null

    if (archivo) {
      urlFoto = await this.repository.subirFotoPerfilAsync(archivo)
    }

    const usuario = await this.usuariosRepository.crearUsuarioAsync(
      data.email,
      data.contrasenia,
      'entrenador'
    )

    const entrenador = await this.repository.crearEntrenadorAsync(
      usuario.idusuario,
      data.nombre,
      data.apellido,
      data.telefono,
      data.fechanacimiento,
      data.ubicacion,
      data.genero,
      data.tieneclub,
      data.experiencia,
      data.titulo,
      urlFoto,
      data.cv,
      data.descripcion
    )

    await this.repository.asignarDeporteAsync(
      entrenador.identrenador,
      data.iddeporte
    )

    return entrenador
  }

}

export default EntrenadoresService