import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ShoppingBag, DollarSign, Package, AlertTriangle, TrendingUp, Clock, Video, Upload, Loader2 } from 'lucide-react'
import { useAdminStore } from '../../store/adminStore'
import { formatINR } from '../../utils/format'
import { getSetting, setSetting } from '../../services/settingsService'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const GOLD_COLORS = ['#1B2B5E', '#2A3F7E', '#3D5A99', '#4E6FA8', '#1A3A6B', '#0F1A3A', '#5B7DB1', '#6B8EC4']

// Hero Video Manager component
function HeroVideoManager() {
  const [currentUrl, setCurrentUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [manualUrl, setManualUrl] = useState('')

  useEffect(() => {
    getSetting('hero_video_url').then(url => {
      if (url) { setCurrentUrl(url); setManualUrl(url) }
    }).catch(() => {})
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Please select a video file'); return }
    if (file.size > 50 * 1024 * 1024) { toast.error('Video must be under 50MB'); return }
    setUploading(true)
    try {
      const fileName = `hero_${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`hero/${fileName}`, file, { cacheControl: '3600', upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('product-images').getPublicUrl(`hero/${fileName}`)
      await setSetting('hero_video_url', data.publicUrl)
      setCurrentUrl(data.publicUrl)
      setManualUrl(data.publicUrl)
      toast.success('Hero video updated!')
    } catch (e) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveUrl = async () => {
    if (!manualUrl.trim()) return
    setSaving(true)
    try {
      await setSetting('hero_video_url', manualUrl.trim())
      setCurrentUrl(manualUrl.trim())
      toast.success('Hero video URL saved!')
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-[#1B2B5E] font-medium mb-4 flex items-center gap-2">
        <Video size={16} className="text-[#1B2B5E]" /> Hero Video
      </h3>
      {currentUrl && (
        <video src={currentUrl} className="w-full h-32 object-cover rounded-lg mb-4 bg-gray-50" muted />
      )}
      <div className="space-y-3">
        {/* Upload from device */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Upload from device (max 50MB)</label>
          <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#1B2B5E]/30 rounded-lg cursor-pointer hover:border-[#D4AF37]/60 transition-all">
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading
              ? <><Loader2 size={15} className="text-[#1B2B5E] animate-spin" /><span className="text-gray-400 text-sm">Uploading...</span></>
              : <><Upload size={15} className="text-[#1B2B5E]" /><span className="text-gray-400 text-sm">Choose video file</span></>
            }
          </label>
        </div>
        {/* Or paste URL */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Or paste video URL</label>
          <div className="flex gap-2">
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] placeholder-gray-600 focus:outline-none focus:border-[#1B2B5E]"
            />
            <button onClick={handleSaveUrl} disabled={saving || !manualUrl.trim()}
              className="px-4 py-2 bg-[#1B2B5E] text-white text-sm font-medium rounded-lg hover:bg-[#2A3F7E] disabled:opacity-60 flex items-center gap-1">
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, sub, color = 'gold', to }) => (
  <Link to={to || '#'} className="cursor-pointer">
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(27,43,94,0.12)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer transition-all hover:border-[#1B2B5E]/30 h-full min-h-[130px] flex flex-col justify-between"
    >
      <div className={`p-2 rounded-lg w-fit ${color === 'gold' ? 'bg-[#1B2B5E]/15' : color === 'green' ? 'bg-green-500/15' : color === 'red' ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
        <Icon size={18} className={color === 'gold' ? 'text-[#1B2B5E]' : color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-blue-400'} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1B2B5E] mb-1">{value}</p>
        <p className="text-gray-400 text-sm">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
      </div>
    </motion.div>
  </Link>
)

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.name === 'revenue' ? formatINR(p.value) : p.value}</p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { stats, orders, products, loadOrders, loadProducts, computeStats, addNotification, notifications, startupNotified } = useAdminStore()

  useEffect(() => {
    Promise.all([loadOrders(), loadProducts()]).then(() => {
      computeStats()
    })
  }, [])

  useEffect(() => {
    if (!stats || startupNotified) return
    useAdminStore.setState({ startupNotified: true })
    if (stats.lowStockCount > 0) {
      addNotification(`${stats.lowStockCount} products have low stock (< 10 items)`, 'warning')
    }
    if (stats.todayOrdersCount > 0) {
      addNotification(`${stats.todayOrdersCount} new orders today`, 'info')
    }
  }, [stats])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1B2B5E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B5E]" style={{ fontFamily: 'Georgia, serif' }}>Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} sub={`${stats.paidOrders} paid`} color="gold" to="/admin/orders" />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatINR(stats.totalRevenue)} sub="from paid orders" color="green" to="/admin/analytics" />
        <StatCard icon={Package} label="Products" value={stats.totalProducts} color="blue" to="/admin/products" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} sub="< 10 items" color="red" to="/admin/products?stock=low" />
        <StatCard icon={Clock} label="Today's Orders" value={stats.todayOrdersCount} color="gold" to="/admin/orders?filter=today" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders + Revenue Line Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#1B2B5E]" /> Orders (Last 14 Days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.last14Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="orders" stroke="#1B2B5E" strokeWidth={2} dot={{ fill: '#1B2B5E', r: 3 }} name="orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-4">Revenue (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.last14Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" fill="#1B2B5E" radius={[3, 3, 0, 0]} name="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Pie */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-4">Category Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.categorySales} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                {stats.categorySales.map((_, i) => <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#fff', border: '1px solid rgba(27,43,94,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#999' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* City Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-4">Orders by City</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} />
              <YAxis dataKey="city" type="category" tick={{ fill: '#999', fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(27,43,94,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" fill="#2A3F7E" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-4">Top Products</h3>
          <div className="space-y-2">
            {stats.topProducts.slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#1B2B5E] text-xs w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-600 text-xs truncate">{p.name}</p>
                  <div className="h-1.5 bg-gray-50 rounded-full mt-1">
                    <div
                      className="h-full bg-[#1B2B5E] rounded-full"
                      style={{ width: `${(p.qty / stats.topProducts[0].qty) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-gray-500 text-xs">{p.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts?.length > 0 && (
        <div className="bg-white border border-red-500/20 rounded-xl p-5">
          <h3 className="text-[#1B2B5E] font-medium mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" /> Low Stock Alert
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.lowStockProducts.slice(0, 8).map(p => (
              <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[#1A1A2E] text-xs font-medium truncate">{p.name}</p>
                <p className="text-red-400 text-xs mt-1">{p.stock} left</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Video Manager */}
      <HeroVideoManager />
      <FeaturesBarManager />
      <OfferBannerManager />
      <ProductsPerPageManager />

      {/* Recent Orders — grouped by day (last 3 days) */}
      {(() => {
        const days = []
        for (let i = 0; i < 3; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const ds = d.toDateString()
          const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
          const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === ds)
          days.push({ label, date: ds, orders: dayOrders })
        }
        const hasAny = days.some(d => d.orders.length > 0)
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#1B2B5E] font-medium">Recent Orders <span className="text-gray-400 text-xs font-normal ml-1">({orders.length} total)</span></h3>
              <Link to="/admin/orders" className="text-xs text-[#1B2B5E] hover:underline font-medium">View all →</Link>
            </div>
            {!hasAny && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">No orders in the last 3 days</div>
            )}
            {days.map(({ label, orders: dayOrders }) => dayOrders.length === 0 ? null : (
              <div key={label} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F4F6FA] border-b border-gray-200">
                  <span className="text-[#1B2B5E] text-xs font-semibold">{label}</span>
                  <span className="text-gray-400 text-xs">{dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""} &middot; {formatINR(dayOrders.filter(o => o.payment_status === "paid").reduce((s, o) => s + (o.total_amount || 0), 0))} revenue</span>
                </div>
                {/* Orders table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-gray-400 text-xs px-4 py-2 font-medium">Order ID</th>
                        <th className="text-left text-gray-400 text-xs px-4 py-2 font-medium">Customer</th>
                        <th className="text-left text-gray-400 text-xs px-4 py-2 font-medium">Amount</th>
                        <th className="text-left text-gray-400 text-xs px-4 py-2 font-medium">Status</th>
                        <th className="text-left text-gray-400 text-xs px-4 py-2 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dayOrders.map(o => {
                        const addr = (() => { try { return typeof o.address === "object" ? o.address : JSON.parse(o.address || "{}") } catch { return {} } })()
                        const customerName = addr.full_name || o.users?.email || "Guest"
                        return (
                          <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-[#1B2B5E] text-xs font-mono font-semibold">{o.display_order_id || "#" + String(o.id).slice(-6).toUpperCase()}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs truncate max-w-[120px]">{customerName}</td>
                            <td className="px-4 py-2.5 text-[#1B2B5E] text-xs font-medium">{formatINR(o.total_amount)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                o.payment_status === "paid"
                                  ? o.order_status === "delivered" ? "bg-green-500 text-white"
                                  : o.order_status === "shipping" ? "bg-orange-500 text-white"
                                  : "bg-blue-500 text-white"
                                  : o.payment_status === "pending_verification" ? "bg-orange-500/20 text-orange-500"
                                  : o.payment_status === "failed" ? "bg-red-500/20 text-red-500"
                                  : "bg-yellow-500/20 text-yellow-600"
                              }`}>
                                {o.payment_status === "paid"
                                  ? (o.order_status === "delivered" ? "Delivered" : o.order_status === "shipping" ? "Shipped" : "Confirmed")
                                  : o.payment_status === "pending_verification" ? "Verify"
                                  : o.payment_status === "failed" ? "Failed"
                                  : "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="text-center">
              <Link to="/admin/orders" className="text-xs text-[#1B2B5E] hover:underline">View all {orders.length} orders →</Link>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Features Bar Manager - edit the 4 trust badges shown on homepage
function FeaturesBarManager() {
  const DEFAULT_FEATURES = [
    { id: 1, title: 'Certified Quality', desc: 'Authenticity Guaranteed' },
    { id: 2, title: 'Fast Shipping', desc: 'Across India' },
    { id: 3, title: 'Easy Returns', desc: '7 Day Return Policy' },
    { id: 4, title: 'Handcrafted', desc: 'Artisan made jewelry' },
  ]
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSetting('features_bar').then(val => {
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p) && p.length) setFeatures(p) } catch {} }
    }).catch(() => {})
  }, [])

  const save = async (updated) => {
    setSaving(true)
    try { await setSetting('features_bar', JSON.stringify(updated)); toast.success('Features bar updated!') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const update = (id, field, value) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-[#1B2B5E] font-medium mb-1 flex items-center gap-2">
        ✦ Homepage Trust Badges
      </h3>
      <p className="text-xs text-gray-400 mb-4">Edit the 4 feature badges shown below the hero on the homepage.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {features.map(f => (
          <div key={f.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <input value={f.title} onChange={e => update(f.id, 'title', e.target.value)}
              placeholder="Title e.g. Fast Shipping"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#1B2B5E]" />
            <input value={f.desc} onChange={e => update(f.id, 'desc', e.target.value)}
              placeholder="Description e.g. Across India"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-500 focus:outline-none focus:border-[#1B2B5E]" />
          </div>
        ))}
      </div>
      <button onClick={() => save(features)} disabled={saving}
        className="px-4 py-2 bg-[#1B2B5E] text-white text-sm font-semibold rounded-lg hover:bg-[#2A3F7E] disabled:opacity-60 transition-all">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

// Offer Banner Manager - add/edit/remove scrolling offers
function OfferBannerManager() {
  const [offers, setOffers] = useState([
    { id: 1, text: '🚚 Free Shipping on all orders across India!', link: '/products' },
    { id: 2, text: '💍 New Bridal Collection - Shop Now', link: '/products?tags=bridal' },
    { id: 3, text: '✨ Use code NASHE10 for 10% off on first order', link: '/products' },
  ])
  const [saving, setSaving] = useState(false)
  const [newText, setNewText] = useState('')
  const [newLink, setNewLink] = useState('/products')

  useEffect(() => {
    getSetting('offer_banner').then(val => {
      if (val) { try { const p = JSON.parse(val); if (Array.isArray(p) && p.length) setOffers(p) } catch {} }
    }).catch(() => {})
  }, [])

  const save = async (updated) => {
    setSaving(true)
    try { await setSetting('offer_banner', JSON.stringify(updated)); toast.success('Banner updated!') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const addOffer = () => {
    if (!newText.trim()) return
    const updated = [...offers, { id: Date.now(), text: newText.trim(), link: newLink || '/products' }]
    setOffers(updated)
    save(updated)
    setNewText('')
    setNewLink('/products')
  }

  const removeOffer = (id) => {
    const updated = offers.filter(o => o.id !== id)
    setOffers(updated)
    save(updated)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-[#1B2B5E] font-medium mb-4 flex items-center gap-2">
        <span className="text-[#1B2B5E]">🏷️</span> Offer Banner
        <span className="text-xs text-gray-500 font-normal ml-1">- scrolling banner below navbar</span>
      </h3>

      {/* Current offers */}
      <div className="space-y-2 mb-4">
        {offers.map(o => (
          <div key={o.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-gray-600 truncate">{o.text}</span>
            <span className="text-xs text-gray-600 shrink-0">{o.link}</span>
            <button onClick={() => removeOffer(o.id)} className="text-gray-600 hover:text-red-400 transition-colors ml-1 shrink-0">&times;</button>
          </div>
        ))}
        {offers.length === 0 && <p className="text-gray-400 text-xs">No offers. Add one below.</p>}
      </div>

      {/* Add new offer */}
      <div className="space-y-2">
        <input value={newText} onChange={e => setNewText(e.target.value)}
          placeholder="Offer text e.g. 🚚 Free Shipping on all orders!"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] placeholder-gray-600 focus:outline-none focus:border-[#1B2B5E]" />
        <div className="flex gap-2">
          <input value={newLink} onChange={e => setNewLink(e.target.value)}
            placeholder="Link e.g. /products"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1A1A2E] placeholder-gray-600 focus:outline-none focus:border-[#1B2B5E]" />
          <button onClick={addOffer} disabled={saving || !newText.trim()}
            className="px-4 py-2 bg-[#1B2B5E] text-white text-sm font-semibold rounded-lg hover:bg-[#2A3F7E] disabled:opacity-60 transition-all">
            {saving ? '...' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Products Per Page Manager - controls how many products users see per page on /products
function ProductsPerPageManager() {
  const PAGE_SIZE_OPTIONS = [8, 12, 24, 48]
  const [value, setValue] = useState(12)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSetting('products_per_page').then(val => {
      const n = parseInt(val)
      if (n && PAGE_SIZE_OPTIONS.includes(n)) setValue(n)
    }).catch(() => {})
  }, [])

  const save = async (n) => {
    setSaving(true)
    try {
      await setSetting('products_per_page', String(n))
      setValue(n)
      toast.success(`Products per page set to ${n}`)
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-[#1B2B5E] font-medium mb-1 flex items-center gap-2">
        <Package size={15} /> Products Per Page
        <span className="text-xs text-gray-500 font-normal ml-1">- controls user-facing /products page</span>
      </h3>
      <p className="text-gray-400 text-xs mb-4">Choose how many products are shown per page on the shop.</p>
      <div className="flex items-center gap-3 flex-wrap">
        {PAGE_SIZE_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => save(n)}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all ${
              value === n
                ? 'bg-[#1B2B5E] text-white border-[#1B2B5E]'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1B2B5E] hover:text-[#1B2B5E]'
            } disabled:opacity-60`}
          >
            {n}
          </button>
        ))}
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>
      <p className="text-gray-400 text-xs mt-3">Current: <span className="text-[#1B2B5E] font-semibold">{value} products per page</span></p>
    </div>
  )
}
