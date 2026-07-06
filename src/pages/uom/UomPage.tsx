import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uomApi } from '@/api/uom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ApprovalBadge, StatusBadge } from '@/components/ui/Badge'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export function UomPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.is_superuser || user?.is_company_admin

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({ queryKey: ['uom'], queryFn: uomApi.getAll })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => uomApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      toast.success('UOM deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: approve } = useMutation({
    mutationFn: (id: string) => uomApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      toast.success('UOM approved')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: reject } = useMutation({
    mutationFn: (id: string) => uomApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uom'] })
      toast.success('UOM rejected')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader
        title="Units of Measure"
        subtitle="Manage measurement units (KG, PCS, LTR, etc.)"
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/uom/new')}>
            Add UOM
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          {
            key: 'approval_status',
            header: 'Approval',
            render: (r) => <ApprovalBadge status={r.approval_status} />,
          },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
          {
            key: 'actions',
            header: '',
            className: 'w-32',
            render: (r) => (
              <div className="flex items-center gap-1">
                {isAdmin && r.approval_status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => approve(r.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="Approve"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      title="Reject"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => navigate(`/uom/${r.id}`)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && remove(deleteId)}
        title="Delete UOM"
        message="Are you sure you want to delete this unit of measure?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
