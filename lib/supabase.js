const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database helpers
const db = {
  // Sliders
  async getSliders() {
    const { data, error } = await supabase
      .from('sliders')
      .select('*')
      .order('order_index', { ascending: true })
    return { data, error }
  },

  async createSlider(sliderData) {
    const { data, error } = await supabase
      .from('sliders')
      .insert(sliderData)
      .select()
      .single()
    return { data, error }
  },

  async updateSlider(id, updates) {
    const { data, error } = await supabase
      .from('sliders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteSlider(id) {
    const { error } = await supabase
      .from('sliders')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Announcements
  async getAnnouncements(options = {}) {
    const { page = 1, limit = 10, search, is_important } = options
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
    
    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }
    
    if (is_important !== undefined) {
      query = query.eq('is_important', is_important)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    return { 
      data, 
      error, 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  async getAnnouncement(id) {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createAnnouncement(announcementData) {
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcementData)
      .select()
      .single()
    return { data, error }
  },

  async updateAnnouncement(id, updates) {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteAnnouncement(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Files
  async getFiles(options = {}) {
    const { page = 1, limit = 10, search, visibility } = options
    let query = supabase
      .from('files')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (visibility) {
      query = query.eq('visibility', visibility)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    return { 
      data, 
      error, 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  async getFile(id) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createFile(fileData) {
    const { data, error } = await supabase
      .from('files')
      .insert(fileData)
      .select()
      .single()
    return { data, error }
  },

  async updateFile(id, updates) {
    const { data, error } = await supabase
      .from('files')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteFile(id) {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
    return { error }
  },

  async incrementFileDownloadCount(id) {
    const { data, error } = await supabase.rpc('increment_file_download_count', { file_id: id })
    return { data, error }
  },

  // Modules
  async getModules(options = {}) {
    const { page = 1, limit = 10, search, visibility } = options
    let query = supabase
      .from('modules')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (visibility) {
      query = query.eq('visibility', visibility)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    return { 
      data, 
      error, 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  async getModule(id) {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createModule(moduleData) {
    const { data, error } = await supabase
      .from('modules')
      .insert(moduleData)
      .select()
      .single()
    return { data, error }
  },

  async updateModule(id, updates) {
    const { data, error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteModule(id) {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id)
    return { error }
  },

  async incrementModuleDownloadCount(id) {
    const { data, error } = await supabase.rpc('increment_module_download_count', { module_id: id })
    return { data, error }
  },

  // Grade files
  async getNilaiFiles(options = {}) {
    const { page = 1, limit = 10, search, cohort } = options
    let query = supabase
      .from('nilai_files')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (search) {
      query = query.or(`class.ilike.%${search}%,cohort.ilike.%${search}%`)
    }
    
    if (cohort) {
      query = query.eq('cohort', cohort)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    return { 
      data, 
      error, 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  async getNilaiFile(id) {
    const { data, error } = await supabase
      .from('nilai_files')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createNilaiFile(fileData) {
    const { data, error } = await supabase
      .from('nilai_files')
      .insert(fileData)
      .select()
      .single()
    return { data, error }
  },

  async updateNilaiFile(id, updates) {
    const { data, error } = await supabase
      .from('nilai_files')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteNilaiFile(id) {
    const { error } = await supabase
      .from('nilai_files')
      .delete()
      .eq('id', id)
    return { error }
  },

  async incrementNilaiDownloadCount(id) {
    const { data, error } = await supabase.rpc('increment_nilai_download_count', { nilai_id: id })
    return { data, error }
  },

  // Search
  async searchContent(options = {}) {
    const { query, type, page = 1, limit = 10 } = options
    const results = []
    
    // Search announcements
    if (!type || type === 'announcement') {
      let announcementQuery = supabase
        .from('announcements')
        .select('id, title, content, published_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .limit(limit)
      
      const { data: announcements, error: announcementError } = await announcementQuery
      if (!announcementError && announcements) {
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
    }
    
    // Search modules
    if (!type || type === 'module') {
      let moduleQuery = supabase
        .from('modules')
        .select('id, title, description, created_at')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      const { data: modules, error: moduleError } = await moduleQuery
      if (!moduleError && modules) {
        modules.forEach(module => {
          results.push({
            id: module.id,
            type: 'module',
            title: module.title,
            excerpt: module.description || '',
            url: `/praktikum#modul${module.id}`,
            created_at: module.created_at
          })
        })
      }
    }
    
    // Search files
    if (!type || type === 'file') {
      let fileQuery = supabase
        .from('files')
        .select('id, name, description, created_at')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      const { data: files, error: fileError } = await fileQuery
      if (!fileError && files) {
        files.forEach(file => {
          results.push({
            id: file.id,
            type: 'file',
            title: file.name,
            excerpt: file.description || '',
            url: `/files/${file.id}`,
            created_at: file.created_at
          })
        })
      }
    }
    
    // Search nilai files
    if (!type || type === 'nilai') {
      let nilaiQuery = supabase
        .from('nilai_files')
        .select('id, class, cohort, created_at')
        .or(`class.ilike.%${query}%,cohort.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      const { data: nilaiFiles, error: nilaiError } = await nilaiQuery
      if (!nilaiError && nilaiFiles) {
        nilaiFiles.forEach(nilaiFile => {
          results.push({
            id: nilaiFile.id,
            type: 'nilai',
            title: `${nilaiFile.class} - ${nilaiFile.cohort}`,
            excerpt: `Grade file for class ${nilaiFile.class}, cohort ${nilaiFile.cohort}`,
            url: `/nilai/${nilaiFile.id}`,
            created_at: nilaiFile.created_at
          })
        })
      }
    }
    
    // Sort by relevance and date
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase())
      const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase())
      
      if (aTitleMatch && !bTitleMatch) return -1
      if (!aTitleMatch && bTitleMatch) return 1
      
      return new Date(b.created_at) - new Date(a.created_at)
    })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    const paginatedResults = results.slice(from, to + 1)
    
    return { 
      data: paginatedResults, 
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit)
      }
    }
  },

  // Admin users
  async getAdmin(id) {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, full_name, role')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async getAdminByEmail(email) {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()
    return { data, error }
  },

  // Groups
  async getGroups(options = {}) {
    const { page = 1, limit = 10, search, visibility, cohort } = options
    let query = supabase
      .from('groups')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    if (visibility) {
      query = query.eq('visibility', visibility)
    }
    
    if (cohort) {
      query = query.eq('cohort', cohort)
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    return {
      data,
      error,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  async getGroup(id) {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createGroup(groupData) {
    const { data, error } = await supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single()
    return { data, error }
  },

  async updateGroup(id, updates) {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteGroup(id) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
    return { error }
  },

  async incrementGroupDownloadCount(id) {
    const { data, error } = await supabase.rpc('increment_group_download_count', { group_id: id })
    return { data, error }
  }
}

// Storage helpers
const storage = {
  async uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options)
    return { data, error }
  },

  async downloadFile(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)
    return { data, error }
  },

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    return { data, error }
  },

  async deleteFile(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path])
    return { data, error }
  },

  async getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data
  },

  async createBucket(bucketName) {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return { data: null, error: listError }
    }
    
    const bucketExists = buckets && buckets.some(bucket => bucket.name === bucketName)
    
    if (bucketExists) {
      return { data: { name: bucketName, exists: true }, error: null }
    }
    
    // Create bucket without MIME type restrictions to allow all file types
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 52428800 // 50MB
      // Omitting allowedMimeTypes allows all MIME types
    })
    
    return { data, error }
  },

  async bucketExists(bucketName) {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return { exists: false, error }
    }
    
    const exists = buckets && buckets.some(bucket => bucket.name === bucketName)
    return { exists, error: null }
  }
}

module.exports = {
  supabase,
  db,
  storage
}
