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

  async getClubByIdAsync(id) {
    return await this.getByIdAsync(id)
  }

  async obtenerPerfilAsync(id) {
    const club = await this.repository.obtenerPerfilAsync(id)
    if (!club) throw { status: 404, message: `No se encontró el club con id ${id}` }
    return club
  }

  async registrarClubAsync(data, archivo) {
    if (typeof data.deportes === 'string') {
      data.deportes = JSON.parse(data.deportes)
    }
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

    const latitud = (data.latitud !== undefined && data.latitud !== null && data.latitud !== '') ? Number(data.latitud) : null
    const longitud = (data.longitud !== undefined && data.longitud !== null && data.longitud !== '') ? Number(data.longitud) : null
    const direccion = data.direccion ?? null

    const club = await this.repository.crearClubAsync(
      usuario.idusuario,
      data.nombre,
      data.ubicacion,
      data.descripcion,
      urlFoto,
      direccion,
      latitud,
      longitud
    )

    for (const iddeporte of data.deportes) {
      await this.repository.asignarDeporteAsync(
        club.idclub,
        iddeporte
      )
    }

    return club
  }

  async crearClubAsync(data, archivo) {
    return await this.registrarClubAsync(data, archivo)
  }

  async actualizarPerfilClubAsync(id, data = {}, archivo) {
    if (!id) throw { status: 400, message: 'El id del club es obligatorio' }

    let urlFoto = data.fotoperfil
    if (archivo) {
      urlFoto = await this.repository.subirFotoPerfilAsync(archivo)
    }

    const updates = {}
    if (data.nombre !== undefined) updates.nombre = data.nombre
    if (data.ubicacion !== undefined) updates.ubicacion = data.ubicacion
    if (data.descripcion !== undefined) updates.descripcion = data.descripcion
    if (urlFoto !== undefined) updates.fotoperfil = urlFoto

    if (data.direccion !== undefined) {
      updates.direccion = (data.direccion !== '' && data.direccion !== null) ? data.direccion : null
    }

    if (data.latitud !== undefined) {
      updates.latitud = (data.latitud !== '' && data.latitud !== null) ? Number(data.latitud) : null
    }

    if (data.longitud !== undefined) {
      updates.longitud = (data.longitud !== '' && data.longitud !== null) ? Number(data.longitud) : null
    }

    const club = await this.repository.actualizarPerfilClubAsync(id, updates)
    if (!club) throw { status: 404, message: `No se encontró el club con id ${id}` }
    return club
  }

  async updateClubAsync(id, data, archivo) {
    return await this.actualizarPerfilClubAsync(id, data, archivo)
  }
}

export default ClubesService