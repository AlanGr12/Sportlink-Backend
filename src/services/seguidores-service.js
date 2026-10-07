import seguidoresRepository from '../repositories/seguidores-repository.js'
import UsuariosRepository from '../repositories/usuarios-repository.js'

const usuariosRepository = new UsuariosRepository()

// Solo se puede seguir a estos tipos de cuenta (no a deportistas)
const TIPOS_SEGUIBLES = ['club', 'entrenador']

class SeguidoresService {

  async #getUsuarioDestino(idusuario) {
    let destino = null
    try { destino = await usuariosRepository.getByIdAsync(idusuario) } catch { destino = null }
    if (!destino) throw { status: 404, message: 'Usuario no encontrado' }
    return destino
  }

  async getEstado(idusuario, idsesion) {
    const [seguidores, seguidos, siguiendo] = await Promise.all([
      seguidoresRepository.contarSeguidoresAsync(idusuario),
      seguidoresRepository.contarSeguidosAsync(idusuario),
      Number(idusuario) === Number(idsesion)
        ? false
        : seguidoresRepository.estaSiguiendoAsync(idsesion, idusuario),
    ])
    return { idusuario: Number(idusuario), seguidores, seguidos, siguiendo }
  }

  async seguir(idseguido, idseguidor) {
    if (Number(idseguido) === Number(idseguidor)) {
      throw { status: 400, message: 'No puedes seguirte a ti mismo' }
    }
    const destino = await this.#getUsuarioDestino(idseguido)
    if (!TIPOS_SEGUIBLES.includes(String(destino.tipousuario).toLowerCase())) {
      throw { status: 400, message: 'Solo se puede seguir a clubes y entrenadores' }
    }
    await seguidoresRepository.seguirAsync(Number(idseguidor), Number(idseguido))
    return await this.getEstado(idseguido, idseguidor)
  }

  async dejarDeSeguir(idseguido, idseguidor) {
    await seguidoresRepository.dejarDeSeguirAsync(Number(idseguidor), Number(idseguido))
    return await this.getEstado(idseguido, idseguidor)
  }

  async getMisSeguidosIds(idseguidor) {
    return await seguidoresRepository.getSeguidosIdsAsync(idseguidor)
  }
}

export default new SeguidoresService()
