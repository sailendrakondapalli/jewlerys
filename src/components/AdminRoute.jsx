import { Navigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"

const ADMIN_EMAILS = [
  "sailendrakondapalli@gmail.com",
  "adduriaswani@gmail.com",
  "susmithajewlaries@gmail.com",
  "nashejewels@gmail.com",
  "naveenreddygandluri51@gmail.com",
  "aswaniadduri11@gmail.com",
  "ssbmanogna@gmail.com",
]

export const isAdmin = (user) => {
  if (!user) return false
  return ADMIN_EMAILS.includes(user.email?.toLowerCase())
}

export default function AdminRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin(user)) return <Navigate to="/" replace />

  return children
}
