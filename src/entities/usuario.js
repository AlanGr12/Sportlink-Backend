class Usuario {
  constructor({ idusuario, email, contrasenia, tipousuario, biografia, createdat, updatedat } = {}) {
    this.idusuario = idusuario
    this.email = email
    this.contrasenia = contrasenia
    this.tipousuario = tipousuario
    this.biografia = biografia || null
    this.createdat = createdat
    this.updatedat = updatedat
  }
}

export default Usuario