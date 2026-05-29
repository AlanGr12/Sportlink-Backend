import 'dotenv/config'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import express from 'express'
import cors from 'cors'
import JugadoresController from './controllers/jugadores-controller.js'
import EntrenadoresController from './controllers/entrenadores-controller.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Rutas
app.use('/api/jugadores', JugadoresController)
app.use('/api/entrenadores', EntrenadoresController)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
