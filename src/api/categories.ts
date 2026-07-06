import api from '@/lib/axios'
import type { Category, CategoryCreate, CategoryUpdate } from '@/types'

export const categoriesApi = {
  getAll: (params?: { includeAll?: boolean }) =>
    api
      .get<Category[]>('/categories/', { params: params?.includeAll ? { include_all: true } : undefined })
      .then((r) => r.data),

  getOne: (id: string) => api.get<Category>(`/categories/${id}`).then((r) => r.data),

  getChildren: (id: string) =>
    api.get<Category[]>(`/categories/${id}/children`).then((r) => r.data),

  create: (data: CategoryCreate) =>
    api.post<Category>('/categories/', data).then((r) => r.data),

  update: (id: string, data: CategoryUpdate) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),

  approve: (id: string) => api.post<Category>(`/categories/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason?: string) =>
    api.post<Category>(`/categories/${id}/reject`, { reason }).then((r) => r.data),

  delete: (id: string) => api.delete(`/categories/${id}`),
}
