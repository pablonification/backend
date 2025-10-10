const express = require('express')
const multer = require('multer')
const { db } = require('../lib/supabase')
const { storage } = require('../lib/storage')
const { hashFilePassword, compareFilePassword, generateSecureString } = require('../lib/password')
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

/**
 * GET /api/files
 * Get all files (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const { data: files, error } = await db.getFiles()
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      description: file.description,
      has_password: file.has_password,
      created_at: file.created_at,
      updated_at: file.updated_at
    }))

    res.json({
      success: true,
      data: publicFiles,
      count: publicFiles.length
    })

  } catch (error) {
    console.error('Get files error:', error)
    next(error)
  }
})

/**
 * GET /api/files/:id
 * Get file info by ID (public)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: file, error } = await db.getFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicFile = {
      id: file.id,
      name: file.name,
      description: file.description,
      has_password: file.has_password,
      created_at: file.created_at,
      updated_at: file.updated_at
    }

    res.json({
      success: true,
      data: publicFile
    })

  } catch (error) {
    console.error('Get file error:', error)
    next(error)
  }
})

/**
 * POST /api/files
 * Upload new file (admin only)
 */
router.post('/', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
        code: 'MISSING_FILE'
      })
    }

    const { description, visibility = 'public', password } = req.body

    // Upload file to storage
    const uploadResult = await storage.uploadFile('files', req.file, '')
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload file')
    }

    // Prepare file data
    const fileData = {
      name: req.file.originalname,
      storage_path: uploadResult.path,
      description: description || '',
      visibility: visibility,
      created_by: req.user.id
    }

    // Add password protection if provided
    if (password && password.trim()) {
      const hashedPassword = await hashFilePassword(password.trim())
      fileData.password_hash = hashedPassword
      fileData.has_password = true
    }

    // Save file info to database
    const { data: file, error } = await db.createFile(fileData)
    
    if (error) {
      // Clean up uploaded file if database save fails
      await storage.deleteFile('files', uploadResult.path)
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: file.id,
        name: file.name,
        description: file.description,
        has_password: file.has_password,
        created_at: file.created_at
      }
    })

  } catch (error) {
    console.error('Upload file error:', error)
    next(error)
  }
})

/**
 * POST /api/files/:id/verify-password
 * Verify file password and get download URL
 */
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
    const { data: file, error } = await db.getFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if file has password protection
    if (!file.has_password || !file.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'File does not require password',
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
    const signedUrlResult = await storage.generateSignedUrl('files', file.storage_path, 3600) // 1 hour
    
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
    console.error('Verify password error:', error)
    next(error)
  }
})

/**
 * GET /api/files/:id/download
 * Download file (public for non-password protected files)
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params

    // Get file info
    const { data: file, error } = await db.getFile(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if file requires password
    if (file.has_password) {
      return res.status(401).json({
        success: false,
        message: 'Password required for this file',
        code: 'PASSWORD_REQUIRED'
      })
    }

    // Generate signed URL for download
    const signedUrlResult = await storage.generateSignedUrl('files', file.storage_path, 3600)
    
    if (!signedUrlResult.success) {
      throw new Error('Failed to generate download URL')
    }

    res.json({
      success: true,
      data: {
        download_url: signedUrlResult.url,
        expires_at: signedUrlResult.expiresAt
      }
    })

  } catch (error) {
    console.error('Download file error:', error)
    next(error)
  }
})

/**
 * DELETE /api/files/:id
 * Delete file (admin only)
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get file info first
    const { data: file, error: getError } = await db.getFile(id)
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${getError.message}`)
    }

    // Delete from storage
    const deleteResult = await storage.deleteFile('files', file.storage_path)
    
    if (!deleteResult.success) {
      console.warn('Failed to delete file from storage:', file.storage_path)
    }

    // Delete from database
    const { error: deleteError } = await db.deleteFile(id)
    
    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`)
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete file error:', error)
    next(error)
  }
})

module.exports = router
