export default class CalendarioEvento {
  constructor({
    idevento,
    idusuario,
    tipo,
    fecha,
    horainicio,
    horafin,
    idprueba,
    identrenamiento,
    idinscripcionempleo,
    titulo,
    descripcion,
    imagen,
    createdat,
    updatedat,
  } = {}) {
    this.idevento            = idevento
    this.idusuario           = idusuario
    this.tipo                = tipo
    this.fecha               = fecha
    this.horainicio          = horainicio
    this.horafin             = horafin
    this.idprueba            = idprueba
    this.identrenamiento     = identrenamiento
    this.idinscripcionempleo = idinscripcionempleo
    this.titulo              = titulo       || null
    this.descripcion         = descripcion  || null
    this.imagen              = imagen       || null
    this.createdat           = createdat
    this.updatedat           = updatedat
  }
}
