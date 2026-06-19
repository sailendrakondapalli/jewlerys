import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, Zap, ChevronLeft, ChevronRight, Star, Tag, Ticket, Copy } from 'lucide-react'
import { fetchProductById, fetchProducts } from '../services/productService'
import { fetchActiveCodes, fetchUsedCodeIds } from '../services/promoService'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useRecentlyViewedStore } from '../store/recentlyViewedStore'
import { isVideoUrl } from '../services/storageService'
import { formatINR } from '../utils/format'
import ProductCard from '../components/ProductCard'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToCart } = useCartStore()
  const { toggleWishlist, isWishlisted } = useWishlistStore()
  const { addProduct } = useRecentlyViewedStore()

  const [product, setProduct] = useState(null)
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [promoCodes, setPromoCodes] = useState([])

  useEffect(() => {
    setLoading(true)
    setImgIdx(0)
    Promise.all([
      fetchProductById(id),
      fetchProducts(),
      fetchActiveCodes().catch(() => []),
      fetchUsedCodeIds(user?.id).catch(() => [])
    ]).then(([prod, all, codes, usedIds]) => {
      const finalProd = prod || all.find(p => p.custom_id === id) || null
      setProduct(finalProd)
      setAllProducts(all)
      if (finalProd) addProduct(finalProd)
      // Filter: match category, and hide one-time codes already used by this user
      setPromoCodes(codes.filter(c => {
        if (c.applicable_category && c.applicable_category !== finalProd?.category) return false
        if (c.is_one_time && usedIds.includes(c.id)) return false
        return true
      }))
      setLoading(false)
    })
  }, [id])

  const wishlisted = product ? isWishlisted(product.id) : false

  const handleAddToCart = async () => {
    if (!user) { toast.error('Please login to add to cart'); navigate('/login'); return }
    await addToCart(product, user.id)
    toast.success('Added to cart!')
  }

  const handleBuyNow = async () => {
    if (!user) { toast.error('Please login'); navigate('/login'); return }
    // Navigate to checkout with just this product — don't touch the cart
    navigate('/checkout', { state: { buyNow: { product, quantity: 1 } } })
  }

  const handleWishlist = async () => {
    if (!user) { toast.error('Please login'); navigate('/login'); return }
    const added = await toggleWishlist(product, user.id)
    toast.success(added ? 'Added to wishlist!' : 'Removed from wishlist')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-[#1A1A1A] rounded-xl" />
          <div className="space-y-4">
            <div className="h-6 bg-[#1A1A1A] rounded w-1/3" />
            <div className="h-8 bg-[#1A1A1A] rounded w-3/4" />
            <div className="h-10 bg-[#1A1A1A] rounded w-1/4" />
            <div className="h-24 bg-[#1A1A1A] rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-[#4A4A6A] text-lg">Product not found</p>
        <button onClick={() => navigate('/products')} className="mt-4 px-6 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm">
          Browse Products
        </button>
      </div>
    )
  }

  const images = product.images || []

  return (
    <>
      <Helmet>
        <title>{product.name} – NaShe Jewels</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={images[0]} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square bg-[#111] rounded-xl overflow-hidden mb-3">
              {isVideoUrl(images[imgIdx]) ? (
                <video
                  key={imgIdx}
                  src={images[imgIdx]}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <motion.img
                  key={imgIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={images[imgIdx] || 'https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=600&q=80'}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-[#D4AF37]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    {isVideoUrl(img) ? (
                      <video src={img} muted playsInline className="w-full h-full object-cover bg-black" />
                    ) : (
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"
                        onError={e => { if (e.target.src !== 'https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80') e.target.src = 'https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-[#C9956C] text-xs uppercase tracking-widest mb-2">{product.category}</p>
            <h1 className="text-3xl font-bold text-[#1A1A2E] mb-3" style={{ fontFamily: 'Georgia, serif' }}>{product.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-[#C9956C]">{Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</div>
              <span className="text-[#8A8AAA] text-xs">(24 reviews)</span>
            </div>
            <p className="text-3xl font-bold text-[#1B2B5E] mb-4">{formatINR(product.price)}</p>
            <p className="text-[#4A4A6A] text-sm leading-relaxed mb-6">{product.description}</p>

            <div className={`grid gap-3 mb-6 text-sm ${product.category === 'Bangles' && product.size ? 'grid-cols-1' : 'grid-cols-1'}`}>
              {/* Size — only for Bangles */}
              {product.category === 'Bangles' && product.size && (
                <div className="bg-[#F2EDE6] rounded-lg p-3">
                  <p className="text-[#8A8AAA] text-xs mb-2">Available Sizes</p>
                  <div className="flex flex-wrap gap-2">
                    {product.size.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-[#F2EDE6] rounded-lg p-3">
                  <p className="text-[#8A8AAA] text-xs mb-1">Stock</p>
                  <p className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
                  </p>
                </div>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag, i) => {
                  // Brand-tonal palette: navy, gold, terracotta — 3 tones each
                  const palettes = [
                    { bg: "bg-[#1B2B5E]/8",  border: "border-[#1B2B5E]/20", text: "text-[#1B2B5E]"  },
                    { bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/30", text: "text-[#A8870A]"  },
                    { bg: "bg-[#C9956C]/10", border: "border-[#C9956C]/30", text: "text-[#9E6B3F]"  },
                  ]
                  const p = palettes[i % palettes.length]
                  return (
                    <span key={tag} className={`flex items-center gap-1.5 px-4 py-1.5 ${p.bg} ${p.text} text-sm rounded-full border ${p.border} font-semibold tracking-wide`}>
                      <Tag size={11} /> {tag}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Promo Codes */}
            {promoCodes.length > 0 && (
              <div className="mb-5">
                <p className="text-[#1A1A2E] text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Ticket size={15} className="text-[#C9956C]" /> Available Offers
                </p>
                <div className="space-y-2">
                  {promoCodes.map(code => (
                    <div key={code.id} className="flex items-center justify-between bg-[#FFF8F0] border border-[#C9956C]/30 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-mono font-bold text-[#C9956C] bg-[#C9956C]/10 px-2 py-0.5 rounded text-sm flex-shrink-0">{code.code}</span>
                        <div className="min-w-0">
                          <p className="text-[#1A1A2E] text-xs font-medium truncate">
                            {code.discount_type === 'percentage' ? `${code.discount_value}% off` : `₹${code.discount_value} off`}
                            {code.min_order_amount > 0 && ` on orders above ₹${code.min_order_amount.toLocaleString('en-IN')}`}
                          </p>
                          {code.description && <p className="text-[#8A8AAA] text-xs truncate">{code.description}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(code.code); toast.success(`Code "${code.code}" copied!`) }}
                        className="flex items-center gap-1 text-xs text-[#C9956C] hover:text-[#b5824f] font-semibold flex-shrink-0 ml-2"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1B2B5E]/10 hover:bg-[#1B2B5E] text-[#1B2B5E] hover:text-white border border-[#1B2B5E]/40 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={18} /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1B2B5E] text-white rounded-xl font-semibold hover:bg-[#2A3F7E] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap size={18} /> Buy Now
              </button>
              <button
                onClick={handleWishlist}
                className={`p-3 rounded-xl border transition-all ${wishlisted ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-[#F2EDE6] border-[#E8E0D5] text-[#4A4A6A] hover:text-red-500'}`}
              >
                <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>

        {/* Related Products — same category, sorted by price ascending */}
        {(() => {
          const related = allProducts
            .filter(p => p.id !== product?.id && p.category === product?.category)
            .sort((a, b) => a.price - b.price)
          if (related.length === 0) return null
          return (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[#C9956C] text-xs uppercase tracking-widest mb-1">You May Also Like</p>
                  <h2 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: 'Georgia, serif' }}>More {product.category}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {related.slice(0, 12).map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )
        })()}
      </div>
    </>
  )
}
