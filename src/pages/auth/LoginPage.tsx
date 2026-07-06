import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/contexts/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getErrorMessage } from '@/lib/utils'
import { Warehouse, Package, TrendingUp, Shield, BarChart3 } from 'lucide-react'

const schema = z.object({
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

const features = [
  { icon: <Package size={18} />, title: 'Inventory Control', desc: 'Real-time stock tracking across all locations' },
  { icon: <TrendingUp size={18} />, title: 'Smart Analytics', desc: 'Insights and reports at your fingertips' },
  { icon: <Shield size={18} />, title: 'Role-Based Access', desc: 'Granular permissions for every team member' },
  { icon: <BarChart3 size={18} />, title: 'Order Management', desc: 'Seamless purchase and sales order workflows' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const tokens = await authApi.login(data)
      useAuthStore.getState().setAccessToken(tokens.access_token)
      const user = await authApi.me()
      setAuth(user, tokens.access_token, tokens.refresh_token)
      toast.success(`Welcome back, ${user.full_name}!`)
      navigate('/')
    } catch (err) {
      useAuthStore.getState().setAccessToken(null)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #7c2d12 0%, #c2410c 35%, #ea580c 65%, #d97706 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-orange-900/30 rounded-full blur-3xl pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Warehouse size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">WMS-MKB</p>
              <p className="text-orange-200 text-xs">Warehouse Management System</p>
            </div>
          </div>

          {/* Main heading */}
          <div className="mt-auto mb-auto pt-16">
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Manage Your<br />
              <span className="text-amber-300">Warehouse</span><br />
              Smarter
            </h1>
            <p className="mt-4 text-orange-200 text-base leading-relaxed max-w-sm">
              A comprehensive platform to control inventory, track orders, and empower your team with real-time data.
            </p>

            {/* Feature cards */}
            <div className="mt-10 grid grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <div className="text-amber-300 mb-2">{f.icon}</div>
                  <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-orange-200 text-xs mt-1 leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-orange-300/60 text-xs mt-auto">
            © 2026 WMS-MKB. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)' }}
            >
              <Warehouse size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-stone-900">WMS-MKB</p>
              <p className="text-xs text-stone-400">Warehouse Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-900">Welcome back</h2>
            <p className="text-stone-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Username or Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('login')}
                placeholder="Enter your username or email"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors ${
                  errors.login
                    ? 'border-red-300 bg-red-50'
                    : 'border-stone-200 hover:border-orange-300'
                }`}
              />
              {errors.login && (
                <p className="text-xs text-red-500 mt-1">{errors.login.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="Enter your password"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors ${
                  errors.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-stone-200 hover:border-orange-300'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href="/forgot-password"
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              style={{ background: isSubmitting ? '#f97316' : 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
