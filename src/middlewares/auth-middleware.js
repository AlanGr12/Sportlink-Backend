import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import supabase from '../configs/supabase-config.js'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('[auth-middleware] FATAL: JWT_SECRET no está definido en las variables de entorno.')
  process.exit(1)
}

/**
 * Middleware: verificarToken
 *
 * Lee el header Authorization con el esquema "Bearer <token>",
 * verifica la firma JWT y, si es válido, asigna req.usuario = decoded payload.
 *
 * Respuestas:
 *   401 - Sin token o header malformado
 *   403 - Token inválido o expirado
 */
export async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'No autenticado',
      detail: 'Se requiere el header "Authorization: Bearer <token>".',
    })
  }

  const token = authHeader.slice(7) // quitar "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    req.usuario = decoded // { idusuario, tipousuario, iat, exp }
  } catch (err) {
    const esExpirado = err.name === 'TokenExpiredError'
    return res.status(StatusCodes.FORBIDDEN).json({
      error: esExpirado ? 'Token expirado' : 'Token inválido',
      detail: err.message,
    })
  }

  // es_admin se lee siempre de la BD (no del JWT) para que otorgar/revocar el rol sea inmediato.
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('es_admin')
      .eq('idusuario', req.usuario.idusuario)
      .maybeSingle()
    if (error) throw new Error(error.message)
    req.usuario.es_admin = data?.es_admin === true
  } catch (err) {
    console.error('[auth-middleware] No se pudo leer es_admin:', err.message)
    req.usuario.es_admin = false
  }

  next()
}

/**
 * Middleware factory: requiereRol
 *
 * Verifica que req.usuario.tipousuario esté dentro de los roles permitidos.
 * Debe usarse DESPUÉS de verificarToken.
 *
 * Uso: router.post('/ruta', verificarToken, requiereRol('club', 'admin'), handler)
 */
export function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = req.usuario?.tipousuario?.toLowerCase()

    if (!rol || !rolesPermitidos.map(r => r.toLowerCase()).includes(rol)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Acceso denegado',
        detail: `Esta acción requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`,
      })
    }

    next()
  }
}

/**
 * Middleware: esAdmin
 *
 * Permite el paso solo a usuarios con es_admin = true. Debe usarse DESPUÉS de verificarToken.
 */
export function esAdmin(req, res, next) {
  if (req.usuario && (req.usuario.es_admin === true || req.usuario.tipousuario === 'ADMIN')) {
    return next()
  }
  return res.status(StatusCodes.FORBIDDEN).json({
    error: 'Acceso denegado. Se requieren permisos de administrador.',
  })
}
