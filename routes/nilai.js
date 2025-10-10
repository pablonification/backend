const express = require('express')
const { db } = require('../lib/supabase')
const { storage } = require('../lib/storage')
const { compareFilePassword } = require('../lib/password')

const router = express.Router()

// GET /api/nilai - Get all grade files
router.get('/', async (req, res, next) => {
  try {
    const { data: files, error } = await db.getNilaiFiles()
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicFiles = files.map(file => ({
      id: file.id,
      class: file.class,
      cohort: file.cohort,
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
      has_password: file.has_password,
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
    const signedUrlResult = await storage.generateSignedUrl('nilai', file.storage_path, 3600)
    
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
    if (file.has_password) {
      return res.status(401).json({
        success: false,
        message: 'Password required for this grade file',
        code: 'PASSWORD_REQUIRED'
      })
    }

    // Generate signed URL for download
    const signedUrlResult = await storage.generateSignedUrl('nilai', file.storage_path, 3600)
    
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
    console.error('Download grade file error:', error)
    next(error)
  }
})

module.exports = router
