export default class Entrenamiento {
  constructor({ identrenamientos, iddeporte, identrenador, precio, cantidad, titulo, imagen, ubicacion, fechaentr, horainicio, horafin, estado, descripcion, genero, nivel, createdat, updatedat, deportes, entrenadores, direccion, latitud, longitud, id_club, clubes } = {}) {
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
    this.id_club = id_club ?? null
    this.clubes = clubes ?? null
    this.direccion = direccion ?? null
    this.latitud = (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : null
    this.longitud = (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : null
  }
}
