const express = require('express')
const router = express.Router()

// Proxy route for modules - forwards to actual modules route
router.use('/api/modules', (req, res, next) => {
  console.log('DEBUG: Proxy route hit for modules, forwarding to actual modules route')
  // Remove /api/proxy prefix and forward to actual modules route
  req.url = req.url.replace('/api/proxy', '')
  next()
}, require('./modules'))

module.exports = router