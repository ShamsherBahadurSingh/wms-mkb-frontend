import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { authApi } from '@/api/auth'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { Plus, Building2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Company name is required').max(FL.name, `Max ${FL.name} characters`),
  code: z.string().min(1, 'Company code is required').max(FL.code, `Max ${FL.code} characters`),
  address: z.string().optional(),
  phone: z.string().max(FL.phone, `Max ${FL.phone} characters`).optional(),
  email: z.string().email('Invalid email').max(FL.email, `Max ${FL.email} characters`).optional().or(z.literal('')),
  admin_full_name: z.string().min(1, 'Admin name is required').max(FL.fullName, `Max ${FL.fullName} characters`),
  admin_username: z.string().min(1, 'Admin username is required').max(FL.username, `Max ${FL.username} characters`),
  admin_email: z.string().email('Invalid admin email').max(FL.email, `Max ${FL.email} characters`),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export function CompaniesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: authApi.getCompanies,
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data: FormData) => authApi.createCompany({
      ...data,
      email: data.email || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Company and admin created successfully')
      setCreateOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Manage tenant companies (SuperUser only)"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Add Company
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Company Name', render: (r) => (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                <Building2 size={14} className="text-orange-600" />
              </div>
              {r.name}
            </div>
          )},
          { key: 'code', header: 'Code' },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Company"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleSubmit((d) => create(d))}>
              Create Company & Admin
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Company Details</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company Name" required maxLength={FL.name} error={errors.name?.message} {...register('name')} />
            <Input label="Company Code" required maxLength={FL.code} error={errors.code?.message} {...register('code')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" maxLength={FL.phone} {...register('phone')} />
            <Input label="Email" type="email" maxLength={FL.email} error={errors.email?.message} {...register('email')} />
          </div>
          <Input label="Address" {...register('address')} />

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">Admin User Details</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Admin Full Name" required maxLength={FL.fullName} error={errors.admin_full_name?.message} {...register('admin_full_name')} />
            <Input label="Admin Username" required maxLength={FL.username} error={errors.admin_username?.message} {...register('admin_username')} />
          </div>
          <Input label="Admin Email" type="email" required maxLength={FL.email} error={errors.admin_email?.message} {...register('admin_email')} />
          <Input label="Admin Password" type="password" required error={errors.admin_password?.message} {...register('admin_password')} />
        </form>
      </Modal>
    </div>
  )
}
