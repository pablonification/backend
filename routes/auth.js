const express = require('express')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const { db, storage } = require('../lib/supabase')
const { hashPassword, comparePassword, validatePassword } = require('../lib/password')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

/**
 * POST /api/auth/login
 * Admin login endpoint
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    }

    // Get admin user from database
    const { data: admin, error } = await db.getAdminByEmail(email)
    
    if (error || !admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Verify password using bcrypt
    const isValidPassword = await comparePassword(password, admin.password_hash)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin.id,
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role
        },
        token: token
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    next(error)
  }
})

/**
 * POST /api/auth/logout
 * Admin logout endpoint
 */
router.post('/logout', (req, res) => {
  // Since we're using JWT, logout is handled client-side
  // by removing the token from storage
  res.json({
    success: true,
    message: 'Logout successful'
  })
})

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user info from database
    const { data: user, error } = await db.getAdmin(decoded.userId)
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      }
    })

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
    }

    console.error('Get user error:', error)
    next(error)
  }
})

/**
 * POST /api/auth/change-password
 * Change admin password
 */
router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user info
    const { data: user, error } = await db.getAdmin(decoded.userId)
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      })
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash)
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      })
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword)
    
    // Update password in database
    const { error: updateError } = await supabase
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id)
    
    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`)
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    next(error)
  }
})

// ============================================
// STUDENT AUTH ENDPOINTS
// ============================================

/**
 * POST /api/auth/student/register
 * Student registration endpoint
 */
router.post('/student/register', async (req, res, next) => {
  try {
    const { email, password, full_name, nim, cohort, faculty } = req.body

    // Validate required fields
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required',
        code: 'MISSING_FIELDS'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      })
    }

    // Check if email already exists
    const { data: existingStudent } = await db.getStudentByEmail(email)
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        code: 'EMAIL_EXISTS'
      })
    }

    // Hash password
    const password_hash = await hashPassword(password)

    // Create student
    const { data: student, error } = await db.createStudent({
      email,
      password_hash,
      full_name,
      nim: nim || null,
      cohort: cohort || null,
      faculty: faculty || null
    })

    if (error) {
      console.error('Create student error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to create account',
        code: 'CREATE_FAILED'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: student.id,
        email: student.email,
        role: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: student.id,
          email: student.email,
          full_name: student.full_name,
          nim: student.nim,
          cohort: student.cohort,
          faculty: student.faculty,
          avatar_url: student.avatar_url,
        },
        token: token
      }
    })

  } catch (error) {
    console.error('Student registration error:', error)
    next(error)
  }
})

/**
 * POST /api/auth/student/login
 * Student login endpoint
 */
router.post('/student/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    }

    // Get student from database
    const { data: student, error } = await db.getStudentByEmail(email)

    if (error || !student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Verify password using bcrypt
    const isValidPassword = await comparePassword(password, student.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: student.id,
        email: student.email,
        role: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: student.id,
          email: student.email,
          full_name: student.full_name,
          nim: student.nim,
          cohort: student.cohort,
          faculty: student.faculty,
          avatar_url: student.avatar_url,
        },
        token: token
      }
    })

  } catch (error) {
    console.error('Student login error:', error)
    next(error)
  }
})

/**
 * GET /api/auth/student/me
 * Get current student info
 */
router.get('/student/me', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Check if this is a student token
    if (decoded.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student token required.',
        code: 'INVALID_ROLE'
      })
    }

    // Get student info from database
    const { data: student, error } = await db.getStudent(decoded.userId)

    if (error || !student) {
      return res.status(401).json({
        success: false,
        message: 'Student not found',
        code: 'USER_NOT_FOUND'
      })
    }

    res.json({
      success: true,
      data: {
        id: student.id,
        email: student.email,
        full_name: student.full_name,
        nim: student.nim,
        cohort: student.cohort,
        faculty: student.faculty,
        avatar_url: student.avatar_url,
      }
    })

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
    }

    console.error('Get student error:', error)
    next(error)
  }
})

router.put('/student/profile', upload.single('avatar'), async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        })
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }

    if (decoded.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for students only',
        code: 'ADMIN_NOT_ALLOWED'
      })
    }

    const { data: studentCheck } = await db.getStudent(decoded.userId)
    if (!studentCheck) {
      return res.status(403).json({
        success: false,
        message: 'Student not found',
        code: 'NOT_A_STUDENT'
      })
    }

    const { full_name, nim, cohort, faculty } = req.body
    const updates = {}

    if (full_name) updates.full_name = full_name
    if (nim !== undefined) updates.nim = nim || null
    if (cohort !== undefined) updates.cohort = cohort || null
    if (faculty !== undefined) updates.faculty = faculty || null

    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop()
      const fileName = `${decoded.userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      console.log('Uploading avatar:', { filePath, size: req.file.size, type: req.file.mimetype })

      const { error: uploadError } = await storage.uploadFile(
        'students',
        filePath,
        req.file.buffer,
        { contentType: req.file.mimetype, upsert: true }
      )

      if (uploadError) {
        console.error('Avatar upload error:', uploadError)
        return res.status(500).json({
          success: false,
          message: `Failed to upload avatar: ${uploadError.message || 'Unknown error'}`,
          code: 'UPLOAD_FAILED'
        })
      }

      const publicUrl = await storage.getPublicUrl('students', filePath)
      console.log('Avatar public URL:', publicUrl)
      updates.avatar_url = publicUrl.publicUrl
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        code: 'NO_UPDATES'
      })
    }

    updates.updated_at = new Date().toISOString()

    const { data: student, error } = await db.updateStudent(decoded.userId, updates)

    if (error) {
      console.error('Update student error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_FAILED'
      })
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: student.id,
          email: student.email,
          full_name: student.full_name,
          nim: student.nim,
          cohort: student.cohort,
          faculty: student.faculty,
          avatar_url: student.avatar_url,
          role: 'student'
        }
      }
    })

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
    }

    console.error('Update profile error:', error)
    next(error)
  }
})

module.exports = router
