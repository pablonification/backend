const express = require('express')
const multer = require('multer')
const { db } = require('../lib/supabase')
const { uploadFile, deleteFile, generateSignedUrl } = require('../lib/storage')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif').split(',')
    const fileExtension = file.originalname.split('.').pop().toLowerCase()
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error(`File type .${fileExtension} not allowed`), false)
    }
  }
})

// GET /api/modules - Get all modules
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, visibility } = req.query
    
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
      visibility
    }

    const { data: modules, error, pagination } = await db.getModules(options)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      data: modules,
      pagination
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

// POST /api/modules - Create new module (admin only)
router.post('/', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Module file is required',
        code: 'MISSING_FILE'
      })
    }

    const { title, description, visibility = 'public' } = req.body

    // Validate input
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Module title is required',
        code: 'MISSING_TITLE'
      })
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Module title must be less than 200 characters',
        code: 'TITLE_TOO_LONG'
      })
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Module description is required',
        code: 'MISSING_DESCRIPTION'
      })
    }

    if (description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Module description must be less than 1000 characters',
        code: 'DESCRIPTION_TOO_LONG'
      })
    }

    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be either "public" or "private"',
        code: 'INVALID_VISIBILITY'
      })
    }

    // Upload file to storage
    const uploadResult = await uploadFile('modules', req.file)
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload module file')
    }

    // Prepare module data
    const moduleData = {
      title: title.trim(),
      file_path: uploadResult.path,
      description: description.trim(),
      visibility: visibility,
      file_size: req.file.size,
      file_type: req.file.mimetype
    }

    // Save module info to database
    const { data: module, error } = await db.createModule(moduleData)
    
    if (error) {
      // Clean up uploaded file if database save fails
      await deleteFile('modules', uploadResult.path)
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: module
    })

  } catch (error) {
    console.error('Create module error:', error)
    next(error)
  }
})

// PUT /api/modules/:id - Update module (admin only)
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, visibility } = req.body

    // Validate input
    if (title && title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Module title must be less than 200 characters',
        code: 'TITLE_TOO_LONG'
      })
    }

    if (description && description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Module description must be less than 1000 characters',
        code: 'DESCRIPTION_TOO_LONG'
      })
    }

    if (visibility && !['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be either "public" or "private"',
        code: 'INVALID_VISIBILITY'
      })
    }

    const updateData = {}
    
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (visibility !== undefined) updateData.visibility = visibility

    const { data: module, error } = await db.updateModule(id, updateData)
    
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
      message: 'Module updated successfully',
      data: module
    })

  } catch (error) {
    console.error('Update module error:', error)
    next(error)
  }
})

// DELETE /api/modules/:id - Delete module (admin only)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get module info first
    const { data: module, error: getError } = await db.getModule(id)
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Module not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${getError.message}`)
    }

    // Delete from storage
    const deleteResult = await deleteFile('modules', module.file_path)
    
    if (!deleteResult.success) {
      console.warn('Failed to delete module file from storage:', module.file_path)
    }

    // Delete from database
    const { error: deleteError } = await db.deleteModule(id)
    
    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`)
    }

    res.json({
      success: true,
      message: 'Module deleted successfully'
    })

  } catch (error) {
    console.error('Delete module error:', error)
    next(error)
  }
})

// GET /api/modules/:id/download - Download module file
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get module info
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

    // Check visibility
    if (module.visibility === 'private') {
      const authHeader = req.headers['authorization']
      const token = authHeader && authHeader.split(' ')[1]
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for private modules',
          code: 'AUTH_REQUIRED'
        })
      }
    }

    // Generate signed URL for download
    const signedUrlResult = await generateSignedUrl('modules', module.file_path, 3600)
    
    if (!signedUrlResult.success) {
      throw new Error('Failed to generate download URL')
    }

    // Increment download count
    await db.incrementModuleDownloadCount(id)

    res.json({
      success: true,
      data: {
        download_url: signedUrlResult.url,
        expires_at: signedUrlResult.expiresAt
      }
    })

  } catch (error) {
    console.error('Download module error:', error)
    next(error)
  }
})

module.exports = router
