import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Pencil, Loader2, Check, X } from "lucide-react"
import { useCategoryStore } from "../../store/categoryStore"
import toast from "react-hot-toast"

function slugify(str) {
  return str.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

export default function AdminCategories() {
  const { categories, loading, loadCategories, addCategory, deleteCategory, isDefault } = useCategoryStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editName, setEditName] = useState(null) // category name being edited
  const [editValue, setEditValue] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadCategories() }, [])

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) { toast.error("Enter a category name"); return }
    if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists`); return
    }
    setSaving(true)
    try {
      await addCategory(trimmed)
      toast.success(`"${trimmed}" added`)
      setNewName("")
      setShowAddModal(false)
    } catch {
      toast.error("Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (name) => {
    try {
      await deleteCategory(name)
      toast.success(`"${name}" removed`)
      setDeleteConfirm(null)
    } catch {
      toast.error("Failed to delete category")
    }
  }

  const startEdit = (name) => {
    setEditName(name)
    setEditValue(name)
  }

  const cancelEdit = () => {
    setEditName(null)
    setEditValue("")
  }

  const handleEditSave = async () => {
    const trimmed = editValue.trim()
    if (!trimmed) { toast.error("Name cannot be empty"); return }
    if (trimmed === editName) { cancelEdit(); return }
    if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists`); return
    }
    setEditSaving(true)
    try {
      // Add new name, then remove old name
      await addCategory(trimmed)
      await deleteCategory(editName)
      toast.success(`Renamed to "${trimmed}"`)
      cancelEdit()
    } catch {
      toast.error("Failed to rename category")
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B5E]" style={{ fontFamily: "Georgia, serif" }}>Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Manage store categories.</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setNewName("") }}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9956C] text-white font-semibold rounded-lg hover:bg-[#b5824f] transition-all text-sm"
        >
          <Plus size={15} /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#1B2B5E]" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No categories yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-gray-500 text-xs font-medium px-6 py-3">Name</th>
                <th className="text-left text-gray-500 text-xs font-medium px-6 py-3">Slug</th>
                <th className="text-right text-gray-500 text-xs font-medium px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {categories.map(cat => (
                  <motion.tr
                    key={cat}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Name cell */}
                    <td className="px-6 py-3.5 font-medium text-[#1A1A2E]">
                      {editName === cat ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") cancelEdit() }}
                          className="border border-[#1B2B5E]/40 rounded-md px-2 py-1 text-sm w-full max-w-xs focus:outline-none focus:border-[#1B2B5E]"
                        />
                      ) : (
                        cat
                      )}
                    </td>

                    {/* Slug cell */}
                    <td className="px-6 py-3.5 text-gray-400 font-mono text-xs">
                      {slugify(editName === cat ? editValue || cat : cat)}
                    </td>

                    {/* Actions cell */}
                    <td className="px-6 py-3.5 text-right">
                      {editName === cat ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleEditSave}
                            disabled={editSaving}
                            className="text-green-500 hover:text-green-600 transition-colors p-1"
                            title="Save"
                          >
                            {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(cat)}
                            className="text-[#C9956C] hover:text-[#b5824f] transition-colors p-1"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => !isDefault(cat) && setDeleteConfirm(cat)}
                            className={`transition-colors p-1 ${isDefault(cat) ? "text-gray-200 cursor-not-allowed" : "text-red-400 hover:text-red-600"}`}
                            title={isDefault(cat) ? "Built-in category, cannot be removed" : "Delete"}
                            disabled={isDefault(cat)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1B2B5E] font-semibold text-base">Add New Category</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Category Name</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    placeholder="e.g. Anklets, Rings, Hair Accessories..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:border-[#1B2B5E]"
                  />
                  {newName.trim() && (
                    <p className="text-xs text-gray-400 mt-1">
                      Slug: <span className="font-mono text-gray-500">{slugify(newName)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-400 rounded-lg text-sm hover:border-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving || !newName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C9956C] text-white font-semibold rounded-lg text-sm hover:bg-[#b5824f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-red-200 rounded-xl p-6 max-w-sm w-full text-center"
            >
              <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-[#1B2B5E] font-semibold mb-1">Delete "{deleteConfirm}"?</h3>
              <p className="text-gray-400 text-sm mb-5">
                Products in this category won't be deleted, but they'll no longer appear under this category in the navbar or filters.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 border border-gray-200 text-gray-400 rounded-lg text-sm hover:border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
