class Jugador {
  constructor({ idjugador, idusuario, nombre, apellido, telefono, fechanacimiento, fotoperfil, iddeporte, ubicacion, genero, descripcion, deportes } = {}) {
    this.idjugador = idjugador
    this.idusuario = idusuario
    this.nombre = nombre
    this.apellido = apellido
    this.telefono = telefono
    this.fechanacimiento = fechanacimiento
    this.fotoperfil = fotoperfil
    this.iddeporte = iddeporte
    this.deportes = deportes
    this.ubicacion = ubicacion
    this.genero = genero
    this.descripcion = descripcion
   
  }
}

export default Jugador
