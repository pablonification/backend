const express = require('express')
const { db } = require('../lib/supabase')

const router = express.Router()

// GET /api/search - Search content
router.get('/', async (req, res, next) => {
  try {
    const { q: query, type, page = 1, limit = 10 } = req.query

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
        code: 'INVALID_QUERY'
      })
    }

    // Parse pagination parameters
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    
    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        code: 'INVALID_PAGINATION'
      })
    }

    const options = {
      query: query.trim(),
      type,
      page: pageNum,
      limit: limitNum
    }

    const { data: results, error, pagination } = await db.searchContent(options)
    
    if (error) {
      throw new Error(`Search error: ${error.message}`)
    }

    res.json({
      success: true,
      data: results,
      pagination
    })

  } catch (error) {
    console.error('Search error:', error)
    next(error)
  }
})

module.exports = router
