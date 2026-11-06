import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import axios from 'axios';
import adjuntosRepository from '../repositories/adjuntos-repository.js';

const apiKey = (process.env.NVIDIA_API_KEY || '').trim();
if (!apiKey) throw new Error('Falta NVIDIA_API_KEY en el archivo .env');

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const MODEL_NAME = (process.env.NVIDIA_MODEL || 'mistralai/mistral-large-4-1t-a52b').trim();
const port = process.env.PORT || 3000;
const api = axios.create({ baseURL: process.env.SPORTLINK_API_URL || `http://127.0.0.1:${port}/api` });

// Máximo de eventos (tarjetas) que se devuelven por respuesta y de resultados que ve el modelo por búsqueda
const MAX_EVENTOS = 5;
const MAX_RESULTADOS_TOOL = 15;

const systemPrompt = () => `Hoy es ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })}. Sos el asistente de SportLink, la red profesional del deporte en Argentina (jugadores, entrenadores y clubes).

Herramientas: si preguntan por pruebas, empleos o entrenamientos, usá siempre las herramientas antes de responder. Nunca inventes eventos, fechas ni datos que no vengan de las herramientas. Si la fecha de cierre de inscripción o la fecha del evento ya pasó, aclaralo y no lo presentes como abierto.

Formato de la respuesta (muy importante):
- Texto plano. Prohibido usar markdown: nada de asteriscos, numerales, guiones bajos, tablas ni negritas.
- Prohibido usar emojis.
- Respondé en español rioplatense (vos), breve y profesional. Como máximo 3 o 4 oraciones cortas.
- No repitas todos los datos de cada evento: la app ya muestra una tarjeta con el detalle de cada evento que marques.

Marcas de eventos: cada vez que recomiendes o menciones un evento concreto que vino de las herramientas, agregá su marca exacta al final de la respuesta, una por evento, con el formato [[prueba:ID]], [[entrenamiento:ID]] o [[empleo:ID]] usando el campo "marca" del resultado. Marcá como máximo ${MAX_EVENTOS} eventos, los más relevantes. Si no hay resultados, decilo y sugerí ajustar la búsqueda, sin marcas.`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'buscar_pruebas',
      description: 'Busca convocatorias y pruebas de clubes según deporte, zona o categoría.',
      parameters: {
        type: 'object',
        properties: {
          deporte: { type: 'string', description: 'Nombre del deporte' },
          zona: { type: 'string', description: 'Zona geográfica' },
          categoria: { type: 'string', description: 'Categoría de edad' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'buscar_empleos',
      description: 'Busca ofertas de trabajo publicadas por clubes.',
      parameters: {
        type: 'object',
        properties: {
          deporte: { type: 'string', description: 'Deporte' },
          nombre: { type: 'string', description: 'Puesto' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'buscar_entrenamientos',
      description: 'Busca entrenamientos disponibles.',
      parameters: {
        type: 'object',
        properties: {
          deporte: { type: 'string', description: 'Deporte' },
          ubicacion: { type: 'string', description: 'Ubicación' },
          nivel: { type: 'string', description: 'Nivel exigido' }
        }
      }
    }
  }
];

// Resumen compacto de cada resultado: menos tokens para el modelo y la "marca" lista para copiar
const RESUMIR = {
  buscar_pruebas: (p) => ({
    marca: `[[prueba:${p.idprueba}]]`,
    club: p.club?.nombre,
    deporte: p.deporte?.deporte,
    categoria: p.categoria,
    genero: p.genero,
    zona: p.zona,
    fecha: p.fechaprueba,
    horario: [p.horainicio, p.horafin].filter(Boolean).join(' a '),
    cierreInscripcion: p.fechacierre,
    cupo: p.cupo,
    descripcion: p.descripcion,
  }),
  buscar_entrenamientos: (e) => ({
    marca: `[[entrenamiento:${e.identrenamientos}]]`,
    titulo: e.titulo,
    deporte: e.deportes?.deporte,
    entrenador: [e.entrenadores?.nombre, e.entrenadores?.apellido].filter(Boolean).join(' '),
    ubicacion: e.ubicacion,
    fecha: e.fechaentr,
    horario: [e.horainicio, e.horafin].filter(Boolean).join(' a '),
    nivel: e.nivel,
    genero: e.genero,
    precio: e.precio,
    descripcion: e.descripcion,
  }),
  buscar_empleos: (e) => ({
    marca: `[[empleo:${e.idempleo}]]`,
    puesto: e.nombre,
    club: e.club?.nombre,
    horario: e.horasreq,
    requisitos: e.habilidadesreq,
    descripcion: e.acercaempleo,
  }),
};

async function executeTool(name, args) {
  try {
    let data;
    if (name === 'buscar_pruebas') data = (await api.get('/pruebas', { params: args })).data;
    else if (name === 'buscar_empleos') data = (await api.get('/empleo', { params: args })).data;
    else if (name === 'buscar_entrenamientos') data = (await api.get('/entrenamientos', { params: args })).data;
    else return { error: 'Herramienta desconocida.' };

    if (!Array.isArray(data)) return data;
    // Solo los activos (estado false = cerrado/dado de baja)
    const activos = data.filter((x) => x?.estado !== false);
    return {
      total: activos.length,
      resultados: activos.slice(0, MAX_RESULTADOS_TOOL).map(RESUMIR[name]),
    };
  } catch (error) {
    return { error: `Fallo local: ${error.message}` };
  }
}

// ── Limpieza de la respuesta ──
const RE_MARCA = /\[\[\s*(prueba|entrenamiento|empleo)\s*:\s*(\d+)\s*\]\]/gi;

function extraerMarcas(texto) {
  const vistas = new Set();
  const marcas = [];
  for (const [, tipo, id] of texto.matchAll(RE_MARCA)) {
    const clave = `${tipo.toUpperCase()}:${id}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    marcas.push({ tipo: tipo.toUpperCase(), id: Number(id) });
  }
  return marcas.slice(0, MAX_EVENTOS);
}

// Por si el modelo igual manda markdown o emojis: se quitan antes de devolver el texto
function limpiarTexto(texto) {
  return texto
    .replace(RE_MARCA, '')
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️⃣]/gu, '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/gm, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[*+•]\s+/gm, '- ')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/\*/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function resolverEventos(marcas) {
  const eventos = await Promise.all(
    marcas.map(({ tipo, id }) => adjuntosRepository.getAsync(tipo, id).catch(() => null))
  );
  // Sin datos internos del dueño
  return eventos.filter(Boolean).map(({ idusuarioDuenio, ...ev }) => ev);
}

export async function procesarMensajeAgente(mensajeUsuario, historialPrevio = []) {
  const messages = [
    { role: 'system', content: systemPrompt() },
    ...historialPrevio,
    { role: 'user', content: mensajeUsuario },
  ];

  const pedir = () => openai.chat.completions.create({
    model: MODEL_NAME,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.3,
    top_p: 1,
    max_tokens: 2048,
  });

  let response = await pedir();
  let message = response.choices[0].message;

  while (message.tool_calls && message.tool_calls.length > 0) {
    messages.push(message);

    for (const toolCall of message.tool_calls) {
      let args = {};
      try {
        args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : (toolCall.function.arguments || {});
      } catch (parseError) {
        console.warn('Error al parsear argumentos de tool:', parseError.message);
        args = {};
      }

      const output = await executeTool(toolCall.function.name, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(output),
      });
    }

    response = await pedir();
    message = response.choices[0].message;
  }

  // El modelo razona antes de responder: a veces vuelve sin texto. Se reintenta una vez.
  if (!message.content?.trim()) {
    response = await pedir();
    message = response.choices[0].message;
  }

  const crudo = message.content || '';
  const eventos = await resolverEventos(extraerMarcas(crudo));
  const texto = limpiarTexto(crudo) || (eventos.length ? 'Te dejo lo que encontré:' : 'Disculpá, no pude generar una respuesta en este momento.');

  return {
    texto,
    eventos,
    historial: messages.filter(m => m.role !== 'system'),
  };
}
