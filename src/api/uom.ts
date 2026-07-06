import api from '@/lib/axios'
import type { UOM, UOMCreate, UOMUpdate } from '@/types'

export const uomApi = {
  getAll: () => api.get<UOM[]>('/uom/').then((r) => r.data),

  getOne: (id: string) => api.get<UOM>(`/uom/${id}`).then((r) => r.data),

  create: (data: UOMCreate) => api.post<UOM>('/uom/', data).then((r) => r.data),

  update: (id: string, data: UOMUpdate) =>
    api.patch<UOM>(`/uom/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/uom/${id}`),

  approve: (id: string) => api.post<UOM>(`/uom/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason?: string) =>
    api.post<UOM>(`/uom/${id}/reject`, { reason }).then((r) => r.data),
}
