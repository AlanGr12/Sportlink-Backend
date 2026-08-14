import 'dotenv/config'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const BASE = 'http://localhost:3000'

async function httpReq(url, method, body, token) {
  const options = {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }
  if (body) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url, options)
  const json = res.status !== 204 ? await res.json().catch(() => null) : null
  return { status: res.status, body: json }
}

function banner(titulo) {
  console.log('\n' + '═'.repeat(65))
  console.log(`  ${titulo}`)
  console.log('═'.repeat(65))
}

function result(label, r) {
  const icon = r.status >= 200 && r.status < 300 ? '✅' :
               r.status === 403 ? '🔒' :
               r.status === 404 ? '⚠️' : '❌'
  console.log(`\n${icon} ${label}`)
  console.log(`   STATUS: ${r.status}`)
  console.log(`   BODY:   ${JSON.stringify(r.body, null, 2)?.split('\n').join('\n           ') || 'vacío'}`)
  return icon
}

async function main() {
  banner('LOGIN DE USUARIOS PARA TESTS')
  
  // Usuario A: Jugador Nicolas
  let resA = await httpReq(`${BASE}/api/login`, 'POST', { email: 'nicocukier@gmail.com', contraseña: '1234' })
  const tokenA = resA.body?.token
  const idA = resA.body?.perfil?.idusuario
  console.log(`Usuario A (Nicolas, id=${idA}) logueado.`)

  // Usuario B: Club Comunicaciones
  let resB = await httpReq(`${BASE}/api/login`, 'POST', { email: 'contacto@comunicaciones.com', contraseña: '123456' })
  const tokenB = resB.body?.token
  const idB = resB.body?.perfil?.idusuario
  console.log(`Usuario B (Club Comunicaciones, id=${idB}) logueado.`)

  if (!tokenA || !tokenB) {
    console.error('❌ Error de login. Abortando.')
    process.exit(1)
  }

  banner('SETUP: CREAR PUBLICACIÓN NORMAL')
  const pubRes = await httpReq(`${BASE}/api/publicaciones`, 'POST', { contenido: 'Publicación base para Fase 3' }, tokenA)
  result('POST /api/publicaciones (Usuario A)', pubRes)
  const idPub = pubRes.body?.idpublicacion

  if (!idPub) {
    console.error('❌ No se pudo crear la publicación base. Abortando.')
    process.exit(1)
  }

  // ─── LIKES ──────────────────────────────────────────────
  banner('TESTS DE LIKES')
  
  const l1 = await httpReq(`${BASE}/api/publicaciones/${idPub}/like`, 'POST', null, tokenA)
  result('TEST L1 — Dar like (Usuario A)', l1)

  const l2 = await httpReq(`${BASE}/api/publicaciones/${idPub}/like`, 'POST', null, tokenA)
  result('TEST L2 — Idempotencia de dar like (CRÍTICO)', l2)
  if (l2.body?.totalLikes === 2) console.log('   ❌ BUG: totalLikes subió a 2, el upsert no fue idempotente.')

  const l3 = await httpReq(`${BASE}/api/publicaciones/${idPub}/like`, 'DELETE', null, tokenA)
  result('TEST L3 — Sacar like (Usuario A)', l3)

  const l4 = await httpReq(`${BASE}/api/publicaciones/${idPub}/like`, 'DELETE', null, tokenA)
  result('TEST L4 — Idempotencia de sacar like', l4)


  // ─── COMENTARIOS ────────────────────────────────────────
  banner('TESTS DE COMENTARIOS')

  const c1 = await httpReq(`${BASE}/api/publicaciones/${idPub}/comentarios`, 'POST', { contenido: 'Primer comentario de prueba' }, tokenA)
  result('TEST C1 — Comentario de Usuario A', c1)
  const idCom1 = c1.body?.idcomentario

  const c2 = await httpReq(`${BASE}/api/publicaciones/${idPub}/comentarios`, 'POST', { contenido: 'Segundo comentario de prueba' }, tokenB)
  result('TEST C2 — Comentario de Usuario B', c2)
  const idCom2 = c2.body?.idcomentario

  const c3 = await httpReq(`${BASE}/api/publicaciones/${idPub}/comentarios`, 'GET', null, tokenA)
  result('TEST C3 — Listar comentarios', c3)

  const c4 = await httpReq(`${BASE}/api/comentarios/${idCom1}`, 'PUT', { contenido: 'Hackeo' }, tokenB)
  result('TEST C4 — Editar comentario ajeno (CRÍTICO - esperado 403)', c4)

  const c5 = await httpReq(`${BASE}/api/comentarios/${idCom1}`, 'PUT', { contenido: 'Primer comentario editado' }, tokenA)
  result('TEST C5 — Editar comentario propio (esperado 200)', c5)

  const c6 = await httpReq(`${BASE}/api/comentarios/${idCom2}`, 'DELETE', null, tokenA)
  result('TEST C6 — Eliminar comentario ajeno (CRÍTICO - esperado 403)', c6)

  const c7 = await httpReq(`${BASE}/api/comentarios/${idCom2}`, 'DELETE', null, tokenB)
  result('TEST C7 — Eliminar comentario propio (esperado 204)', c7)

  const c7Verif = await httpReq(`${BASE}/api/publicaciones/${idPub}/comentarios`, 'GET', null, tokenA)
  result('Verificación post-DELETE (debe haber solo 1 comentario)', c7Verif)


  // ─── FEED ENRIQUECIDO ───────────────────────────────────
  banner('TESTS DEL FEED ENRIQUECIDO')

  // Setup F1: Usuario A le da like y comenta de nuevo
  await httpReq(`${BASE}/api/publicaciones/${idPub}/like`, 'POST', null, tokenA)
  await httpReq(`${BASE}/api/publicaciones/${idPub}/comentarios`, 'POST', { contenido: 'Tercer comentario' }, tokenA)

  const f1 = await httpReq(`${BASE}/api/publicaciones/${idPub}`, 'GET', null, tokenA)
  result('TEST F1 — GET publicación con Usuario A (esperado usuarioDioLike: true)', f1)

  const f2 = await httpReq(`${BASE}/api/publicaciones/${idPub}`, 'GET', null, tokenB)
  result('TEST F2 — GET publicación con Usuario B (esperado usuarioDioLike: false, mismos totales)', f2)


  // ─── LIMPIEZA FINAL ─────────────────────────────────────
  banner('LIMPIEZA FINAL')
  const delPub = await httpReq(`${BASE}/api/publicaciones/${idPub}`, 'DELETE', null, tokenA)
  result('Borrar publicación base (ON DELETE CASCADE)', delPub)

  console.log('\n✅ Script finalizado. Copiá todo el output para el reporte.')
}

main().catch(console.error)
