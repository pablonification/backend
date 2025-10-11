const express = require('express')
const { db } = require('../lib/supabase')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// GET /api/sliders - Get all sliders
router.get('/', async (req, res, next) => {
  try {
    const { data: sliders, error } = await db.getSliders()
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: sliders,
      count: sliders.length
    })

  } catch (error) {
    console.error('Get sliders error:', error)
    next(error)
  }
})

// POST /api/sliders - Create slider
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, image_path, alt_text, order_index } = req.body

    if (!title || !image_path) {
      return res.status(400).json({
        success: false,
        message: 'Title and image_path are required',
        code: 'MISSING_FIELDS'
      })
    }

    const sliderData = {
      title,
      image_path,
      alt_text: alt_text || '',
      order_index: order_index || 0
    }

    const { data: slider, error } = await db.createSlider(sliderData)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: slider
    })

  } catch (error) {
    console.error('Create slider error:', error)
    next(error)
  }
})

// PUT /api/sliders/:id - Update slider
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, image_path, alt_text, order_index } = req.body

    const updateData = {
      title,
      image_path,
      alt_text,
      order_index
    }

    const { data: slider, error } = await db.updateSlider(id, updateData)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Slider not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Slider updated successfully',
      data: slider
    })

  } catch (error) {
    console.error('Update slider error:', error)
    next(error)
  }
})

// DELETE /api/sliders/:id - Delete slider
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const { error } = await db.deleteSlider(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Slider not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Slider deleted successfully'
    })

  } catch (error) {
    console.error('Delete slider error:', error)
    next(error)
  }
})

module.exports = router
