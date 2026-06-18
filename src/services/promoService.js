import { supabase } from '../lib/supabase'

// Fetch all active promo codes (for product page display)
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

// Validate a promo code for a given user and cart total + category
export async function validatePromoCode({ code, userId, cartTotal, cartCategories = [] }) {
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !promo) return { valid: false, message: 'Invalid or expired promo code' }

  // Check expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, message: 'This promo code has expired' }
  }

  // Check minimum order amount
  if (promo.min_order_amount && cartTotal < promo.min_order_amount) {
    return { valid: false, message: `Minimum order of ₹${promo.min_order_amount.toLocaleString('en-IN')} required` }
  }

  // Check category condition
  if (promo.applicable_category) {
    const matches = cartCategories.some(c =>
      c.toLowerCase() === promo.applicable_category.toLowerCase()
    )
    if (!matches) {
      return { valid: false, message: `This code is only valid for ${promo.applicable_category} products` }
    }
  }

  // Check one-time use
  if (promo.is_one_time && userId) {
    const { data: existing } = await supabase
      .from('promo_code_uses')
      .select('id')
      .eq('code_id', promo.id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return { valid: false, message: 'You have already used this promo code' }
    }
  }

  // Calculate discount
  let discountAmount = 0
  if (promo.discount_type === 'percentage') {
    discountAmount = Math.floor((cartTotal * promo.discount_value) / 100)
  } else {
    discountAmount = Math.min(promo.discount_value, cartTotal)
  }

  return { valid: true, promo, discountAmount }
}

// Record usage after order placed
export async function recordPromoUse({ codeId, userId, orderId }) {
  const { error } = await supabase.from('promo_code_uses').insert({
    code_id: codeId,
    user_id: userId,
    order_id: orderId,
  })
  if (error) console.error('Failed to record promo use:', error.message)
}

// Admin: create code
export async function createPromoCode(data) {
  const { error, data: created } = await supabase
    .from('promo_codes')
    .insert({ ...data, code: data.code.toUpperCase().trim() })
    .select()
    .single()
  if (error) throw error
  return created
}

// Admin: update code
export async function updatePromoCode(id, data) {
  const { error } = await supabase.from('promo_codes').update(data).eq('id', id)
  if (error) throw error
}

// Admin: delete code
export async function deletePromoCode(id) {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) throw error
}
