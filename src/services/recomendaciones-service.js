import recomendacionesRepository from '../repositories/recomendaciones-repository.js'

const LIMITE_DEFAULT = 3
const LIMITE_MAX = 10

// Fisher-Yates: mezcla en el lugar
const mezclar = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

class RecomendacionesService {

  /**
   * Perfiles recomendados para el feed, elegidos al azar entre los que comparten deporte:
   *   jugador    → entrenadores y clubes de su deporte
   *   club       → entrenadores de los deportes del club
   *   entrenador → clubes de sus deportes
   */
  async getRecomendaciones(idusuario, tipousuario, limite) {
    const tipo = String(tipousuario || '').toLowerCase()
    const cantidad = Math.min(Math.max(Number(limite) || LIMITE_DEFAULT, 1), LIMITE_MAX)

    const iddeportes = await recomendacionesRepository.getDeportesDelUsuarioAsync(idusuario, tipo)
    if (iddeportes.length === 0) return []

    let candidatos = []
    if (tipo === 'jugador') {
      const [entrenadores, clubes] = await Promise.all([
        recomendacionesRepository.getEntrenadoresPorDeportesAsync(iddeportes),
        recomendacionesRepository.getClubesPorDeportesAsync(iddeportes),
      ])
      candidatos = [...entrenadores, ...clubes]
    } else if (tipo === 'club') {
      candidatos = await recomendacionesRepository.getEntrenadoresPorDeportesAsync(iddeportes)
    } else if (tipo === 'entrenador') {
      candidatos = await recomendacionesRepository.getClubesPorDeportesAsync(iddeportes)
    }

    // Un perfil puede coincidir en varios deportes: se agrupa por usuario
    const porUsuario = new Map()
    for (const c of candidatos) {
      if (Number(c.idusuario) === Number(idusuario)) continue
      const existente = porUsuario.get(c.idusuario)
      if (existente) {
        if (c.deporte && !existente.deportes.includes(c.deporte)) existente.deportes.push(c.deporte)
      } else {
        const { deporte, ...resto } = c
        porUsuario.set(c.idusuario, { ...resto, deportes: deporte ? [deporte] : [] })
      }
    }

    return mezclar([...porUsuario.values()])
      .slice(0, cantidad)
      .map(r => ({ ...r, deporte: r.deportes.join(', ') }))
  }
}

export default new RecomendacionesService()
