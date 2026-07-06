import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FL } from '@/lib/fieldLimits'
import { authApi } from '@/api/auth'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/lib/utils'
import { Table, PageHeader } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import type { Role, Module, PermissionInput, RoleWithPermissions } from '@/types'
import { Plus, Shield, Trash2, Star } from 'lucide-react'

const createSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(FL.name, `Max ${FL.name} characters`),
  display_name: z.string().max(FL.displayName, `Max ${FL.displayName} characters`).optional(),
})
type CreateFormData = z.infer<typeof createSchema>

const PERM_FIELDS: Array<{ key: keyof Omit<PermissionInput, 'module_id'>; label: string; color?: string }> = [
  { key: 'can_view', label: 'View' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_update', label: 'Update' },
  { key: 'can_delete', label: 'Delete' },
  { key: 'can_approve', label: 'Approve', color: 'text-amber-600' },
  { key: 'can_bulk_upload', label: 'Bulk Upload' },
  { key: 'can_bulk_update', label: 'Bulk Upd.' },
]

type PermMap = Record<string, Record<string, boolean>>

function buildPermMapFromRole(role: RoleWithPermissions): PermMap {
  const map: PermMap = {}
  for (const perm of role.permissions) {
    map[perm.module_id] = {
      can_view: perm.can_view,
      can_edit: perm.can_edit,
      can_update: perm.can_update,
      can_delete: perm.can_delete,
      can_approve: perm.can_approve,
      can_bulk_upload: perm.can_bulk_upload,
      can_bulk_update: perm.can_bulk_update,
    }
  }
  return map
}

export function RolesPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [permMap, setPermMap] = useState<PermMap>({})
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: authApi.getRoles,
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: authApi.getModules,
  })

  // Load existing permissions when a role is selected for editing
  const { data: roleDetail, isFetching: loadingPerms } = useQuery({
    queryKey: ['role', permRole?.id],
    queryFn: () => authApi.getRole(permRole!.id),
    enabled: !!permRole,
  })

  useEffect(() => {
    if (roleDetail) {
      setPermMap(buildPermMapFromRole(roleDetail))
    }
  }, [roleDetail])

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: CreateFormData) => authApi.createRole(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role created')
      setCreateOpen(false)
      reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: savePerms, isPending: savingPerms } = useMutation({
    mutationFn: () => {
      if (!permRole) throw new Error('No role selected')
      const permissions: PermissionInput[] = modules.map((m) => ({
        module_id: m.id,
        can_view: permMap[m.id]?.can_view ?? false,
        can_edit: permMap[m.id]?.can_edit ?? false,
        can_delete: permMap[m.id]?.can_delete ?? false,
        can_update: permMap[m.id]?.can_update ?? false,
        can_bulk_upload: permMap[m.id]?.can_bulk_upload ?? false,
        can_bulk_update: permMap[m.id]?.can_bulk_update ?? false,
        can_approve: permMap[m.id]?.can_approve ?? false,
      }))
      return authApi.updateRolePermissions(permRole.id, { permissions })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role', permRole?.id] })
      toast.success('Permissions saved')
      setPermRole(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: confirmDelete, isPending: deleting } = useMutation({
    mutationFn: () => authApi.deleteRole(deleteRole!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role deleted')
      setDeleteRole(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  })

  function openPermissions(role: Role) {
    setPermRole(role)
    setPermMap({})
  }

  function togglePerm(moduleId: string, field: string) {
    setPermMap((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: !(prev[moduleId]?.[field] ?? false),
      },
    }))
  }

  function toggleAll(moduleId: string, value: boolean) {
    const all: Record<string, boolean> = {}
    PERM_FIELDS.forEach((f) => (all[f.key] = value))
    setPermMap((prev) => ({ ...prev, [moduleId]: all }))
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="System roles are auto-seeded. Create custom roles with granular module permissions."
        action={
          <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Add Role
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={roles}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'name', header: 'Role',
            render: (r) => (
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-orange-400" />
                <span className="font-medium">{r.display_name || r.name}</span>
                {r.is_default && (
                  <span title="Default role for new users">
                    <Star size={12} className="text-amber-400" />
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'type', header: 'Type',
            render: (r) => r.is_system_role
              ? <Badge variant="info">System</Badge>
              : <Badge variant="neutral">Custom</Badge>,
          },
          {
            key: 'actions', header: '', className: 'w-52',
            render: (r) => (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => openPermissions(r)}>
                  Edit Permissions
                </Button>
                {!r.is_system_role && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={13} />}
                    onClick={() => setDeleteRole(r)}
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Create Role Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Custom Role"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleSubmit((d) => create(d))}>Create Role</Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Input
            label="Role Name (internal)"
            required
            placeholder="e.g. warehouse_manager"
            maxLength={FL.name}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Display Name"
            placeholder="e.g. Warehouse Manager"
            maxLength={FL.displayName}
            error={errors.display_name?.message}
            {...register('display_name')}
          />
        </form>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal
        open={permRole !== null}
        onClose={() => setPermRole(null)}
        title={`Permissions — ${permRole?.display_name || permRole?.name}`}
        size="xl"
        footer={
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Approve: users with this flag can bypass the approval workflow and auto-generate short codes.
            </span>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPermRole(null)}>Cancel</Button>
              <Button loading={savingPerms || loadingPerms} onClick={() => savePerms()}>
                Save Permissions
              </Button>
            </div>
          </div>
        }
      >
        {loadingPerms ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading permissions…</div>
        ) : modules.length === 0 ? (
          <p className="text-sm text-slate-500">No modules available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-slate-600 font-semibold">Module</th>
                  {PERM_FIELDS.map((f) => (
                    <th
                      key={f.key}
                      className={`text-center py-2 px-2 font-semibold whitespace-nowrap ${f.color ?? 'text-slate-600'}`}
                    >
                      {f.label}
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 text-slate-600 font-semibold">All</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m: Module) => {
                  const allChecked = PERM_FIELDS.every((f) => permMap[m.id]?.[f.key])
                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-700">
                        {m.display_name || m.name}
                      </td>
                      {PERM_FIELDS.map((f) => (
                        <td key={f.key} className="text-center px-2 py-2">
                          <input
                            type="checkbox"
                            checked={permMap[m.id]?.[f.key] ?? false}
                            onChange={() => togglePerm(m.id, f.key)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                      ))}
                      <td className="text-center px-2 py-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => toggleAll(m.id, e.target.checked)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteRole !== null}
        onClose={() => setDeleteRole(null)}
        title="Delete Role"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteRole(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={() => confirmDelete()}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{deleteRole?.display_name || deleteRole?.name}</strong>?
          Users assigned this role will lose its permissions.
        </p>
      </Modal>
    </div>
  )
}
