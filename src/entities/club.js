class Club {
  constructor({ idclub, idusuario, nombre, ubicacion, fotoperfil, descripcion, deportes } = {}) {
    this.idclub = idclub
    this.idusuario = idusuario
    this.nombre = nombre
    this.ubicacion = ubicacion
    this.fotoperfil = fotoperfil
    this.descripcion = descripcion
    this.deportes = deportes || []
  }
}

export default Club