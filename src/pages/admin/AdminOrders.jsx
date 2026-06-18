import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ChevronDown, ChevronUp, AlertTriangle, Eye, Truck, Upload, RefreshCw } from "lucide-react"
import { useAdminStore } from "../../store/adminStore"
import { formatINR, formatDate } from "../../utils/format"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const STATUS_TABS = [
  { key: "all",       label: "All",       color: "bg-gray-200 text-gray-700" },
  { key: "pending",   label: "Pending",   color: "bg-yellow-100 text-yellow-700" },
  { key: "confirmed", label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  { key: "shipping",  label: "Shipped",   color: "bg-orange-100 text-orange-700" },
  { key: "delivered", label: "Delivered", color: "bg-green-100 text-green-700" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
]

const ORDER_STATUSES = [
  { key: "confirmed", label: "Confirmed", color: "bg-blue-500 text-white border-blue-600" },
  { key: "shipping",  label: "Shipped",   color: "bg-orange-500 text-white border-orange-600" },
  { key: "delivered", label: "Delivered", color: "bg-green-500 text-white border-green-600" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-500 text-white border-red-600" },
]

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 9999]

function StatusDropdown({ orderId, currentStatus, onStatusUpdate }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const current = ORDER_STATUSES.find(s => s.key === currentStatus) || ORDER_STATUSES[0]

  const handleSelect = async (statusKey) => {
    if (statusKey === currentStatus) { setOpen(false); return }
    setLoading(true)
    await onStatusUpdate(orderId, statusKey)
    setLoading(false)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${current.color} hover:opacity-80`}>
        {loading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : null}
        {current.label}<ChevronDown size={11} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 right-0 z-20 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl min-w-[130px]">
            {ORDER_STATUSES.map(s => (
              <button key={s.key} onClick={() => handleSelect(s.key)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors ${s.key === currentStatus ? "opacity-50 cursor-default" : ""}`}>
                <span className={`w-2 h-2 rounded-full border ${s.color}`} />
                <span className="text-gray-500">{s.label}</span>
                {s.key === currentStatus && <span className="ml-auto text-gray-500">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  )
}

function TrackingPanel({ order, onSave }) {
  const [trackingId, setTrackingId] = useState(order.tracking_id || "")
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(order.tracking_image_url || null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!trackingId.trim()) { toast.error("Tracking ID is required"); return }
    setSaving(true)
    try {
      let imageUrl = order.tracking_image_url || null
      if (image) {
        const ext = image.name.split(".").pop()
        const path = `tracking/${order.id}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, image, { contentType: image.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
      const { error } = await supabase.from("orders").update({
        tracking_id: trackingId.trim() || null,
        tracking_image_url: imageUrl,
        tracking_updated_at: new Date().toISOString(),
      }).eq("id", order.id)
      if (error) throw error
      onSave(order.id, { tracking_id: trackingId.trim() || null, tracking_image_url: imageUrl })
      toast.success("Tracking info saved")
    } catch (e) {
      toast.error(e.message || "Failed to save tracking")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 space-y-3">
      <p className="text-orange-600 text-sm font-bold flex items-center gap-2"><Truck size={16} /> Tracking Info</p>
      <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="Tracking ID (required)"
        className="w-full bg-white border-2 border-orange-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
      <label className="flex items-center gap-2 p-2.5 border-2 border-dashed border-orange-300 hover:border-orange-500 rounded-lg cursor-pointer bg-white">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <Upload size={14} className="text-orange-500" />
        <span className="text-sm text-orange-500">{image ? image.name : "Upload tracking screenshot (optional)"}</span>
      </label>
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Tracking" className="h-24 rounded-lg border-2 border-orange-300 object-cover" />
          <button onClick={() => { setImage(null); setPreview(null) }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow">×</button>
        </div>
      )}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-orange-500 border-2 border-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saving ? "Saving..." : "Save Tracking Info"}
      </button>
    </div>
  )
}

function getStatusBadge(order) {
  const needsVerification = order.payment_status === "pending_verification"
  if (needsVerification) return { label: "Pending", color: "bg-yellow-100 text-yellow-700" }
  if (order.order_status === "cancelled" || order.payment_status === "failed")
    return { label: "Cancelled", color: "bg-red-500 text-white" }
  const s = order.order_status || "confirmed"
  if (s === "delivered") return { label: "Delivered", color: "bg-green-500 text-white" }
  if (s === "shipping")  return { label: "Shipped",   color: "bg-orange-500 text-white" }
  return { label: "Confirmed", color: "bg-blue-500 text-white" }
}

function OrderRow({ order, expanded, onToggle, onStatusUpdate, onVerify, onReject, onNotify, onScreenshot, onTrackingSave }) {
  const addr = (() => { try { return typeof order.address === "object" ? order.address : JSON.parse(order.address) } catch { return {} } })()
  const isCancelled = order.order_status === "cancelled" || order.payment_status === "failed"
  const needsVerification = order.payment_status === "pending_verification"
  const badge = getStatusBadge(order)
  const orderId = order.display_order_id || "#" + String(order.id).slice(-6).toUpperCase()

  return (
    <div className={`border rounded-xl overflow-hidden mb-2 ${needsVerification ? "border-orange-400/50 bg-orange-50/30" : isCancelled ? "border-red-200" : "border-gray-200 bg-white"}`}>
      {/* Row header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-xs">Order</span>
              <span className="text-[#1B2B5E] text-xs font-mono font-bold">{orderId}</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{addr.full_name || "Customer"} &middot; {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-2">
          <span className="text-[#1B2B5E] text-sm font-semibold">{formatINR(order.total_amount)}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${badge.color}`}>{badge.label}</span>
          {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-200 p-4 space-y-3">
              {needsVerification && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 space-y-3">
                  <p className="text-orange-500 text-xs font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Payment Verification Required</p>
                  {order.payment_screenshot_url && (
                    <div className="space-y-2">
                      <img src={order.payment_screenshot_url} alt="Payment" className="w-full max-h-48 object-contain rounded-lg border border-orange-300 bg-white cursor-pointer" onClick={() => onScreenshot(order.payment_screenshot_url)} />
                      <button onClick={() => onScreenshot(order.payment_screenshot_url)} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-600"><Eye size={11} /> View Full Screenshot</button>
                    </div>
                  )}
                  {order.upi_ref && <p className="text-gray-500 text-xs">UPI Ref: <span className="font-mono text-[#1A1A2E]">{order.upi_ref}</span></p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onVerify(order.id)} className="py-2.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600">✅ Confirm Payment</button>
                    <button onClick={() => onReject(order.id)} className="py-2.5 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600">❌ Reject</button>
                  </div>
                </div>
              )}

              {order.payment_status === "paid" && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-[#1A1A2E] text-xs font-semibold">Order Status</p>
                  <div className="flex items-start">
                    {[
                      { key: "confirmed", label: "Confirmed", color: "bg-blue-500", line: "bg-blue-400", text: "text-blue-500" },
                      { key: "shipping",  label: "Shipped",   color: "bg-orange-500", line: "bg-orange-400", text: "text-orange-500" },
                      { key: "delivered", label: "Delivered", color: "bg-green-500", line: "bg-green-400", text: "text-green-500" },
                    ].map((step, idx) => {
                      const steps = ["confirmed","shipping","delivered"]
                      const currentIdx = steps.indexOf(order.order_status || "confirmed")
                      const done = idx <= currentIdx
                      return (
                        <div key={step.key} className="flex-1 flex flex-col items-center">
                          <div className="flex items-center w-full">
                            <div className={`w-full h-1 rounded-full ${idx === 0 ? "opacity-0" : done ? (idx===1?"bg-blue-400":"bg-orange-400") : "bg-gray-200"}`} />
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${done ? `${step.color} border-transparent` : "border-gray-200 bg-gray-100"}`}>
                              {step.key==="confirmed" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-4 h-4 ${done?"text-white":"text-gray-400"}`}><polyline points="20 6 9 17 4 12"/></svg>}
                              {step.key==="shipping"  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${done?"text-white":"text-gray-400"}`}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                              {step.key==="delivered" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-4 h-4 ${done?"text-white":"text-gray-400"}`}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                            </div>
                            <div className={`w-full h-1 rounded-full ${idx===2?"opacity-0":done&&idx<currentIdx?step.line:"bg-gray-200"}`} />
                          </div>
                          <p className={`text-xs mt-1.5 text-center font-medium ${done?step.text:"text-gray-400"}`}>{step.label}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-gray-400 text-xs">Change status:</span>
                    <StatusDropdown orderId={order.id} currentStatus={order.order_status || "confirmed"} onStatusUpdate={onStatusUpdate} />
                  </div>
                </div>
              )}

              {order.order_status === "shipping" && <TrackingPanel order={order} onSave={onTrackingSave} />}

              <div className="space-y-1">
                {order.order_items?.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded p-1.5">
                    {item.products?.images?.[0] && <img src={item.products.images[0]} alt="" className="w-7 h-7 object-cover rounded" onError={e=>{e.target.style.display="none"}} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1A1A2E] text-xs truncate">{item.products?.name}</p>
                      {item.products?.custom_id && <p className="text-[#1B2B5E] text-xs font-mono">ID: {item.products.custom_id}</p>}
                      <p className="text-gray-500 text-xs">x{item.quantity} &middot; {formatINR(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {addr.full_name && (
                <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-400">
                  <p className="text-[#1A1A2E]">{addr.full_name} &middot; {addr.phone}</p>
                  <p>{addr.address1}, {addr.city} &middot; {addr.pincode}</p>
                </div>
              )}
              <button onClick={() => onNotify(order, addr)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1ebe5d]">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Customer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AdminOrders() {
  const { orders, loadOrders } = useAdminStore()
  const [localOrders, setLocalOrders] = useState([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [expanded, setExpanded] = useState(null)
  const [screenshotModal, setScreenshotModal] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [searchParams] = useSearchParams()
  const filterToday = searchParams.get("filter") === "today"

  useEffect(() => { loadOrders() }, [])
  useEffect(() => {
    if (!orders.length) return
    if (filterToday) {
      const today = new Date().toDateString()
      setLocalOrders(orders.filter(o => new Date(o.created_at).toDateString() === today))
    } else {
      setLocalOrders(orders)
    }
  }, [orders, filterToday])

  const handleRefresh = async () => {
    setRefreshing(true)
    setSearch("")
    setActiveTab("all")
    setPage(1)
    await loadOrders(true)
    setRefreshing(false)
    toast.success("Orders refreshed")
  }

  // Count per tab
  const countFor = (tabKey) => {
    if (tabKey === "all") return localOrders.length
    if (tabKey === "pending") return localOrders.filter(o => o.payment_status === "pending_verification").length
    if (tabKey === "cancelled") return localOrders.filter(o => o.order_status === "cancelled" || o.payment_status === "failed").length
    return localOrders.filter(o => o.order_status === tabKey && o.payment_status !== "pending_verification" && o.payment_status !== "failed").length
  }

  // Filter logic
  const applyTabFilter = (order) => {
    if (activeTab === "all") return true
    if (activeTab === "pending") return order.payment_status === "pending_verification"
    if (activeTab === "cancelled") return order.order_status === "cancelled" || order.payment_status === "failed"
    return order.order_status === activeTab && order.payment_status !== "pending_verification"
  }

  const q = search.toLowerCase().trim()
  const filtered = localOrders.filter(o => {
    const matchesTab = applyTabFilter(o)
    if (!matchesTab) return false
    if (!q) return true
    const id = (o.display_order_id || "").toLowerCase()
    const addr = (() => { try { return typeof o.address === "object" ? o.address : JSON.parse(o.address) } catch { return {} } })()
    return id.includes(q) || String(o.id).toLowerCase().includes(q) || (addr.full_name||"").toLowerCase().includes(q) || (addr.phone||"").toLowerCase().includes(q)
  })

  const totalPages = pageSize === 9999 ? 1 : Math.ceil(filtered.length / pageSize)
  const paged = pageSize === 9999 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleStatusUpdate = async (orderId, newStatus) => {
    const order = localOrders.find(o => o.id === orderId)
    const { error } = await supabase.rpc("admin_update_order_status", { p_order_id: orderId, p_status: newStatus })
    if (error) { toast.error("Failed: " + error.message); return }
    setLocalOrders(p => p.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o))
    useAdminStore.setState(s => ({ orders: s.orders.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o) }))
    toast.success("Status updated to " + newStatus)
    if (newStatus === "cancelled" && order) {
      const addr = (() => { try { return typeof order.address === "object" ? order.address : JSON.parse(order.address) } catch { return {} } })()
      const phone = addr.phone?.replace(/\D/g, "")
      if (phone) {
        const msg = encodeURIComponent(`*Order Cancelled - NaShe Jewels*\n\nHi ${addr.full_name||"Customer"},\n\nYour order *${order.display_order_id||"#"+String(order.id).slice(-6).toUpperCase()}* has been cancelled.\nAmount: ₹${order.total_amount?.toLocaleString("en-IN")}\n\nIf you paid, your refund will be processed within 5-7 business days.\n\nFor queries: +91 8639006849\n\nNaShe Jewels`)
        window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank")
      }
    }
  }

  const verifyPayment = async (orderId) => {
    const { error } = await supabase.rpc("admin_verify_payment", { p_order_id: orderId })
    if (!error) {
      setLocalOrders(p => p.map(o => o.id === orderId ? { ...o, payment_status: "paid", payment_verified: true, order_status: "confirmed" } : o))
      useAdminStore.setState(s => ({ orders: s.orders.map(o => o.id === orderId ? { ...o, payment_status: "paid", payment_verified: true, order_status: "confirmed" } : o) }))
      toast.success("Payment verified!")
    } else { toast.error(error.message) }
  }

  const rejectPayment = async (orderId) => {
    const order = localOrders.find(o => o.id === orderId)
    const { error } = await supabase.rpc("admin_reject_payment", { p_order_id: orderId })
    if (error) { toast.error(error.message); return }
    setLocalOrders(p => p.map(o => o.id === orderId ? { ...o, payment_status: "failed", order_status: "cancelled" } : o))
    useAdminStore.setState(s => ({ orders: s.orders.map(o => o.id === orderId ? { ...o, payment_status: "failed", order_status: "cancelled" } : o) }))
    toast.success("Payment rejected")
    if (order) {
      const addr = (() => { try { return typeof order.address === "object" ? order.address : JSON.parse(order.address) } catch { return {} } })()
      const phone = addr.phone?.replace(/\D/g, "")
      if (phone) {
        const msg = encodeURIComponent(`*Order Rejected - NaShe Jewels*\n\nHi ${addr.full_name||"Customer"},\n\nYour order *${order.display_order_id||"#"+String(order.id).slice(-6).toUpperCase()}* has been rejected due to payment verification failure.\nAmount: ₹${order.total_amount?.toLocaleString("en-IN")}\n\nContact us at +91 8639006849.\n\nNaShe Jewels`)
        window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank")
      }
    }
  }

  const notifyCustomer = (order, addr) => {
    const phone = addr.phone?.replace(/\D/g, "")
    if (!phone) { toast.error("No phone number"); return }
    const msg = encodeURIComponent(`*Order Update - NaShe Jewels*\n\nHi ${addr.full_name||"Customer"},\nOrder ${order.display_order_id||"#"+String(order.id).slice(-6).toUpperCase()} status: ${order.order_status||"confirmed"}\nAmount: ₹${order.total_amount?.toLocaleString("en-IN")}\n\nNaShe Jewels`)
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank")
  }

  const handleTrackingSave = (orderId, data) => {
    setLocalOrders(p => p.map(o => o.id === orderId ? { ...o, ...data } : o))
  }

  const cardProps = { onStatusUpdate: handleStatusUpdate, onVerify: verifyPayment, onReject: rejectPayment, onNotify: notifyCustomer, onScreenshot: setScreenshotModal, onTrackingSave: handleTrackingSave }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]" style={{ fontFamily: "Georgia, serif" }}>
            {filterToday ? "Today's Orders" : "Orders"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length === localOrders.length
              ? `${localOrders.length} total orders`
              : `${filtered.length} of ${localOrders.length} orders`}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, phone, order ID..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#1B2B5E]" />
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(tab => {
          const count = countFor(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? "bg-[#C9956C] text-white border-[#C9956C]"
                  : "bg-white border-gray-200 text-gray-600 hover:border-[#C9956C] hover:text-[#C9956C]"
              }`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive ? "bg-white/30 text-white" : tab.color}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No orders found</p>
        ) : (
          <>
            {paged.map(order => (
              <OrderRow key={order.id} order={order} expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                {...cardProps} />
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {pageSize === 9999
                    ? `Showing all ${filtered.length}`
                    : `Showing ${Math.min((page-1)*pageSize+1, filtered.length)}–${Math.min(page*pageSize, filtered.length)} of ${filtered.length}`}
                </p>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1B2B5E]">
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n === 9999 ? "All" : n}</option>)}
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:border-[#1B2B5E] disabled:opacity-40">‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2.5 py-1 text-xs rounded border transition-all ${p === page ? "bg-[#1B2B5E] text-white border-[#1B2B5E]" : "border-gray-200 text-gray-500 hover:border-[#1B2B5E]"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:border-[#1B2B5E] disabled:opacity-40">›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Screenshot modal */}
      <AnimatePresence>
        {screenshotModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setScreenshotModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-lg w-full bg-white rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="text-[#1B2B5E] font-medium">Payment Screenshot</p>
                <button onClick={() => setScreenshotModal(null)} className="text-gray-400 hover:text-[#1A1A2E] text-xl">&times;</button>
              </div>
              <img src={screenshotModal} alt="Payment screenshot" className="w-full max-h-[70vh] object-contain p-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
