import supabase from '../configs/supabase-config.js'
import NotificacionesRepository from '../repositories/notificaciones-repository.js'

const ZONA = 'America/Argentina/Buenos_Aires'
const HORA_ENVIO = 8            // los recordatorios salen a partir de las 8:00 (hora Argentina)
const INTERVALO_MS = 60 * 60 * 1000

const repository = new NotificacionesRepository()

function ahoraEnZona() {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA }) // YYYY-MM-DD
  const hora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(new Date()))
  return { hoy, hora }
}

function sumarDias(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}

const hhmm = (h) => (h ? String(h).slice(0, 5) : null)

/**
 * Avisa a los deportistas inscriptos que mañana tienen una prueba o un entrenamiento.
 * Es idempotente: la clave RECORDATORIO:<TIPO>:<id> evita duplicados aunque corra varias veces.
 */
export async function enviarRecordatoriosDiaPrevio() {
  const { hoy, hora } = ahoraEnZona()
  if (hora < HORA_ENVIO) return
  const manana = sumarDias(hoy, 1)

  // ── Pruebas ──
  const { data: pruebas, error: errP } = await supabase
    .from('pruebas')
    .select('idprueba, categoria, horainicio, clubes ( nombre ), deportes ( deporte )')
    .eq('fechaprueba', manana)
  if (errP) throw new Error(errP.message)

  for (const p of pruebas || []) {
    const { data: insc, error } = await supabase
      .from('inscripcionesprueba')
      .select('jugadores ( idusuario )')
      .eq('idprueba', p.idprueba)
    if (error) throw new Error(error.message)
    for (const i of insc || []) {
      const id_usuario = i.jugadores?.idusuario
      if (!id_usuario) continue
      await repository.crearSiNoExiste({
        id_usuario,
        clave: `RECORDATORIO:PRUEBA:${p.idprueba}`,
        titulo: 'Mañana tenés una prueba',
        mensaje: `Mañana${hhmm(p.horainicio) ? ` a las ${hhmm(p.horainicio)}` : ''} tenés la prueba de ${p.deportes?.deporte || 'deporte'} (${p.categoria}) en ${p.clubes?.nombre || 'el club'}.`,
        tipo: 'RECORDATORIO',
        enlace: `/pruebas/${p.idprueba}`,
      })
    }
  }

  // ── Entrenamientos ──
  const { data: entrenamientos, error: errE } = await supabase
    .from('entrenamientos')
    .select('identrenamientos, titulo, horainicio')
    .eq('fechaentr', manana)
  if (errE) throw new Error(errE.message)

  for (const e of entrenamientos || []) {
    const { data: insc, error } = await supabase
      .from('inscripcionesentrenamientos')
      .select('jugadores ( idusuario )')
      .eq('identrenamiento', e.identrenamientos)
    if (error) throw new Error(error.message)
    for (const i of insc || []) {
      const id_usuario = i.jugadores?.idusuario
      if (!id_usuario) continue
      await repository.crearSiNoExiste({
        id_usuario,
        clave: `RECORDATORIO:ENTRENAMIENTO:${e.identrenamientos}`,
        titulo: 'Mañana tenés un entrenamiento',
        mensaje: `Mañana${hhmm(e.horainicio) ? ` a las ${hhmm(e.horainicio)}` : ''} tenés el entrenamiento "${e.titulo}".`,
        tipo: 'RECORDATORIO',
        enlace: `/entrenamientos/${e.identrenamientos}`,
      })
    }
  }
}

/** Arranca el recordatorio periódico (una vez por hora, y poco después de iniciar el servidor). */
export function iniciarRecordatorios() {
  const correr = async () => {
    try {
      await enviarRecordatoriosDiaPrevio()
    } catch (err) {
      console.error('[recordatorios] Error:', err.message || err)
    }
  }
  setTimeout(correr, 30 * 1000)
  setInterval(correr, INTERVALO_MS)
}
