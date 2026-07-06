import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FL } from '@/lib/fieldLimits'
import { cpnApi } from '@/api/commonProductNames'
import { categoriesApi } from '@/api/categories'
import { attributeTypesApi } from '@/api/attributeTypes'
import { attributesApi } from '@/api/attributes'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Textarea } from '@/components/ui/Textarea'
import { MultiSelectDropdown } from '@/components/ui/Table'
import type { CommonProductName, CPNAttribute, Category } from '@/types'
import {
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Upload,
  Download,
  Type,
  List,
  Tag,
} from 'lucide-react'

const APPROVAL_OPTIONS = [
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Pending',  value: 'PENDING'  },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Draft',    value: 'DRAFT'    },
]

const PAGE_SIZES = [10, 50, 100, 500]

// Position 6 is reserved for Last Level Classification
const LLC_POSITION = 6

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveAttrValue(attr: CommonProductName['cpn_attributes'][0]): string {
  return attr.attribute?.name ?? attr.free_text ?? attr.category?.name ?? ''
}

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

// ── Per-attribute-type value state ────────────────────────────────────────────

type AttrMode = 'attribute' | 'free_text'

interface AttrValueState {
  mode: AttrMode
  attribute_id: string
  free_text: string
}

function emptyAttrValue(): AttrValueState {
  return { mode: 'attribute', attribute_id: '', free_text: '' }
}

function hasAttrValue(v: AttrValueState): boolean {
  return v.mode === 'attribute' ? !!v.attribute_id : !!v.free_text.trim()
}

