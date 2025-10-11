const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

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
  async getAnnouncements(limit = null) {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    return { data, error }
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
  async getFiles() {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
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

  // Modules
  async getModules() {
    const { data, error } = await supabase
      .from('praktikum_modules')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getModule(id) {
    const { data, error } = await supabase
      .from('praktikum_modules')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createModule(moduleData) {
    const { data, error } = await supabase
      .from('praktikum_modules')
      .insert(moduleData)
      .select()
      .single()
    return { data, error }
  },

  async updateModule(id, updates) {
    const { data, error } = await supabase
      .from('praktikum_modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteModule(id) {
    const { error } = await supabase
      .from('praktikum_modules')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Grade files
  async getNilaiFiles() {
    const { data, error } = await supabase
      .from('nilai_files')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
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

  // Search
  async searchContent(query) {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, published_at')
      .textSearch('title,content', query)
    return { data, error }
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
  }
}

// Storage helpers
const storage = {
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
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
  }
}

module.exports = {
  supabase,
  db,
  storage
}
