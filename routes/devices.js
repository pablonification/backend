const express = require('express')
const jwt = require('jsonwebtoken')
const { db } = require('../lib/supabase')

const router = express.Router()

function extractTokenPayload(req) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) return null
  
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

router.post('/', async (req, res, next) => {
  try {
    const { push_token, platform } = req.body
    
    if (!push_token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
        code: 'MISSING_TOKEN'
      })
    }
    
    if (!platform || !['ios', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Platform must be ios or android',
        code: 'INVALID_PLATFORM'
      })
    }
    
    const decoded = extractTokenPayload(req)
    
    const tokenData = {
      push_token,
      platform,
      user_id: decoded?.userId || null,
      user_type: decoded?.role || null
    }
    
    const { data, error } = await db.upsertPushToken(tokenData)
    
    if (error) {
      console.error('Register push token error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to register device',
        code: 'REGISTER_FAILED'
      })
    }
    
    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: {
        id: data.id,
        push_token: data.push_token,
        platform: data.platform,
        user_id: data.user_id,
        user_type: data.user_type
      }
    })
    
  } catch (error) {
    console.error('Register device error:', error)
    next(error)
  }
})

router.delete('/:token', async (req, res, next) => {
  try {
    const { token } = req.params
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
        code: 'MISSING_TOKEN'
      })
    }
    
    const { error } = await db.deletePushToken(token)
    
    if (error) {
      console.error('Delete push token error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to unregister device',
        code: 'UNREGISTER_FAILED'
      })
    }
    
    res.json({
      success: true,
      message: 'Device unregistered successfully'
    })
    
  } catch (error) {
    console.error('Unregister device error:', error)
    next(error)
  }
})

module.exports = router
