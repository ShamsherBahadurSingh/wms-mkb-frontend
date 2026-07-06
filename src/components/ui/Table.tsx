import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PageSpinner } from './Spinner'
import { ChevronLeft, ChevronRight, Search, ChevronDown, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilterOption {
  label: string
  value: string
}

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  searchable?: boolean
  filterOptions?: FilterOption[]
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  defaultPageSize?: number
}

const PAGE_SIZES = [10, 50, 100, 500]

// ── Built-in filter options for common columns ────────────────────────────────

const AUTO_FILTER: Record<string, FilterOption[]> = {
  is_active: [
    { label: 'Active',   value: 'true'  },
    { label: 'Inactive', value: 'false' },
  ],
  approval_status: [
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Pending',  value: 'PENDING'  },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Draft',    value: 'DRAFT'    },
  ],
}

// ── MultiSelect dropdown ──────────────────────────────────────────────────────

export type { FilterOption }

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
}: {
  options: FilterOption[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = selected.length > 0 && selected.length < options.length
  const label = active ? `${selected.length} of ${options.length}` : 'All'

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2.5 py-1 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors',
          active
            ? 'border-orange-400 text-orange-700 bg-orange-50 font-medium'
            : 'border-orange-100 text-slate-500'
        )}
      >
        <span className="flex-1 text-left">{label}</span>
        {active && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange([]) }}
            className="flex-shrink-0 text-orange-500 hover:text-orange-700"
          >
            <X size={10} />
          </span>
        )}
        <ChevronDown size={11} className={cn('flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-orange-100 shadow-xl z-50 min-w-[150px] py-1.5 overflow-hidden">
          {options.map((opt) => {
            const checked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-xs',
                  checked ? 'bg-orange-50 text-orange-800' : 'text-slate-700 hover:bg-orange-50/60'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-orange-300 text-orange-500 focus:ring-orange-400 w-3.5 h-3.5 flex-shrink-0"
                />
                <span className="font-medium">{opt.label}</span>
              </label>
            )
          })}
          {active && (
            <>
              <div className="border-t border-orange-50 mx-3 my-1" />
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 font-semibold"
              >
                Clear filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Table ────────────────────────────────────────────────────────────────

export function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found',
  rowKey,
  onRowClick,
  defaultPageSize = 50,
}: TableProps<T>) {
  const [search,  setSearch]  = useState<Record<string, string>>({})
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [page,     setPage]    = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  function getColFilterOptions(col: Column<T>): FilterOption[] | null {
    if (col.filterOptions) return col.filterOptions
    return AUTO_FILTER[col.key] ?? null
  }

  function isColTextSearchable(col: Column<T>): boolean {
    if (getColFilterOptions(col)) return false
    if (col.searchable !== undefined) return col.searchable
    return col.render === undefined && col.key !== 'actions'
  }

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const r = row as Record<string, unknown>

      // Text search
      for (const col of columns) {
        if (!isColTextSearchable(col)) continue
        const q = search[col.key]?.trim().toLowerCase()
        if (!q) continue
        const str = r[col.key] == null ? '' : String(r[col.key]).toLowerCase()
        if (!str.includes(q)) return false
      }

      // Multi-select filter
      for (const col of columns) {
        const selected = filters[col.key]
        if (!selected || selected.length === 0) continue
        const str = String(r[col.key] ?? '')
        if (!selected.includes(str)) return false
      }

      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, filters, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages - 1)
  const sliced     = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const hasFilterRow = columns.some(
    (col) => isColTextSearchable(col) || getColFilterOptions(col) !== null
  )

  if (loading) return <PageSpinner />

  const start = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const end   = Math.min((safePage + 1) * pageSize, filtered.length)

  return (
    <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {/* Column headers */}
            <tr
              className="border-b border-orange-100"
              style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fefce8 100%)' }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-4 py-3 text-xs font-bold text-amber-900 uppercase tracking-wider whitespace-nowrap',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>

            {/* Filter row */}
            {hasFilterRow && (
              <tr className="border-b border-orange-50 bg-orange-50/30">
                {columns.map((col) => {
                  const filterOpts = getColFilterOptions(col)
                  const isText = isColTextSearchable(col)
                  return (
                    <th key={col.key} className={cn('px-3 py-1.5 font-normal', col.className)}>
                      {filterOpts ? (
                        <MultiSelectDropdown
                          options={filterOpts}
                          selected={filters[col.key] ?? []}
                          onChange={(vals) => {
                            setFilters((p) => ({ ...p, [col.key]: vals }))
                            setPage(0)
                          }}
                        />
                      ) : isText ? (
                        <div className="relative">
                          <Search
                            size={11}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-300 pointer-events-none"
                          />
                          <input
                            value={search[col.key] ?? ''}
                            onChange={(e) => {
                              setSearch((p) => ({ ...p, [col.key]: e.target.value }))
                              setPage(0)
                            }}
                            placeholder="Search…"
                            className="w-full pl-7 pr-2 py-1 text-xs border border-orange-100 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 text-slate-600 placeholder-slate-300 transition-colors"
                          />
                        </div>
                      ) : null}
                    </th>
                  )
                })}
              </tr>
            )}
          </thead>

          <tbody>
            {sliced.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="text-orange-200" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              sliced.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-orange-50/60 last:border-0 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20',
                    onRowClick && 'cursor-pointer hover:bg-orange-50/70'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-700', col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-orange-100 bg-gradient-to-r from-orange-50/60 to-amber-50/60">
        <span className="text-xs text-slate-500">
          Showing{' '}
          <span className="font-semibold text-slate-700">{start}–{end}</span>
          {' '}of{' '}
          <span className="font-semibold text-slate-700">{filtered.length}</span>
          {filtered.length !== data.length && (
            <span className="text-orange-500 ml-1">(filtered from {data.length})</span>
          )}
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
              className="text-xs border border-orange-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-700 cursor-pointer"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="px-2 py-1 text-xs rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-orange-200 rounded-md min-w-[60px] text-center">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1 text-xs rounded-md border border-orange-200 text-slate-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
