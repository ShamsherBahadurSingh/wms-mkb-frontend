import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uomApi } from '@/api/uom'
import { dimensionsApi, breakableUnitsApi, billableUnitsApi } from '@/api/master'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { FL } from '@/lib/fieldLimits'
import type { Dimension, BreakableUnit, BillableUnit } from '@/types'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

// ── Name computation (mirrors backend logic) ──────────────────────────────────

function computeUomName(
  dim: Dimension | null,
  bu: BreakableUnit | null,
  buToDim: number,
  bill: BillableUnit | null,
  billToBu: number,
): string {
  if (!dim || !bu || !bill) return '-'
  const fmt = (v: number) => String(v)
  if (bill.code.toLowerCase() === 'n/a') return 'n/a'
  const parts: string[] = [bill.code]
  if (bill.code !== bu.code) parts.push(`[${fmt(billToBu)} ${bu.code}/${bill.code}]`)
  if (bu.code !== dim.code) parts.push(`[${fmt(buToDim)} ${dim.code}/${bu.code}]`)
  return parts.join(' ')
}

// ── FormRow layout helper ─────────────────────────────────────────────────────

function FormRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[280px_1fr] items-start gap-6 px-6 py-4">
      <div className="pt-2 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-green-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function UomFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const qc = useQueryClient()
  const toast = useToast()

  // Form state
  const [dimensionId, setDimensionId] = useState('')
  const [breakableUnitId, setBreakableUnitId] = useState('')
  const [buToDim, setBuToDim] = useState(1)
  const [billableUnitId, setBillableUnitId] = useState('')
  const [billToBu, setBillToBu] = useState(1)
  const [synonyms, setSynonyms] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Data queries
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['uom', id],
    queryFn: () => uomApi.getOne(id!),
    enabled: isEdit,
  })

  const { data: dimensions = [] } = useQuery({
    queryKey: ['dimensions'],
    queryFn: dimensionsApi.getAll,
  })

  const { data: breakableUnits = [] } = useQuery({
    queryKey: ['breakable-units'],
    queryFn: breakableUnitsApi.getAll,
  })

  const { data: billableUnits = [] } = useQuery({
    queryKey: ['billable-units'],
    queryFn: billableUnitsApi.getAll,
  })

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setDimensionId(existing.dimension_id ?? '')
      setBreakableUnitId(existing.breakable_unit_id ?? '')
      setBuToDim(existing.breakable_unit_dimension ?? 1)
      setBillableUnitId(existing.billable_unit_id ?? '')
      setBillToBu(existing.billable_unit_dimension ?? 1)
      const syns = existing.synonyms
        ? existing.synonyms.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      setSynonyms(syns.length > 0 ? syns : [''])
      setDescription(existing.description ?? '')
      setIsActive(existing.is_active)
    }
  }, [existing])

  // Derived — selected objects for preview
  const selectedDim = dimensions.find((d) => d.id === dimensionId) ?? null
  const selectedBu = breakableUnits.find((b) => b.id === breakableUnitId) ?? null
  const selectedBill = billableUnits.find((b) => b.id === billableUnitId) ?? null

  const computedName = useMemo(
    () => computeUomName(selectedDim, selectedBu, buToDim, selectedBill, billToBu),
    [selectedDim, selectedBu, buToDim, selectedBill, billToBu],
  )

  // Mutations
  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: uomApi.create,
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (data: Parameters<typeof uomApi.update>[1]) => uomApi.update(id!, data),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const saving = creating || updating

  // Validation
  function validate() {
    const e: Record<string, string> = {}
    if (!dimensionId) e.dimension_id = 'Dimension is required'
    if (!breakableUnitId) e.breakable_unit_id = 'Breakable unit is required'
    if (!billableUnitId) e.billable_unit_id = 'Billable unit is required'
    if (buToDim <= 0) e.bu_to_dim = 'Must be greater than 0'
    if (billToBu <= 0) e.bill_to_bu = 'Must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function buildPayload() {
    const synonymsStr = synonyms.filter(Boolean).join(', ') || undefined
    return {
      dimension_id: dimensionId,
      breakable_unit_id: breakableUnitId,
      breakable_unit_dimension: buToDim,
      billable_unit_id: billableUnitId,
      billable_unit_dimension: billToBu,
      synonyms: synonymsStr,
      description: description || undefined,
    }
  }

  function resetForm() {
    setDimensionId('')
    setBreakableUnitId('')
    setBuToDim(1)
    setBillableUnitId('')
    setBillToBu(1)
    setSynonyms([''])
    setDescription('')
    setIsActive(true)
    setErrors({})
  }

  function handleSave(nav: 'back' | 'another' | 'stay') {
    if (!validate()) return
    const payload = buildPayload()
    if (isEdit) {
      update(
        { ...payload, is_active: isActive },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['uom'] })
            toast.success('UOM updated')
            if (nav === 'back') navigate('/uom')
          },
        },
      )
    } else {
      create(payload, {
        onSuccess: (saved) => {
          qc.invalidateQueries({ queryKey: ['uom'] })
          toast.success('UOM created')
          if (nav === 'back') navigate('/uom')
          else if (nav === 'another') resetForm()
          else if (nav === 'stay') navigate(`/uom/${saved.id}`)
        },
      })
    }
  }

  // Synonym helpers
  function addSynonym() { setSynonyms((p) => [...p, '']) }
  function removeSynonym(idx: number) { setSynonyms((p) => p.filter((_, i) => i !== idx)) }
  function updateSynonym(idx: number, val: string) {
    setSynonyms((p) => p.map((s, i) => (i === idx ? val : s)))
  }

  // Approval badge
  function approvalClass(status: string) {
    const map: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
    }
    return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'
  }

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  const selectCls = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white appearance-none ${
      err ? 'border-red-300' : 'border-slate-200'
    }`

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
      err ? 'border-red-300' : 'border-slate-200'
    }`

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate('/uom')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        UOMs
      </button>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Unit of Measurement Fields</h2>
          {isEdit && existing && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${approvalClass(existing.approval_status)}`}
            >
              {existing.approval_status}
            </span>
          )}
        </div>

        {/* Live name preview — always visible at top */}
        <div className={`px-6 py-4 border-b border-slate-200 transition-colors ${computedName === '-' ? 'bg-slate-50/50' : 'bg-orange-50/40'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Name (auto-computed, read-only)
          </p>
          <p className={`text-xl font-semibold tracking-tight ${computedName === '-' ? 'text-slate-300' : 'text-slate-800'}`}>
            {computedName}
          </p>
          {computedName === '-' && (
            <p className="text-xs text-slate-400 mt-1">
              Select Dimension, Breakable Unit and Billable Unit to compute the name
            </p>
          )}
        </div>

        <div className="divide-y divide-slate-100">

          {/* Dimension */}
          <FormRow label="Dimension" required>
            <div>
              <select
                value={dimensionId}
                onChange={(e) => { setDimensionId(e.target.value); setErrors((p) => ({ ...p, dimension_id: '' })) }}
                className={selectCls(errors.dimension_id)}
              >
                <option value="">Select Dimension…</option>
                {dimensions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              {errors.dimension_id && <p className="text-xs text-red-500 mt-1">{errors.dimension_id}</p>}
            </div>
          </FormRow>

          {/* Breakable Unit */}
          <FormRow label="Breakable Unit" required>
            <div>
              <select
                value={breakableUnitId}
                onChange={(e) => { setBreakableUnitId(e.target.value); setErrors((p) => ({ ...p, breakable_unit_id: '' })) }}
                className={selectCls(errors.breakable_unit_id)}
              >
                <option value="">Select Breakable Unit…</option>
                {breakableUnits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.breakable_unit_id && <p className="text-xs text-red-500 mt-1">{errors.breakable_unit_id}</p>}
            </div>
          </FormRow>

          {/* Breakable Unit to Dimension */}
          <FormRow label="Breakable Unit to Dimension" required>
            <div>
              <input
                type="number"
                min={1}
                step={1}
                value={buToDim}
                onChange={(e) => { setBuToDim(Number(e.target.value)); setErrors((p) => ({ ...p, bu_to_dim: '' })) }}
                className={inputCls(errors.bu_to_dim)}
              />
              {errors.bu_to_dim && <p className="text-xs text-red-500 mt-1">{errors.bu_to_dim}</p>}
            </div>
          </FormRow>

          {/* Billable Unit */}
          <FormRow label="Billable Unit" required>
            <div>
              <select
                value={billableUnitId}
                onChange={(e) => { setBillableUnitId(e.target.value); setErrors((p) => ({ ...p, billable_unit_id: '' })) }}
                className={selectCls(errors.billable_unit_id)}
              >
                <option value="">Select Billable Unit…</option>
                {billableUnits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              {errors.billable_unit_id && <p className="text-xs text-red-500 mt-1">{errors.billable_unit_id}</p>}
            </div>
          </FormRow>

          {/* Billable Unit to Breakable Unit */}
          <FormRow label="Billable Unit to Breakable Unit" required>
            <div>
              <input
                type="number"
                min={1}
                step={1}
                value={billToBu}
                onChange={(e) => { setBillToBu(Number(e.target.value)); setErrors((p) => ({ ...p, bill_to_bu: '' })) }}
                className={inputCls(errors.bill_to_bu)}
              />
              {errors.bill_to_bu && <p className="text-xs text-red-500 mt-1">{errors.bill_to_bu}</p>}
            </div>
          </FormRow>

          {/* Synonyms */}
          <FormRow label="Synonyms">
            <div className="space-y-2">
              {synonyms.map((syn, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={syn}
                    maxLength={FL.nameUom}
                    onChange={(e) => updateSynonym(idx, e.target.value)}
                    placeholder={`Synonym ${idx + 1}`}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSynonym(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSynonym}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus size={14} />
                Add new item
              </button>
            </div>
          </FormRow>

          {/* Description */}
          <FormRow label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={FL.description}
              placeholder="Optional description…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
            />
          </FormRow>

          {/* Is Active */}
          <FormRow label="Is Active">
            <Toggle checked={isActive} onChange={() => setIsActive((v) => !v)} />
          </FormRow>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-3">
          {isEdit ? (
            <>
              <Button variant="outline" onClick={() => navigate('/uom')}>
                Cancel
              </Button>
              <Button loading={saving} onClick={() => handleSave('back')}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" loading={saving} onClick={() => handleSave('another')}>
                Save and add another
              </Button>
              <Button variant="outline" loading={saving} onClick={() => handleSave('stay')}>
                Save and continue editing
              </Button>
              <Button loading={saving} onClick={() => handleSave('back')}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
