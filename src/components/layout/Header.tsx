import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { useToast } from '@/contexts/ToastContext'
import { LogOut, ChevronDown, Bell } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // best-effort logout
    }
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const roleLabel = user?.is_superuser ? 'Superuser' : user?.is_company_admin ? 'Admin' : 'User'
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <header className="h-14 bg-white border-b border-orange-100 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      {/* Left: breadcrumb area (can be filled later) */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
        <span className="text-sm font-semibold text-stone-700">
          {user?.company?.name ?? 'WMS-MKB'}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors relative">
          <Bell size={16} />
        </button>

        <div className="w-px h-5 bg-orange-100 mx-1" />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)' }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-stone-800 leading-tight">{user?.full_name}</p>
              <p className="text-[11px] text-orange-500 font-medium">{roleLabel}</p>
            </div>
            <ChevronDown
              size={14}
              className={`text-stone-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-orange-100 shadow-lg shadow-orange-900/10 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-orange-50">
                <p className="text-sm font-semibold text-stone-800">{user?.full_name}</p>
                <p className="text-xs text-stone-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
