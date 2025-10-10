const express = require('express')
const { db } = require('../lib/supabase')

const router = express.Router()

// GET /api/search - Search content
router.get('/', async (req, res, next) => {
  try {
    const { q: query, type } = req.query

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
        code: 'INVALID_QUERY'
      })
    }

    // Search announcements
    const { data: announcements, error: announcementError } = await db.searchContent(query)
    
    if (announcementError) {
      console.warn('Search announcements error:', announcementError)
    }

    // Format search results
    const results = []
    
    if (announcements && announcements.length > 0) {
      announcements.forEach(announcement => {
        results.push({
          id: announcement.id,
          type: 'announcement',
          title: announcement.title,
          excerpt: announcement.content.substring(0, 200) + '...',
          url: `/pengumuman/${announcement.id}`,
          created_at: announcement.published_at
        })
      })
    }

    // Add modules search (if needed)
    if (!type || type === 'all' || type === 'modules') {
      const { data: modules, error: moduleError } = await db.getModules()
      
      if (!moduleError && modules) {
        const filteredModules = modules.filter(module => 
          module.title.toLowerCase().includes(query.toLowerCase()) ||
          (module.description && module.description.toLowerCase().includes(query.toLowerCase()))
        )
        
        filteredModules.forEach(module => {
          results.push({
            id: module.id,
            type: 'module',
            title: module.title,
            excerpt: module.description || '',
            url: `/praktikum`,
            created_at: module.created_at
          })
        })
      }
    }

    // Sort by relevance (simple implementation)
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase())
      const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase())
      
      if (aTitleMatch && !bTitleMatch) return -1
      if (!aTitleMatch && bTitleMatch) return 1
      
      return new Date(b.created_at) - new Date(a.created_at)
    })

    res.json({
      success: true,
      data: {
        query: query,
        results: results,
        count: results.length,
        types: {
          announcements: results.filter(r => r.type === 'announcement').length,
          modules: results.filter(r => r.type === 'module').length
        }
      }
    })

  } catch (error) {
    console.error('Search error:', error)
    next(error)
  }
})

module.exports = router
