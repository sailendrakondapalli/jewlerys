import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Tag } from 'lucide-react'
import { getSetting } from '../services/settingsService'

export default function OfferBanner() {
  const [offers, setOffers] = useState([])
  const [visible, setVisible] = useState(true)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    getSetting('offer_banner').then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.length > 0) setOffers(parsed)
        } catch {}
      }
    }).catch(() => {})
  }, [])

  // Auto-rotate offers every 4 seconds
  useEffect(() => {
    if (!visible || offers.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % offers.length), 4000)
    return () => clearInterval(t)
  }, [visible, offers.length])

  if (!visible || offers.length === 0) return null

  const offer = offers[current]

  return (
    <div className="sticky top-16 z-40 relative bg-gradient-to-r from-[#B8960C] via-[#D4AF37] to-[#B8960C] text-black overflow-hidden">
      <div className="flex items-center justify-center gap-1 py-2.5 px-10">
        <Tag size={13} className="flex-shrink-0 mr-1" />
        <AnimatePresence mode="wait">
          <motion.a
            key={offer.id}
            href={offer.link}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-xs sm:text-sm font-semibold text-center hover:underline truncate max-w-xs sm:max-w-lg"
          >
            {offer.text}
          </motion.a>
        </AnimatePresence>
      </div>

      {offers.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {offers.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1 h-1 rounded-full transition-all ${i === current ? 'bg-black w-3' : 'bg-black/40'}`}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black transition-colors p-1"
        aria-label="Close banner"
      >
        <X size={14} />
      </button>
    </div>
  )
}
