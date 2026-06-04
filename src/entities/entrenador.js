class Entrenador {
  constructor({ identrenador, idusuario, nombre, apellido, cv, telefono, fotoperfil, titulo, fechanacimiento, experiencia, tieneclub, genero, ubicacion, descripcion, deportes } = {}) {
    this.identrenador = identrenador
    this.idusuario = idusuario
    this.nombre = nombre
    this.apellido = apellido
    this.cv = cv
    this.telefono = telefono
    this.fotoperfil = fotoperfil
    this.titulo = titulo
    this.fechanacimiento = fechanacimiento
    this.experiencia = experiencia
    this.tieneclub = tieneclub
    this.genero = genero
    this.ubicacion = ubicacion
    this.descripcion = descripcion
    this.deportes = deportes  
  }
}

export default Entrenador