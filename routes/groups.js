const express = require('express')
const multer = require('multer')
const { db } = require('../lib/supabase')
const { uploadFile, generateSignedUrl, deleteFile } = require('../lib/storage')
const { hashFilePassword, compareFilePassword } = require('../lib/password')
const { authenticateToken, requireRole } = require('../middleware/auth')

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false)
    }
  }
})

/**
 * GET /api/groups - Get all group files
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, visibility, cohort } = req.query
    
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
      visibility,
      cohort
    }

    const { data: groups, error, pagination } = await db.getGroups(options)
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      storage_path: group.storage_path,
      cohort: group.cohort,
      visibility: group.visibility,
      has_password: group.has_password,
      file_size: group.file_size,
      file_type: group.file_type,
      download_count: group.download_count,
      created_at: group.created_at,
      updated_at: group.updated_at
    }))

    res.json({
      success: true,
      data: publicGroups,
      pagination
    })

  } catch (error) {
    console.error('Get groups error:', error)
    next(error)
  }
})

/**
 * GET /api/groups/:id - Get specific group file
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const { data: group, error } = await db.getGroup(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Group file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Remove sensitive information
    const publicGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      storage_path: group.storage_path,
      cohort: group.cohort,
      visibility: group.visibility,
      has_password: group.has_password,
      file_size: group.file_size,
      file_type: group.file_type,
      download_count: group.download_count,
      created_at: group.created_at,
      updated_at: group.updated_at
    }

    res.json({
      success: true,
      data: publicGroup
    })

  } catch (error) {
    console.error('Get group error:', error)
    next(error)
  }
})

/**
 * POST /api/groups - Create new group file
 */
router.post('/', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    const { name, description, cohort, visibility = 'public' } = req.body

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
        code: 'MISSING_NAME'
      })
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Group name must be less than 100 characters',
        code: 'NAME_TOO_LONG'
      })
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group description is required',
        code: 'MISSING_DESCRIPTION'
      })
    }

    if (description.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Group description must be less than 500 characters',
        code: 'DESCRIPTION_TOO_LONG'
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

    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be either "public" or "private"',
        code: 'INVALID_VISIBILITY'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Group file is required',
        code: 'MISSING_FILE'
      })
    }

    // Upload file to storage
    const uploadResult = await uploadFile('groups', req.file)
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload file')
    }

    // Prepare group data
    const groupData = {
      name: name.trim(),
      description: description.trim(),
      storage_path: uploadResult.path,
      cohort: cohort.trim(),
      visibility: visibility,
      file_size: req.file.size,
      file_type: req.file.mimetype
    }

    // Save group info to database
    const { data: group, error } = await db.createGroup(groupData)
    
    if (error) {
      // Clean up uploaded file if database save fails
      await deleteFile('groups', uploadResult.path)
      throw new Error(`Database error: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Group file created successfully',
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        storage_path: group.storage_path,
        cohort: group.cohort,
        visibility: group.visibility,
        has_password: group.has_password,
        file_size: group.file_size,
        file_type: group.file_type,
        download_count: group.download_count,
        created_at: group.created_at,
        updated_at: group.updated_at
      }
    })

  } catch (error) {
    console.error('Create group error:', error)
    next(error)
  }
})

/**
 * PUT /api/groups/:id - Update group file
 */
router.put('/:id', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, cohort, visibility } = req.body

    // Validate input
    if (name && name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Group name must be less than 100 characters',
        code: 'NAME_TOO_LONG'
      })
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Group description must be less than 500 characters',
        code: 'DESCRIPTION_TOO_LONG'
      })
    }

    if (cohort && cohort.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cohort must be less than 50 characters',
        code: 'COHORT_TOO_LONG'
      })
    }

    if (visibility && !['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: 'Visibility must be either "public" or "private"',
        code: 'INVALID_VISIBILITY'
      })
    }

    // Get existing group
    const { data: existingGroup, error: getError } = await db.getGroup(id)
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Group file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${getError.message}`)
    }

    // Prepare update data
    const updateData = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (cohort !== undefined) updateData.cohort = cohort.trim()
    if (visibility !== undefined) updateData.visibility = visibility
    
    // Handle file update if provided
    if (req.file) {
      // Upload new file
      const uploadResult = await uploadFile('groups', req.file)
      
      if (!uploadResult.success) {
        throw new Error('Failed to upload file')
      }
      
      updateData.storage_path = uploadResult.path
      updateData.file_size = req.file.size
      updateData.file_type = req.file.mimetype
    }

    // Update group in database
    const { data: group, error: updateError } = await db.updateGroup(id, updateData)
    
    if (updateError) {
      // Clean up uploaded file if database update fails
      if (req.file && uploadResult) {
        await deleteFile('groups', uploadResult.path)
      }
      throw new Error(`Database error: ${updateError.message}`)
    }

    // Clean up old file if new file was uploaded
    if (req.file && uploadResult && existingGroup.storage_path !== uploadResult.path) {
      await deleteFile('groups', existingGroup.storage_path)
    }

    res.json({
      success: true,
      message: 'Group file updated successfully',
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        storage_path: group.storage_path,
        cohort: group.cohort,
        visibility: group.visibility,
        has_password: group.has_password,
        file_size: group.file_size,
        file_type: group.file_type,
        download_count: group.download_count,
        created_at: group.created_at,
        updated_at: group.updated_at
      }
    })

  } catch (error) {
    console.error('Update group error:', error)
    next(error)
  }
})

