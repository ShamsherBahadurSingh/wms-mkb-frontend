import api from '@/lib/axios'
import type { AttributeType, AttributeTypeCreate, AttributeTypeUpdate } from '@/types'

export const attributeTypesApi = {
  getAll: () => api.get<AttributeType[]>('/attribute-types/').then((r) => r.data),

  getOne: (id: string) =>
    api.get<AttributeType>(`/attribute-types/${id}`).then((r) => r.data),

  create: (data: AttributeTypeCreate) =>
    api.post<AttributeType>('/attribute-types/', data).then((r) => r.data),

  update: (id: string, data: AttributeTypeUpdate) =>
    api.patch<AttributeType>(`/attribute-types/${id}`, data).then((r) => r.data),

  reorder: (orderedIds: string[]) =>
    api
      .post<AttributeType[]>('/attribute-types/reorder', { ordered_ids: orderedIds })
      .then((r) => r.data),

  delete: (id: string) => api.delete(`/attribute-types/${id}`),
}
