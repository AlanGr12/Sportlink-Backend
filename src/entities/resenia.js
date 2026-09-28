class Resenia {
  constructor({
    idresenia,
    idjugador,
    idclub = null,
    identrenador = null,
    idprueba = null,
    identrenamiento = null,
    estrellitas,
    textoopinion,
    createdat,
    updatedat,
    jugador = null,
    jugadores = null
  } = {}) {
    this.idresenia = idresenia
    this.idjugador = idjugador
    this.idclub = idclub
    this.identrenador = identrenador
    this.idprueba = idprueba
    this.identrenamiento = identrenamiento
    this.estrellitas = estrellitas
    this.textoopinion = textoopinion
    this.createdat = createdat
    this.updatedat = updatedat
    this.jugador = jugador || jugadores || null
  }
}

export default Resenia
