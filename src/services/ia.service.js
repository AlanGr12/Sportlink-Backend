import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';
import axios from 'axios';

const apiKey = (process.env.NVIDIA_API_KEY || '').trim();
if (!apiKey) throw new Error('Falta NVIDIA_API_KEY en el archivo .env');

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const MODEL_NAME = 'z-ai/glm-5.3';
const port = process.env.PORT || 3000;
const api = axios.create({ baseURL: process.env.SPORTLINK_API_URL || `http://127.0.0.1:${port}/api` });

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

async function executeTool(name, args) {
  try {
    if (name === 'buscar_pruebas') return (await api.get('/pruebas', { params: args })).data;
    if (name === 'buscar_empleos') return (await api.get('/empleo', { params: args })).data;
    if (name === 'buscar_entrenamientos') return (await api.get('/entrenamientos', { params: args })).data;
    return { error: `Herramienta desconocida.` };
  } catch (error) {
    return { error: `Fallo local: ${error.message}` };
  }
}

export async function procesarMensajeAgente(mensajeUsuario, historialPrevio = []) {
  const messages = [
    { role: 'system', content: 'Sos el asistente de SportLink. Si preguntan por pruebas, empleos o entrenamientos, usá siempre las herramientas. Respondé en español, breve y profesional.' },
    ...historialPrevio,
    { role: 'user', content: mensajeUsuario },
  ];

  let response = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.5,
    top_p: 1,
    max_tokens: 1024,
  });

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

    response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.5,
      top_p: 1,
      max_tokens: 1024,
    });
    message = response.choices[0].message;
  }

  return {
    texto: message.content || 'Disculpá, no pude generar una respuesta en este momento.',
    historial: messages.filter(m => m.role !== 'system'),
  };
}
