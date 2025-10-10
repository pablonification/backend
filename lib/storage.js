const { storage } = require('./supabase')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

/**
 * Upload a file to Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {File} file - File object
 * @param {string} folder - Optional folder path
 * @returns {Promise<object>} - Upload result
 */
const uploadFile = async (bucket, file, folder = '') => {
  try {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname)
    const fileName = `${uuidv4()}${fileExtension}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Upload file
    const { data, error } = await storage.uploadFile(bucket, filePath, file.buffer)
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    return {
      success: true,
      path: filePath,
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    }
  } catch (error) {
    console.error('File upload error:', error)
    throw new Error('Failed to upload file')
  }
}

/**
 * Generate a signed URL for file download
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<object>} - Signed URL result
 */
const generateSignedUrl = async (bucket, filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await storage.getSignedUrl(bucket, filePath, expiresIn)
    
    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`)
    }

    return {
      success: true,
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    }
  } catch (error) {
    console.error('Signed URL generation error:', error)
    throw new Error('Failed to generate download URL')
  }
}

/**
 * Delete a file from storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in storage
 * @returns {Promise<object>} - Delete result
 */
const deleteFile = async (bucket, filePath) => {
  try {
    const { data, error } = await storage.deleteFile(bucket, filePath)
    
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }

    return {
      success: true,
      message: 'File deleted successfully'
    }
  } catch (error) {
    console.error('File deletion error:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * Get public URL for a file
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in storage
 * @returns {object} - Public URL
 */
const getPublicUrl = (bucket, filePath) => {
  try {
    const { data } = storage.getPublicUrl(bucket, filePath)
    return {
      success: true,
      url: data.publicUrl
    }
  } catch (error) {
    console.error('Public URL generation error:', error)
    throw new Error('Failed to generate public URL')
  }
}

/**
 * Validate file type and size
 * @param {File} file - File object
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']
  } = options

  const result = {
    isValid: true,
    errors: []
  }

  // Check file size
  if (file.size > maxSize) {
    result.isValid = false
    result.errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    result.isValid = false
    result.errors.push('File type not allowed')
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase()
  if (!allowedExtensions.includes(fileExtension)) {
    result.isValid = false
    result.errors.push('File extension not allowed')
  }

  return result
}

/**
 * Get file info from storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - File path in storage
 * @returns {Promise<object>} - File info
 */
const getFileInfo = async (bucket, filePath) => {
  try {
    // This would require additional Supabase storage API calls
    // For now, return basic info
    return {
      success: true,
      path: filePath,
      bucket: bucket
    }
  } catch (error) {
    console.error('Get file info error:', error)
    throw new Error('Failed to get file info')
  }
}

/**
 * List files in a bucket folder
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path
 * @returns {Promise<object>} - File list
 */
const listFiles = async (bucket, folder = '') => {
  try {
    // This would require additional Supabase storage API calls
    // For now, return empty list
    return {
      success: true,
      files: []
    }
  } catch (error) {
    console.error('List files error:', error)
    throw new Error('Failed to list files')
  }
}

module.exports = {
  uploadFile,
  generateSignedUrl,
  deleteFile,
  getPublicUrl,
  validateFile,
  getFileInfo,
  listFiles
}
