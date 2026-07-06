import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  requireSuperuser?: boolean
  requireAdmin?: boolean
}

export function ProtectedRoute({ requireSuperuser, requireAdmin }: ProtectedRouteProps) {
  const { user, accessToken } = useAuthStore()

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />
  }

  if (requireSuperuser && !user.is_superuser) {
    return <Navigate to="/" replace />
  }

  if (requireAdmin && !user.is_superuser && !user.is_company_admin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
