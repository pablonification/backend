const express = require('express')
const { db } = require('../lib/supabase')

const router = express.Router()

// GET /api/modules - Get all modules
router.get('/', async (req, res, next) => {
  try {
    const { data: modules, error } = await db.getModules()
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: modules,
      count: modules.length
    })

  } catch (error) {
    console.error('Get modules error:', error)
    next(error)
  }
})

// GET /api/modules/:id - Get module by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: module, error } = await db.getModule(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Module not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: module
    })

  } catch (error) {
    console.error('Get module error:', error)
    next(error)
  }
})

module.exports = router
