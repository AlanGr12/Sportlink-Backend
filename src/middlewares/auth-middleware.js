import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

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
export function verificarToken(req, res, next) {
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
    next()
  } catch (err) {
    const esExpirado = err.name === 'TokenExpiredError'
    return res.status(StatusCodes.FORBIDDEN).json({
      error: esExpirado ? 'Token expirado' : 'Token inválido',
      detail: err.message,
    })
  }
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
