const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const sliderRoutes = require('./routes/sliders')
const announcementRoutes = require('./routes/announcements')
const fileRoutes = require('./routes/files')
const moduleRoutes = require('./routes/modules')
const nilaiRoutes = require('./routes/nilai')
const searchRoutes = require('./routes/search')
const groupRoutes = require('./routes/groups')
const contactRoutes = require('./routes/contact')
const proxyRoutes = require('./routes/proxy')

const errorHandler = require('./middleware/errorHandler')
const { authenticateToken } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 5001

// Security middleware
app.use(helmet())

// Rate limiting (more lenient for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: false,
  // Skip rate limiting for health check
  skip: (req) => {
    return req.path === '/health'
  }
})
app.use(limiter)

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/sliders', sliderRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/files', fileRoutes)
// Add debugging middleware
app.use((req, res, next) => {
  console.log(`DEBUG: ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api/proxy', proxyRoutes)
app.use('/api/modules', moduleRoutes)
app.use('/api/nilai', nilaiRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/contact', contactRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  })
})

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
