import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"
import { ArrowRight, Sparkles, Shield, Truck, RefreshCw, Star, Clock } from "lucide-react"
import { CATEGORIES } from "../data/products"
import { fetchProducts } from "../services/productService"
import { getSetting } from "../services/settingsService"
import ProductCard from "../components/ProductCard"
import SkeletonCard from "../components/SkeletonCard"
import ScrollReveal from "../components/ScrollReveal"
import PromoBanners from "../components/PromoBanners"
import ReviewsSection from "../components/ReviewsSection"
import heroBgImg from "../assets/herobg.jpg"

const FALLBACK_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80"

const ICON_MAP = [
  <Shield size={20} />,
  <Truck size={20} />,
  <RefreshCw size={20} />,
  <Sparkles size={20} />,
]

const DEFAULT_FEATURES = [
  { id: 1, title: "Certified Quality", desc: "Authenticity Guaranteed" },
  { id: 2, title: "Fast Shipping", desc: "Across India" },
  { id: 3, title: "Easy Returns", desc: "7 Day Return Policy" },
  { id: 4, title: "Handcrafted", desc: "Artisan made jewelry" },
]

export default function HomePage() {
  const [newArrivals, setNewArrivals] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [dynamicCategories, setDynamicCategories] = useState(CATEGORIES)
  const [categoryImageMap, setCategoryImageMap] = useState({})
  const [heroVideoUrl, setHeroVideoUrl] = useState(null) // null = still loading, "" = loaded but no video

  useEffect(() => {
    getSetting('hero_video_url').then(url => setHeroVideoUrl(url || "")).catch(() => setHeroVideoUrl(""))
  }, [])

  useEffect(() => {
    fetchProducts({ sort: "newest" }).then(data => {
      setNewArrivals(data.slice(0, 6))
      const premium = data.filter(p => p.tags?.includes("premium") || p.tags?.includes("bridal"))
      setBestSellers(premium.slice(0, 6))
      setLoading(false)
      // Build dynamic category list from actual products — includes any custom categories admin added
      const cats = [...new Set(data.map(p => p.category).filter(Boolean))]
      if (cats.length > 0) setDynamicCategories(cats.sort())

      // Build category image map: use the most recently added product's image per category
      // data is already sorted newest-first, so the first product per category is the most recent
      // Prefer an image over a video — skip video URLs when looking for a category thumbnail
      const isVideoUrl = (url) => url && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url)
      const imgMap = {}
      data.forEach(p => {
        if (!p.category || imgMap[p.category]) return
        const mediaList = Array.isArray(p.images)
          ? p.images
          : [p.image || p.images].filter(Boolean)
        // Pick the first non-video media as the category thumbnail
        const thumb = mediaList.find(m => m && !isVideoUrl(m))
        if (thumb) imgMap[p.category] = thumb
      })
      // Second pass: if a category still has no image (all products only have videos),
      // fall back to the first video so the card at least shows something via <video>
      data.forEach(p => {
        if (!p.category || imgMap[p.category]) return
        const mediaList = Array.isArray(p.images)
          ? p.images
          : [p.image || p.images].filter(Boolean)
        if (mediaList[0]) imgMap[p.category] = mediaList[0]
      })
      setCategoryImageMap(imgMap)
    })
    getSetting('features_bar').then(val => {
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p) && p.length) setFeatures(p) } catch {} }
    }).catch(() => {})
  }, [])

  const SectionHeader = ({ label, title, link, linkText = "View All" }) => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-[#C9956C] text-xs uppercase tracking-widest mb-1">{label}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "Georgia, serif" }}>{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-[#1B2B5E] text-sm hover:underline flex items-center gap-1 shrink-0 font-medium">
          {linkText} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )

  return (
    <>
      <Helmet>
        <title>NaShe Jewels - Premium Indian Jewelry</title>
        <meta name="description" content="Discover exquisite handcrafted Indian jewelry. Shop earrings, necklaces, bangles and more." />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ minHeight: "clamp(320px, 60vw, 650px)" }}>
        {/* Full bleed background — null=loading(dark), video if set, else static image */}
        {heroVideoUrl === null ? (
          <div className="absolute inset-0 bg-[#1A1A2E]" />
        ) : heroVideoUrl ? (
          <video
            src={heroVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        ) : (
          <img src={heroBgImg} alt="NaShe Jewels hero" className="absolute inset-0 w-full h-full object-cover object-center" />
        )}
        {/* Gradient overlay — left dark for text, fades right */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        {/* Extra soft vignette on top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        {/* Text content — left side, over the empty cream area of the photo */}
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center" style={{ minHeight: "inherit" }}>
          <div className="max-w-xs sm:max-w-md py-10 sm:py-16">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-5 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              NaShe Jewels
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-base sm:text-xl font-semibold mb-4 sm:mb-7 leading-relaxed"
              style={{ fontFamily: "Georgia, serif" }}>
              <span className="text-[#D4AF37]">Because Luxury</span>{" "}
              <span className="text-white">Shouldn't Be Rare.</span>
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Link to="/#categories" className="inline-flex items-center gap-1.5 px-5 sm:px-7 py-2.5 sm:py-3 bg-[#1B2B5E] text-white font-semibold rounded-lg hover:bg-[#2A3F7E] transition-all shadow-md text-xs sm:text-sm whitespace-nowrap"
                onClick={e => { e.preventDefault(); document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' }) }}>
                Shop Now <ArrowRight size={13} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Promo Banners — Flipkart-style sliding offer cards */}
      <PromoBanners />

      {/* Features bar */}
      <ScrollReveal>
        <section className="bg-white border-y border-[#E8E0D5] py-8 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <div key={f.id || i} className="flex items-center gap-3">
                <div className="text-[#1B2B5E]">{ICON_MAP[i % ICON_MAP.length]}</div>
                <div>
                  <p className="text-[#1A1A2E] text-sm font-semibold">{f.title}</p>
                  <p className="text-[#8A8AAA] text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 1. Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 py-12">
        <ScrollReveal>
          <div className="text-center mb-8">
            <p className="text-[#C9956C] text-xs uppercase tracking-widest mb-2">Browse By</p>
            <h2 className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "Georgia, serif" }}>Shop By Category</h2>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {dynamicCategories.map((cat, i) => {
            const media = categoryImageMap[cat] || FALLBACK_CATEGORY_IMAGE
            const mediaIsVideo = /\.(mp4|mov|webm|ogg)(\?|$)/i.test(media)
            return (
              <ScrollReveal key={cat} delay={i * 0.06}>
                <Link to={`/products?category=${encodeURIComponent(cat)}`}
                  className="group relative overflow-hidden rounded-xl aspect-square block">
                  {mediaIsVideo ? (
                    <video src={media} muted loop playsInline autoPlay
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <img src={media} alt={cat} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={e => { e.target.src = FALLBACK_CATEGORY_IMAGE }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-semibold text-sm">{cat}</p>
                  </div>
                  <div className="absolute inset-0 border-2 border-[#D4AF37]/0 group-hover:border-[#D4AF37]/60 rounded-xl transition-all duration-300" />
                </Link>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      {/* 2. New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <ScrollReveal>
          <SectionHeader label="Just In" title="New Arrivals" link="/products?sort=newest" />
        </ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : newArrivals.map((p, i) => (
              <ScrollReveal key={p.id} delay={i * 0.04}>
                <ProductCard product={p} />
              </ScrollReveal>
            ))
          }
        </div>
      </section>

      {/* 3. Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <ScrollReveal>
          <SectionHeader label="Customer Favourites" title="Best Sellers" link="/products?tags=premium" />
        </ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : bestSellers.map((p, i) => (
              <ScrollReveal key={p.id} delay={i * 0.04}>
                <ProductCard product={p} />
              </ScrollReveal>
            ))
          }
        </div>
      </section>

      {/* Customer Reviews */}
      <ScrollReveal>
        <ReviewsSection />
      </ScrollReveal>

      {/* Bridal Banner */}
      <ScrollReveal>
        <section className="relative overflow-hidden mx-4 mb-16 rounded-2xl">
          <img src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1400&q=80"
            alt="Bridal collection" className="w-full h-64 object-cover"
            onError={e => { e.target.src = "https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=1400&q=80" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B2B5E]/85 to-[#1B2B5E]/30 flex items-center px-8">
            <div>
              <p className="text-[#C9956C] text-xs uppercase tracking-widest mb-2">Limited Edition</p>
              <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>Bridal Collection</h3>
              <Link to="/products?tags=bridal" className="px-6 py-2.5 bg-white text-[#1B2B5E] font-semibold rounded-lg hover:bg-[#FAF8F5] transition-all text-sm">
                Explore Now
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </>
  )
}
