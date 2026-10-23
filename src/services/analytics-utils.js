// Funciones puras compartidas por los paneles de estadísticas (club y entrenador)

const RANGOS = { mes: 30, trimestre: 90, historico: null }

export const aFecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Misma regla que el resto del proyecto: una actividad terminó si su fecha (y hora de fin) ya pasó
export function haPasado(fechaStr, horaFinStr) {
  if (!fechaStr) return false
  const d = new Date()
  const hoy = aFecha(d)
  const fecha = String(fechaStr).substring(0, 10)
  if (fecha < hoy) return true
  if (fecha > hoy) return false
  if (horaFinStr) {
    const ahora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return String(horaFinStr).substring(0, 5) < ahora
  }
  return false
}

// Porcentaje de cupos cubiertos, acotado a 100. null si la actividad no tiene cupo definido.
export const porcentaje = (inscriptos, cupo) => (cupo > 0 ? Math.min(100, Math.round((inscriptos / cupo) * 100)) : null)
export const promedio = (nums) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0)
export const contarPor = (filas, clave) => {
  const m = new Map()
  for (const f of filas) m.set(f[clave], (m.get(f[clave]) || 0) + 1)
  return m
}

/** Fecha (YYYY-MM-DD) desde la que se consulta según el rango, o null para el histórico. */
export function desdeRango(rango) {
  if (!(rango in RANGOS)) throw { status: 400, message: 'El rango debe ser mes, trimestre o historico.' }
  const dias = RANGOS[rango]
  if (dias === null) return null
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return aFecha(d)
}

// Evita inyección de fórmulas al abrir el CSV en Excel/Sheets
export function celdaCsv(valor) {
  let s = valor === null || valor === undefined ? '' : String(valor)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Arma el CSV (con BOM para que Excel respete los acentos) y un nombre de archivo seguro. */
export function armarCsv(nombreBase, tipo, rango, columnas, filas, respaldo = 'panel') {
  const lineas = [columnas, ...filas].map(f => f.map(celdaCsv).join(','))
  const slug = String(nombreBase || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  return {
    nombreArchivo: `${slug || respaldo}-${tipo}-${rango}.csv`,
    csv: '﻿' + lineas.join('\r\n'),
  }
}
