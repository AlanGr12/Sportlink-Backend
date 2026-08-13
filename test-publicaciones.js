import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const JWT_SECRET = process.env.JWT_SECRET
const BASE_URL = 'http://localhost:3000/api/publicaciones'

function generateToken(idusuario, tipousuario) {
  return jwt.sign({ idusuario, tipousuario }, JWT_SECRET, { expiresIn: '1h' })
}

async function runTests() {
  console.log('--- Buscando datos de prueba ---')

  // Obtener usuarios
  const { data: usuariosClub } = await supabase.from('usuarios').select('idusuario').eq('tipousuario', 'club').limit(2)
  const { data: usuariosEntrenador } = await supabase.from('usuarios').select('idusuario').eq('tipousuario', 'entrenador').limit(2)
  const { data: usuarioJugador } = await supabase.from('usuarios').select('idusuario').eq('tipousuario', 'jugador').limit(1)

  if (!usuariosClub || usuariosClub.length < 2 || !usuariosEntrenador || usuariosEntrenador.length < 2) {
      console.log('No hay suficientes datos en la BD para probar todos los casos. Se requiere al menos 2 clubes y 2 entrenadores.')
      return
  }

  const club1Id = usuariosClub[0].idusuario
  const club2Id = usuariosClub[1].idusuario
  const entrenador1Id = usuariosEntrenador[0].idusuario
  const entrenador2Id = usuariosEntrenador[1].idusuario
  const jugadorId = usuarioJugador?.[0]?.idusuario || club1Id // Fallback

  const tokenClub1 = generateToken(club1Id, 'club')
  const tokenClub2 = generateToken(club2Id, 'club')
  const tokenEntrenador1 = generateToken(entrenador1Id, 'entrenador')
  const tokenJugador = generateToken(jugadorId, 'jugador')

  // Obtener id de club en la tabla clubes
  const { data: club1Data } = await supabase.from('clubes').select('idclub').eq('idusuario', club1Id).single()
  const idclub1 = club1Data?.idclub

  const { data: entr1Data } = await supabase.from('entrenadores').select('identrenador').eq('idusuario', entrenador1Id).single()
  const identrenador1 = entr1Data?.identrenador

  // Buscar o crear prueba
  let { data: pruebas } = await supabase.from('pruebas').select('idprueba').eq('idclub', idclub1).limit(1)
  let idprueba1 = pruebas?.[0]?.idprueba

  if (!idprueba1 && idclub1) {
    const { data: newPrueba } = await supabase.from('pruebas').insert({ idclub: idclub1, iddeporte: 1, cupo: 10 }).select().single()
    idprueba1 = newPrueba.idprueba
  }

  // Buscar o crear entrenamiento
  let { data: entrenamientos } = await supabase.from('entrenamientos').select('identrenamientos').eq('identrenador', identrenador1).limit(1)
  let identrenamiento1 = entrenamientos?.[0]?.identrenamientos

  if (!identrenamiento1 && identrenador1) {
    const { data: newEntr } = await supabase.from('entrenamientos').insert({ identrenador: identrenador1, iddeporte: 1, precio: 0, cantidad: 10 }).select().single()
    identrenamiento1 = newEntr.identrenamientos
  }

  // Buscar o crear empleo
  let { data: empleos } = await supabase.from('empleo').select('idempleo').eq('idclub', idclub1).limit(1)
  let idempleo1 = empleos?.[0]?.idempleo

  if (!idempleo1 && idclub1) {
     const { data: newEmp } = await supabase.from('empleo').insert({ idclub: idclub1, iddeporte: 1, nombre: 'Test', horasreq: 10, estado: 'Abierto' }).select().single()
     idempleo1 = newEmp.idempleo
  }

  console.log(`Datos obtenidos: Prueba: ${idprueba1}, Entrenamiento: ${identrenamiento1}, Empleo: ${idempleo1}`)

  let testsPassed = 0
  let testsFailed = 0

  async function test(name, reqOptions, expectedStatus) {
    const res = await fetch(BASE_URL + (reqOptions.path || ''), reqOptions)
    if (res.status === expectedStatus) {
      console.log(`✅ [PASS] ${name}`)
      testsPassed++
      return await res.json().catch(() => null)
    } else {
      console.error(`❌ [FAIL] ${name} - Esperaba ${expectedStatus}, obtuvo ${res.status}`)
      const err = await res.json().catch(() => null)
      console.error(err)
      testsFailed++
      return null
    }
  }

  // 1. NORMAL propia -> 201
  const pub1 = await test('1. NORMAL propia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenJugador}` },
    body: JSON.stringify({ contenido: 'Test normal', tipopublicacion: 'NORMAL' })
  }, 201)

  // 2. NORMAL con idprueba -> 400
  await test('2. NORMAL con idprueba', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenJugador}` },
    body: JSON.stringify({ contenido: 'Test', tipopublicacion: 'NORMAL', idprueba: idprueba1 })
  }, 400)

  // 3. PRUEBA propia -> 201
  const pubPrueba = await test('3. PRUEBA propia del club autenticado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` },
    body: JSON.stringify({ contenido: 'Test prueba', tipopublicacion: 'PRUEBA', idprueba: idprueba1 })
  }, 201)

  // 4. PRUEBA de otro club -> 403
  await test('4. PRUEBA de otro club', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub2}` },
    body: JSON.stringify({ contenido: 'Test prueba', tipopublicacion: 'PRUEBA', idprueba: idprueba1 })
  }, 403)

  // 5. PRUEBA inexistente -> 404
  await test('5. PRUEBA inexistente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` },
    body: JSON.stringify({ contenido: 'Test prueba', tipopublicacion: 'PRUEBA', idprueba: 999999 })
  }, 404)

  // 6. ENTRENAMIENTO propio -> 201
  const pubEntr = await test('6. ENTRENAMIENTO propio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenEntrenador1}` },
    body: JSON.stringify({ contenido: 'Test entr', tipopublicacion: 'ENTRENAMIENTO', identrenamiento: identrenamiento1 })
  }, 201)

  // 7. ENTRENAMIENTO de otro -> 403
  await test('7. ENTRENAMIENTO de otro entrenador', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` }, // Club intentando
    body: JSON.stringify({ contenido: 'Test entr', tipopublicacion: 'ENTRENAMIENTO', identrenamiento: identrenamiento1 })
  }, 403)

  // 8. ENTRENAMIENTO inexistente -> 404
  await test('8. ENTRENAMIENTO inexistente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenEntrenador1}` },
    body: JSON.stringify({ contenido: 'Test entr', tipopublicacion: 'ENTRENAMIENTO', identrenamiento: 999999 })
  }, 404)

  // 9. EMPLEO propio -> 201
  const pubEmp = await test('9. EMPLEO propio del club', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` },
    body: JSON.stringify({ contenido: 'Test empleo', tipopublicacion: 'EMPLEO', idempleo: idempleo1 })
  }, 201)

  // 10. EMPLEO de otro -> 403
  await test('10. EMPLEO de otro club', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub2}` },
    body: JSON.stringify({ contenido: 'Test empleo', tipopublicacion: 'EMPLEO', idempleo: idempleo1 })
  }, 403)

  // 11. EMPLEO inexistente -> 404
  await test('11. EMPLEO inexistente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` },
    body: JSON.stringify({ contenido: 'Test empleo', tipopublicacion: 'EMPLEO', idempleo: 999999 })
  }, 404)

  // 12. PUT propia -> 200
  if (pub1) {
    await test('12. PUT de publicación propia', {
      method: 'PUT',
      path: `/${pub1.idpublicacion}`,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenJugador}` },
      body: JSON.stringify({ contenido: 'Editado' })
    }, 200)
  }

  // 13. PUT ajena -> 403
  if (pub1) {
    await test('13. PUT de publicación ajena', {
      method: 'PUT',
      path: `/${pub1.idpublicacion}`,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenClub1}` },
      body: JSON.stringify({ contenido: 'Editado' })
    }, 403)
  }

  // 16. GET paginado y resolver N+1
  const feed = await test('16. GET /api/publicaciones', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenJugador}` }
  }, 200)

  if (feed && feed.publicaciones && feed.publicaciones.length > 0) {
      const pPrueba = feed.publicaciones.find(p => p.tipopublicacion === 'PRUEBA')
      if (pPrueba && pPrueba.referencia) {
          console.log('✅ [PASS] 18. Referencia PRUEBA mostrada correctamente')
      } else {
          console.error('❌ [FAIL] 18. Falta referencia PRUEBA')
      }
      const pEntr = feed.publicaciones.find(p => p.tipopublicacion === 'ENTRENAMIENTO')
      if (pEntr && pEntr.referencia) {
          console.log('✅ [PASS] 19. Referencia ENTRENAMIENTO mostrada correctamente')
      } else {
          console.error('❌ [FAIL] 19. Falta referencia ENTRENAMIENTO')
      }
      const pEmp = feed.publicaciones.find(p => p.tipopublicacion === 'EMPLEO')
      if (pEmp && pEmp.referencia) {
          console.log('✅ [PASS] 20. Referencia EMPLEO mostrada correctamente')
      } else {
          console.error('❌ [FAIL] 20. Falta referencia EMPLEO')
      }
  }

  // 15. DELETE ajena -> 403
  if (pub1) {
    await test('15. DELETE de publicación ajena', {
      method: 'DELETE',
      path: `/${pub1.idpublicacion}`,
      headers: { 'Authorization': `Bearer ${tokenClub1}` }
    }, 403)
  }

  // 14. DELETE propia -> 204
  if (pub1) {
    await test('14. DELETE de publicación propia', {
      method: 'DELETE',
      path: `/${pub1.idpublicacion}`,
      headers: { 'Authorization': `Bearer ${tokenJugador}` }
    }, 204)
  }
  
  if (pubPrueba) await fetch(BASE_URL + `/${pubPrueba.idpublicacion}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenClub1}` }})
  if (pubEntr) await fetch(BASE_URL + `/${pubEntr.idpublicacion}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenEntrenador1}` }})
  if (pubEmp) await fetch(BASE_URL + `/${pubEmp.idpublicacion}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${tokenClub1}` }})

  console.log(`\nTests finalizados: ${testsPassed} passed, ${testsFailed} failed.`)
  process.exit(testsFailed > 0 ? 1 : 0)
}

runTests()
