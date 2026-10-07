import EmpleoRepository from '../repositories/empleo-repository.js'
import chatRepository from '../repositories/chat-repository.js'
import supabase from '../configs/supabase-config.js'

class EmpleoService {
  constructor() {
    this.repository = new EmpleoRepository()
  }

  async getAllAsync() {
    return await this.repository.getAllAsync()
  }

  async getByIdAsync(id) {
    const empleo = await this.repository.getByIdAsync(id)
    if (!empleo) throw { status: 404, message: `No se encontró el empleo con id ${id}` }
    return empleo
  }

  async getAllByClubAsync(idclub) {
    if (!idclub) throw { status: 400, message: 'El id del club es obligatorio' }
    return await this.repository.getAllByClubAsync(idclub)
  }

  async crearEmpleo(data, idusuario) {
    const {
      idclub,
      iddeporte,
      nombre,
      horasreq,
      habilidadesreq,
      acercaempleo,
      estado
    } = data || {}

    if (!idclub)    throw { status: 400, message: 'El club es obligatorio' }
    if (!iddeporte) throw { status: 400, message: 'El deporte es obligatorio' }
    if (!nombre)    throw { status: 400, message: 'El nombre de la vacante es obligatorio' }

    // Validar estrictamente que 'estado' sea booleano o las cadenas 'true'/'false' (por defecto activo)
    let estadoBool = true
    if (estado !== undefined && estado !== null) {
      if (typeof estado !== 'boolean') {
        const s = String(estado).toLowerCase()
        if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
        estadoBool = s === 'true'
      } else {
        estadoBool = estado
      }
    }

    const existe = await this.repository.existeEmpleo(idclub, iddeporte, nombre)
    if (existe) throw { status: 400, message: 'Ya existe una vacante con ese nombre para ese club y deporte' }

    const empleo = await this.repository.crearEmpleo(
      idclub,
      iddeporte,
      nombre,
      horasreq,
      habilidadesreq,
      acercaempleo,
      estadoBool
    )

    // Crear grupo de chat para el empleo (no interrumpe si falla)
    try {
      const idusuarioAdmin = idusuario ? Number(idusuario) : null
      
      // Obtener nombre del club usando supabase directamente
      // (no via this.repository.supabase, que no es una propiedad pública del repositorio)
      const { data: clubData } = await supabase
        .from('clubes')
        .select('nombre')
        .eq('idclub', Number(idclub))
        .single()
      const nombreClub = clubData?.nombre || 'Club'

      await chatRepository.crearConversacionRPC(
        'GRUPAL',
        `${nombreClub} - Empleo: ${nombre}`,
        null,
        null,
        null,
        empleo.idempleo,
        idusuarioAdmin ? [idusuarioAdmin] : [],
        idusuarioAdmin
      )
    } catch (errChat) {
      console.error('[empleo-service] Error creando grupo de chat para empleo:', errChat.message)
    }

    return empleo
  }

  async #verificarDuenio(id, usuario) {
    const duenio = await this.repository.getIdUsuarioDuenioAsync(id)
    if (duenio === undefined) throw { status: 404, message: 'Empleo no encontrado' }
    if (usuario?.es_admin !== true && Number(duenio) !== Number(usuario?.idusuario)) {
      throw { status: 403, message: 'No tienes permiso para modificar esta vacante' }
    }
  }

  async actualizarEmpleo(id, data, usuario) {
    await this.#verificarDuenio(id, usuario)
    const { iddeporte, nombre, horasreq, habilidadesreq, acercaempleo, estado } = data || {}
    const campos = {}

    if (nombre !== undefined) {
      if (!String(nombre).trim()) throw { status: 400, message: 'El nombre de la vacante es obligatorio' }
      campos.nombre = String(nombre).trim()
    }
    if (iddeporte !== undefined) {
      if (!Number(iddeporte)) throw { status: 400, message: 'El deporte es obligatorio' }
      campos.iddeporte = Number(iddeporte)
    }
    if (horasreq !== undefined) campos.horasreq = horasreq === '' ? null : horasreq
    if (habilidadesreq !== undefined) campos.habilidadesreq = habilidadesreq || null
    if (acercaempleo !== undefined) campos.acercaempleo = acercaempleo || null
    if (estado !== undefined) {
      const s = String(estado).toLowerCase()
      if (s !== 'true' && s !== 'false') throw { status: 400, message: 'El estado debe ser true o false' }
      campos.estado = s === 'true'
    }
    if (Object.keys(campos).length === 0) throw { status: 400, message: 'No hay campos para actualizar' }

    if (campos.nombre !== undefined || campos.iddeporte !== undefined) {
      const actual = await this.repository.getByIdAsync(id)
      const existe = await this.repository.existeOtroEmpleo(
        actual.idclub, campos.iddeporte ?? actual.iddeporte, campos.nombre ?? actual.nombre, id)
      if (existe) throw { status: 400, message: 'Ya existe una vacante con ese nombre para ese club y deporte' }
    }

    return await this.repository.actualizarEmpleoAsync(id, campos)
  }
}

export default EmpleoService
