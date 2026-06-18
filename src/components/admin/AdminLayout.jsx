import { useState, useRef, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Users, Bell, Menu, X, LogOut, ChevronRight, AlertTriangle, Store, Image, Tag, Ticket } from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import { useAdminStore } from "../../store/adminStore"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const NAV = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/products", label: "Products", icon: Package },
  { path: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { path: "/admin/categories", label: "Categories", icon: Tag },
  { path: "/admin/promo-codes", label: "Promo Codes", icon: Ticket },
  { path: "/admin/banners", label: "Banners", icon: Image },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/users", label: "Users", icon: Users },
]

function Sidebar({ pathname, onSignOut, onNavClick, onToggle }) {
  return (
    <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
      className="flex-shrink-0 bg-[#1B2B5E] flex flex-col overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <Link
          to="/admin"
          onClick={onNavClick}
          className="flex items-center gap-2 select-none"
        >
          <span className="text-white font-bold text-lg hover:text-blue-200 transition-colors" style={{ fontFamily: "Georgia, serif" }}>NaShe Jewels</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = pathname === path || (path !== "/admin" && pathname.startsWith(path))
          return (
            <Link key={path} to={path} onClick={onNavClick}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all " + (active ? "bg-white text-[#1B2B5E] font-semibold shadow-sm" : "text-blue-100 hover:text-white hover:bg-white/10")}>
              <Icon size={17} /><span>{label}</span>{active && <ChevronRight size={13} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:text-white hover:bg-white/10 transition-all">
          <Store size={17} /> Switch to User
        </Link>
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:text-white hover:bg-white/10 transition-all">
          <LogOut size={17} /> Logout
        </button>
      </div>
    </motion.aside>
  )
}

export default function AdminLayout({ children }) {
  // Default: open on desktop (lg+), always closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

  // Close sidebar when resizing to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { pathname } = useLocation()
  const { signOut, user } = useAuthStore()
  const { notifications, clearNotification, addNotification } = useAdminStore()
  const navigate = useNavigate()
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler) }
  }, [])

  // Toggle notification panel — clear all when panel closes (admin has seen them)
  const handleBellClick = () => {
    if (notifOpen) {
      // Closing — clear all notifications now (read from store directly to avoid stale closure)
      const current = useAdminStore.getState().notifications
      current.forEach(n => clearNotification(n.id))
    }
    setNotifOpen(o => !o)
  }

  const getNotifLink = (n) => {
    const msg = n.msg?.toLowerCase() || ""
    if (msg.includes("stock")) return "/admin/products"
    if (msg.includes("order")) return "/admin/orders"
    if (msg.includes("user")) return "/admin/users"
    return "/admin"
  }

  const handleNotifClick = (n) => {
    clearNotification(n.id)
    setNotifOpen(false)
    navigate(getNotifLink(n))
  }

  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); navigate("/") }

  // Realtime: fire notification when a new order is inserted
  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
      }, (payload) => {
        const order = payload.new
        const addrObj = (() => { try { return typeof order.address === "string" ? JSON.parse(order.address) : (order.address || {}) } catch { return {} } })()
        const name = addrObj.full_name || "A customer"
        const amount = order.total_amount ? `₹${Math.ceil(order.total_amount).toLocaleString("en-IN")}` : ""
        const orderId = order.display_order_id || `#${String(order.id).slice(-6).toUpperCase()}`
        addNotification(`🛍️ New order ${orderId} from ${name} ${amount}`, "info")
        // Also reload orders in store
        useAdminStore.getState().loadOrders(true)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <div className="flex h-screen bg-[#F4F6FA] overflow-hidden">
      <AnimatePresence initial={false}>
        {sidebarOpen && <Sidebar pathname={pathname} onSignOut={handleSignOut} onNavClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }} onToggle={() => setSidebarOpen(o => !o)} />}
      </AnimatePresence>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-500 hover:text-[#1B2B5E] p-1 transition-colors">
              <Menu size={20} />
            </button>
            <span className="text-gray-600 text-sm font-medium hidden sm:block">
              {NAV.find(n => pathname === n.path || (n.path !== "/admin" && pathname.startsWith(n.path)))?.label || "Admin Panel"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button onClick={handleBellClick} className="relative text-gray-500 hover:text-[#1B2B5E] p-1 transition-colors">
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="text-gray-800 text-sm font-medium">Notifications</span>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <button onClick={() => notifications.forEach(n => clearNotification(n.id))}
                            className="text-xs text-[#1B2B5E] hover:underline">
                            Clear all
                          </button>
                        )}
                        <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0
                        ? <p className="text-gray-400 text-xs text-center py-6">No notifications</p>
                        : notifications.map(n => (
                          <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer"
                            onClick={() => handleNotifClick(n)}>
                            <AlertTriangle size={14} className={n.type === "warning" ? "text-yellow-500 mt-0.5" : "text-[#C9956C] mt-0.5"} />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-700 text-xs">{n.msg}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{new Date(n.time).toLocaleTimeString()}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); clearNotification(n.id) }} className="text-gray-300 hover:text-gray-500">
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 bg-[#1B2B5E] rounded-full flex items-center justify-center border-2 border-[#C9956C]">
                  <span className="text-white text-xs font-bold">
                    {(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "U")[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-600 text-xs hidden sm:block font-medium">
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0]}
                </span>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-gray-800 text-xs font-semibold truncate">
                        {user?.user_metadata?.full_name || user?.user_metadata?.name || "Admin"}
                      </p>
                      <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); handleSignOut() }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
