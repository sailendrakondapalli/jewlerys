import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { formatINR } from '../utils/format'
import toast from 'react-hot-toast'

const isVideo = (url) => url && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url)

export default function ProductCard({ product }) {
  const { user } = useAuthStore()
  const { addToCart, items } = useCartStore()
  const { toggleWishlist, isWishlisted } = useWishlistStore()
  const navigate = useNavigate()
  const wishlisted = isWishlisted(product.id)

  const inCart = items.some(i => i.product_id === product.id)

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (inCart) { navigate('/cart'); return }
    if (!user) { toast.error('Please login to add to cart'); return }
    try { await addToCart(product, user?.id); toast.success('Added to cart!') }
    catch (err) { toast.error(err.message || 'Failed to add to cart') }
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Please login to save to wishlist'); return }
    try {
      const added = await toggleWishlist(product, user?.id)
      toast.success(added ? 'Added to wishlist!' : 'Removed from wishlist')
    } catch (err) { toast.error(err.message || 'Failed to update wishlist') }
  }

  const media = product.images?.[0] || 'https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80'
  const mediaIsVideo = isVideo(media)

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
      className="group relative bg-white rounded-2xl overflow-hidden border border-[#E8E0D5] hover:border-[#C9956C]/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(27,43,94,0.12)]">
      <Link to={`/products/${product.id}`}>
        <div className="relative overflow-hidden aspect-square bg-[#FAF8F5]">
          {mediaIsVideo ? (
            <video
              src={media}
              muted
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <img src={media} alt={product.name} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80' }} />
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-[#1B2B5E] text-sm font-semibold bg-white px-3 py-1 rounded-full border border-[#1B2B5E]/20">Out of Stock</span>
            </div>
          )}
          {product.tags?.includes('bridal') && (
            <span className="absolute top-2 left-2 bg-[#1B2B5E] text-white text-xs px-2 py-0.5 rounded-full font-medium">Bridal</span>
          )}
          {product.tags?.includes('new') && !product.tags?.includes('bridal') && (
            <span className="absolute top-2 left-2 bg-[#C9956C] text-white text-xs px-2 py-0.5 rounded-full font-medium">New</span>
          )}
          {/* Wishlist button overlay */}
          <button onClick={handleWishlist}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all shadow-sm ${wishlisted ? 'bg-red-500 text-white' : 'bg-white text-[#4A4A6A] hover:text-red-500'}`}>
            <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="p-3">
          <p className="text-xs text-[#C9956C] mb-1 uppercase tracking-wider font-medium">{product.category}</p>
          <h3 className="text-[#1A1A2E] text-sm font-semibold line-clamp-2 mb-2 group-hover:text-[#1B2B5E] transition-colors">{product.name}</h3>
          <span className="text-[#1B2B5E] font-bold text-base">{formatINR(product.price)}</span>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button onClick={handleAddToCart} disabled={product.stock === 0}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            inCart
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-[#1B2B5E] hover:bg-[#2A3F7E] text-white'
          }`}>
          {inCart ? <><ArrowRight size={13} /> Go to Cart</> : <><ShoppingCart size={13} /> Add to Cart</>}
        </button>
      </div>
    </motion.div>
  )
}
