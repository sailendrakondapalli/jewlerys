import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Package, ChevronDown, ChevronUp, CheckCircle, Truck, Clock, XCircle, AlertTriangle, Search } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import { supabase } from "../lib/supabase"
import { formatINR, formatDate } from "../utils/format"
import { isVideoUrl } from "../services/storageService"

const STATUS_STEPS = [
  {
    key: "confirmed", label: "Confirmed", icon: CheckCircle,
    desc: "Your order has been confirmed",
    activeColor: "bg-blue-500 border-blue-500",
    doneColor: "bg-blue-500 border-blue-500",
    activeText: "text-blue-600 font-semibold",
    doneText: "text-blue-500 font-medium",
    activeLine: "bg-blue-400",
  },
  {
    key: "shipping", label: "Shipped", icon: Truck,
    desc: "Your order is on the way",
    activeColor: "bg-orange-500 border-orange-500",
    doneColor: "bg-orange-500 border-orange-500",
    activeText: "text-orange-500 font-semibold",
    doneText: "text-orange-500 font-medium",
    activeLine: "bg-orange-400",
  },
  {
    key: "delivered", label: "Delivered", icon: Package,
    desc: "Order delivered successfully",
    activeColor: "bg-green-500 border-green-500",
    doneColor: "bg-green-500 border-green-500",
    activeText: "text-green-600 font-semibold",
    doneText: "text-green-500 font-medium",
    activeLine: "bg-green-400",
  },
]

