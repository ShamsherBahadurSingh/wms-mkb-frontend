import api from '@/lib/axios'
import type { Brand, BrandCreate, BrandUpdate } from '@/types'

export const brandsApi = {
  getAll: () => api.get<Brand[]>('/brands/').then((r) => r.data),

  getOne: (id: string) => api.get<Brand>(`/brands/${id}`).then((r) => r.data),

  create: (data: BrandCreate) =>
    api.post<Brand>('/brands/', data).then((r) => r.data),

  update: (id: string, data: BrandUpdate) =>
    api.patch<Brand>(`/brands/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/brands/${id}`),
}
