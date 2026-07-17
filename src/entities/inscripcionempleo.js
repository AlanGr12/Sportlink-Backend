class InscripcionEmpleo {
  constructor({ idinsripcion, identrenador, idempleo, estado,
                contratado, fechainscripcion, createdat,
                entrenadores, empleo } = {}) {
    this.idinsripcion      = idinsripcion
    this.identrenador      = identrenador
    this.idempleo          = idempleo
    this.estado            = estado         // true = activa, false = finalizada
    this.contratado        = contratado     // true = contratado
    this.fechainscripcion  = fechainscripcion
    this.createdat         = createdat
    this.entrenador        = entrenadores || null
    this.empleo            = empleo || null
  }
}

export default InscripcionEmpleo
