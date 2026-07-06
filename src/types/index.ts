// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  login: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface RefreshRequest {
  refresh_token: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  security_key: string
}

export interface ResetPasswordRequest {
  email: string
  security_key: string
  new_password: string
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
}

export interface CompanyCreate {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  admin_full_name: string
  admin_username: string
  admin_email: string
  admin_password: string
}

export interface CompanyWithAdmin {
  company: Company
  admin: User
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  full_name: string
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
  is_company_admin: boolean
  role?: Role
  company?: Company
  user_role_entries: UserRoleEntry[]
}

export interface UserCreate {
  full_name: string
  username: string
  email: string
  password: string
  role_id?: string
  role_ids?: string[]
}

export interface UserUpdate {
  full_name?: string
  is_active?: boolean
  role_id?: string
}

export interface UserRoleAssign {
  role_ids: string[]
}

// ─── Role & Permission ────────────────────────────────────────────────────────

export interface Role {
  id: string
  name: string
  display_name?: string
  is_system_role: boolean
  is_default: boolean
}

export interface RoleCreate {
  name: string
  display_name?: string
}

export interface RoleUpdate {
  name?: string
  display_name?: string
}

export interface Module {
  id: string
  name: string
  display_name?: string
  code: string
  description?: string
  is_active: boolean
}

export interface Permission {
  id: string
  module_id: string
  module?: Module
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_update: boolean
  can_bulk_upload: boolean
  can_bulk_update: boolean
  can_approve: boolean
}

export interface PermissionInput {
  module_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_update: boolean
  can_bulk_upload: boolean
  can_bulk_update: boolean
  can_approve: boolean
}

export interface RolePermissionsUpdate {
  permissions: PermissionInput[]
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface UserRoleEntry {
  id: string
  role: Role
}

// ─── Brand ────────────────────────────────────────────────────────────────────

export interface Brand {
  id: string
  name: string
  short_code?: string
  description?: string
  brand_type?: string
  parent_id?: string
  brand_logo?: string
  is_active: boolean
  approval_status: string
  submitted_by_id?: string
  approved_by_id?: string
  rejection_reason?: string
}

export interface BrandCreate {
  name: string
  short_code?: string
  description?: string
  brand_type?: string
  parent_id?: string
  brand_logo?: string
}

export interface BrandUpdate {
  name?: string
  short_code?: string
  description?: string
  brand_type?: string
  parent_id?: string
  is_active?: boolean
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  short_code?: string
  description?: string
  parent_id?: string
  is_active: boolean
  approval_status: string
  submitted_by_id?: string
  approved_by_id?: string
  rejection_reason?: string
  created_at?: string
  updated_at?: string
}

export interface CategoryCreate {
  name: string
  description?: string
  parent_id?: string
}

export interface CategoryUpdate {
  name?: string
  description?: string
  parent_id?: string
  is_active?: boolean
}

// ─── Dimension ────────────────────────────────────────────────────────────────

export interface Dimension {
  id: string
  name: string
  code: string
  is_active: boolean
}

export interface DimensionCreate {
  name: string
  code: string
}

export interface DimensionUpdate {
  name?: string
  code?: string
  is_active?: boolean
}

// ─── Breakable Unit ───────────────────────────────────────────────────────────

export interface BreakableUnit {
  id: string
  name: string
  code: string
  is_active: boolean
}

export interface BreakableUnitCreate {
  name: string
  code: string
}

export interface BreakableUnitUpdate {
  name?: string
  code?: string
  is_active?: boolean
}

// ─── Billable Unit ────────────────────────────────────────────────────────────

export interface BillableUnit {
  id: string
  name: string
  code: string
  is_active: boolean
}

export interface BillableUnitCreate {
  name: string
  code: string
}

export interface BillableUnitUpdate {
  name?: string
  code?: string
  is_active?: boolean
}

// ─── UOM ──────────────────────────────────────────────────────────────────────

export interface UOM {
  id: string
  name: string
  short_code: string
  description?: string
  synonyms?: string
  dimension_id?: string
  breakable_unit_id?: string
  billable_unit_id?: string
  breakable_unit_dimension?: number
  billable_unit_dimension?: number
  is_active: boolean
  approval_status: string
  submitted_by_id?: string
  approved_by_id?: string
  rejection_reason?: string
}

export interface UOMCreate {
  dimension_id: string
  breakable_unit_id: string
  breakable_unit_dimension?: number
  billable_unit_id: string
  billable_unit_dimension?: number
  synonyms?: string
  description?: string
}

export interface UOMUpdate {
  dimension_id?: string
  breakable_unit_id?: string
  breakable_unit_dimension?: number
  billable_unit_id?: string
  billable_unit_dimension?: number
  synonyms?: string
  description?: string
  is_active?: boolean
}

// ─── Attribute Type ───────────────────────────────────────────────────────────

export interface AttributeType {
  id: string
  name: string
  code: string
  description?: string
  position: number
  is_active: boolean
}

export interface AttributeTypeCreate {
  name: string
  code?: string
  description?: string
  // position is auto-assigned by the backend
}

export interface AttributeTypeUpdate {
  name?: string
  code?: string
  description?: string
  is_active?: boolean
  // position is managed via /reorder endpoint only
}

export interface AttributeTypeReorder {
  ordered_ids: string[]
}

// ─── Attribute ────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Attribute {
  id: string
  name: string
  short_code: string
  attribute_type_id: string
  attribute_type?: AttributeType
  synonyms?: string
  description?: string
  is_active: boolean
  approval_status: ApprovalStatus
  submitted_by_id?: string
  approved_by_id?: string
  rejection_reason?: string
}

