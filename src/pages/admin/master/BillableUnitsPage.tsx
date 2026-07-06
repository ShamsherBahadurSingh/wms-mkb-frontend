import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { billableUnitsApi } from '@/api/master'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/Badge'
import type { BillableUnit } from '@/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(FL.nameUom, `Max ${FL.nameUom} characters`),
  code: z.string().min(1, 'Code is required').max(FL.codeUom, `Max ${FL.codeUom} characters`),
})

type FormData = z.infer<typeof schema>

export function BillableUnitsPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [modal, setModal] = useState<{ open: boolean; item?: BillableUnit }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['billable-units'],
    queryFn: billableUnitsApi.getAll,
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (d: FormData) =>
      modal.item ? billableUnitsApi.update(modal.item.id, d) : billableUnitsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billable-units'] })
      toast.success(modal.item ? 'Billable unit updated' : 'Billable unit created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => billableUnitsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billable-units'] })
      toast.success('Billable unit deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    reset({ name: '', code: '' })
    setModal({ open: true })
  }

  function openEdit(item: BillableUnit) {
    reset({ name: item.name, code: item.code })
    setModal({ open: true, item })
  }

  return (
    <div>
      <PageHeader
        title="Billable Units"
        subtitle="Manage billable units used in UOM definitions"
        action={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add Billable Unit
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'code', header: 'Code' },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
          {
            key: 'actions', header: '', className: 'w-24',
            render: (r) => (
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.item ? 'Edit Billable Unit' : 'Add Billable Unit'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit((d) => save(d))}>
              {modal.item ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Name" required maxLength={FL.nameUom} error={errors.name?.message} {...register('name')} />
          <Input label="Code" required maxLength={FL.codeUom} placeholder="e.g. box, bag, tin" error={errors.code?.message} {...register('code')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && remove(deleteId)}
        title="Delete Billable Unit"
        message="Are you sure you want to delete this billable unit?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
