import api from '@/lib/axios'
import type {
  LoginRequest,
  TokenResponse,
  AccessTokenResponse,
  RefreshRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  User,
  Company,
  CompanyCreate,
  CompanyWithAdmin,
  UserCreate,
  UserUpdate,
  UserRoleAssign,
  Role,
  RoleCreate,
  RoleUpdate,
  RoleWithPermissions,
  Permission,
  RolePermissionsUpdate,
  Module,
} from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout'),

  refresh: (data: RefreshRequest) =>
    api.post<AccessTokenResponse>('/auth/refresh', data).then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<ForgotPasswordResponse>('/auth/forgot-password', data).then((r) => r.data),

  resetPassword: (data: ResetPasswordRequest) => api.post('/auth/reset-password', data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  // Companies (SuperUser only)
  getCompanies: () => api.get<Company[]>('/auth/companies').then((r) => r.data),

  createCompany: (data: CompanyCreate) =>
    api.post<CompanyWithAdmin>('/auth/companies', data).then((r) => r.data),

  // Users (Company Admin only)
  getUsers: () => api.get<User[]>('/auth/users').then((r) => r.data),

  getUser: (id: string) => api.get<User>(`/auth/users/${id}`).then((r) => r.data),

  createUser: (data: UserCreate) =>
    api.post<User>('/auth/users', data).then((r) => r.data),

  updateUser: (id: string, data: UserUpdate) =>
    api.put<User>(`/auth/users/${id}`, data).then((r) => r.data),

  assignUserRoles: (userId: string, data: UserRoleAssign) =>
    api.put<User>(`/auth/users/${userId}/roles`, data).then((r) => r.data),

  removeUserRole: (userId: string, roleId: string) =>
    api.delete<User>(`/auth/users/${userId}/roles/${roleId}`).then((r) => r.data),

  // Roles (Company Admin only)
  getRoles: () => api.get<Role[]>('/auth/roles').then((r) => r.data),

  getRole: (id: string) =>
    api.get<RoleWithPermissions>(`/auth/roles/${id}`).then((r) => r.data),

  createRole: (data: RoleCreate) =>
    api.post<Role>('/auth/roles', data).then((r) => r.data),

  updateRole: (id: string, data: RoleUpdate) =>
    api.patch<Role>(`/auth/roles/${id}`, data).then((r) => r.data),

  deleteRole: (id: string) =>
    api.delete(`/auth/roles/${id}`),

  updateRolePermissions: (roleId: string, data: RolePermissionsUpdate) =>
    api.put<Permission[]>(`/auth/roles/${roleId}/permissions`, data).then((r) => r.data),

  // Modules
  getModules: () => api.get<Module[]>('/auth/modules').then((r) => r.data),
}
