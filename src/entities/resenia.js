class Resenia {
  constructor({
    idresenia,
    idjugador = null,
    identrenador_autor = null,
    idclub = null,
    identrenador = null,
    idprueba = null,
    identrenamiento = null,
    estrellitas,
    textoopinion,
    createdat,
    updatedat,
    rolAutor = null,
    autor = null,
    jugador = null,
    jugadores = null,
    nombre = null,
    apellido = null,
    fotoperfil = null
  } = {}) {
    this.idresenia = idresenia
    this.idjugador = idjugador
    this.identrenador_autor = identrenador_autor
    this.idclub = idclub
    this.identrenador = identrenador
    this.idprueba = idprueba
    this.identrenamiento = identrenamiento
    this.estrellitas = estrellitas
    this.textoopinion = textoopinion
    this.createdat = createdat
    this.updatedat = updatedat
    this.rolAutor = rolAutor || (identrenador_autor ? 'ENTRENADOR' : 'JUGADOR')
    this.nombre = nombre || jugador?.nombre || jugadores?.nombre || 'Usuario'
    this.apellido = apellido || jugador?.apellido || jugadores?.apellido || ''
    this.fotoperfil = fotoperfil || jugador?.fotoperfil || jugadores?.fotoperfil || null
    this.jugador = jugador || jugadores || {
      idjugador: this.idjugador,
      nombre: this.nombre,
      apellido: this.apellido,
      fotoperfil: this.fotoperfil
    }
    this.autor = autor || {
      nombre: this.nombre,
      apellido: this.apellido,
      fotoperfil: this.fotoperfil,
      rol: this.rolAutor
    }
  }
}

export default Resenia
