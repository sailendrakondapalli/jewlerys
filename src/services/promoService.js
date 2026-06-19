import { supabase } from '../lib/supabase'

// Fetch all active codes
export async function fetchActiveCodes() {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Fetch ALL codes (admin)
export async function fetchAllCodes() {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*, promo_code_uses(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Get code IDs already used by this user
export async function fetchUsedCodeIds(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('promo_code_uses')
    .select('code_id')
    .eq('user_id', userId)
  if (error) return []
  return (data || []).map(r => r.code_id)
}

/**
 * Calculate item-level discount for a promo code against cart items.
 * Discount applies ONLY to product cost. Shipping is NEVER touched.
 *
 * @param {object} promo  - promo_codes row
 * @param {Array}  items  - cart items: [{ products: { price, category }, quantity }]
 * @returns {number} discountAmount in ₹ (integer)
 */
export function calcItemDiscount(promo, items) {
  // Determine which items qualify
  const qualifyingItems = items.filter(item => {
    // Category filter
    if (promo.applicable_category) {
      if ((item.products?.category || '').toLowerCase() !== promo.applicable_category.toLowerCase()) return false
    }
    // If no category filter but has min_order_amount, treat it as a per-item min price threshold
    // i.e. only items individually priced >= min_order_amount qualify for the discount
    if (!promo.applicable_category && promo.min_order_amount) {
      if ((item.products?.price || 0) < promo.min_order_amount) return false
    }
    return true
  })

  if (qualifyingItems.length === 0) return 0

  // Sum only qualifying items' product cost
  const qualifyingSubtotal = qualifyingItems.reduce(
    (s, item) => s + (item.products?.price || 0) * item.quantity, 0
  )

  if (promo.discount_type === 'percentage') {
    return Math.floor((qualifyingSubtotal * promo.discount_value) / 100)
  } else {
    // Flat — cap at qualifying subtotal so we never discount more than the products cost
    return Math.min(promo.discount_value, qualifyingSubtotal)
  }
}

/**
 * Check if a promo code's conditions are met (without network call).
 * Used to enable/disable codes in the UI.
 * Returns { eligible: bool, reason: string | null }
 */
export function checkEligibility(promo, { cartSubtotal, cartCategories, usedIds }) {
  // Expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { eligible: false, reason: 'Expired' }
  }
  // One-time already used
  if (promo.is_one_time && usedIds.includes(promo.id)) {
    return { eligible: false, reason: 'Already used' }
  }
  // Min order (on product subtotal only)
  if (promo.min_order_amount && cartSubtotal < promo.min_order_amount) {
    return { eligible: false, reason: `Min order ₹${promo.min_order_amount.toLocaleString('en-IN')} required` }
  }
  // Category
  if (promo.applicable_category) {
    const match = cartCategories.some(c => c.toLowerCase() === promo.applicable_category.toLowerCase())
    if (!match) return { eligible: false, reason: `Only for ${promo.applicable_category}` }
  }
  return { eligible: true, reason: null }
}

/**
 * Full server-side validation before order placement (authoritative check).
 * Discount is calculated on product subtotal only — shipping excluded.
 */
export async function validatePromoCode({ code, userId, cartSubtotal, cartItems = [], cartCategories = [] }) {
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !promo) return { valid: false, message: 'Invalid or expired promo code' }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, message: 'This promo code has expired' }
  }
  if (promo.min_order_amount && cartSubtotal < promo.min_order_amount) {
    return { valid: false, message: `Minimum order of ₹${promo.min_order_amount.toLocaleString('en-IN')} required` }
  }
  if (promo.applicable_category) {
    const matches = cartCategories.some(c => c.toLowerCase() === promo.applicable_category.toLowerCase())
    if (!matches) return { valid: false, message: `This code is only valid for ${promo.applicable_category} products` }
  }
  if (promo.is_one_time && userId) {
    const { data: existing } = await supabase
      .from('promo_code_uses')
      .select('id')
      .eq('code_id', promo.id)
      .eq('user_id', userId)
      .single()
    if (existing) return { valid: false, message: 'You have already used this promo code' }
  }

  const discountAmount = calcItemDiscount(promo, cartItems)
  return { valid: true, promo, discountAmount }
}

// Record usage after order placed
export async function recordPromoUse({ codeId, userId, orderId }) {
  const { error } = await supabase.from('promo_code_uses').insert({
    code_id: codeId, user_id: userId, order_id: orderId,
  })
  if (error) console.error('Failed to record promo use:', error.message)
}

// Admin CRUD
export async function createPromoCode(data) {
  const { error, data: created } = await supabase
    .from('promo_codes')
    .insert({ ...data, code: data.code.toUpperCase().trim() })
    .select().single()
  if (error) throw error
  return created
}
export async function updatePromoCode(id, data) {
  const { error } = await supabase.from('promo_codes').update(data).eq('id', id)
  if (error) throw error
}
export async function deletePromoCode(id) {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) throw error
}
