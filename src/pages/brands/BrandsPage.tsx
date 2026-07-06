import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FL } from '@/lib/fieldLimits'
import { brandsApi } from '@/api/brands'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Brand } from '@/types'
import {
  Plus, Pencil, Trash2, Search, X,
  ChevronRight, ChevronLeft, Upload, Download, RotateCcw,
} from 'lucide-react'

const BRAND_TYPES = ['Manufacturer', 'Product', 'Company', 'Restaurant', 'Other']

const PAGE_SIZES = [10, 50, 100]

const APPROVAL_COLORS: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  PENDING:  'bg-amber-100 text-amber-700 border-amber-200',
  DRAFT:    'bg-slate-100 text-slate-500 border-slate-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
}

function ApprovalBadge({ status }: { status?: string }) {
  const s = (status ?? 'DRAFT').toUpperCase()
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${APPROVAL_COLORS[s] ?? APPROVAL_COLORS.DRAFT}`}>
      {s}
    </span>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-green-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function BrandsPage() {
  const qc = useQueryClient()
  const toast = useToast()

  // ── Table state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ open: boolean; brand?: Brand }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Form state ────────────────────────────────────────────────────────────
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('Manufacturer')
  const [formDescription, setFormDescription] = useState('')
  const [formParentId, setFormParentId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formNameError, setFormNameError] = useState('')
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const [parentSearch, setParentSearch] = useState('')

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: brandsApi.getAll,
  })

  const brandMap = useMemo(() => new Map(data.map((b) => [b.id, b])), [data])

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((b) => b.is_active).length,
    approved: data.filter((b) => b.approval_status === 'APPROVED').length,
    pending: data.filter((b) => b.approval_status === 'PENDING').length,
  }), [data])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return data
    return data.filter(
      (b) => b.name.toLowerCase().includes(s) || (b.short_code?.toLowerCase() ?? '').includes(s),
    )
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const startRow = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endRow = Math.min(safePage * pageSize, filtered.length)

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const payload = {
        name: formName.trim(),
        brand_type: formType,
        description: formDescription.trim() || undefined,
        parent_id: formParentId || undefined,
        is_active: formIsActive,
      }
      return modal.brand
        ? brandsApi.update(modal.brand.id, payload)
        : brandsApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      toast.success(modal.brand ? 'Brand updated' : 'Brand created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      brandsApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => brandsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] })
      toast.success('Brand deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setFormName('')
    setFormType('Manufacturer')
    setFormDescription('')
    setFormParentId('')
    setFormIsActive(true)
    setFormNameError('')
    setParentPickerOpen(false)
    setParentSearch('')
    setModal({ open: true })
  }

  function openEdit(brand: Brand) {
    setFormName(brand.name)
    setFormType(brand.brand_type ?? 'Manufacturer')
    setFormDescription(brand.description ?? '')
    setFormParentId(brand.parent_id ?? '')
    setFormIsActive(brand.is_active)
    setFormNameError('')
    setParentPickerOpen(false)
    setParentSearch('')
    setModal({ open: true, brand })
  }

  function handleSave() {
    if (!formName.trim()) {
      setFormNameError('Brand name is required')
      return
    }
    save()
  }

  function clearParent() {
    setFormParentId('')
    setParentPickerOpen(false)
    setParentSearch('')
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedParentBrand = formParentId ? brandMap.get(formParentId) : null

  const parentOptions = useMemo(() => {
    const excludeId = modal.brand?.id
    return data
      .filter((b) => b.id !== excludeId)
      .filter((b) => !parentSearch || b.name.toLowerCase().includes(parentSearch.toLowerCase()))
  }, [data, modal.brand, parentSearch])

  const STAT_CARDS = [
    { label: 'Total',    value: stats.total,    color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100'   },
    { label: 'Active',   value: stats.active,   color: 'text-green-600',  bg: 'bg-green-50 border-green-100'     },
    { label: 'Approved', value: stats.approved, color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Pending',  value: stats.pending,  color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100'     },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Brands</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage product brands and manufacturers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload size={14} />}>Bulk Upload</Button>
          <Button variant="outline" icon={<Download size={14} />}>Export</Button>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Create Brand</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or short code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
        </div>
        <button
          onClick={() => { setSearch(''); setPage(1) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-100" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fefce8 100%)' }}>
                <th className="pl-4 pr-2 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider min-w-[200px]">Name</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-24">Short Code</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">Type</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-36">Parent</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">Approval</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-amber-900 uppercase tracking-wider w-20">Active</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">Loading brands…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search size={32} className="text-orange-200" />
                    <span className="text-sm">No brands found</span>
                  </div>
                </td></tr>
              ) : rows.map((brand, idx) => {
                const rowNum = (safePage - 1) * pageSize + idx + 1
                const parentBrand = brand.parent_id ? brandMap.get(brand.parent_id) : null
                return (
                  <tr
                    key={brand.id}
                    className={`border-b border-orange-50/60 last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} hover:bg-orange-50/70`}
                  >
                    <td className="pl-4 pr-2 py-2.5 text-xs text-slate-400 select-none">{rowNum}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => openEdit(brand)}
                        className="text-sm font-semibold text-orange-700 hover:text-orange-900 hover:underline text-left leading-tight"
                      >
                        {brand.name}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono text-slate-500">{brand.short_code || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {brand.brand_type || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{parentBrand?.name || '—'}</td>
                    <td className="px-3 py-2.5"><ApprovalBadge status={brand.approval_status} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <Toggle
                        checked={brand.is_active}
                        onChange={() => toggleActive({ id: brand.id, is_active: !brand.is_active })}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(brand)}
                          className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(brand.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-orange-100 bg-gradient-to-r from-orange-50/60 to-amber-50/60">
          <span className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">{startRow}–{endRow}</span>
            {' '}of{' '}
            <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span>
            {filtered.length !== data.length && (
              <span className="text-orange-500 ml-1">(filtered from {data.length})</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="text-xs border border-orange-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-700 cursor-pointer"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={safePage === 1} className="px-2 py-1 text-xs rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={13} />
              </button>
              <span className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-orange-200 rounded-md min-w-[60px] text-center">
                {safePage} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="p-1.5 rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={13} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={safePage >= totalPages} className="px-2 py-1 text-xs rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.brand ? `Edit — ${modal.brand.name}` : 'Create Brand'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>
              {modal.brand ? 'Save Changes' : 'Create Brand'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">

          {/* Approval Status (edit only) */}
          {modal.brand && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-medium text-slate-500 shrink-0">Approval Status</span>
              <ApprovalBadge status={modal.brand.approval_status} />
            </div>
          )}

          {/* Brand Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors appearance-none bg-white"
            >
              {BRAND_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setFormNameError('') }}
              placeholder="e.g. Nestlé, Amul…"
              autoFocus
              maxLength={FL.name}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${formNameError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {formNameError && <p className="text-xs text-red-500 mt-1">{formNameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
              <span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
          </div>

          {/* Parent Brand */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Parent Brand
                <span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>
              </label>
              {selectedParentBrand && (
                <button
                  type="button"
                  onClick={clearParent}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {selectedParentBrand ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-orange-700 truncate">
                    {selectedParentBrand.name}
                  </div>
                  {selectedParentBrand.brand_type && (
                    <div className="text-xs text-slate-400 mt-0.5">{selectedParentBrand.brand_type}</div>
                  )}
                </div>
                {selectedParentBrand.short_code && (
                  <span className="text-[10px] font-mono text-orange-500 bg-orange-100 px-2 py-0.5 rounded shrink-0">
                    {selectedParentBrand.short_code}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-2 px-0.5">
                No parent selected — this will be a <strong className="text-slate-500">root brand</strong>
              </p>
            )}

            <button
              type="button"
              onClick={() => setParentPickerOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 transition-colors"
            >
              <Search size={12} />
              {parentPickerOpen
                ? 'Close picker'
                : selectedParentBrand
                ? 'Change parent'
                : 'Browse & select parent'}
            </button>

            {parentPickerOpen && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search brands…"
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {parentOptions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No brands found</div>
                  ) : (
                    parentOptions.map((b) => {
                      const isSelected = formParentId === b.id
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setFormParentId(b.id)
                            setParentPickerOpen(false)
                            setParentSearch('')
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-orange-700' : 'text-slate-700'}`}>
                              {b.name}
                            </div>
                            {b.brand_type && (
                              <div className="text-xs text-slate-400 mt-0.5">{b.brand_type}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {b.short_code && (
                              <span className="text-[10px] font-mono text-slate-400">{b.short_code}</span>
                            )}
                            {isSelected && <span className="text-orange-600 font-bold text-xs">✓</span>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Is Active</p>
              <p className="text-xs text-slate-400 mt-0.5">Enable or disable this brand</p>
            </div>
            <Toggle checked={formIsActive} onChange={() => setFormIsActive((v) => !v)} />
          </div>

        </div>
      </Modal>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete Brand"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
