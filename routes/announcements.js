const express = require('express')
const { db } = require('../lib/supabase')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

/**
 * GET /api/announcements
 * Get all announcements (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, is_important } = req.query
    
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
      page: pageNum,
      limit: limitNum,
      search,
      is_important: is_important === 'true' ? true : is_important === 'false' ? false : undefined
    }

    const { data: announcements, error, pagination } = await db.getAnnouncements(options)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: announcements,
      pagination
    })

  } catch (error) {
    console.error('Get announcements error:', error)
    next(error)
  }
})

/**
 * GET /api/announcements/:id
 * Get announcement by ID (public)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: announcement, error } = await db.getAnnouncement(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: announcement
    })

  } catch (error) {
    console.error('Get announcement error:', error)
    next(error)
  }
})

/**
 * POST /api/announcements
 * Create new announcement (admin only)
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, content, attachments = [], is_important = false } = req.body

    // Validate input
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
        code: 'MISSING_FIELDS'
      })
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be less than 200 characters',
        code: 'TITLE_TOO_LONG'
      })
    }

    if (content.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Content must be less than 10,000 characters',
        code: 'CONTENT_TOO_LONG'
      })
    }

    // Validate attachments array
    if (!Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'Attachments must be an array',
        code: 'INVALID_ATTACHMENTS'
      })
    }

    const announcementData = {
      title,
      content,
      attachments,
      is_important,
      published_at: new Date().toISOString()
    }

    const { data: announcement, error } = await db.createAnnouncement(announcementData)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    })

  } catch (error) {
    console.error('Create announcement error:', error)
    next(error)
  }
})

/**
 * PUT /api/announcements/:id
 * Update announcement (admin only)
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, content, attachments, is_important } = req.body

    // Validate input
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
        code: 'MISSING_FIELDS'
      })
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be less than 200 characters',
        code: 'TITLE_TOO_LONG'
      })
    }

    if (content.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Content must be less than 10,000 characters',
        code: 'CONTENT_TOO_LONG'
      })
    }

    // Validate attachments array if provided
    if (attachments !== undefined && !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'Attachments must be an array',
        code: 'INVALID_ATTACHMENTS'
      })
    }

    const updateData = {
      title,
      content,
      attachments,
      is_important
    }

    const { data: announcement, error } = await db.updateAnnouncement(id, updateData)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    })

  } catch (error) {
    console.error('Update announcement error:', error)
    next(error)
  }
})

/**
 * DELETE /api/announcements/:id
 * Delete announcement (admin only)
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const { error } = await db.deleteAnnouncement(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    })

  } catch (error) {
    console.error('Delete announcement error:', error)
    next(error)
  }
})

module.exports = router
