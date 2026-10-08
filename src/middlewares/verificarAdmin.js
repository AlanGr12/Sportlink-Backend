import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'
import supabase from '../configs/supabase-config.js'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('[verificarAdmin] FATAL: JWT_SECRET no está definido en las variables de entorno.')
  process.exit(1)
}

/**
 * Middleware: verificarAdmin
 *
 * Valida el token JWT del usuario y consulta directamente en public.usuarios
 * que es_admin === true. Si no está autenticado devuelve 401. Si no es admin devuelve 403 Forbidden.
 */
export async function verificarAdmin(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      error: 'No autenticado',
      detail: 'Se requiere el header "Authorization: Bearer <token>".',
    })
  }

  const token = authHeader.slice(7)

  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
  } catch (err) {
    const esExpirado = err.name === 'TokenExpiredError'
    return res.status(StatusCodes.FORBIDDEN).json({
      error: esExpirado ? 'Token expirado' : 'Token inválido',
      detail: err.message,
    })
  }

  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('idusuario, email, tipousuario, es_admin')
      .eq('idusuario', decoded.idusuario)
      .maybeSingle()

    if (error) {
      console.error('[verificarAdmin] Error consultando usuario:', error.message)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Error verificando permisos de administrador' })
    }

    if (!usuario || usuario.es_admin !== true) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Acceso denegado',
        detail: 'Se requiere el rol de administrador (es_admin = true) para acceder a esta sección.',
      })
    }

    req.usuario = {
      ...decoded,
      ...usuario,
      es_admin: true,
    }

    next()
  } catch (err) {
    console.error('[verificarAdmin] Excepción no controlada:', err)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Error interno en la autorización' })
  }
}

export default verificarAdmin
