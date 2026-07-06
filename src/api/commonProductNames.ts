import api from '@/lib/axios'
import type {
  CommonProductName,
  CommonProductNameCreate,
  CommonProductNameUpdate,
  ApprovalAction,
} from '@/types'

export const cpnApi = {
  getAll: (params?: { includeAll?: boolean }) =>
    api
      .get<CommonProductName[]>('/common-product-names/', {
        params: params?.includeAll ? { include_all: true } : undefined,
      })
      .then((r) => r.data),

  getPending: () =>
    api.get<CommonProductName[]>('/common-product-names/pending').then((r) => r.data),

  getOne: (id: string) =>
    api.get<CommonProductName>(`/common-product-names/${id}`).then((r) => r.data),

  create: (data: CommonProductNameCreate) =>
    api.post<CommonProductName>('/common-product-names/', data).then((r) => r.data),

  update: (id: string, data: CommonProductNameUpdate) =>
    api.patch<CommonProductName>(`/common-product-names/${id}`, data).then((r) => r.data),

  approve: (id: string) =>
    api.post<CommonProductName>(`/common-product-names/${id}/approve`).then((r) => r.data),

  reject: (id: string, data: ApprovalAction) =>
    api
      .post<CommonProductName>(`/common-product-names/${id}/reject`, data)
      .then((r) => r.data),

  delete: (id: string) => api.delete(`/common-product-names/${id}`),
}
