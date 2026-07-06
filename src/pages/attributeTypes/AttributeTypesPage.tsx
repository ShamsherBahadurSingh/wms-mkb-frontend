import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { attributeTypesApi } from '@/api/attributeTypes'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/Badge'
import type { AttributeType } from '@/types'
import { Plus, Pencil, Trash2, GripVertical, Info } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(FL.name, `Max ${FL.name} characters`),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// ── Drag state ────────────────────────────────────────────────────────────────

interface DragState {
  draggedId: string | null
  overId: string | null
}

export function AttributeTypesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [modal, setModal] = useState<{ open: boolean; at?: AttributeType }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Local ordered list — drives the UI; synced from server data
  const [localOrder, setLocalOrder] = useState<AttributeType[]>([])
  const [drag, setDrag] = useState<DragState>({ draggedId: null, overId: null })

  const { data = [], isLoading } = useQuery({
    queryKey: ['attribute-types'],
    queryFn: attributeTypesApi.getAll,
  })

  // Keep localOrder in sync with server data (but don't stomp an active drag)
  useEffect(() => {
    if (drag.draggedId) return
    setLocalOrder([...data].sort((a, b) => a.position - b.position))
  }, [data, drag.draggedId])

  // ── Mutations ────────────────────────────────────────────────────────────

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (d: FormData) =>
      modal.at
        ? attributeTypesApi.update(modal.at.id, d)
        : attributeTypesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attribute-types'] })
      toast.success(modal.at ? 'Attribute type updated' : 'Attribute type created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => attributeTypesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attribute-types'] })
      toast.success('Attribute type deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: reorder } = useMutation({
    mutationFn: (orderedIds: string[]) => attributeTypesApi.reorder(orderedIds),
    onSuccess: (updated) => {
      qc.setQueryData(['attribute-types'], updated)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
      // revert to server state
      setLocalOrder([...data].sort((a, b) => a.position - b.position))
    },
  })

  // ── Form ─────────────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    reset({ name: '', description: '' })
    setModal({ open: true })
  }

  function openEdit(at: AttributeType) {
    reset({ name: at.name, description: at.description ?? '' })
    setModal({ open: true, at })
  }

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = 'move'
    setDrag({ draggedId: id, overId: null })
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    setDrag((prev) => {
      if (!prev.draggedId || prev.draggedId === overId) return prev

      // Reorder the local array as the user drags
      const from = localOrder.findIndex((x) => x.id === prev.draggedId)
      const to = localOrder.findIndex((x) => x.id === overId)
      if (from === -1 || to === -1) return { ...prev, overId }

      const next = [...localOrder]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      setLocalOrder(next)

      return { ...prev, overId }
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const { draggedId } = drag
    setDrag({ draggedId: null, overId: null })
    if (!draggedId) return
    reorder(localOrder.map((x) => x.id))
  }

  function handleDragEnd() {
    // Reset drag state if drop didn't fire (e.g. dropped outside)
    setDrag({ draggedId: null, overId: null })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Attribute Types"
        subtitle="Define attribute categories (Color, Size, Material, etc.) — drag rows to reorder"
        action={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add Attribute Type
          </Button>
        }
      />

      {/* Reserved position notice */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
        <Info size={13} className="text-amber-500 shrink-0" />
        Position 6 is reserved for <span className="font-semibold text-amber-700">Last Level Classification</span> and is skipped automatically when reordering.
      </div>

      {/* Drag-and-drop table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : localOrder.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No attribute types yet — create one above</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 text-left w-12">Pos</th>
                <th className="px-3 py-3 text-left">Name</th>
                <th className="px-3 py-3 text-left">Code</th>
                <th className="px-3 py-3 text-left">Description</th>
                <th className="px-3 py-3 text-left w-20">Status</th>
                <th className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {localOrder.map((at) => {
                const isDragging = drag.draggedId === at.id
                return (
                  <tr
                    key={at.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, at.id)}
                    onDragOver={(e) => handleDragOver(e, at.id)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-slate-100 last:border-0 transition-all select-none ${
                      isDragging
                        ? 'opacity-40 bg-orange-50'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Drag handle */}
                    <td className="px-3 py-2.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                      <GripVertical size={15} />
                    </td>

                    {/* Position badge */}
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
                        {at.position}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 font-medium text-slate-800">{at.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{at.code}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[260px] truncate">{at.description || '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge active={at.is_active} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(at)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(at.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.at ? 'Edit Attribute Type' : 'Add Attribute Type'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit((d) => save(d))}>
              {modal.at ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Name" required maxLength={FL.name} error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" {...register('description')} />
          <p className="text-xs text-slate-400">
            Position is assigned automatically and can be changed by dragging rows on the list.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete Attribute Type"
        message="Are you sure? This may affect related attributes."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
