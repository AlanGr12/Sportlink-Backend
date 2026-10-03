class Prueba {
  constructor({ idprueba, cupo, horainicio, horafin, estado,
                descripcion, imagen, categoria, zona, genero, fechaprueba,
                fechacierre, createdat, clubes, deportes,
                direccion, latitud, longitud } = {}) {
    this.idprueba    = idprueba
    this.cupo        = cupo
    this.horainicio  = horainicio
    this.horafin     = horafin
    this.estado      = estado
    this.descripcion = descripcion
    this.imagen      = imagen
    this.categoria   = categoria
    this.zona        = zona
    this.genero      = genero
    this.fechaprueba = fechaprueba
    this.fechacierre = fechacierre
    this.createdat   = createdat
    this.club        = clubes   // { idclub, nombre, fotoperfil, ubicacion, direccion, latitud, longitud }
    this.deporte     = deportes // { iddeporte, deporte }
    this.direccion   = direccion ?? null
    this.latitud     = (latitud !== undefined && latitud !== null && latitud !== '') ? Number(latitud) : null
    this.longitud    = (longitud !== undefined && longitud !== null && longitud !== '') ? Number(longitud) : null
  }
}

export default Prueba