/**
 * DELETE /api/groups/:id - Delete group file
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get group info first
    const { data: group, error: getError } = await db.getGroup(id)
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Group file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${getError.message}`)
    }

    // Delete file from storage
    const deleteResult = await deleteFile('groups', group.storage_path)
    
    if (!deleteResult.success) {
      console.warn('Failed to delete file from storage:', group.storage_path)
    }

    // Delete from database
    const { error: deleteError } = await db.deleteGroup(id)
    
    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`)
    }

    res.json({
      success: true,
      message: 'Group file deleted successfully'
    })

  } catch (error) {
    console.error('Delete group error:', error)
    next(error)
  }
})

/**
 * POST /api/groups/:id/verify-password - Verify group password
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

    // Get group info
    const { data: group, error } = await db.getGroup(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Group file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if group has password protection
    if (!group.has_password || !group.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Group file does not require password',
        code: 'NO_PASSWORD_REQUIRED'
      })
    }

    // Verify password
    const isValidPassword = await compareFilePassword(password, group.password_hash)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
        code: 'INVALID_PASSWORD'
      })
    }

    // Generate download token (valid for 1 hour)
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      { 
        groupId: group.id,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.json({
      success: true,
      message: 'Password verified successfully',
      data: {
        download_token: token,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Verify password error:', error)
    next(error)
  }
})

/**
 * GET /api/groups/:id/download - Download group file
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params
    const { token } = req.query

    // Get group info
    const { data: group, error } = await db.getGroup(id)
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Group file not found',
          code: 'NOT_FOUND'
        })
      }
      throw new Error(`Database error: ${error.message}`)
    }

    // Check if group requires password
    if (group.has_password && !token) {
      return res.status(401).json({
        success: false,
        message: 'Password required for this group file',
        code: 'PASSWORD_REQUIRED'
      })
    }

    // Verify token if password protected
    if (group.has_password && token) {
      try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        if (!decoded || decoded.groupId !== group.id || Date.now() - decoded.timestamp > 3600 * 1000) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired download token',
            code: 'INVALID_TOKEN'
          })
        }
      } catch (tokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid download token',
          code: 'INVALID_TOKEN'
        })
      }
    }

    // Generate signed URL
    const signedUrlResult = await generateSignedUrl('groups', group.storage_path, 3600)
    
    if (!signedUrlResult.success) {
      throw new Error('Failed to generate download URL')
    }

    // Increment download count
    await db.incrementGroupDownloadCount(id)

    res.json({
      success: true,
      data: {
        download_url: signedUrlResult.url,
        expires_at: signedUrlResult.expiresAt
      }
    })

  } catch (error) {
    console.error('Download group error:', error)
    next(error)
  }
})

module.exports = router