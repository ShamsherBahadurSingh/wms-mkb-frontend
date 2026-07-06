import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { itemsApi } from '@/api/items'
import { tasksApi } from '@/api/tasks'
import { categoriesApi } from '@/api/categories'
import { brandsApi } from '@/api/brands'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import type { Item, TaskStatus } from '@/types'
import { Plus, Pencil, Trash2, Play, RefreshCw } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(FL.name, `Max ${FL.name} characters`),
  description: z.string().optional(),
  unit: z.string().max(FL.unit, `Max ${FL.unit} characters`).optional(),
  price: z.string().max(FL.price, `Max ${FL.price} characters`).optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const taskVariant: Record<TaskStatus, 'neutral' | 'pending' | 'success' | 'error' | 'info'> = {
  PENDING: 'pending',
  STARTED: 'info',
  SUCCESS: 'success',
  FAILURE: 'error',
  RETRY: 'warning' as never,
  REVOKED: 'neutral',
}

export function ItemsPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [modal, setModal] = useState<{ open: boolean; item?: Item }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [taskMap, setTaskMap] = useState<Record<string, { taskId: string; status: TaskStatus }>>({})

  const { data = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: itemsApi.getAll })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.getAll })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: brandsApi.getAll })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (d: FormData) =>
      modal.item ? itemsApi.update(modal.item.id, d) : itemsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      toast.success(modal.item ? 'Item updated' : 'Item created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: processItem } = useMutation({
    mutationFn: (id: string) => itemsApi.process(id),
    onSuccess: (data, id) => {
      setTaskMap((prev) => ({ ...prev, [id]: { taskId: data.task_id, status: 'PENDING' } }))
      toast.info('Processing started')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  async function checkTask(itemId: string) {
    const entry = taskMap[itemId]
    if (!entry) return
    try {
      const result = await tasksApi.getStatus(entry.taskId)
      setTaskMap((prev) => ({ ...prev, [itemId]: { ...entry, status: result.status } }))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    reset({ name: '', description: '', unit: '', price: '', category_id: '', brand_id: '' })
    setModal({ open: true })
  }

  function openEdit(item: Item) {
    reset({
      name: item.name,
      description: item.description ?? '',
      unit: item.unit ?? '',
      price: item.price ?? '',
      category_id: item.category_id ?? '',
      brand_id: item.brand_id ?? '',
    })
    setModal({ open: true, item })
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: `${c.name} (${c.short_code})` }))
  const brandOptions = brands.map((b) => ({ value: b.id, label: `${b.name} (${b.short_code})` }))
  const getCategoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '—'
  const getBrandName = (id?: string) => brands.find((b) => b.id === id)?.name ?? '—'

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Product/SKU master records — code auto-generated as {Category}{Brand}{Seq}"
        action={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add Item
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'short_code', header: 'Short Code', render: (r) => r.short_code || '—' },
          { key: 'category_id', header: 'Category', render: (r) => getCategoryName(r.category_id) },
          { key: 'brand_id', header: 'Brand', render: (r) => getBrandName(r.brand_id) },
          { key: 'unit', header: 'Unit', render: (r) => r.unit || '—' },
          { key: 'price', header: 'Price', render: (r) => r.price ? `₹${r.price}` : '—' },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
          {
            key: 'task',
            header: 'Task',
            render: (r) => {
              const task = taskMap[r.id]
              if (!task) return '—'
              return <Badge variant={taskVariant[task.status]}>{task.status}</Badge>
            },
          },
          {
            key: 'actions', header: '', className: 'w-36',
            render: (r) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => processItem(r.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  title="Process item"
                >
                  <Play size={14} />
                </button>
                {taskMap[r.id] && (
                  <button
                    onClick={() => checkTask(r.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Check task status"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
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
        title={modal.item ? 'Edit Item' : 'Add Item'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit((d) => save(d))}>
              {modal.item ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Name" required maxLength={FL.name} error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={categoryOptions} placeholder="Select category" {...register('category_id')} />
            <Select label="Brand" options={brandOptions} placeholder="Select brand" {...register('brand_id')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit" placeholder="e.g. KG, PCS" maxLength={FL.unit} error={errors.unit?.message} {...register('unit')} />
            <Input label="Price" placeholder="0.00" maxLength={FL.price} error={errors.price?.message} {...register('price')} />
          </div>
          <Textarea label="Description" {...register('description')} />
          {modal.item && modal.item.short_code && (
            <div className="text-sm text-slate-500">
              Auto-generated code: <span className="font-mono font-semibold text-slate-700">{modal.item.short_code}</span>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && remove(deleteId)}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