const LEVEL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-rose-50 text-rose-700 border-rose-200',
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CommonProductNamesPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.is_superuser || user?.is_company_admin

  // Table state
  const [search, setSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortField, setSortField] = useState<'name' | 'created_at'>('created_at')
  const [sortDesc, setSortDesc] = useState(true)

  // Modal state
  const [modal, setModal] = useState<{ open: boolean; cpn?: CommonProductName }>({ open: false })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Form — category picker
  const [formCategoryId, setFormCategoryId] = useState('')
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const [catPickerSearch, setCatPickerSearch] = useState('')

  // Form — last level classification (user-editable, pre-filled from category)
  const [formLastLevelClass, setFormLastLevelClass] = useState('')
  const [lastLevelError, setLastLevelError] = useState('')

  // Form — attribute values keyed by attribute_type_id
  const [attrValues, setAttrValues] = useState<Record<string, AttrValueState>>({})

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: cpns = [], isLoading } = useQuery({
    queryKey: ['cpn'],
    queryFn: () => cpnApi.getAll({ includeAll: true }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll({ includeAll: true }),
  })

  const { data: atypes = [] } = useQuery({
    queryKey: ['attribute-types'],
    queryFn: attributeTypesApi.getAll,
  })

  const { data: attrs = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll(),
  })

  // ── Category hierarchy for picker ─────────────────────────────────────────

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const catPaths = useMemo(() => {
    const paths = new Map<string, string[]>()
    for (const cat of categories) {
      const path: string[] = []
      let cur: Category | undefined = cat
      for (let i = 0; i < 6 && cur; i++) {
        path.unshift(cur.name)
        cur = cur.parent_id ? catMap.get(cur.parent_id) : undefined
      }
      paths.set(cat.id, path)
    }
    return paths
  }, [categories, catMap])

  // ── Derived from attribute types (exclude reserved position 6) ────────────

  const sortedAtypes = useMemo(
    () => [...atypes].filter(at => at.position !== LLC_POSITION).sort((a, b) => a.position - b.position),
    [atypes],
  )

  // Table columns: attr types ordered by position with LLC slot inserted at pos 6
  type TableCol =
    | { kind: 'attribute'; at: (typeof atypes)[0] }
    | { kind: 'llc' }

  const orderedColumns = useMemo<TableCol[]>(() => {
    const cols: TableCol[] = []
    let llcInserted = false
    for (const at of sortedAtypes) {
      if (!llcInserted && at.position > LLC_POSITION) {
        cols.push({ kind: 'llc' })
        llcInserted = true
      }
      cols.push({ kind: 'attribute', at })
    }
    if (!llcInserted) cols.push({ kind: 'llc' })
    return cols
  }, [sortedAtypes])

  const attrsByType = useMemo(() => {
    const map = new Map<string, typeof attrs>()
    for (const a of attrs) {
      const list = map.get(a.attribute_type_id) ?? []
      list.push(a)
      map.set(a.attribute_type_id, list)
    }
    return map
  }, [attrs])

  const attrLookup = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const cpn of cpns) {
      const typeMap = new Map<string, string>()
      for (const a of cpn.cpn_attributes) {
        const val = resolveAttrValue(a)
        if (val) typeMap.set(a.attribute_type.id, val)
      }
      m.set(cpn.id, typeMap)
    }
    return m
  }, [cpns])

  const stats = useMemo(
    () => ({
      total: cpns.length,
      approved: cpns.filter((c) => c.approval_status === 'APPROVED').length,
      pending: cpns.filter((c) => c.approval_status === 'PENDING').length,
    }),
    [cpns],
  )

  const filtered = useMemo(() => {
    let result = [...cpns]
    const s = search.trim().toLowerCase()
    if (s) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.last_level_classification ?? '').toLowerCase().includes(s) ||
          (c.category?.name ?? '').toLowerCase().includes(s),
      )
    }
    if (approvalFilter.length > 0) {
      result = result.filter((c) => approvalFilter.includes(c.approval_status))
    }
    result.sort((a, b) => {
      const diff =
        sortField === 'name'
          ? a.name.localeCompare(b.name)
          : new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      return sortDesc ? -diff : diff
    })
    return result
  }, [cpns, search, sortField, sortDesc, approvalFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const startRow = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endRow = Math.min(safePage * pageSize, filtered.length)

  // ── Computed CPN name preview (read-only) ─────────────────────────────────

  const attrLookupById = useMemo(() => new Map(attrs.map((a) => [a.id, a])), [attrs])

  const computedCpnName = useMemo(() => {
    const llc = formLastLevelClass.trim()
    const filled = sortedAtypes
      .filter((at) => hasAttrValue(attrValues[at.id] ?? emptyAttrValue()))
      .map((at) => {
        const v = attrValues[at.id]!
        const val =
          v.mode === 'attribute'
            ? (attrLookupById.get(v.attribute_id)?.name ?? '')
            : v.free_text.trim()
        return { position: at.position, value: val }
      })
      .filter((x) => x.value)

    const before = filled.filter((a) => a.position < LLC_POSITION).map((a) => a.value)
    const after = filled.filter((a) => a.position > LLC_POSITION).map((a) => a.value)
    const parts = [...before, ...(llc ? [llc] : []), ...after]
    return parts.join(' ') || '—'
  }, [formLastLevelClass, sortedAtypes, attrValues, attrLookupById])

  // ── Mutations ────────────────────────────────────────────────────────────

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const attributes = sortedAtypes
        .filter((at) => hasAttrValue(attrValues[at.id] ?? emptyAttrValue()))
        .map((at): CPNAttribute => {
          const v = attrValues[at.id]!
          return {
            attribute_type_id: at.id,
            ...(v.mode === 'attribute'
              ? { attribute_id: v.attribute_id }
              : { free_text: v.free_text }),
          }
        })
      const payload = {
        category_id: formCategoryId,
        last_level_classification: formLastLevelClass.trim(),
        attributes,
      }
      return modal.cpn ? cpnApi.update(modal.cpn.id, payload) : cpnApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpn'] })
      toast.success(modal.cpn ? 'CPN updated' : 'CPN created')
      setModal({ open: false })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => cpnApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpn'] })
      toast.success('CPN deleted')
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: approve } = useMutation({
    mutationFn: (id: string) => cpnApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpn'] })
      toast.success('Approved')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cpnApi.reject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpn'] })
      toast.success('Rejected')
      setRejectId(null)
      setRejectReason('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Form helpers ──────────────────────────────────────────────────────────

  function buildInitialAttrValues(cpn?: CommonProductName): Record<string, AttrValueState> {
    const initial: Record<string, AttrValueState> = {}
    for (const at of atypes) {
      if (at.position === LLC_POSITION) continue
      const existing = cpn?.cpn_attributes.find((a) => a.attribute_type.id === at.id)
      if (existing) {
        initial[at.id] = {
          mode: existing.attribute ? 'attribute' : 'free_text',
          attribute_id: existing.attribute?.id ?? '',
          free_text: existing.free_text ?? '',
        }
      } else {
        initial[at.id] = emptyAttrValue()
      }
    }
    return initial
  }

  function openCreate() {
    setFormCategoryId('')
    setFormLastLevelClass('')
    setLastLevelError('')
    setCatPickerOpen(false)
    setCatPickerSearch('')
    setAttrValues(buildInitialAttrValues())
    setModal({ open: true })
  }

  function openEdit(cpn: CommonProductName) {
    setFormCategoryId(cpn.category_id ?? '')
    setFormLastLevelClass(cpn.last_level_classification ?? cpn.category?.name ?? '')
    setLastLevelError('')
    setCatPickerOpen(false)
    setCatPickerSearch('')
    setAttrValues(buildInitialAttrValues(cpn))
    setModal({ open: true, cpn })
  }

  function selectCategory(cat: Category) {
    setFormCategoryId(cat.id)
    setFormLastLevelClass(cat.name)
    setLastLevelError('')
    setCatPickerOpen(false)
    setCatPickerSearch('')
  }

  function clearCategory() {
    setFormCategoryId('')
    setFormLastLevelClass('')
    setCatPickerOpen(false)
    setCatPickerSearch('')
  }

  function setAttrMode(typeId: string, mode: AttrMode) {
    setAttrValues((prev) => ({
      ...prev,
      [typeId]: { mode, attribute_id: '', free_text: '' },
    }))
  }

  function setAttrAttributeId(typeId: string, attribute_id: string) {
    setAttrValues((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], attribute_id },
    }))
  }

  function setAttrFreeText(typeId: string, free_text: string) {
    setAttrValues((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], free_text },
    }))
  }

  function toggleSort(field: 'name' | 'created_at') {
    if (sortField === field) setSortDesc((d) => !d)
    else { setSortField(field); setSortDesc(true) }
    setPage(1)
  }

  function handleSave() {
    if (!formLastLevelClass.trim()) {
      setLastLevelError('Last Level Classification is required')
      return
    }
    save()
  }

  // ── Derived form values ───────────────────────────────────────────────────

  const selectedCatForForm = formCategoryId ? catMap.get(formCategoryId) : null
  const selectedCatPath = formCategoryId ? (catPaths.get(formCategoryId) ?? []) : []

  const catPickerOptions = useMemo(() => {
    if (!catPickerSearch.trim()) return categories
    const s = catPickerSearch.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(s))
  }, [categories, catPickerSearch])

  const filledCount = sortedAtypes.filter((at) =>
    hasAttrValue(attrValues[at.id] ?? emptyAttrValue()),
  ).length

  const formIsValid = !!formCategoryId && !!formLastLevelClass.trim()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Common Product Names</h1>
          <p className="text-sm text-slate-500 mt-0.5">Normalized shared product name registry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload size={14} />}>Bulk Upload</Button>
          <Button variant="outline" icon={<Download size={14} />}>Export</Button>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Create CPN</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="rounded-xl border border-orange-100 bg-orange-50 px-5 py-3 min-w-[100px]">
          <div className="text-2xl font-bold text-orange-600">{stats.total.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Total</div>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-5 py-3 min-w-[100px]">
          <div className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Approved</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 min-w-[100px]">
          <div className="text-2xl font-bold text-amber-600">{stats.pending.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Pending</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
        </div>
        <button
          onClick={() => { setSearch(''); setApprovalFilter([]); setPage(1) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ minWidth: `${600 + orderedColumns.length * 130}px` }}
          >
            <thead>
              {/* Column headers */}
              <tr className="border-b border-orange-100" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fefce8 100%)' }}>
                <th className="pl-4 pr-2 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider min-w-[180px]">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-orange-700 transition-colors">
                    CPN Name
                    {sortField === 'name' && (sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider min-w-[130px]">Category</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-28">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-orange-700 transition-colors">
                    Created On
                    {sortField === 'created_at' && (sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                  </button>
                </th>
                {orderedColumns.map((col) =>
                  col.kind === 'llc' ? (
                    <th key="llc" className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider min-w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <Tag size={10} className="text-orange-500 shrink-0" />
                        <span>Last Level Classification</span>
                      </div>
                    </th>
                  ) : (
                    <th key={col.at.id} className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-[130px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-orange-400 tracking-widest">L{col.at.position}</span>
                        <span className="block truncate max-w-[110px] normal-case font-semibold" title={col.at.name}>{col.at.name}</span>
                      </div>
                    </th>
                  )
                )}
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider w-24">Actions</th>
              </tr>
              {/* Filter row */}
              <tr className="border-b border-orange-50 bg-orange-50/30">
                <th className="pl-4 pr-2 py-1.5" />
                <th className="px-3 py-1.5 font-normal" />
                <th className="px-3 py-1.5 font-normal" />
                <th className="px-3 py-1.5 font-normal" />
                {orderedColumns.map((col) => (
                  <th key={col.kind === 'llc' ? 'llc' : col.at.id} className="px-3 py-1.5 font-normal" />
                ))}
                <th className="px-3 py-1.5 font-normal w-24">
                  <MultiSelectDropdown
                    options={APPROVAL_OPTIONS}
                    selected={approvalFilter}
                    onChange={(vals) => { setApprovalFilter(vals); setPage(1) }}
                  />
                </th>
                <th className="px-3 py-1.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4 + orderedColumns.length + 2} className="py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4 + orderedColumns.length + 2} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search size={32} className="text-orange-200" />
                    <span className="text-sm">No common product names found</span>
                  </div>
                </td></tr>
              ) : rows.map((cpn, idx) => {
                const rowNum = (safePage - 1) * pageSize + idx + 1
                const typeMap = attrLookup.get(cpn.id)
                const createdAt = cpn.created_at
                  ? new Date(cpn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <tr key={cpn.id} className={`border-b border-orange-50/60 last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} hover:bg-orange-50/70`}>
                    <td className="pl-4 pr-2 py-2.5 text-xs text-slate-400 select-none">{rowNum}</td>
                    {/* CPN Name */}
                    <td className="px-3 py-2.5">
                      <button onClick={() => openEdit(cpn)} className="text-sm font-semibold text-orange-700 hover:text-orange-900 hover:underline text-left leading-tight max-w-[170px] block truncate" title={cpn.name}>
                        {cpn.name || '—'}
                      </button>
                    </td>
                    {/* Category */}
                    <td className="px-3 py-2.5 text-xs text-slate-600">{cpn.category?.name ?? '—'}</td>
                    {/* Created On */}
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{createdAt}</td>
                    {/* Dynamic columns: L1…L5, LLC, L7… */}
                    {orderedColumns.map((col) =>
                      col.kind === 'llc' ? (
                        <td key="llc" className="px-3 py-2.5">
                          <span className="block truncate text-xs font-medium text-orange-700 max-w-[140px]" title={cpn.last_level_classification ?? ''}>
                            {cpn.last_level_classification || '—'}
                          </span>
                        </td>
                      ) : (
                        <td key={col.at.id} className="px-3 py-2.5 w-[130px]">
                          {typeMap?.get(col.at.id)
                            ? <span className="block truncate text-xs text-slate-700 max-w-[110px]" title={typeMap.get(col.at.id)}>{typeMap.get(col.at.id)}</span>
                            : <span className="text-slate-300 text-xs">—</span>
                          }
                        </td>
                      )
                    )}
                    <td className="px-3 py-2.5"><ApprovalBadge status={cpn.approval_status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(cpn)} className="p-1 rounded text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Edit">
                          <Pencil size={13} />
                        </button>
                        {isAdmin && cpn.approval_status === 'PENDING' && (
                          <>
                            <button onClick={() => approve(cpn.id)} className="p-1 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Approve">
                              <Check size={13} />
                            </button>
                            <button onClick={() => { setRejectId(cpn.id); setRejectReason('') }} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reject">
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteId(cpn.id)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
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
            {filtered.length !== cpns.length && <span className="text-orange-500 ml-1">(filtered from {cpns.length})</span>}
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
        title={modal.cpn ? `Edit — ${modal.cpn.last_level_classification ?? modal.cpn.name}` : 'Create Common Product Name'}
        size="xl"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {filledCount > 0
                ? `${filledCount} attribute${filledCount > 1 ? 's' : ''} filled`
                : 'Fill attributes below (optional)'}
            </span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setModal({ open: false })}>Cancel</Button>
              <Button loading={saving} disabled={!formIsValid} onClick={handleSave}>
                {modal.cpn ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">

          {/* ── CPN Name Preview (read-only, always on top) ──────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Tag size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CPN Name Preview</span>
              <span className="text-[10px] text-slate-400 ml-auto italic">Auto-calculated · not editable</span>
            </div>
            <p className={`text-sm font-medium leading-snug ${computedCpnName === '—' ? 'text-slate-400 italic' : 'text-slate-800'}`}>
              {computedCpnName}
            </p>
          </div>

          {/* ── Step 1: Category ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              {selectedCatForForm && (
                <button type="button" onClick={clearCategory} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5">
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {/* Selected display */}
            {selectedCatForForm ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-orange-700">{selectedCatForForm.name}</div>
                  {selectedCatPath.length > 1 && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {selectedCatPath.map((p, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight size={10} className="text-slate-400" />}
                          <span className="text-xs text-slate-500">{p}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${LEVEL_COLORS[(selectedCatPath.length - 1) % LEVEL_COLORS.length]}`}>
                  L{selectedCatPath.length}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-2">Select a category to continue</p>
            )}

            {/* Toggle picker */}
            <button
              type="button"
              onClick={() => setCatPickerOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-800 transition-colors"
            >
              <Search size={12} />
              {catPickerOpen ? 'Close picker' : selectedCatForForm ? 'Change category' : 'Browse & select category'}
            </button>

            {/* Inline category picker */}
            {catPickerOpen && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories…"
                      value={catPickerSearch}
                      onChange={(e) => setCatPickerSearch(e.target.value)}
                      autoFocus
                      className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {catPickerOptions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No categories found</div>
                  ) : catPickerOptions.map((c) => {
                    const path = catPaths.get(c.id) ?? []
                    const isSelected = formCategoryId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCategory(c)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isSelected ? 'text-orange-700' : 'text-slate-700'}`}>{c.name}</div>
                          {path.length > 1 && (
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {path.slice(0, -1).join(' › ')} › <span className="text-slate-500 font-medium">{c.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[(path.length - 1) % LEVEL_COLORS.length]}`}>L{path.length}</span>
                          {isSelected && <span className="text-orange-600 font-bold text-xs">✓</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Last Level Classification ───────────────────────────── */}
          {formCategoryId && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-orange-500" />
                  <label className="text-sm font-semibold text-orange-700">
                    Last Level Classification <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 bg-orange-100 px-1.5 py-0.5 rounded font-medium">Position 6</span>
                </div>
                {/* Reset button — only visible when user has customised the text */}
                {selectedCatForForm && formLastLevelClass !== selectedCatForForm.name && (
                  <button
                    type="button"
                    onClick={() => { setFormLastLevelClass(selectedCatForForm.name); setLastLevelError('') }}
                    className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-700 font-medium transition-colors"
                  >
                    <RotateCcw size={10} />
                    Reset to "{selectedCatForForm.name}"
                  </button>
                )}
              </div>

              <input
                type="text"
                value={formLastLevelClass}
                onChange={(e) => { setFormLastLevelClass(e.target.value); setLastLevelError('') }}
                placeholder="e.g. Curd Rice, South Indian Curd Rice…"
                maxLength={FL.nameCpn}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white transition-colors font-medium ${lastLevelError ? 'border-red-300' : 'border-orange-200'}`}
              />
              {lastLevelError && <p className="text-xs text-red-500 mt-1">{lastLevelError}</p>}

              <p className="text-xs text-slate-500 mt-1.5">
                Auto-filled from category. Edit to make it more specific. Always saved as-is.
              </p>
            </div>
          )}

          {/* ── Step 3: Attributes (locked until category selected) ──────────── */}
          <div className={!formCategoryId ? 'opacity-40 pointer-events-none select-none' : ''}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-slate-700">Attributes</span>
                <span className="ml-2 text-xs text-slate-400">
                  {formCategoryId
                    ? 'Select or enter a value for each attribute. Leave empty to skip.'
                    : 'Select a category first to enable attributes.'}
                </span>
              </div>
              {filledCount > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {filledCount} filled
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[40px_180px_1fr_80px] bg-slate-50 border-b border-slate-200 px-3 py-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">#</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Attribute Type</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Value</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide text-center">Mode</span>
              </div>

              <div className="divide-y divide-slate-100">
                {sortedAtypes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No attribute types defined yet</div>
                ) : sortedAtypes.map((at) => {
                  const v = attrValues[at.id] ?? emptyAttrValue()
                  const filled = hasAttrValue(v)
                  const typeAttrs = attrsByType.get(at.id) ?? []

                  return (
                    <div
                      key={at.id}
                      className={`grid grid-cols-[40px_180px_1fr_80px] items-center px-3 py-2.5 transition-colors ${filled ? 'bg-orange-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      <span className="text-[10px] text-slate-400 font-mono">{at.position}</span>
                      <div className="pr-3">
                        <span className={`text-sm font-medium ${filled ? 'text-orange-700' : 'text-slate-600'}`}>
                          {at.name}
                        </span>
                        {filled && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-500 align-middle" />}
                      </div>

                      <div className="pr-3">
                        {v.mode === 'attribute' ? (
                          <select
                            value={v.attribute_id}
                            onChange={(e) => setAttrAttributeId(at.id, e.target.value)}
                            className={`w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors ${filled ? 'border-orange-200' : 'border-slate-200'}`}
                          >
                            <option value="">— Select {at.name} —</option>
                            {typeAttrs.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={v.free_text}
                            onChange={(e) => setAttrFreeText(at.id, e.target.value)}
                            placeholder={`Enter ${at.name.toLowerCase()}…`}
                            className={`w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors ${filled ? 'border-orange-200' : 'border-slate-200'}`}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAttrMode(at.id, 'attribute')}
                          title="Select from list"
                          className={`p-1.5 rounded-lg transition-colors ${v.mode === 'attribute' ? 'bg-orange-100 text-orange-600' : 'text-slate-300 hover:text-slate-500'}`}
                        >
                          <List size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttrMode(at.id, 'free_text')}
                          title="Enter free text"
                          className={`p-1.5 rounded-lg transition-colors ${v.mode === 'free_text' ? 'bg-orange-100 text-orange-600' : 'text-slate-300 hover:text-slate-500'}`}
                        >
                          <Type size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove(deleteId)}
        title="Delete Common Product Name"
        message="Are you sure you want to delete this common product name? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Reject Modal */}
      <Modal
        open={rejectId !== null}
        onClose={() => setRejectId(null)}
        title="Reject Common Product Name"
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
          placeholder="Optional…"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
