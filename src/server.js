import 'dotenv/config'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import express from 'express'
import cors from 'cors'
import JugadoresController from './controllers/jugadores-controller.js'
import EntrenadoresController from './controllers/entrenadores-controller.js'
import UsuariosController from './controllers/usuarios-controller.js'
import ClubesController from './controllers/clubes-controller.js'
import PruebasController from './controllers/pruebas-controller.js'
import EntrenamientosController from './controllers/entrenamientos-controller.js'
import InscripcionesEntrenamientosController from './controllers/inscripcionesentrenamientos-controller.js'
import InscripcionesPruebaController from './controllers/inscripcionesprueba-controller.js'
import CalendarioEventosController from './controllers/calendarioeventos-controller.js'
import EmpleoController from './controllers/empleo-controller.js'
import InscripcionesEmpleoController from './controllers/inscripcionesempleo-controller.js'
import EntrevistasController from './controllers/entrevistas-controller.js'
import chatRoutes from './routes/chat-routes.js'
import publicacionesRoutes from './routes/publicaciones-routes.js'
import comentariosRoutes from './routes/comentarios-routes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Rutas
app.use('/api/jugadores', JugadoresController)
app.use('/api/entrenadores', EntrenadoresController)
app.use('/api/login', UsuariosController)
app.use('/api/clubes', ClubesController)
app.use('/api/pruebas',PruebasController)
app.use('/api/entrenamientos', EntrenamientosController)
app.use('/api/inscripcionesentrenamientos', InscripcionesEntrenamientosController)
app.use('/api/inscripcionesprueba', InscripcionesPruebaController)
app.use('/api/calendario', CalendarioEventosController)
app.use('/api/empleo', EmpleoController)
app.use('/api/inscripcionesempleo', InscripcionesEmpleoController)
app.use('/api/entrevistas', EntrevistasController)
app.use('/api/conversaciones', chatRoutes)
app.use('/api/publicaciones', publicacionesRoutes)
app.use('/api/comentarios', comentariosRoutes)
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
