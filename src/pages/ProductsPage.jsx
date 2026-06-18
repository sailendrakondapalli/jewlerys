import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchProducts } from '../services/productService'
import { getSetting } from '../services/settingsService'
import { useCategoryStore } from '../store/categoryStore'
import ProductCard from '../components/ProductCard'
import SkeletonCard from '../components/SkeletonCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

const PAGE_SIZE_OPTIONS = [8, 12, 24, 48]
const DEFAULT_PAGE_SIZE = 12

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const { categories, loadCategories } = useCategoryStore()

  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'newest'

  // Load admin-configured per-page setting and categories
  useEffect(() => {
    getSetting('products_per_page').then(val => {
      const n = parseInt(val)
      if (n && PAGE_SIZE_OPTIONS.includes(n)) setPageSize(n)
    }).catch(() => {})
    loadCategories()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [category, search, sort, pageSize])

  // If search exactly matches a category name, treat it as a category filter
  const matchedCategory = categories.find(c => c.toLowerCase() === search.toLowerCase())

  useEffect(() => {
    if (matchedCategory && !category) {
      const params = new URLSearchParams(searchParams)
      params.set('category', matchedCategory)
      params.delete('search')
      setSearchParams(params, { replace: true })
      return
    }
    setLoading(true)
    fetchProducts({ category, search, sort }).then(data => {
      setProducts(data)
      setLoading(false)
    })
  }, [category, search, sort])

  const setFilter = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    setSearchParams(params)
  }

  const clearFilters = () => setSearchParams({})
  const hasFilters = category || search

  // Pagination
  const totalPages = Math.ceil(products.length / pageSize)
  const pagedProducts = products.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <Helmet>
        <title>{category ? `${category} – NaShe Jewels` : 'All Jewelry – NaShe Jewels'}</title>
        <meta name="description" content={`Shop ${category || 'all'} jewelry at NaShe Jewels. Premium handcrafted Indian jewelry.`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            {category || 'All Jewelry'}
          </h1>
          {search && <p className="text-[#4A4A6A] text-sm">Search results for: <span className="text-[#C9956C] font-medium">"{search}"</span></p>}
          <p className="text-[#8A8AAA] text-sm mt-1">{loading ? '...' : `${products.length} pieces`}</p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('category', '')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!category ? 'bg-[#1B2B5E] text-white' : 'bg-white text-[#4A4A6A] hover:text-[#1B2B5E] border border-[#E8E0D5]'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter('category', cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat || search.toLowerCase() === cat.toLowerCase()
                    ? 'bg-[#1B2B5E] text-white'
                    : 'bg-white text-[#4A4A6A] hover:text-[#1B2B5E] border border-[#E8E0D5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[#8A8AAA] hover:text-red-500 transition-colors">
                <X size={12} /> Clear
              </button>
            )}
            <select
              value={sort}
              onChange={e => setFilter('sort', e.target.value)}
              className="bg-white border border-[#E8E0D5] text-[#4A4A6A] text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B2B5E]"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Per-page selector */}
        {!loading && products.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#8A8AAA] text-xs">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, products.length)} of {products.length} pieces
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[#8A8AAA] text-xs">Per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="bg-white border border-[#E8E0D5] text-[#4A4A6A] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1B2B5E]"
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(pageSize).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">💎</p>
            <p className="text-[#4A4A6A] text-lg">No jewelry found</p>
            <p className="text-[#8A8AAA] text-sm mt-2">Try adjusting your filters</p>
            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-[#1B2B5E] text-white rounded-lg text-sm font-medium hover:bg-[#2A3F7E] transition-all">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {pagedProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-[#E8E0D5] text-[#4A4A6A] hover:border-[#1B2B5E] disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-8 h-8 text-xs rounded-lg border transition-all ${p === page ? 'bg-[#1B2B5E] text-white border-[#1B2B5E]' : 'border-[#E8E0D5] text-[#4A4A6A] hover:border-[#1B2B5E]'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-[#E8E0D5] text-[#4A4A6A] hover:border-[#1B2B5E] disabled:opacity-40 transition-all"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
