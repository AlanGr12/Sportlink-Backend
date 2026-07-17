class Entrevista {
  constructor({ identrevista, idinscripcion, fecha, horainicio, horafin, ubicacion,
                comentarios, puntaje, estado, createdat, updatedat,
                inscripcionesempleo } = {}) {
    this.identrevista        = identrevista
    this.idinscripcion       = idinscripcion
    this.fecha               = fecha
    this.horainicio          = horainicio
    this.horafin             = horafin
    this.ubicacion           = ubicacion
    this.comentarios         = comentarios
    this.puntaje             = puntaje
    this.estado              = estado  // PENDIENTE | REALIZADA | CANCELADA
    this.createdat           = createdat
    this.updatedat           = updatedat
    this.inscripcion         = inscripcionesempleo || null
  }
}

export default Entrevista
