import adjuntosRepository from '../repositories/adjuntos-repository.js'

// Qué tipo de evento puede adjuntar cada tipo de cuenta
const PERMITIDOS = {
  club: ['PRUEBA', 'EMPLEO'],
  entrenador: ['ENTRENAMIENTO'],
}

// El dueño solo se usa para validar; no se expone en las respuestas
const publico = ({ idusuarioDuenio, ...resto }) => resto

class AdjuntosService {

  /** Eventos que el usuario logueado puede adjuntar. */
  async getMios(idusuario, tipousuario) {
    const tipo = String(tipousuario || '').toLowerCase()
    let eventos = []
    if (tipo === 'club') eventos = await adjuntosRepository.getDeClubAsync(idusuario)
    else if (tipo === 'entrenador') eventos = await adjuntosRepository.getDeEntrenadorAsync(idusuario)
    return eventos.map(publico)
  }

  /** Detalle normalizado de un evento (para dibujar la tarjeta). */
  async getDetalle(tipo, id) {
    tipo = String(tipo || '').toUpperCase()
    if (!adjuntosRepository.esTipoValido(tipo)) throw { status: 400, message: 'Tipo de evento inválido' }
    const evento = await adjuntosRepository.getAsync(tipo, Number(id))
    if (!evento) throw { status: 404, message: 'El evento no existe' }
    return publico(evento)
  }

  /**
   * Valida que el usuario pueda adjuntar ese evento: su tipo de cuenta admite ese tipo de evento
   * y el evento es suyo. Devuelve el evento normalizado.
   */
  async validarPropio(tipo, id, idusuario, tipousuario) {
    tipo = String(tipo || '').toUpperCase()
    if (!adjuntosRepository.esTipoValido(tipo)) throw { status: 400, message: 'Tipo de evento inválido' }

    const rol = String(tipousuario || '').toLowerCase()
    if (!(PERMITIDOS[rol] || []).includes(tipo)) {
      throw { status: 403, message: 'Tu tipo de cuenta no puede adjuntar este tipo de evento' }
    }

    const evento = await adjuntosRepository.getAsync(tipo, Number(id))
    if (!evento) throw { status: 404, message: 'El evento no existe' }
    if (Number(evento.idusuarioDuenio) !== Number(idusuario)) {
      throw { status: 403, message: 'Solo podés adjuntar tus propios eventos' }
    }
    return publico(evento)
  }
}

export default new AdjuntosService()