function DeliveryTracker({ status }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status)
  const isCancelled = status === "cancelled"
  return (
    <div className="bg-white border border-[#E8E0D5] rounded-xl p-5 mt-3 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[#1A1A2E] text-sm font-semibold">Order Status</p>
        {isCancelled && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-medium">Cancelled</span>
        )}
      </div>
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const done = !isCancelled && idx <= currentIdx
          const active = !isCancelled && idx === currentIdx
          const Icon = step.icon
          const lineColor = done && idx < currentIdx ? step.activeLine : "bg-[#E8E0D5]"
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {/* Left connector line */}
                <div className={`w-full h-1 rounded-full ${idx === 0 ? "opacity-0" : done ? STATUS_STEPS[idx - 1].activeLine : "bg-[#E8E0D5]"}`} />
                {/* Step circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all shadow-sm ${
                  active ? step.activeColor :
                  done ? step.doneColor :
                  "border-[#D1D5DB] bg-[#F3F4F6]"
                }`}>
                  <Icon size={16} className={done || active ? "text-white" : "text-[#9CA3AF]"} />
                </div>
                {/* Right connector line */}
                <div className={`w-full h-1 rounded-full ${idx === STATUS_STEPS.length - 1 ? "opacity-0" : done && idx < currentIdx ? step.activeLine : "bg-[#E8E0D5]"}`} />
              </div>
              <p className={`text-xs mt-2 text-center ${
                active ? step.activeText :
                done ? step.doneText :
                "text-[#9CA3AF]"
              }`}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
      {!isCancelled && currentIdx >= 0 && (
        <p className="text-center text-xs text-gray-400 mt-3 italic">{STATUS_STEPS[currentIdx].desc}</p>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState("")

  const filteredOrders = search.trim()
    ? orders.filter(o => (o.display_order_id || "").toLowerCase().includes(search.toLowerCase().trim()))
    : orders

  useEffect(() => {
    if (!user) return
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, product_id, products(id, name, images, price))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    fetchOrders()

    const channel = supabase
      .channel("orders-user")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const getStatusBadge = (order) => {
    if (order.payment_status === "pending") return { label: "Pending Payment", color: "bg-yellow-500 text-white", icon: Clock }
    if (order.payment_status === "failed") return { label: "Payment Failed", color: "bg-red-500 text-white", icon: XCircle }
    if (order.order_status === "cancelled") return { label: "Cancelled", color: "bg-red-500 text-white", icon: XCircle }
    const status = order.order_status || "confirmed"
    const map = {
      confirmed: { label: "Order Confirmed", color: "bg-blue-500 text-white", icon: CheckCircle },
      shipping: { label: "Shipped", color: "bg-orange-500 text-white", icon: Truck },
      delivered: { label: "Delivered", color: "bg-green-500 text-white", icon: Package },
    }
    return map[status] || { label: status, color: "bg-gray-500 text-white", icon: Package }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white border border-[#E8E0D5] rounded-xl p-6 animate-pulse shadow-sm">
            <div className="h-4 bg-[#F2EDE6] rounded w-1/3 mb-3" />
            <div className="h-3 bg-[#F2EDE6] rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package size={64} className="text-[#C9956C] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2" style={{ fontFamily: "Georgia, serif" }}>No orders yet</h2>
        <p className="text-[#8A8AAA]">Your order history will appear here</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1A1A2E] mb-6" style={{ fontFamily: "Georgia, serif" }}>My Orders</h1>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order ID (e.g. NS0-001)..."
          className="w-full bg-white border border-[#E8E0D5] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#8A8AAA] focus:outline-none focus:border-[#1B2B5E]"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8AAA] hover:text-[#1A1A2E] text-xs">✕</button>
        )}
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 && search && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No orders found for "{search}"</p>
            <button onClick={() => setSearch("")} className="mt-3 text-[#D4AF37] text-xs hover:underline">Clear search</button>
          </div>
        )}
        {filteredOrders.map((order, i) => {
          const addr = (() => { try { return typeof order.address === "object" ? order.address : JSON.parse(order.address) } catch { return {} } })()
          const statusInfo = getStatusBadge(order)
          const StatusIcon = statusInfo.icon
          return (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white border border-[#E8E0D5] rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div>
                  <p className="text-[#1A1A2E] font-medium text-sm">{order.display_order_id || `Order #${order.id?.slice(-8)?.toUpperCase()}`}</p>
                  <p className="text-[#8A8AAA] text-xs mt-1">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[#1B2B5E] font-semibold">{formatINR(order.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 mt-1 font-medium ${statusInfo.color}`} style={{ color: "#ffffff" }}>
                      <StatusIcon size={10} /> {statusInfo.label}
                    </span>
                  </div>
                  {expanded === order.id ? <ChevronUp size={16} className="text-[#8A8AAA]" /> : <ChevronDown size={16} className="text-[#8A8AAA]" />}
                </div>
              </div>

              <AnimatePresence>
                {expanded === order.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-[#E8E0D5] p-5 space-y-4 bg-[#FAF8F5]">

                      {/* Delivery Tracker */}
                      {order.payment_status === "paid" && (
                        <DeliveryTracker status={order.order_status || "confirmed"} />
                      )}

                      {/* Tracking info — shown when shipped */}
                      {order.order_status === "shipping" && (order.tracking_id || order.tracking_image_url) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                          <p className="text-yellow-700 text-xs font-semibold flex items-center gap-1">
                            <Truck size={12} /> Shipment Tracking
                          </p>
                          {order.tracking_id && (
                            <div className="flex items-center gap-2">
                              <p className="text-[#4A4A6A] text-xs">Tracking ID:</p>
                              <p className="text-[#1A1A2E] text-xs font-mono font-semibold">{order.tracking_id}</p>
                            </div>
                          )}
                          {order.tracking_image_url && (
                            <img src={order.tracking_image_url} alt="Tracking" className="w-full max-h-48 object-contain rounded-lg border border-yellow-200" />
                          )}
                        </div>
                      )}

                      {/* Cancelled state */}
                      {order.order_status === "cancelled" && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                          <p className="text-red-400 text-sm font-medium flex items-center gap-1.5">
                            <XCircle size={14} /> Order Cancelled
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {order.refund_status === "refunded"
                              ? "✓ Refund processed. Amount will reflect in 5-7 business days."
                              : "Refund is being processed. You will receive it within 5-7 business days."}
                          </p>
                        </div>
                      )}

                      {/* Order items */}
                      <div className="space-y-3">
                        {order.order_items?.map(item => (
                          <Link
                            key={item.id}
                            to={`/products/${item.product_id || item.products?.id}`}
                            className="flex items-center gap-3 hover:bg-[#FAF8F5] rounded-lg p-1 -mx-1 transition-colors group"
                          >
                            {item.products?.images?.[0] && (
                              isVideoUrl(item.products.images[0]) ? (
                                <video
                                  src={item.products.images[0]}
                                  muted playsInline loop autoPlay
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#E8E0D5] group-hover:border-[#C9956C] transition-colors bg-black"
                                />
                              ) : (
                                <img src={item.products.images[0]} alt={item.products?.name}
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#E8E0D5] group-hover:border-[#C9956C] transition-colors"
                                  onError={e => { e.target.src = "https://images.unsplash.com/photo-1515562153-702640cf-b037-4b1e-83b0-418397cf1be3?w=400&q=80" }} />
                              )
                            )}
                            <div className="flex-1">
                              <p className="text-[#1A1A2E] text-sm group-hover:text-[#1B2B5E] transition-colors">{item.products?.name || "Product"}</p>
                              <p className="text-[#8A8AAA] text-xs">Qty: {item.quantity} × {formatINR(item.price)}</p>
                            </div>
                            <p className="text-[#1B2B5E] text-sm font-medium">{formatINR(item.quantity * item.price)}</p>
                          </Link>
                        ))}
                      </div>

                      {/* Price breakdown */}
                      {(() => {
                        const itemsSubtotal = (order.order_items || []).reduce(
                          (s, i) => s + (i.price || 0) * (i.quantity || 1), 0
                        )
                        const total = order.total_amount || 0
                        // Try to reconstruct shipping + discount
                        // Shipping is always 80 (AP/TS) or 100 (other states)
                        let shipping = 0, discount = 0
                        const diff80 = itemsSubtotal + 80 - total
                        const diff100 = itemsSubtotal + 100 - total
                        if (diff80 === 0) { shipping = 80; discount = 0 }
                        else if (diff100 === 0) { shipping = 100; discount = 0 }
                        else if (diff80 > 0) { shipping = 80; discount = diff80 }
                        else if (diff100 > 0) { shipping = 100; discount = diff100 }
                        else {
                          // total > itemsSubtotal + 100 — shouldn't happen, just show diff
                          shipping = total - itemsSubtotal
                          discount = 0
                        }
                        return (
                          <div className="bg-white border border-[#E8E0D5] rounded-xl p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-[#4A4A6A]">
                              <span>Items subtotal</span>
                              <span>{formatINR(itemsSubtotal)}</span>
                            </div>
                            {shipping > 0 && (
                              <div className="flex justify-between text-[#C9956C]">
                                <span>Shipping</span>
                                <span>+{formatINR(shipping)}</span>
                              </div>
                            )}
                            {discount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount applied</span>
                                <span>-{formatINR(discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-[#1A1A2E] border-t border-[#E8E0D5] pt-2 mt-1">
                              <span>Order Total</span>
                              <span className="text-[#1B2B5E] text-base">{formatINR(total)}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {addr.full_name && (
                        <div className="bg-white border border-[#E8E0D5] rounded-lg p-3 text-xs">
                          <p className="text-[#4A4A6A] font-medium mb-1">Delivery Address</p>
                          <p className="text-[#1A1A2E]">{addr.full_name}, {addr.phone}</p>
                          <p className="text-[#4A4A6A]">{addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}</p>
                          <p className="text-[#4A4A6A]">{addr.city}, {addr.state} – {addr.pincode}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
