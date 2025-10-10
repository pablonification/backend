const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  } catch (error) {
    throw new Error('Failed to hash password')
  }
}

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if password matches
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword)
    return isMatch
  } catch (error) {
    throw new Error('Failed to compare password')
  }
}

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Random password
 */
const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
const validatePassword = (password) => {
  const result = {
    isValid: true,
    errors: []
  }

  if (!password) {
    result.isValid = false
    result.errors.push('Password is required')
    return result
  }

  if (password.length < 8) {
    result.isValid = false
    result.errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 128) {
    result.isValid = false
    result.errors.push('Password must be less than 128 characters long')
  }

  if (!/[a-z]/.test(password)) {
    result.isValid = false
    result.errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    result.isValid = false
    result.errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    result.isValid = false
    result.errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.isValid = false
    result.errors.push('Password must contain at least one special character')
  }

  return result
}

/**
 * Generate a secure random string for file passwords
 * @param {number} length - String length (default: 16)
 * @returns {string} - Random string
 */
const generateSecureString = (length = 16) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return result
}

/**
 * Hash a file password (for file protection)
 * @param {string} password - File password
 * @returns {Promise<string>} - Hashed password
 */
const hashFilePassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10) // Lower salt rounds for file passwords
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  } catch (error) {
    throw new Error('Failed to hash file password')
  }
}

/**
 * Compare a file password with its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if password matches
 */
const compareFilePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword)
    return isMatch
  } catch (error) {
    throw new Error('Failed to compare file password')
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generatePassword,
  validatePassword,
  generateSecureString,
  hashFilePassword,
  compareFilePassword
}
