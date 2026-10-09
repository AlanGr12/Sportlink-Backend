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

    // ── Moderación de clubes: solo los APROBADOS obtienen sesión ──────────────
    // Se valida después de la contraseña para no revelar el estado a quien no la conoce.
    const perfilExtra = await this.repository.getPerfilByUsuarioAsync(usuario.idusuario, usuario.tipousuario)

    if (String(usuario.tipousuario).toLowerCase() === 'club') {
      const estadoClub = String(perfilExtra?.estado || 'PENDIENTE').toUpperCase()
      if (estadoClub === 'PENDIENTE') {
        throw {
          status: 403,
          codigo: 'CLUB_PENDIENTE',
          message: 'Tu cuenta de club está siendo revisada por el equipo de administración para ser aprobada.'
        }
      }
      if (estadoClub === 'RECHAZADO') {
        throw {
          status: 403,
          codigo: 'CLUB_RECHAZADO',
          message: 'La solicitud de tu club no fue admitida por el equipo de administración. Si creés que se trata de un error, contactá a soporte.'
        }
      }
    }

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
    const perfil = {
      idusuario:   usuario.idusuario,
      email:       usuario.email,
      tipousuario: usuario.tipousuario,
      fotoperfil:  perfilExtra?.fotoperfil || null,
      nombre:      perfilExtra?.nombre     || null,
      biografia:   usuario.biografia       || null,
      es_admin:    usuario.es_admin === true,
      estado:      perfilExtra?.estado     || null,
    }

    return { token, perfil }
  }

  async getPerfilCompletoAsync(idusuario, solicitante) {
    const usuario = await this.repository.getByIdAsync(idusuario)
    if (!usuario) throw { status: 404, message: 'No se encontró el usuario' }

    const perfil = await this.repository.getPerfilCompletoByUsuarioAsync(idusuario, usuario.tipousuario)

    // Perfiles de clubes no aprobados: solo visibles para administradores y para el propio club
    if (solicitante && String(usuario.tipousuario).toLowerCase() === 'club'
        && String(perfil?.estado || 'PENDIENTE').toUpperCase() !== 'APROBADO') {
      const esPropio = Number(solicitante.idusuario) === Number(idusuario)
      if (!esPropio && solicitante.es_admin !== true) {
        throw { status: 404, message: 'Este perfil no está disponible o se encuentra en proceso de validación.' }
      }
    }

    // Nunca exponer la contraseña en el perfil completo
    const { contraseña, ...usuarioSinPassword } = usuario

    return {
      ...usuarioSinPassword,
      ...(perfil || {}),
      biografia: usuario.biografia !== undefined ? usuario.biografia : (perfil?.biografia ?? null),
    }
  }

  async actualizarFotoPerfilAsync(idusuario, tipousuario, archivo) {
    if (!idusuario) throw { status: 400, message: 'ID de usuario requerido' }
    if (!archivo) throw { status: 400, message: 'Debes enviar una imagen en el campo "foto"' }

    const tipo = String(tipousuario || '').toLowerCase()
    const carpeta = { jugador: 'jugadores', entrenador: 'entrenadores', club: 'clubes' }[tipo]
    if (!carpeta) throw { status: 400, message: 'Tipo de usuario no soporta foto de perfil' }

    const url = await this.repository.subirFotoPerfilAsync(archivo, carpeta)
    await this.repository.actualizarFotoPerfilAsync(idusuario, tipo, url)
    return url
  }

  async actualizarBiografiaAsync(idusuario, biografia) {
    if (!idusuario) throw { status: 400, message: 'ID de usuario requerido' }
    return await this.repository.actualizarBiografiaAsync(idusuario, biografia)
  }

}

export default UsuariosService
