import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useToast } from '@/contexts/ToastContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getErrorMessage } from '@/lib/utils'
import { Warehouse, ArrowLeft, Copy } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const toast = useToast()
  const [securityKey, setSecurityKey] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.forgotPassword(data)
      setSecurityKey(res.security_key)
      toast.success('Security key generated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function copyKey() {
    if (securityKey) {
      navigator.clipboard.writeText(securityKey)
      toast.info('Security key copied to clipboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(145deg, #7c2d12 0%, #c2410c 35%, #ea580c 65%, #d97706 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Warehouse size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Enter your email to get a security key
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          {securityKey ? (
            <div className="flex flex-col gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-700 mb-2">
                  Security key generated!
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-green-100 px-3 py-2 rounded font-mono break-all">
                    {securityKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="p-1.5 rounded hover:bg-green-100 transition-colors"
                    title="Copy key"
                  >
                    <Copy size={14} className="text-green-700" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Use this key with your email to reset your password.
              </p>
              <Link to="/reset-password" className="w-full">
                <Button className="w-full">Go to Reset Password</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                required
                {...register('email')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full mt-2">
                Get Security Key
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
