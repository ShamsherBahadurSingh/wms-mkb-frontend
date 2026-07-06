import { useState } from 'react'
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
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import type { Role, User } from '@/types'
import { Plus, Pencil, Shield, X } from 'lucide-react'

const createSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(FL.fullName, `Max ${FL.fullName} characters`),
  username: z.string().min(1, 'Username is required').max(FL.username, `Max ${FL.username} characters`),
  email: z.string().email('Invalid email').max(FL.email, `Max ${FL.email} characters`),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role_id: z.string().optional(),
})

const editSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(FL.fullName, `Max ${FL.fullName} characters`),
  is_active: z.string(),
  role_id: z.string().optional(),
})

type CreateData = z.infer<typeof createSchema>
type EditData = z.infer<typeof editSchema>

export function UsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [rolesUser, setRolesUser] = useState<User | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getUsers,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: authApi.getRoles,
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (d: CreateData) => authApi.createUser(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditData }) =>
      authApi.updateUser(id, {
        full_name: data.full_name,
        is_active: data.is_active === 'true',
        role_id: data.role_id || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditUser(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { mutate: assignRoles, isPending: assigningRoles } = useMutation({
    mutationFn: () =>
      authApi.assignUserRoles(rolesUser!.id, { role_ids: selectedRoleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Roles updated')
      setRolesUser(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) })

  function openEdit(user: User) {
    editForm.reset({
      full_name: user.full_name,
      is_active: String(user.is_active),
      role_id: user.role?.id ?? '',
    })
    setEditUser(user)
  }

  function openRoles(user: User) {
    // Pre-select existing additional role IDs
    const existing = user.user_role_entries.map((e) => e.role.id)
    setSelectedRoleIds(existing)
    setRolesUser(user)
  }

  function toggleRoleSelection(roleId: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    )
  }

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.display_name || r.name }))

  function getUserRoleBadges(user: User) {
    const allRoles: Role[] = []
    if (user.role) allRoles.push(user.role)
    user.user_role_entries.forEach((e) => {
      if (!allRoles.find((r) => r.id === e.role.id)) allRoles.push(e.role)
    })
    return allRoles
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage company users and their roles"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            Add User
          </Button>
        }
      />

      <Table
        loading={isLoading}
        data={users}
        rowKey={(r) => r.id}
        columns={[
          { key: 'full_name', header: 'Name' },
          { key: 'username', header: 'Username' },
          { key: 'email', header: 'Email' },
          {
            key: 'roles',
            header: 'Roles',
            render: (r) => {
              const allRoles = getUserRoleBadges(r)
              if (allRoles.length === 0) return <span className="text-slate-400 text-xs">No role</span>
              return (
                <div className="flex flex-wrap gap-1">
                  {allRoles.map((role) => (
                    <Badge key={role.id} variant="info">{role.display_name || role.name}</Badge>
                  ))}
                </div>
              )
            },
          },
          {
            key: 'type',
            header: 'Type',
            render: (r) =>
              r.is_superuser
                ? <Badge variant="warning">Superuser</Badge>
                : r.is_company_admin
                ? <Badge variant="info">Admin</Badge>
                : <Badge variant="neutral">User</Badge>,
          },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
          {
            key: 'actions', header: '', className: 'w-24',
            render: (r) => (
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(r)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  title="Edit user"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => openRoles(r)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Manage roles"
                >
                  <Shield size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Create User Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create User"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={createForm.handleSubmit((d) => create(d))}>
              Create User
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Full Name" required maxLength={FL.fullName} error={createForm.formState.errors.full_name?.message} {...createForm.register('full_name')} />
          <Input label="Username" required maxLength={FL.username} error={createForm.formState.errors.username?.message} {...createForm.register('username')} />
          <Input label="Email" type="email" required maxLength={FL.email} error={createForm.formState.errors.email?.message} {...createForm.register('email')} />
          <Input label="Password" type="password" required error={createForm.formState.errors.password?.message} {...createForm.register('password')} />
          <Select label="Primary Role" options={roleOptions} placeholder="Use default role" {...createForm.register('role_id')} />
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title="Edit User"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              loading={updating}
              onClick={editForm.handleSubmit((d) => editUser && update({ id: editUser.id, data: d }))}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        {editUser && (
          <form className="flex flex-col gap-4">
            <Input
              label="Full Name"
              required
              maxLength={FL.fullName}
              error={editForm.formState.errors.full_name?.message}
              {...editForm.register('full_name')}
            />
            <Select
              label="Status"
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
              {...editForm.register('is_active')}
            />
            <Select
              label="Primary Role"
              options={roleOptions}
              placeholder="No role"
              {...editForm.register('role_id')}
            />
          </form>
        )}
      </Modal>

      {/* Manage Roles Modal */}
      <Modal
        open={rolesUser !== null}
        onClose={() => setRolesUser(null)}
        title={`Additional Roles — ${rolesUser?.full_name}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRolesUser(null)}>Cancel</Button>
            <Button loading={assigningRoles} onClick={() => assignRoles()}>Save Roles</Button>
          </div>
        }
      >
        {rolesUser && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Primary role: <strong>{rolesUser.role?.display_name || rolesUser.role?.name || 'None'}</strong>
              {' '}(set in Edit User). Toggle additional roles below.
            </p>
            <div className="space-y-1">
              {roles.map((role) => {
                const isPrimary = rolesUser.role?.id === role.id
                const checked = selectedRoleIds.includes(role.id)
                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${isPrimary ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={isPrimary}
                      checked={checked}
                      onChange={() => !isPrimary && toggleRoleSelection(role.id)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">
                          {role.display_name || role.name}
                        </span>
                        {role.is_system_role && (
                          <Badge variant="info" className="text-[10px]">System</Badge>
                        )}
                        {isPrimary && (
                          <span className="text-xs text-slate-400">(primary)</span>
                        )}
                      </div>
                    </div>
                    {checked && !isPrimary && (
                      <X
                        size={14}
                        className="text-slate-400 hover:text-red-500"
                        onClick={(e) => { e.preventDefault(); toggleRoleSelection(role.id) }}
                      />
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
