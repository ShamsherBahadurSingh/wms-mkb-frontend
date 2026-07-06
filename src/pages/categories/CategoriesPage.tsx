import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FL } from '@/lib/fieldLimits'
import { categoriesApi } from '@/api/categories'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Category } from '@/types'
import { MultiSelectDropdown } from '@/components/ui/Table'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GitMerge,
  Upload,
  Download,
  X,
} from 'lucide-react'

const APPROVAL_OPTIONS = [
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Pending',  value: 'PENDING'  },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Draft',    value: 'DRAFT'    },
]

const ACTIVE_OPTIONS = [
  { label: 'Active',   value: 'true'  },
  { label: 'Inactive', value: 'false' },
]

const PAGE_SIZES = [10, 50, 100, 500]

// ── Level badge colors by depth ───────────────────────────────────────────────
const LEVEL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-rose-50 text-rose-700 border-rose-200',
]

function ApprovalBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    DRAFT: 'bg-slate-100 text-slate-500 border-slate-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cls[status] ?? cls.DRAFT}`}>
      {status ?? 'DRAFT'}
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

export function CategoriesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  // ── Table state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [levelFilters, setLevelFilters] = useState<string[]>(['', '', '', '', '', ''])
  const [approvalFilter, setApprovalFilter] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortDesc, setSortDesc] = useState(true)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ open: boolean; category?: Category }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Create/Edit form state ────────────────────────────────────────────────
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formParentId, setFormParentId] = useState('')
  const [formNameError, setFormNameError] = useState('')
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const [formParentSearch, setFormParentSearch] = useState('')

  // ── Change Parent modal state ─────────────────────────────────────────────
  const [changeParentFor, setChangeParentFor] = useState<Category | null>(null)
  const [changeParentSearch, setChangeParentSearch] = useState('')
  const [selectedParent, setSelectedParent] = useState<string>('')

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll({ includeAll: true }),
  })

  const catMap = useMemo(() => new Map(data.map((c) => [c.id, c])), [data])

  const catPaths = useMemo(() => {
    const paths = new Map<string, string[]>()
    for (const cat of data) {
      const path: string[] = []
      let cur: Category | undefined = cat
      for (let i = 0; i < 6 && cur; i++) {
        path.unshift(cur.name)
        cur = cur.parent_id ? catMap.get(cur.parent_id) : undefined
      }
      paths.set(cat.id, path)
    }
    return paths
  }, [data, catMap])

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((c) => c.is_active).length,
    approved: data.filter((c) => c.approval_status === 'APPROVED').length,
    pending: data.filter((c) => c.approval_status === 'PENDING').length,
    draft: data.filter((c) => c.approval_status === 'DRAFT').length,
  }), [data])

  const filtered = useMemo(() => {
    let result = [...data]
    const s = search.trim().toLowerCase()
    if (s) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(s) || (c.short_code?.toLowerCase() ?? '').includes(s),
      )
    }
    levelFilters.forEach((f, i) => {
      if (f.trim()) {
        const lf = f.toLowerCase()
        result = result.filter((c) => (catPaths.get(c.id)?.[i] ?? '').toLowerCase().includes(lf))
      }
    })
    if (approvalFilter.length > 0) {
      result = result.filter((c) => approvalFilter.includes(c.approval_status ?? 'DRAFT'))
    }
    if (activeFilter.length > 0) {
      result = result.filter((c) => activeFilter.includes(String(c.is_active)))
    }
    result.sort((a, b) => {
      const ta = new Date(a.created_at ?? 0).getTime()
      const tb = new Date(b.created_at ?? 0).getTime()
      return sortDesc ? tb - ta : ta - tb
    })
    return result
  }, [data, search, levelFilters, sortDesc, catPaths, approvalFilter, activeFilter])

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
        description: formDescription.trim() || undefined,
        parent_id: formParentId || undefined,
      }
      return modal.category
        ? categoriesApi.update(modal.category.id, payload)
        : categoriesApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success(modal.category ? 'Category updated' : 'Category created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      categoriesApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: doChangeParent, isPending: changingParent } = useMutation({
    mutationFn: ({ id, parent_id }: { id: string; parent_id: string }) =>
      categoriesApi.update(id, { parent_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Parent updated')
      setChangeParentFor(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setFormName('')
    setFormDescription('')
    setFormParentId('')
    setFormNameError('')
    setParentPickerOpen(false)
    setFormParentSearch('')
    setModal({ open: true })
  }

  function openEdit(cat: Category) {
    setFormName(cat.name)
    setFormDescription(cat.description ?? '')
    setFormParentId(cat.parent_id ?? '')
    setFormNameError('')
    setParentPickerOpen(false)
    setFormParentSearch('')
    setModal({ open: true, category: cat })
  }

  function handleSave() {
    if (!formName.trim()) {
      setFormNameError('Category name is required')
      return
    }
    save()
  }

  function clearParent() {
    setFormParentId('')
    setParentPickerOpen(false)
    setFormParentSearch('')
  }

  function setLevelFilter(idx: number, val: string) {
    setLevelFilters((prev) => { const next = [...prev]; next[idx] = val; return next })
    setPage(1)
  }

  function resetFilters() {
    setSearch('')
    setLevelFilters(['', '', '', '', '', ''])
    setApprovalFilter([])
    setActiveFilter([])
    setPage(1)
  }

  function openChangeParent(cat: Category) {
    setChangeParentFor(cat)
    setSelectedParent(cat.parent_id ?? '')
    setChangeParentSearch('')
  }

  // ── Derived form values ───────────────────────────────────────────────────
  // Path preview: parent's path + new name appended
  const previewPath = useMemo(() => {
    const parentPath = formParentId ? (catPaths.get(formParentId) ?? []) : []
    const name = formName.trim()
    return name ? [...parentPath, name] : parentPath
  }, [formParentId, formName, catPaths])

  const selectedParentCat = formParentId ? catMap.get(formParentId) : null
  const selectedParentPath = formParentId ? (catPaths.get(formParentId) ?? []) : []

  // Parent picker options: exclude the category being edited (and its own id)
  const formParentPickerOptions = useMemo(() => {
    const excludeId = modal.category?.id
    return data
      .filter((c) => c.id !== excludeId)
      .filter((c) => !formParentSearch || c.name.toLowerCase().includes(formParentSearch.toLowerCase()))
  }, [data, modal.category, formParentSearch])

  // Change-parent modal options
  const changeParentOptions = useMemo(() => {
    if (!changeParentFor) return []
    return data
      .filter((c) => c.id !== changeParentFor.id)
      .filter((c) => !changeParentSearch || c.name.toLowerCase().includes(changeParentSearch.toLowerCase()))
  }, [data, changeParentFor, changeParentSearch])

  // ── Stat cards ────────────────────────────────────────────────────────────
  const STAT_CARDS = [
    { label: 'Total', value: stats.total, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Active', value: stats.active, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    { label: 'Approved', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Draft', value: stats.draft, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Hierarchical product classification</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload size={14} />}>Bulk Upload</Button>
          <Button variant="outline" icon={<Download size={14} />}>Export</Button>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Create Category</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
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
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1500px' }}>
            <thead>
              {/* Column headers */}
              <tr className="border-b border-orange-100" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fefce8 100%)' }}>
                <th className="pl-4 pr-2 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider min-w-[180px]">Category Name</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-24">Short Code</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">
                  <button onClick={() => { setSortDesc((d) => !d); setPage(1) }} className="flex items-center gap-1 hover:text-orange-700 transition-colors">
                    Created On
                    {sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                </th>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">L{i}</th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">Status</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-amber-900 uppercase tracking-wider w-20">Active</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-32">Actions</th>
              </tr>
              {/* Filter row */}
              <tr className="border-b border-orange-50 bg-orange-50/30">
                <th className="pl-4 pr-2 py-1.5" />
                <th className="px-3 py-1.5 font-normal" />
                <th className="px-3 py-1.5 font-normal" />
                <th className="px-3 py-1.5 font-normal" />
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-3 py-1.5 font-normal w-28">
                    <div className="relative">
                      <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-300 pointer-events-none" />
                      <input
                        type="text"
                        placeholder={`L${i}…`}
                        value={levelFilters[i - 1]}
                        onChange={(e) => setLevelFilter(i - 1, e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-xs border border-orange-100 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 text-slate-600 placeholder-slate-300 transition-colors"
                      />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-1.5 font-normal w-28">
                  <MultiSelectDropdown
                    options={APPROVAL_OPTIONS}
                    selected={approvalFilter}
                    onChange={(vals) => { setApprovalFilter(vals); setPage(1) }}
                  />
                </th>
                <th className="px-3 py-1.5 font-normal w-20">
                  <MultiSelectDropdown
                    options={ACTIVE_OPTIONS}
                    selected={activeFilter}
                    onChange={(vals) => { setActiveFilter(vals); setPage(1) }}
                  />
                </th>
                <th className="px-3 py-1.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={14} className="py-16 text-center text-slate-400 text-sm">Loading categories…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={14} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search size={32} className="text-orange-200" />
                    <span className="text-sm">No categories found</span>
                  </div>
                </td></tr>
              ) : rows.map((cat, idx) => {
                const path = catPaths.get(cat.id) ?? []
                const rowNum = (safePage - 1) * pageSize + idx + 1
                const createdAt = cat.created_at
                  ? new Date(cat.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <tr key={cat.id} className={`border-b border-orange-50/60 last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} hover:bg-orange-50/70`}>
                    <td className="pl-4 pr-2 py-2.5 text-xs text-slate-400 select-none">{rowNum}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openEdit(cat)} className="text-sm font-semibold text-orange-700 hover:text-orange-900 hover:underline text-left leading-tight">
                        {cat.name}
                      </button>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-xs font-mono text-slate-500">{cat.short_code || '—'}</span></td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{createdAt}</td>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <td key={i} className="px-3 py-2.5 w-28">
                        {path[i]
                          ? <span className="block truncate text-xs text-slate-600 max-w-[100px]" title={path[i]}>{path[i]}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                    ))}
                    <td className="px-3 py-2.5"><ApprovalBadge status={cat.approval_status ?? 'DRAFT'} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <Toggle checked={cat.is_active} onChange={() => toggleActive({ id: cat.id, is_active: !cat.is_active })} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openChangeParent(cat)} className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors whitespace-nowrap" title="Change parent">
                          <GitMerge size={10} />
                          Parent
                        </button>
                        <button onClick={() => openEdit(cat)} className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteId(cat.id)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
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
            Showing <span className="font-semibold text-slate-700">{startRow}–{endRow}</span> of <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span>
            {filtered.length !== data.length && <span className="text-orange-500 ml-1">(filtered from {data.length})</span>}
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
        title={modal.category ? `Edit — ${modal.category.name}` : 'Create Category'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>
              {modal.category ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">

          {/* 1 — Category Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setFormNameError('') }}
              placeholder="e.g. Curd Rice, Organic Honey…"
              autoFocus
              maxLength={FL.name}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${formNameError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            />
            {formNameError && <p className="text-xs text-red-500 mt-1">{formNameError}</p>}
          </div>

          {/* 2 — Hierarchy Path Preview */}
          {previewPath.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Hierarchy Path Preview
              </p>
              <div className="flex items-start flex-wrap gap-x-1 gap-y-3">
                {previewPath.map((name, i) => {
                  const isNew = i === previewPath.length - 1 && !!formName.trim()
                  const color = LEVEL_COLORS[i] ?? LEVEL_COLORS[0]
                  return (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />}
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${
                            isNew
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                              : color
                          }`}
                        >
                          {name}
                        </span>
                        <span className={`text-[9px] font-medium ${isNew ? 'text-orange-600' : 'text-slate-400'}`}>
                          {isNew ? `L${i + 1} · new` : `L${i + 1}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3 — Parent Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Parent Category
                <span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>
              </label>
              {selectedParentCat && (
                <button
                  type="button"
                  onClick={clearParent}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {/* Selected parent display */}
            {selectedParentCat ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-orange-700 truncate">
                    {selectedParentCat.name}
                  </div>
                  {selectedParentPath.length > 1 && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {selectedParentPath.map((p, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight size={10} className="text-slate-400" />}
                          <span className="text-xs text-slate-500">{p}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                  L{selectedParentPath.length}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-2 px-0.5">
                No parent selected — this will be a <strong className="text-slate-500">root category (L1)</strong>
              </p>
            )}

            {/* Toggle picker */}
            <button
              type="button"
              onClick={() => setParentPickerOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 transition-colors"
            >
              <Search size={12} />
              {parentPickerOpen
                ? 'Close picker'
                : selectedParentCat
                ? 'Change parent'
                : 'Browse & select parent'}
            </button>

            {/* Inline picker */}
            {parentPickerOpen && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Search */}
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories…"
                      value={formParentSearch}
                      onChange={(e) => setFormParentSearch(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {formParentPickerOptions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No categories found</div>
                  ) : (
                    formParentPickerOptions.map((c) => {
                      const path = catPaths.get(c.id) ?? []
                      const isSelected = formParentId === c.id
                      const levelColor = LEVEL_COLORS[(path.length - 1) % LEVEL_COLORS.length]
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormParentId(c.id)
                            setParentPickerOpen(false)
                            setFormParentSearch('')
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-orange-700' : 'text-slate-700'}`}>
                              {c.name}
                            </div>
                            {path.length > 1 && (
                              <div className="text-xs text-slate-400 truncate mt-0.5">
                                {path.slice(0, -1).join(' › ')} ›{' '}
                                <span className="text-slate-500 font-medium">{c.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${levelColor}`}>
                              L{path.length}
                            </span>
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

          {/* 4 — Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
              <span className="ml-1.5 text-xs font-normal text-slate-400">optional</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description for this category…"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* ── Change Parent Modal ──────────────────────────────────────────────── */}
      <Modal
        open={changeParentFor !== null}
        onClose={() => setChangeParentFor(null)}
        title={`Change Parent — ${changeParentFor?.name ?? ''}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setChangeParentFor(null)}>Cancel</Button>
            <Button
              loading={changingParent}
              disabled={!selectedParent || selectedParent === changeParentFor?.parent_id}
              onClick={() => changeParentFor && selectedParent && doChangeParent({ id: changeParentFor.id, parent_id: selectedParent })}
            >
              Set Parent
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories…"
              value={changeParentSearch}
              onChange={(e) => setChangeParentSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {changeParentOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No categories found</div>
            ) : (
              changeParentOptions.map((c) => {
                const path = catPaths.get(c.id) ?? []
                const isSelected = selectedParent === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedParent(c.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? 'text-orange-700' : 'text-slate-700'}`}>{c.name}</div>
                      {path.length > 1 && (
                        <div className="text-xs text-slate-400 truncate mt-0.5">{path.slice(0, -1).join(' › ')} › <span className="text-slate-500">{c.name}</span></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[(path.length - 1) % LEVEL_COLORS.length]}`}>L{path.length}</span>
                      {isSelected && <span className="text-orange-600 font-bold text-xs">✓</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
