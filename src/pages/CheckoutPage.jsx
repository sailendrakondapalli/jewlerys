import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { MapPin, Plus, Check, CheckCircle, Upload, Copy, Smartphone, AlertCircle, Loader2, Zap } from "lucide-react"
import { useCartStore } from "../store/cartStore"
import { useAuthStore } from "../store/authStore"
import { saveOrder } from "../services/orderService"
import { fetchAddresses, saveAddress } from "../services/addressService"
import { supabase } from "../lib/supabase"
import { formatINR } from "../utils/format"
import toast from "react-hot-toast"

const UPI_ID = "Q487529392@ybl"
const ADMIN_WHATSAPP = "918639006849"
// Generate QR dynamically from UPI ID using Google Charts API
const getQRUrl = (upiId, amount) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=NaShe+Jewels&am=${Math.ceil(amount)}&cu=INR&tn=NaShe+Jewels+Order`)}`

const EMPTY_ADDR = { label: "Home", full_name: "", phone: "", address1: "", address2: "", city: "", state: "", pincode: "", is_default: false }

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
]

function NewAddressForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState(EMPTY_ADDR)
  const [errors, setErrors] = useState({})
  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = "Required"
    if (!form.phone.match(/^\d{10}$/)) e.phone = "10-digit number"
    if (!form.address1.trim()) e.address1 = "Required"
    if (!form.city.trim()) e.city = "Required"
    if (!form.state.trim()) e.state = "Required"
    if (!form.pincode.match(/^\d{6}$/)) e.pincode = "6-digit PIN"
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const handleSubmit = (e) => { e.preventDefault(); if (validate()) onSave(form) }
  const inp = "w-full bg-white border border-[#E8E0D5] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#8A8AAA] focus:outline-none focus:border-[#1B2B5E]"
  const lbl = "text-xs text-[#4A4A6A] mb-1 block font-medium"
  return (
    <form onSubmit={handleSubmit} className="border border-[#E8E0D5] rounded-xl p-4 bg-[#FAF8F5] space-y-3">
      <div className="flex gap-2 mb-1">
        {["Home","Work","Other"].map(l => (
          <button key={l} type="button" onClick={() => setForm(f => ({ ...f, label: l }))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${form.label === l ? "bg-[#1B2B5E] text-white" : "bg-white text-[#4A4A6A] border border-[#E8E0D5]"}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className={lbl}>Full Name *</label><input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Your name" className={inp} />{errors.full_name&&<p className="text-red-400 text-xs mt-0.5">{errors.full_name}</p>}</div>
        <div><label className={lbl}>Phone *</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10-digit number" maxLength={10} inputMode="numeric" type="tel" className={inp} />{errors.phone&&<p className="text-red-400 text-xs mt-0.5">{errors.phone}</p>}</div>
        <div className="col-span-2"><label className={lbl}>Address Line 1 *</label><input value={form.address1} onChange={e=>setForm(f=>({...f,address1:e.target.value}))} placeholder="House/Flat, Street" className={inp} />{errors.address1&&<p className="text-red-400 text-xs mt-0.5">{errors.address1}</p>}</div>
        <div className="col-span-2"><label className={lbl}>Address Line 2</label><input value={form.address2} onChange={e=>setForm(f=>({...f,address2:e.target.value}))} placeholder="Landmark (optional)" className={inp} /></div>
        <div><label className={lbl}>City *</label><input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="City" className={inp} />{errors.city&&<p className="text-red-400 text-xs mt-0.5">{errors.city}</p>}</div>
        <div>
          <label className={lbl}>State *</label>
          <select value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} className={inp}>
            <option value="">Select State</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state&&<p className="text-red-400 text-xs mt-0.5">{errors.state}</p>}
        </div>
        <div><label className={lbl}>PIN Code *</label><input value={form.pincode} onChange={e=>setForm(f=>({...f,pincode:e.target.value.replace(/\D/g,"").slice(0,6)}))} placeholder="6-digit PIN" maxLength={6} inputMode="numeric" type="tel" className={inp} />{errors.pincode&&<p className="text-red-400 text-xs mt-0.5">{errors.pincode}</p>}</div>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="accent-[#D4AF37]" />
        Save as default address
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-[#E8E0D5] text-[#4A4A6A] rounded-lg text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#1B2B5E] text-white font-semibold rounded-lg text-sm hover:bg-[#2A3F7E] disabled:opacity-60">Save & Use</button>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const { items: cartItems, getTotal, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Buy Now mode: single product passed via navigation state, bypasses cart
  const buyNowData = location.state?.buyNow || null
  const isBuyNow = !!buyNowData

  // Normalise items into the same shape as cart items so the rest of the page works identically
  const items = isBuyNow
    ? [{ id: `buynow_${buyNowData.product.id}`, product_id: buyNowData.product.id, quantity: buyNowData.quantity, products: buyNowData.product }]
    : cartItems

  const total = items.reduce((s, i) => s + (i.products?.price || 0) * i.quantity, 0)
  const fileRef = useRef(null)

  // Shipping cost based on state
  const getShippingCost = (addr) => {
    if (!addr) return 100
    const state = (addr.state || "").toLowerCase().trim()
    const localStates = ["andhra pradesh", "telangana", "ap", "ts"]
    return localStates.some(s => state.includes(s)) ? 80 : 100
  }

  const [addresses, setAddresses] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState("address") // address | payment | success
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [upiRef, setUpiRef] = useState("")
  const [orderSeries, setOrderSeries] = useState("NS0")
  const [submitting, setSubmitting] = useState(false)
  const [savingAddr, setSavingAddr] = useState(false)
  const [qrRevealed, setQrRevealed] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id
    fetchAddresses(userId).then(addrs => {
      setAddresses(addrs)
      // Only set default if nothing is selected yet — prevents resetting on re-render or tab focus
      setSelectedId(prev => {
        if (prev && addrs.find(a => a.id === prev)) return prev
        const def = addrs.find(a => a.is_default) || addrs[0]
        return def ? def.id : null
      })
      if (addrs.length === 0) setShowNewForm(true)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.id])

  const handleSaveNew = async (form) => {
    setSavingAddr(true)
    try {
      const newAddr = await saveAddress(user.id, form)
      const updated = form.is_default ? [newAddr, ...addresses.map(a => ({ ...a, is_default: false }))] : [...addresses, newAddr]
      setAddresses(updated)
      setSelectedId(newAddr.id)
      setShowNewForm(false)
      toast.success("Address saved")
    } catch (e) { toast.error(e.message || "Failed") }
    finally { setSavingAddr(false) }
  }

  const handleScreenshotChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return }
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const handleSubmitOrder = async () => {
    if (!screenshot) { toast.error("Please upload payment screenshot"); return }
    const addr = addresses.find(a => a.id === selectedId)
    if (!addr) { toast.error("Please select delivery address"); return }
    setSubmitting(true)
    try {
      const shipping = getShippingCost(addr)

      // Upload screenshot to Supabase Storage (product-images bucket is public)
      const ext = screenshot.name.split(".").pop()
      const path = `payment-screenshots/${user.id}_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, screenshot, { contentType: screenshot.type })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path)

      // Split items by series based on admin-assigned custom_id prefix
      // NS1-xxx = HYD series, NS0-xxx (or anything else) = Home series
      const ns1Items = items.filter(i =>
        (i.products?.custom_id || "").toUpperCase().startsWith("NS1")
      )
      const ns0Items = items.filter(i => !ns1Items.includes(i))

      // Build list of [series, itemsForSeries] pairs — skip empty
      const orderGroups = []
      if (ns0Items.length > 0) orderGroups.push(["NS0", ns0Items])
      if (ns1Items.length > 0) orderGroups.push(["NS1", ns1Items])
      if (orderGroups.length === 0) orderGroups.push(["NS0", items]) // fallback

      const createdOrderIds = []

      for (const [series, groupItems] of orderGroups) {
        const groupSubtotal = groupItems.reduce((s, i) => s + (i.products?.price || 0) * i.quantity, 0)
        // Distribute shipping proportionally — or add full shipping to first group only
        const isFirstGroup = createdOrderIds.length === 0
        const groupTotal = groupSubtotal + (isFirstGroup ? shipping : 0)

        // Generate sequential order ID: NS0-001, NS0-002 / NS1-001, NS1-002
        const { data: seqData, error: seqErr } = await supabase.rpc("get_next_series_number", { p_series: series })
        if (seqErr) throw seqErr
        const displayOrderId = `${series}-${String(seqData).padStart(3, "0")}`

        const { data: order, error: orderErr } = await supabase.from("orders").insert({
          user_id: user.id,
          total_amount: groupTotal,
          payment_status: "pending_verification",
          payment_method: "upi",
          payment_screenshot_url: urlData.publicUrl,
          upi_ref: upiRef.trim(),
          address: JSON.stringify(addr),
          order_status: "pending",
          order_series: series,
          display_order_id: displayOrderId,
        }).select().single()
        if (orderErr) throw orderErr

        const orderItems = groupItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.products?.price || 0,
        }))
        await supabase.from("order_items").insert(orderItems)
        createdOrderIds.push(displayOrderId)
      }

      const displayOrderId = createdOrderIds.join(" + ")

      // Clear cart only for normal cart checkout — Buy Now doesn't touch the cart
      if (!isBuyNow) await clearCart(user.id)

      setStep("success")
      toast.success("Order placed! Awaiting payment verification.")
    } catch (e) {
      toast.error(e.message || "Failed to place order")
    } finally { setSubmitting(false) }
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <CheckCircle size={80} className="text-green-400 mx-auto mb-6" />
        </motion.div>
        <h2 className="text-3xl font-bold text-[#1A1A2E] mb-3" style={{ fontFamily: "Georgia, serif" }}>Order Placed!</h2>
        <p className="text-[#4A4A6A] mb-2">Your order is pending payment verification.</p>
        <p className="text-[#8A8AAA] text-sm mb-8">We will confirm your order once payment is verified. You will be notified.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate("/orders")} className="px-6 py-3 bg-[#1B2B5E] text-white font-semibold rounded-lg hover:bg-[#2A3F7E] transition-all">View Orders</button>
          <button onClick={() => navigate("/")} className="px-6 py-3 border border-[#1B2B5E] text-[#1B2B5E] rounded-lg hover:bg-[#1B2B5E]/10 transition-all">Continue Shopping</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#1A1A2E] mb-8" style={{ fontFamily: "Georgia, serif" }}>
        {isBuyNow ? "Buy Now" : "Checkout"}
      </h1>
      {isBuyNow && (
        <div className="mb-6 flex items-center gap-2 bg-[#1B2B5E]/5 border border-[#1B2B5E]/20 rounded-lg px-4 py-2.5 text-sm text-[#1B2B5E]">
          <Zap size={14} className="flex-shrink-0" />
          Buying <span className="font-semibold mx-1">{buyNowData.product.name}</span> directly — your cart is unchanged.
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {["address","payment"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (s === "address" && step === "payment") ? "bg-[#1B2B5E] text-white" : "bg-[#E8E0D5] text-[#8A8AAA] border border-[#E8E0D5]"}`}>
              {i + 1}
            </div>
            <span className={`text-sm capitalize ${step === s ? "text-[#1A1A2E] font-medium" : "text-[#8A8AAA]"}`}>{s === "address" ? "Delivery Address" : "Payment"}</span>
            {i === 0 && <div className="w-8 h-px bg-[#E8E0D5] mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {step === "address" && (
            <div className="bg-white border border-[#E8E0D5] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1A1A2E] font-semibold flex items-center gap-2"><MapPin size={16} className="text-[#C9956C]" /> Delivery Address</h2>
                {!showNewForm && <button onClick={() => setShowNewForm(true)} className="flex items-center gap-1 text-xs text-[#1B2B5E] font-medium"><Plus size={13} /> Add New</button>}
              </div>
              {loading ? <div className="h-20 bg-[#F2EDE6] rounded-xl animate-pulse" /> : (
                <div className="space-y-3">
                  {showNewForm && <NewAddressForm onSave={handleSaveNew} onCancel={() => addresses.length > 0 && setShowNewForm(false)} saving={savingAddr} />}
                  {addresses.map(addr => (
                    <div key={addr.id} onClick={() => { setSelectedId(addr.id); setShowNewForm(false) }}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedId === addr.id ? "border-[#1B2B5E] bg-[#1B2B5E]/5" : "border-[#E8E0D5] bg-[#FAF8F5] hover:border-[#1B2B5E]/30"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-xs px-2 py-0.5 bg-[#1B2B5E]/10 text-[#1B2B5E] rounded-full font-medium">{addr.label}</span>
                          <p className="text-[#1A1A2E] text-sm font-medium mt-1">{addr.full_name} &middot; {addr.phone}</p>
                          <p className="text-[#4A4A6A] text-xs">{addr.address1}, {addr.city}, {addr.state} &ndash; {addr.pincode}</p>
                        </div>
                        {selectedId === addr.id && <div className="w-5 h-5 bg-[#1B2B5E] rounded-full flex items-center justify-center ml-3"><Check size={12} className="text-white" /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { if (!selectedId) { toast.error("Select an address"); return } setStep("payment") }}
                disabled={!selectedId || loading}
                className="w-full mt-4 py-3 bg-[#1B2B5E] text-white font-semibold rounded-lg hover:bg-[#2A3F7E] transition-all disabled:opacity-50">
                Continue to Payment &rarr;
              </button>
            </div>
          )}

          {step === "payment" && (() => {
            const selectedAddr = addresses.find(a => a.id === selectedId)
            const shipping = getShippingCost(selectedAddr)
            const grandTotal = Math.ceil(total + shipping)
            const upiDeepLink = `upi://pay?pa=${UPI_ID}&pn=NaShe+Jewels&am=${grandTotal}&cu=INR&tn=NaShe+Jewels+Order`
            return (
              <div className="space-y-4">
                {/* Header card */}
                <div className="rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-[#1B2B5E] px-6 py-5 text-center">
                    <Smartphone size={28} className="text-[#D4AF37] mx-auto mb-2" />
                    <h2 className="text-white font-bold text-xl">Pay via UPI</h2>
                    <p className="text-blue-200 text-sm">Scan QR or use UPI ID below</p>
                  </div>

                  <div className="bg-white px-6 py-6 space-y-5">
                    {/* Amount */}
                    <div className="text-center">
                      <p className="text-[#4A4A6A] text-sm font-medium mb-1">Amount to Pay</p>
                      <p className="text-[#1B2B5E] text-5xl font-bold" style={{ fontFamily: "Georgia, serif" }}>
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white p-3 rounded-2xl border-2 border-[#E8E0D5] shadow-sm inline-block">
                        <img src={getQRUrl(UPI_ID, grandTotal)} alt="UPI QR Code" className="w-48 h-48 object-contain" />
                      </div>
                      <p className="text-[#4A4A6A] text-sm font-medium">Scan with any UPI app</p>
                      {/* App logos */}
                      <div className="flex items-center gap-3 mt-1">
                        {["GPay","PhonePe","Paytm","BHIM"].map(app => (
                          <span key={app} className="text-xs font-bold text-[#1B2B5E] bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-lg">{app}</span>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#C7D2FE]" />
                      <span className="text-[#4A4A6A] text-xs font-medium">Or pay using UPI ID</span>
                      <div className="flex-1 h-px bg-[#C7D2FE]" />
                    </div>

                    {/* UPI ID row */}
                    <div className="flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3">
                      <p className="flex-1 text-[#1B2B5E] font-mono text-sm font-bold">{UPI_ID}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(UPI_ID); toast.success("UPI ID copied!") }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C9956C] text-white text-xs font-bold rounded-lg hover:bg-[#b5824f] transition-all shadow-sm">
                        <Copy size={12} /> Copy
                      </button>
                    </div>

                    {/* Open UPI App button */}
                    <a href={upiDeepLink}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all text-sm">
                      <Zap size={15} /> Open UPI App (amount auto-filled)
                    </a>
                    <p className="text-[#8A8AAA] text-xs text-center -mt-2">
                      Tap above to open your UPI app with ₹{grandTotal.toLocaleString("en-IN")} pre-filled. If copying the UPI ID manually, enter the amount <strong>₹{grandTotal.toLocaleString("en-IN")}</strong> yourself.
                    </p>

                    {/* How to pay */}
                    <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl p-4">
                      <p className="text-[#1E3A8A] text-sm font-bold mb-2">How to pay:</p>
                      <ol className="text-[#1E40AF] text-sm space-y-1.5 list-decimal list-inside">
                        <li>Scan the QR code or tap "Open UPI App" above</li>
                        <li>Amount ₹{grandTotal.toLocaleString("en-IN")} will be auto-filled — confirm and pay</li>
                        <li>If entering UPI ID manually, type the amount ₹{grandTotal.toLocaleString("en-IN")} yourself</li>
                        <li>Take a screenshot of the success screen</li>
                        <li>Upload it below to confirm your order</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Screenshot upload card */}
                <div className="bg-white border border-[#E8E0D5] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-[#1A1A2E] font-semibold text-base flex items-center gap-2">
                    <Upload size={15} className="text-[#C9956C]" /> Upload Payment Screenshot <span className="text-red-500">*</span>
                  </h3>

                  {/* What screenshot must show */}
                  <div className="bg-[#FFF5F2] border border-[#FFCAB8] rounded-2xl p-4 space-y-2">
                    <p className="text-[#C0392B] text-sm font-bold flex items-center gap-1.5">
                      <span className="text-base">ⓘ</span> Screenshot must clearly show:
                    </p>
                    <ul className="space-y-1.5 ml-1">
                      {[
                        `Payment Success message`,
                        `Amount: ₹${grandTotal.toLocaleString("en-IN")}`,
                        `Paid to: ${UPI_ID}`,
                        `Transaction ID / UTR number`,
                      ].map((text, i) => (
                        <li key={i} className="text-[#059669] text-sm font-medium flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-[#34D399] rounded text-white text-xs font-bold flex-shrink-0">✓</span> {text}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-[#FFCAB8] pt-2 mt-1">
                      <p className="text-[#C0392B] text-sm font-semibold flex items-center gap-1.5">
                        <span className="text-base">⚠️</span> Wrong or unclear screenshots will be rejected and order cancelled.
                      </p>
                    </div>
                  </div>

                  {/* UPI Transaction Reference */}
                  <div>
                    <label className="text-xs text-[#4A4A6A] mb-1 block font-medium">UPI Transaction Reference (optional)</label>
                    <input value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="e.g. 123456789012"
                      className="w-full bg-white border border-[#E8E0D5] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#8A8AAA] focus:outline-none focus:border-[#1B2B5E]" />
                  </div>

                  {/* File upload area */}
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[#E8E0D5] hover:border-[#C9956C]/50 rounded-xl cursor-pointer transition-all bg-[#FAF8F5]">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotChange} />
                    {screenshotPreview ? (
                      <div className="relative">
                        <img src={screenshotPreview} alt="Screenshot preview" className="h-36 rounded-lg border border-[#E8E0D5] object-cover" />
                        <button type="button" onClick={e => { e.preventDefault(); setScreenshot(null); setScreenshotPreview(null) }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">×</button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-[#F2EDE6] flex items-center justify-center">
                          <Upload size={20} className="text-[#C9956C]" />
                        </div>
                        <p className="text-[#4A4A6A] text-sm font-medium">Click to upload payment screenshot</p>
                        <p className="text-[#8A8AAA] text-xs">PNG, JPG — max 10MB</p>
                      </>
                    )}
                  </label>
                </div>

                {/* CTA */}
                <div className="space-y-2">
                  <button onClick={handleSubmitOrder} disabled={submitting || !screenshot}
                    className="w-full py-4 bg-[#1B2B5E] text-white font-bold rounded-xl hover:bg-[#2A3F7E] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg">
                    {submitting
                      ? <><Loader2 size={18} className="animate-spin" /> Placing Order...</>
                      : <><CheckCircle size={18} /> I've Paid — Confirm Order</>
                    }
                  </button>
                  <p className="text-[#4A4A6A] text-xs text-center font-medium">Your order will be confirmed after admin verifies the payment</p>
                </div>

                <button onClick={() => setStep("address")} className="flex items-center gap-1 text-xs text-[#8A8AAA] hover:text-[#1B2B5E] transition-colors">
                  &larr; Back to checkout
                </button>
              </div>
            )
          })()}
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-[#E8E0D5] rounded-xl p-6 h-fit sticky top-20 shadow-sm">
          <h2 className="text-[#1A1A2E] font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {items.map(item => (
              <div key={item.id || item.product_id} className="flex justify-between text-sm">
                <span className="text-[#4A4A6A] truncate mr-2">{item.products?.name} &times; {item.quantity}</span>
                <span className="text-[#1A1A2E] shrink-0 font-medium">{formatINR((item.products?.price || 0) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E8E0D5] pt-4 space-y-2 mb-5">
            {(() => {
              const selectedAddr = addresses.find(a => a.id === selectedId)
              const shipping = getShippingCost(selectedAddr)
              const grandTotal = total + shipping
              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A4A6A]">Subtotal</span>
                    <span className="text-[#1A1A2E] font-medium">{formatINR(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A4A6A]">Shipping</span>
                    <span className="text-[#C9956C] font-medium">+{formatINR(shipping)}</span>
                  </div>
                  {selectedAddr && (
                    <p className="text-[#8A8AAA] text-xs">
                      {["andhra pradesh","telangana","ap","ts"].some(s => (selectedAddr.state||"").toLowerCase().includes(s))
                        ? "AP/Telangana rate"
                        : "Other states rate"}
                    </p>
                  )}
                  <div className="flex justify-between font-semibold pt-1 border-t border-[#E8E0D5]">
                    <span className="text-[#1A1A2E]">Total</span>
                    <span className="text-[#1B2B5E] text-lg font-bold">{formatINR(grandTotal)}</span>
                  </div>
                </>
              )
            })()}
          </div>
          <p className="text-[#8A8AAA] text-xs text-center">🔒 UPI Payment · Secure &amp; Safe</p>
        </div>
      </div>
    </div>
  )
}
