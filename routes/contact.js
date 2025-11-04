const express = require('express')
const rateLimit = require('express-rate-limit')
const { db } = require('../lib/supabase')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// Specific rate limiter for contact form submissions
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
})

// POST /api/contact - Public: submit a contact message
router.post('/', contactLimiter, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body || {}

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        code: 'VALIDATION_ERROR'
      })
    }

    if (String(message).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Message is too short',
        code: 'VALIDATION_ERROR'
      })
    }

    const { data, error } = await db.createContactMessage({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: 'new'
    })

    if (error) {
      throw error
    }

    return res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

// GET /api/contact - Admin only: list messages
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query

    const { data, error, pagination } = await db.getContactMessages({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status
    })

    if (error) {
      throw error
    }

    res.json({ success: true, data, pagination })
  } catch (error) {
    next(error)
  }
})

module.exports = router
