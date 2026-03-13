import express from 'express'
import usersApp from '../services/users/app.js'
import reviewsApp from '../services/reviews/app.js'
import catalogApp from '../services/catalog/main.js'
import malApp from '../services/mal-integration/main.js'

const app = express()
app.use(express.json())

// CORS — permitir cualquier origen en desarrollo/producción (o configurar según necesidad)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Montar cada servicio bajo su prefijo
app.use('/api/users', usersApp)
app.use('/api/reviews', reviewsApp)
app.use('/api/catalog', catalogApp)
app.use('/api/mal', malApp)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor consolidado escuchando en puerto ${PORT}`)
})

export default app
