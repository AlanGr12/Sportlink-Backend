import UsuariosRepository from "../repositories/usuarios-repository.js";

class UsuariosService {

  constructor() {
    this.repository = new UsuariosRepository()
  }

  async loginAsync(email,contraseña) {
    const usuario = await this.repository.getByEmailAsync(email)

    if (!usuario) throw { status: 404, message: `No se encontro el usuario` }

    if (usuario.contraseña != contraseña) throw { status: 404, message: `No se encontro el usuario con esa contraseña`}

    return usuario
  }

  

}

export default UsuariosService
