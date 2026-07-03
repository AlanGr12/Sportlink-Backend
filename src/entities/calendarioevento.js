export default class CalendarioEvento {
  constructor({ idevento, idusuario, tipo, fecha, horainicio, horafin, idprueba, identrenamiento, idinscripcionempleo, createdat, updatedat } = {}) {
    this.idevento = idevento
    this.idusuario = idusuario
    this.tipo = tipo
    this.fecha = fecha
    this.horainicio = horainicio
    this.horafin = horafin
    this.idprueba = idprueba
    this.identrenamiento = identrenamiento
    this.idinscripcionempleo = idinscripcionempleo
    this.createdat = createdat
    this.updatedat = updatedat
  }
}
