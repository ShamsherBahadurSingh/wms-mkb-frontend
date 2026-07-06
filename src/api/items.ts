import api from '@/lib/axios'
import type { Item, ItemCreate, ItemUpdate, TaskAccepted } from '@/types'

export const itemsApi = {
  getAll: () => api.get<Item[]>('/items/').then((r) => r.data),

  getOne: (id: string) => api.get<Item>(`/items/${id}`).then((r) => r.data),

  create: (data: ItemCreate) => api.post<Item>('/items/', data).then((r) => r.data),

  update: (id: string, data: ItemUpdate) =>
    api.patch<Item>(`/items/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/items/${id}`),

  process: (id: string) =>
    api.post<TaskAccepted>(`/items/${id}/process`).then((r) => r.data),
}
