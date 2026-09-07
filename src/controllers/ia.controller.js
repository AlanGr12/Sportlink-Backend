import { procesarMensajeAgente } from '../services/ia.service.js';

export async function chatAgente(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'El cuerpo de la petición no puede estar vacío.' });
    }

    const { mensaje, historial } = req.body;

    if (!mensaje || typeof mensaje !== 'string' || mensaje.trim() === '') {
      return res.status(400).json({ error: 'El campo "mensaje" es obligatorio y debe ser texto.' });
    }

    const { texto, historial: historialActualizado } = await procesarMensajeAgente(mensaje.trim(), historial || []);
    
    return res.json({ respuesta: texto, historial: historialActualizado });
  } catch (error) {
    console.error('Error en chatAgente:', error);
    return res.status(500).json({ error: 'Error al procesar la solicitud con IA.', detalles: error.message });
  }
}
