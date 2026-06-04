import JugadoresRepository from '../repositories/jugadores-repository.js'
import UsuariosRepository from '../repositories/usuarios-repository.js'

class JugadoresService {

  constructor() {
    this.repository = new JugadoresRepository()
    this.usuariosRepository = new UsuariosRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const jugador = await this.repository.getByIdAsync(id)

    if (!jugador) throw { status: 404, message: `No se encontró el jugador con id ${id}` }

    return jugador
  }

   async registrarJugadorAsync(data, archivo) {
    let urlFoto = null

    if (archivo) {
      urlFoto = await this.repository.subirFotoPerfilAsync(archivo)
    }

    const usuario = await this.usuariosRepository.crearUsuarioAsync(
      data.email,
      data.contrasenia,
      'jugador'
    )

    const jugador = await this.repository.crearJugadorAsync(
      usuario.idusuario,
      data.nombre,
      data.apellido,
      data.iddeporte,
      data.telefono,
      data.fechanacimiento,
      data.ubicacion,
      data.genero,
      urlFoto,
      data.descripcion
    )

    return jugador
}
}

export default JugadoresService
