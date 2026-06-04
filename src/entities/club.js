class Club {
  constructor({ idclub, idusuario, nombre, ubicacion, fotoperfil, descripcion } = {}) {
    this.idclub = idclub
    this.idusuario = idusuario
    this.nombre = nombre
    this.ubicacion = ubicacion
    this.fotoperfil = fotoperfil
    this.descripcion = descripcion
  }
}

export default Club