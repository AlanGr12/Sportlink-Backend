class Usuario{
      constructor({ idusuario, email, contraseña, tipousuario} = {}) {
    this.idusuario = idusuario
    this.email = email
    this.contraseña = contraseña
    this.tipousuario = tipousuario
  }
}


export default Usuario