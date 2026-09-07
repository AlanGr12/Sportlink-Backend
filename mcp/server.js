import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const api = axios.create({
  baseURL: process.env.SPORTLINK_API_URL || 'http://localhost:3000/api',
});

const server = new Server(
  { name: "sportlink-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'buscar_pruebas',
        description: 'Busca convocatorias y pruebas de clubes según deporte, zona o categoría.',
        inputSchema: {
          type: 'object',
          properties: {
            deporte: { type: 'string' },
            zona: { type: 'string' },
            categoria: { type: 'string' }
          }
        }
      },
      {
        name: 'buscar_empleos',
        description: 'Busca ofertas de trabajo publicadas por clubes.',
        inputSchema: {
          type: 'object',
          properties: {
            deporte: { type: 'string' },
            nombre: { type: 'string' }
          }
        }
      },
      {
        name: 'buscar_entrenamientos',
        description: 'Busca entrenamientos disponibles.',
        inputSchema: {
          type: 'object',
          properties: {
            deporte: { type: 'string' },
            ubicacion: { type: 'string' },
            nivel: { type: 'string' }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let data;

  try {
    if (name === 'buscar_pruebas') {
      data = (await api.get('/pruebas', { params: args })).data;
    } else if (name === 'buscar_empleos') {
      data = (await api.get('/empleo', { params: args })).data;
    } else if (name === 'buscar_entrenamientos') {
      data = (await api.get('/entrenamientos', { params: args })).data;
    } else {
      throw new Error("Herramienta desconocida");
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error al ejecutar ${name}: ${error.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);