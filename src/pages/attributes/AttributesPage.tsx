import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { attributesApi } from '@/api/attributes'
import { attributeTypesApi } from '@/api/attributeTypes'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ApprovalBadge, StatusBadge } from '@/components/ui/Badge'
import type { Attribute } from '@/types'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(FL.name, `Max ${FL.name} characters`),
  attribute_type_id: z.string().min(1, 'Attribute type is required'),
  synonyms: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function AttributesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.is_superuser || user?.is_company_admin

  const [modal, setModal] = useState<{ open: boolean; attr?: Attribute }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['attributes', filterTypeId],
    queryFn: () => attributesApi.getAll(filterTypeId || undefined),
  })

  const { data: atypes = [] } = useQuery({
    queryKey: ['attribute-types'],
    queryFn: attributeTypesApi.getAll,
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (d: FormData) =>
      modal.attr ? attributesApi.update(modal.attr.id, d) : attributesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      toast.success(modal.attr ? 'Attribute updated' : 'Attribute created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => attributesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      toast.success('Attribute deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: approve } = useMutation({
    mutationFn: (id: string) => attributesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      toast.success('Attribute approved')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      attributesApi.reject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] })
      toast.success('Attribute rejected')
      setRejectId(null)
      setRejectReason('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    reset({ name: '', attribute_type_id: '', synonyms: '', description: '' })
    setModal({ open: true })
  }

  function openEdit(attr: Attribute) {
    reset({
      name: attr.name,
      attribute_type_id: attr.attribute_type_id,
      synonyms: attr.synonyms ?? '',
      description: attr.description ?? '',
    })
    setModal({ open: true, attr })
  }

  const atypeOptions = atypes.map((t) => ({ value: t.id, label: t.name }))
  const filterOptions = [{ value: '', label: 'All Types' }, ...atypeOptions]

  return (
    <div>
      <PageHeader
        title="Attributes"
        subtitle="Manage product attributes with approval workflow"
        action={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add Attribute
          </Button>
        }
      />

      <div className="mb-4">
        <select
          value={filterTypeId}
          onChange={(e) => setFilterTypeId(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {filterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <Table
        loading={isLoading}
        data={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'short_code', header: 'Code' },
          {
            key: 'attribute_type_id',
            header: 'Type',
            render: (r) => atypes.find((t) => t.id === r.attribute_type_id)?.name ?? r.attribute_type_id,
          },
          { key: 'synonyms', header: 'Synonyms', render: (r) => r.synonyms || '—' },
          {
            key: 'approval_status',
            header: 'Approval',
            render: (r) => <ApprovalBadge status={r.approval_status} />,
          },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
          {
            key: 'actions', header: '', className: 'w-32',
            render: (r) => (
              <div className="flex items-center gap-1">
                {isAdmin && r.approval_status === 'pending' && (
                  <>
                    <button
                      onClick={() => approve(r.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="Approve"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => { setRejectId(r.id); setRejectReason('') }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      title="Reject"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                  <Pencil size={14} />
                </button>
                {isAdmin && (
                  <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.attr ? 'Edit Attribute' : 'Add Attribute'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit((d) => save(d))}>
              {modal.attr ? 'Save Changes' : 'Submit for Approval'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Name" required maxLength={FL.name} error={errors.name?.message} {...register('name')} />
          <Select
            label="Attribute Type"
            required
            options={atypeOptions}
            placeholder="Select type..."
            error={errors.attribute_type_id?.message}
            {...register('attribute_type_id')}
          />
          <Input label="Synonyms" placeholder="Comma-separated" {...register('synonyms')} />
          <Textarea label="Description" {...register('description')} />
        </form>
      </Modal>

      <Modal
        open={rejectId !== null}
        onClose={() => setRejectId(null)}
        title="Reject Attribute"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="danger" loading={rejecting} onClick={() => rejectId && reject({ id: rejectId, reason: rejectReason })}>
              Reject
            </Button>
          </div>
        }
      >
        <Textarea
          label="Rejection Reason"
          placeholder="Optional reason for rejection"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete Attribute"
        message="Are you sure you want to delete this attribute?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
