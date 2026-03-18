import express from 'express'
import usersApp, { ensureUsersTable } from '../services/users/app.js'
import reviewsApp, { ensureReviewsTable } from '../services/reviews/app.js'
import catalogApp, { ensureAnimesTable } from '../services/catalog/app.js'
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
  return next()
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

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Initialize database tables before mounting apps and starting the server
(async () => {
  try {
    await ensureUsersTable()
    await ensureAnimesTable()
    await ensureReviewsTable()

    app.listen(PORT, () => {
      console.log(`Servidor consolidado escuchando en puerto ${PORT}`)
    })
  } catch (err) {
    console.error('Error initializing database tables:', err)
    process.exit(1)
  }
})()

export default app
