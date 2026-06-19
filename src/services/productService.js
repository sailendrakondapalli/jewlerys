import { supabase } from '../lib/supabase'

// Try Supabase first, NO mock fallback — return empty array if DB fails
export async function fetchProducts(filters = {}) {
  try {
    let query = supabase.from('products').select('*')
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,custom_id.ilike.%${filters.search}%`)
    }
    if (filters.sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false })
    else if (filters.category) query = query.order('price', { ascending: true })
    else query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) { console.error('fetchProducts error:', error.message); return [] }
    return data || []
  } catch (e) {
    console.error('fetchProducts failed:', e.message)
    return []
  }
}

export async function fetchProductById(id) {
  try {
    // Try by UUID first, then by custom_id
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (!error && data) return data
    // Try custom_id lookup
    const { data: byCode } = await supabase.from('products').select('*').eq('custom_id', id).single()
    return byCode || null
  } catch {
    return null
  }
}

