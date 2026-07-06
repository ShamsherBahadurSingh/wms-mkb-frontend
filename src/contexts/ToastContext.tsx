import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

const DURATIONS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 7000,
  error: 8000,
}

const CONFIG: Record<
  ToastType,
  { title: string; icon: ReactNode; border: string; iconBg: string; bar: string }
> = {
  success: {
    title: 'Success',
    icon: <CheckCircle2 size={20} />,
    border: 'border-l-green-500',
    iconBg: 'text-green-500',
    bar: 'bg-green-500',
  },
  error: {
    title: 'Error',
    icon: <XCircle size={20} />,
    border: 'border-l-red-500',
    iconBg: 'text-red-500',
    bar: 'bg-red-500',
  },
  info: {
    title: 'Information',
    icon: <Info size={20} />,
    border: 'border-l-blue-500',
    iconBg: 'text-blue-500',
    bar: 'bg-blue-500',
  },
  warning: {
    title: 'Warning',
    icon: <AlertTriangle size={20} />,
    border: 'border-l-amber-500',
    iconBg: 'text-amber-500',
    bar: 'bg-amber-500',
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const cfg = CONFIG[toast.type]

  return (
    <div
      className={`toast-enter relative flex items-start gap-3 bg-white rounded-xl shadow-lg border border-stone-100 border-l-4 ${cfg.border} px-4 py-3.5 min-w-[320px] max-w-[420px] overflow-hidden`}
      role="alert"
    >
      {/* Icon */}
      <span className={`flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>{cfg.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 leading-tight">{cfg.title}</p>
        <p className="text-sm text-stone-600 mt-0.5 leading-snug break-words">{toast.message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 ml-1 p-0.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>

      {/* Progress bar */}
      <div
        className={`toast-progress absolute bottom-0 left-0 ${cfg.bar} opacity-70`}
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++nextId
    const duration = DURATIONS[type]
    setToasts((prev) => [...prev, { id, message, type, duration }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const value: ToastContextValue = {
    success: (m) => add(m, 'success'),
    error: (m) => add(m, 'error'),
    info: (m) => add(m, 'info'),
    warning: (m) => add(m, 'warning'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Fixed top-center toast stack */}
      <div
        className="fixed top-4 inset-x-0 flex flex-col items-center gap-2.5 z-[9999] pointer-events-none px-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
