class Prueba {
  constructor({ idprueba, cupo, horainicio, horafin, estado,
                descripcion, imagen, categoria, zona, genero, fechaprueba,
                fechacierre, createdat, clubes, deportes } = {}) {
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
    this.club        = clubes   // { idclub, nombre, fotoperfil, ubicacion }
    this.deporte     = deportes // { iddeporte, deporte }
  }
}

export default Prueba