export interface AttributeCreate {
  name: string
  short_code?: string
  attribute_type_id: string
  synonyms?: string
  description?: string
}

export interface AttributeUpdate {
  name?: string
  synonyms?: string
  description?: string
  is_active?: boolean
}

export interface ApprovalAction {
  reason?: string
}

// ─── Common Product Name ──────────────────────────────────────────────────────

// Input shape for create/update forms
export interface CPNAttribute {
  attribute_type_id: string
  attribute_id?: string
  free_text?: string
  category_id?: string
}

// Response shape from the API (nested objects)
export interface CPNAttributeTypeInfo {
  id: string
  name: string
  code: string
  position: number
}

export interface CPNAttributeResponse {
  id: string
  attribute_type: CPNAttributeTypeInfo
  attribute?: { id: string; name: string }
  free_text?: string
  category?: { id: string; name: string }
}

export interface CommonProductName {
  id: string
  name: string
  last_level_classification: string | null
  category_id?: string
  category?: { id: string; name: string }
  is_active: boolean
  approval_status: string
  submitted_by_id?: string
  approved_by_id?: string
  rejection_reason?: string
  created_at?: string
  updated_at?: string
  cpn_attributes: CPNAttributeResponse[]
}

export interface CommonProductNameCreate {
  category_id: string
  last_level_classification: string
  attributes: CPNAttribute[]
}

export interface CommonProductNameUpdate {
  category_id?: string
  last_level_classification?: string
  attributes?: CPNAttribute[]
  is_active?: boolean
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export interface Item {
  id: string
  name: string
  short_code?: string
  description?: string
  unit?: string
  price?: string
  category_id?: string
  brand_id?: string
  is_active: boolean
}

export interface ItemCreate {
  name: string
  description?: string
  unit?: string
  price?: string
  category_id?: string
  brand_id?: string
}

export interface ItemUpdate {
  name?: string
  description?: string
  unit?: string
  price?: string
  category_id?: string
  brand_id?: string
  is_active?: boolean
}

export interface TaskAccepted {
  task_id: string
  status: 'PENDING'
}

export type TaskStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export interface TaskResult {
  task_id: string
  status: TaskStatus
  result?: unknown
  error?: string
  traceback?: string
}

// ─── Generic ──────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>
}
