import api from '@/lib/axios'
import type { Attribute, AttributeCreate, AttributeUpdate, ApprovalAction } from '@/types'

export const attributesApi = {
  getAll: (attributeTypeId?: string) =>
    api
      .get<Attribute[]>('/attributes/', {
        params: attributeTypeId ? { attribute_type_id: attributeTypeId } : undefined,
      })
      .then((r) => r.data),

  getPending: () =>
    api.get<Attribute[]>('/attributes/pending').then((r) => r.data),

  getOne: (id: string) => api.get<Attribute>(`/attributes/${id}`).then((r) => r.data),

  create: (data: AttributeCreate) =>
    api.post<Attribute>('/attributes/', data).then((r) => r.data),

  update: (id: string, data: AttributeUpdate) =>
    api.patch<Attribute>(`/attributes/${id}`, data).then((r) => r.data),

  approve: (id: string) =>
    api.post<Attribute>(`/attributes/${id}/approve`).then((r) => r.data),

  reject: (id: string, data: ApprovalAction) =>
    api.post<Attribute>(`/attributes/${id}/reject`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/attributes/${id}`),
}
