export default class InscripcionEntrenamiento {
	constructor({ idinscripcionesentr, identrenamiento, idjugadorinscripto, estado, createdat } = {}) {
		this.idinscripcionesentr = idinscripcionesentr
		this.identrenamiento = identrenamiento
		this.idjugadorinscripto = idjugadorinscripto
		this.estado = estado
		this.createdat = createdat
	}
}
