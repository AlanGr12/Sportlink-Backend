import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import UsuariosRepository from '../repositories/usuarios-repository.js'

const JWT_SECRET = process.env.JWT_SECRET

class UsuariosService {

  constructor() {
    this.repository = new UsuariosRepository()
  }

  async loginAsync(email, contraseña) {
    const usuario = await this.repository.getByEmailAsync(email)
    if (!usuario) throw { status: 401, message: 'Credenciales inválidas' }

    // ── Verificar contraseña ──────────────────────────────────────────────────
    let autenticado = false

    // Detectar si la contraseña almacenada es un hash bcrypt ($2b$...)
    const esBcrypt = typeof usuario.contraseña === 'string' && usuario.contraseña.startsWith('$2')

    if (esBcrypt) {
      // Flujo normal: comparar con bcrypt
      autenticado = await bcrypt.compare(contraseña, usuario.contraseña)
    } else {
      // TODO: Eliminar este bloque de fallback una vez que todos los usuarios
      //       hayan sido migrados a contraseñas hasheadas con bcrypt.
      //       Monitorear los logs "[auth-migration]" para saber cuándo es seguro hacerlo.
      if (usuario.contraseña === contraseña) {
        autenticado = true

        // Log para monitoreo de migración pendiente
        console.warn(
          `[auth-migration] Usuario idusuario=${usuario.idusuario} inició sesión con contraseña en texto plano. ` +
          `Migrando automáticamente a bcrypt...`
        )

        // Migración automática: re-hashear y guardar
        try {
          const hash = await bcrypt.hash(contraseña, 10)
          await this.repository.actualizarContrasenia(usuario.idusuario, hash)
          console.info(`[auth-migration] Contraseña del usuario idusuario=${usuario.idusuario} migrada exitosamente.`)
        } catch (migErr) {
          // No bloquear el login si falla la migración, solo loguear
          console.error(`[auth-migration] Error al migrar contraseña de idusuario=${usuario.idusuario}:`, migErr.message)
        }
      }
    }

    if (!autenticado) throw { status: 401, message: 'Credenciales inválidas' }

    // ── Generar JWT ───────────────────────────────────────────────────────────
    // NUNCA incluir la contraseña (ni hasheada) en el payload del token.
    const payload = {
      idusuario: usuario.idusuario,
      tipousuario: usuario.tipousuario,
    }

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS256',
    })

    // ── Perfil público (sin contraseña) ───────────────────────────────────────
    const perfilExtra = await this.repository.getPerfilByUsuarioAsync(usuario.idusuario, usuario.tipousuario)

    const perfil = {
      idusuario:   usuario.idusuario,
      email:       usuario.email,
      tipousuario: usuario.tipousuario,
      fotoperfil:  perfilExtra?.fotoperfil || null,
      nombre:      perfilExtra?.nombre     || null,
    }

    return { token, perfil }
  }

  async getPerfilCompletoAsync(idusuario) {
    const usuario = await this.repository.getByIdAsync(idusuario)
    if (!usuario) throw { status: 404, message: 'No se encontró el usuario' }

    const perfil = await this.repository.getPerfilCompletoByUsuarioAsync(idusuario, usuario.tipousuario)

    // Nunca exponer la contraseña en el perfil completo
    const { contraseña, ...usuarioSinPassword } = usuario

    return {
      ...usuarioSinPassword,
      ...(perfil || {}),
    }
  }

}

export default UsuariosService
