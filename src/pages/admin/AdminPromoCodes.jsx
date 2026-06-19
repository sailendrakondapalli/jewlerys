import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Pencil, Loader2, X, Check, Tag, ToggleLeft, ToggleRight } from "lucide-react"
import { fetchAllCodes, createPromoCode, updatePromoCode, deletePromoCode } from "../../services/promoService"
import { useCategoryStore } from "../../store/categoryStore"
import { formatINR } from "../../utils/format"
import toast from "react-hot-toast"

const EMPTY_FORM = {
  code: "", description: "", discount_type: "percentage", discount_value: "",
  min_order_amount: "", applicable_category: "", is_one_time: false,
  is_active: true, expires_at: ""
}

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCode, setEditCode] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { categories, loadCategories } = useCategoryStore()

  useEffect(() => { load(); loadCategories() }, [])

  const load = async () => {
    setLoading(true)
    try { setCodes(await fetchAllCodes()) } catch { toast.error("Failed to load codes") }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditCode(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (c) => {
    setEditCode(c)
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      applicable_category: c.applicable_category || "", is_one_time: c.is_one_time,
      is_active: c.is_active, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : ""
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return }
    if (!form.discount_value || isNaN(form.discount_value) || Number(form.discount_value) <= 0) {
      toast.error("Valid discount value required"); return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        applicable_category: form.applicable_category || null,
        is_one_time: form.is_one_time,
        is_active: form.is_active,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }
      if (editCode) { await updatePromoCode(editCode.id, payload); toast.success("Code updated") }
      else { await createPromoCode(payload); toast.success("Code created") }
      setShowModal(false)
      load()
    } catch (e) { toast.error(e.message || "Failed to save") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await deletePromoCode(id); toast.success("Code deleted"); setCodes(c => c.filter(x => x.id !== id)); setDeleteConfirm(null) }
    catch (e) { toast.error(e.message || "Failed to delete") }
  }

  const toggleActive = async (code) => {
    try {
      await updatePromoCode(code.id, { is_active: !code.is_active })
      setCodes(cs => cs.map(c => c.id === code.id ? { ...c, is_active: !code.is_active } : c))
    } catch { toast.error("Failed to update") }
  }

  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(codes.length / PAGE_SIZE)
  const pagedCodes = codes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#1B2B5E]"
  const lbl = "text-xs text-gray-400 mb-1 block"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2B5E]" style={{ fontFamily: "Georgia, serif" }}>Promo Codes</h1>
          <p className="text-gray-500 text-sm mt-1">{codes.length} total codes</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#1B2B5E] text-white font-semibold rounded-lg hover:bg-[#2A3F7E] transition-all text-sm">
          <Plus size={15} /> Add Code
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-[#1B2B5E]" /></div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No promo codes yet. Add one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-gray-700 text-sm font-semibold px-5 py-3">Code</th>
                <th className="text-left text-gray-700 text-sm font-semibold px-5 py-3">Discount</th>
                <th className="text-left text-gray-700 text-sm font-semibold px-5 py-3">Conditions</th>
                <th className="text-left text-gray-700 text-sm font-semibold px-5 py-3">Uses</th>
                <th className="text-left text-gray-700 text-sm font-semibold px-5 py-3">Status</th>
                <th className="text-right text-gray-700 text-sm font-semibold px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {pagedCodes.map(c => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-[#1B2B5E] text-sm bg-[#1B2B5E]/8 px-2 py-0.5 rounded w-fit">{c.code}</span>
                        {c.description && <p className="text-gray-400 text-xs">{c.description}</p>}
                        {c.is_one_time && <span className="text-xs text-[#C9956C] bg-[#C9956C]/10 px-2 py-0.5 rounded-full w-fit">One-time</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#1B2B5E]">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs space-y-0.5">
                      {c.min_order_amount > 0 && <p>Min order: {formatINR(c.min_order_amount)}</p>}
                      {c.applicable_category && <p>Category: {c.applicable_category}</p>}
                      {c.expires_at && <p>Expires: {new Date(c.expires_at).toLocaleDateString('en-IN')}</p>}
                      {!c.min_order_amount && !c.applicable_category && !c.expires_at && <p className="text-gray-300">No conditions</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-sm">
                      {c.promo_code_uses?.[0]?.count || 0}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleActive(c)} className="flex items-center gap-1.5 text-xs font-medium transition-colors">
                        {c.is_active
                          ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">Active</span></>
                          : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="text-[#C9956C] hover:text-[#b5824f] p-1"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, codes.length)} of {codes.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:border-[#1B2B5E] disabled:opacity-40">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-2.5 py-1 text-xs rounded border transition-all ${p === page ? "bg-[#1B2B5E] text-white border-[#1B2B5E]" : "border-gray-200 text-gray-500 hover:border-[#1B2B5E]"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:border-[#1B2B5E] disabled:opacity-40">›</button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-[#1B2B5E] font-semibold">{editCode ? "Edit Promo Code" : "Add Promo Code"}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={lbl}>Code *</label>
                    <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. WELCOME10" className={inp} readOnly={!!editCode} />
                    {editCode && <p className="text-xs text-gray-400 mt-0.5">Code cannot be changed after creation</p>}
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Description (shown to customers)</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Welcome discount for new customers" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Discount Type</label>
                    <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className={inp}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Discount Value *</label>
                    <input type="number" min="1" value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === 'percentage' ? "e.g. 10" : "e.g. 100"} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Min Order Amount (₹)</label>
                    <input type="number" min="0" value={form.min_order_amount}
                      onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                      placeholder="0 = no minimum" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Applicable Category</label>
                    <select value={form.applicable_category} onChange={e => setForm(f => ({ ...f, applicable_category: e.target.value }))} className={inp}>
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Expiry Date (optional)</label>
                    <input type="date" value={form.expires_at}
                      onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className={inp} />
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_one_time}
                        onChange={e => setForm(f => ({ ...f, is_one_time: e.target.checked }))} className="accent-[#C9956C] w-4 h-4" />
                      <span className="text-sm text-[#1A1A2E] font-medium">One-time use per user</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_active}
                        onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-green-500 w-4 h-4" />
                      <span className="text-sm text-[#1A1A2E] font-medium">Active (visible to customers)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-400 rounded-lg text-sm hover:border-gray-300">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1B2B5E] text-white font-semibold rounded-lg text-sm hover:bg-[#2A3F7E] disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editCode ? "Update Code" : "Create Code"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
              <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-[#1B2B5E] font-semibold mb-2">Delete this promo code?</h3>
              <p className="text-gray-400 text-sm mb-5">This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-gray-200 text-gray-400 rounded-lg text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
