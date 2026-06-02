class Usuario{
      constructor({ idusuario, email, contrasenia, tipousuario} = {}) {
    this.idusuario = idusuario
    this.email = email
    this.contrasenia = contrasenia
    this.tipousuario = tipousuario
  }
}


export default Usuario