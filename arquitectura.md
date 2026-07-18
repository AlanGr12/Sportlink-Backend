# Análisis de la Arquitectura Backend - Sportlink

Este documento describe la arquitectura y las tecnologías utilizadas en el backend del proyecto **Sportlink**.

## 1. Tecnologías Principales

- **Entorno de ejecución:** Node.js
- **Framework Web:** Express.js
- **Base de Datos / BaaS:** Supabase (PostgreSQL) interactuando a través del cliente `@supabase/supabase-js`.
- **Manejo de variables de entorno:** `dotenv`
- **Manejo de archivos:** `multer` (aunque también se observa configuración para aceptar imágenes en base64 de hasta 10mb).
- **CORS:** `cors` para permitir peticiones desde el frontend.

## 2. Patrón de Arquitectura

El proyecto sigue un patrón de **Arquitectura en Capas (Layered Architecture)**, lo que promueve la separación de responsabilidades, facilita el mantenimiento y la escalabilidad del código. 

La estructura de carpetas dentro de `src` refleja claramente estas capas:

### `server.js` (Punto de entrada)
Es el archivo principal que inicializa la aplicación Express. Se encarga de:
- Configurar middlewares (CORS, parseo de JSON y URL-encoded con límites extendidos).
- Registrar todas las rutas principales apuntando a sus respectivos **Controladores** (ej. `/api/jugadores`, `/api/login`).
- Iniciar el servidor en el puerto especificado.

### `controllers/` (Capa de Presentación / Enrutamiento)
Los controladores son responsables de manejar las peticiones HTTP (req, res).
- Reciben los datos del cliente (body, params, query).
- Llaman a los métodos correspondientes en la capa de **Servicios**.
- Formatean y envían la respuesta HTTP al cliente (usando `http-status-codes` para los códigos de estado).
- Atrapan errores y envían respuestas de error adecuadas.

### `services/` (Capa de Lógica de Negocio)
Los servicios contienen la lógica central de la aplicación.
- Orquestan las operaciones necesarias para cumplir con un caso de uso (por ejemplo, el login verifica las credenciales y luego busca el perfil completo del usuario).
- Aplican reglas de negocio y validaciones.
- Sirven de puente entre los Controladores y los Repositorios.

### `repositories/` (Capa de Acceso a Datos)
Los repositorios abstraen la comunicación con la base de datos (en este caso, Supabase).
- Contienen las consultas específicas (queries) utilizando el cliente de Supabase (ej. `.from('usuarios').select('*')`).
- Retornan los datos crudos al Servicio, ocultando los detalles de implementación de la base de datos al resto de la aplicación.
- Si en el futuro se cambiara Supabase por un ORM como Prisma o TypeORM, solo esta capa necesitaría modificaciones sustanciales.

### `entities/` (Capa de Dominio)
Contiene las clases o modelos de datos que representan los objetos del negocio (ej. `usuario.js`). Ayudan a estructurar la información que fluye entre las capas.

### `configs/` (Configuraciones)
Almacena archivos de configuración globales.
- `supabase-config.js`: Inicializa y exporta la instancia del cliente de Supabase utilizando las variables de entorno (`SUPABASE_URL` y `SUPABASE_KEY`).

## 3. Flujo de una Petición Típica

1. **Cliente (Frontend):** Envía una petición HTTP (ej. `POST /api/login`).
2. **Server:** `server.js` intercepta la ruta y la dirige al `UsuariosController`.
3. **Controlador:** Extrae `email` y `contraseña` del `req.body` y llama a `UsuariosService.loginAsync(email, contraseña)`.
4. **Servicio:** Ejecuta la lógica de login. Llama a `UsuariosRepository.getByEmailAsync(email)` para buscar al usuario.
5. **Repositorio:** Realiza la consulta a Supabase y devuelve los datos del usuario al Servicio.
6. **Servicio:** Verifica la contraseña. Si es correcta, pide al Repositorio datos adicionales (el perfil) y construye el objeto de respuesta final.
7. **Controlador:** Recibe el objeto construido por el servicio y responde con un `200 OK` y los datos en formato JSON. Si algo falla, el servicio lanza un error que el controlador atrapa (catch) para devolver un `404` o `500`.

## 4. Ventajas de esta arquitectura
- **Modularidad:** Cada archivo tiene un propósito único (Single Responsibility Principle).
- **Testabilidad:** Es fácil crear pruebas unitarias (mocks) para los servicios sin depender de la base de datos real, o para los controladores sin depender de la lógica de negocio.
- **Escalabilidad:** Se pueden agregar nuevas funcionalidades creando nuevos controladores, servicios y repositorios sin afectar los existentes.
