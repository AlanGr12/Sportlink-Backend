const normalizar = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/**
 * Valida que el género del jugador sea compatible con el de la actividad.
 * 'Mixto' (o sin género definido) admite a cualquiera; Masculino/Femenino solo a su género.
 */
export function verificarGeneroJugador(generoActividad, jugador, tipo = 'actividad') {
  const requerido = normalizar(generoActividad)
  if (!requerido || requerido === 'mixto') return

  if (normalizar(jugador?.genero) !== requerido) {
    throw {
      status: 400,
      message: `Esta ${tipo} es exclusiva para el género ${requerido}, por lo que no podés inscribirte.`
    }
  }
}

/**
 * Valida que el deporte esté entre los que el club/entrenador tiene seleccionados en su perfil.
 */
export function verificarDeporteAutorizado(iddeporte, idsPermitidos, quien = 'club') {
  const permitidos = (idsPermitidos || []).map(Number)
  if (!permitidos.includes(Number(iddeporte))) {
    throw {
      status: 400,
      message: `Solo podés crear actividades de los deportes que seleccionaste en tu perfil de ${quien}.`
    }
  }
}
