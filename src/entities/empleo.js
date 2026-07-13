class Empleo {
  constructor({ idempleo, idclub, iddeporte, nombre, horasreq, habilidadesreq,
                acercaempleo, fechapublicacion, estado, createdat, updatedat,
                clubes, deportes } = {}) {
    this.idempleo         = idempleo
    this.idclub           = idclub
    this.iddeporte        = iddeporte
    this.nombre           = nombre
    this.horasreq         = horasreq
    this.habilidadesreq   = habilidadesreq
    this.acercaempleo     = acercaempleo
    this.fechapublicacion = fechapublicacion
    this.estado           = estado
    this.createdat        = createdat
    this.updatedat        = updatedat
    this.club             = clubes   // { idclub, nombre, fotoperfil, ubicacion }
    this.deporte          = deportes // { iddeporte, deporte }
  }
}

export default Empleo