export default class Entrenamiento {
  constructor({ identrenamientos, iddeporte, identrenador, precio, cantidad, titulo, imagen, ubicacion, fechaentr, horainicio, horafin, estado, descripcion, genero, nivel, createdat, updatedat, deportes, entrenadores } = {}) {
    this.identrenamientos = identrenamientos
    this.iddeporte = iddeporte
    this.identrenador = identrenador
    this.precio = precio
    this.cantidad = cantidad
    this.titulo = titulo
    this.imagen = imagen
    this.ubicacion = ubicacion
    this.fechaentr = fechaentr
    this.horainicio = horainicio
    this.horafin = horafin
    this.estado = estado
    this.descripcion = descripcion
    this.genero = genero
    this.nivel = nivel
    this.createdat = createdat
    this.updatedat = updatedat
    this.deportes = deportes
    this.entrenadores = entrenadores
  }
}
