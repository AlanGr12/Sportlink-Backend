export default class InscripcionPrueba {
  constructor({ idinscripcionesprueba, idjugador, idprueba, estado, fechainscripcion } = {}) {
    this.idinscripcionesprueba = idinscripcionesprueba
    this.idjugador = idjugador
    this.idprueba = idprueba
    this.estado = estado
    this.fechainscripcion = fechainscripcion
  }
}
