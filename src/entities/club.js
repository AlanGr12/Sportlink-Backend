class Club {
  constructor({ idclub, idusuario, nombre, ubicacion, fotoperfil, descripcion, deportes, direccion, latitud, longitud } = {}) {
    this.idclub = idclub
    this.idusuario = idusuario
    this.nombre = nombre
    this.ubicacion = ubicacion
    this.fotoperfil = fotoperfil
    this.descripcion = descripcion
    this.deportes = deportes || []
    this.direccion = direccion ?? null
    this.latitud = (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : null
    this.longitud = (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : null
  }
}

export default Club