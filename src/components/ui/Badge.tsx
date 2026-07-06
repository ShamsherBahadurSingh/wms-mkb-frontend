import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'pending'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 border border-green-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  pending: 'bg-orange-100 text-orange-700 border border-orange-200',
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>
}

export function ApprovalBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    APPROVED: 'success',
    REJECTED: 'error',
    PENDING:  'pending',
    DRAFT:    'neutral',
    approved: 'success',
    rejected: 'error',
    pending:  'pending',
    draft:    'neutral',
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  return <Badge variant={map[status] ?? 'neutral'}>{label}</Badge>
}
