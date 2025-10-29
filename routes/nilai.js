const express = require('express')
const multer = require('multer')
const { db } = require('../lib/supabase')
const { uploadFile, deleteFile, generateSignedUrl } = require('../lib/storage')
const { compareFilePassword, hashFilePassword } = require('../lib/password')
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

// GET /api/nilai - Get all grade files
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, cohort } = req.query
    
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
      cohort
    }

    const { data: files, error, pagination } = await db.getNilaiFiles(options)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicFiles = files.map(file => ({
      id: file.id,
      class: file.class,
      cohort: file.cohort,
      storage_path: file.storage_path,
      has_password: file.has_password,
      file_size: file.file_size,
      file_type: file.file_type,
      download_count: file.download_count,
      created_at: file.created_at,
      updated_at: file.updated_at
    }))

    res.json({
      success: true,
      data: publicFiles,
      pagination
    })

  } catch (error) {
    console.error('Get grade files error:', error)
    next(error)
  }
})

// GET /api/nilai/:id - Get grade file info
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: file, error } = await db.getNilaiFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Grade file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicFile = {
      id: file.id,
      class: file.class,
      cohort: file.cohort,
      storage_path: file.storage_path,
      has_password: file.has_password,
      file_size: file.file_size,
      file_type: file.file_type,
      download_count: file.download_count,
      created_at: file.created_at,
      updated_at: file.updated_at
    }

    res.json({
      success: true,
      data: publicFile
    })

  } catch (error) {
    console.error('Get grade file error:', error)
    next(error)
  }
})

// POST /api/nilai - Create new grade file (admin only)
router.post('/', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Grade file is required',
        code: 'MISSING_FILE'
      })
    }

    const { class: className, cohort, password } = req.body

    // Validate input
    if (!className || className.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Class name is required',
        code: 'MISSING_CLASS'
      })
    }

    if (className.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Class name must be less than 50 characters',
        code: 'CLASS_TOO_LONG'
      })
    }

    if (!cohort || cohort.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cohort is required',
        code: 'MISSING_COHORT'
      })
    }

    if (cohort.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cohort must be less than 50 characters',
        code: 'COHORT_TOO_LONG'
      })
    }

    // Upload file to storage
    const uploadResult = await uploadFile('nilai', req.file)
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload grade file')
    }

    // Prepare grade file data
    const fileData = {
      class: className.trim(),
      cohort: cohort.trim(),
      storage_path: uploadResult.path,
      file_size: req.file.size,
      file_type: req.file.mimetype
    }

    // Add password protection if provided
    if (password && password.trim()) {
      const hashedPassword = await hashFilePassword(password.trim())
      fileData.password_hash = hashedPassword
      fileData.has_password = true
    }

    // Save grade file info to database
    const { data: file, error } = await db.createNilaiFile(fileData)
    
    if (error) {
      // Clean up uploaded file if database save fails
      await deleteFile('nilai', uploadResult.path)
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Grade file created successfully',
      data: file
    })

  } catch (error) {
    console.error('Create grade file error:', error)
    next(error)
  }
})

// PUT /api/nilai/:id - Update grade file (admin only)
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { class: className, cohort, password } = req.body

    // Validate input
    if (className && className.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Class name must be less than 50 characters',
        code: 'CLASS_TOO_LONG'
      })
    }

    if (cohort && cohort.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cohort must be less than 50 characters',
        code: 'COHORT_TOO_LONG'
      })
    }

    const updateData = {}
    
    if (className !== undefined) updateData.class = className.trim()
    if (cohort !== undefined) updateData.cohort = cohort.trim()
    
    // Add or update password protection if provided
    if (password !== undefined) {
      if (password && password.trim()) {
        const hashedPassword = await hashFilePassword(password.trim())
        updateData.password_hash = hashedPassword
        updateData.has_password = true
      } else {
        updateData.password_hash = null
        updateData.has_password = false
      }
    }

    const { data: file, error } = await db.updateNilaiFile(id, updateData)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Grade file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    res.json({
      success: true,
      message: 'Grade file updated successfully',
      data: file
    })

  } catch (error) {
    console.error('Update grade file error:', error)
    next(error)
  }
})

// DELETE /api/nilai/:id - Delete grade file (admin only)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get grade file info first
    const { data: file, error: getError } = await db.getNilaiFile(id)
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Grade file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${getError.message}`)
    }

    // Delete from storage
    const deleteResult = await deleteFile('nilai', file.storage_path)
    
    if (!deleteResult.success) {
      console.warn('Failed to delete grade file from storage:', file.storage_path)
    }

    // Delete from database
    const { error: deleteError } = await db.deleteNilaiFile(id)
    
    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`)
    }

    res.json({
      success: true,
      message: 'Grade file deleted successfully'
    })

  } catch (error) {
    console.error('Delete grade file error:', error)
    next(error)
  }
})

// POST /api/nilai/:id/verify-password - Verify grade file password
router.post('/:id/verify-password', async (req, res, next) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
        code: 'MISSING_PASSWORD'
      })
    }

    // Get file info
    const { data: file, error } = await db.getNilaiFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Grade file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if file has password protection
    if (!file.has_password || !file.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Grade file does not require password',
        code: 'NO_PASSWORD_REQUIRED'
      })
    }

    // Verify password
    const isValidPassword = await compareFilePassword(password, file.password_hash)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
        code: 'INVALID_PASSWORD'
      })
    }

    // Generate signed URL for download
    const signedUrlResult = await generateSignedUrl('nilai', file.storage_path, 3600)
    
    if (!signedUrlResult.success) {
      throw new Error('Failed to generate download URL')
    }

    res.json({
      success: true,
      message: 'Password verified successfully',
      data: {
        download_url: signedUrlResult.url,
        expires_at: signedUrlResult.expiresAt
      }
    })

  } catch (error) {
    console.error('Verify grade file password error:', error)
    next(error)
  }
})

// GET /api/nilai/:id/download - Download grade file
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params
    const { token } = req.query

    // Get file info
    const { data: file, error } = await db.getNilaiFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Grade file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if file requires password
    if (file.has_password && !token) {
      return res.status(401).json({
        success: false,
        message: 'Password required for this grade file',
        code: 'PASSWORD_REQUIRED'
      })
    }

    // Generate signed URL for download
    const signedUrlResult = await generateSignedUrl('nilai', file.storage_path, 3600)
    
    if (!signedUrlResult.success) {
      throw new Error('Failed to generate download URL')
    }

    // Increment download count
    await db.incrementNilaiDownloadCount(id)

    res.json({
      success: true,
      data: {
        download_url: signedUrlResult.url,
        expires_at: signedUrlResult.expiresAt
      }
    })

  } catch (error) {
    console.error('Download grade file error:', error)
    next(error)
  }
})

module.exports = router
