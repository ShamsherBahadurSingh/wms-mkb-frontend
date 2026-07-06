import api from '@/lib/axios'
import type {
  BillableUnit,
  BillableUnitCreate,
  BillableUnitUpdate,
  BreakableUnit,
  BreakableUnitCreate,
  BreakableUnitUpdate,
  Dimension,
  DimensionCreate,
  DimensionUpdate,
} from '@/types'

export const dimensionsApi = {
  getAll: () => api.get<Dimension[]>('/dimensions/').then((r) => r.data),
  create: (data: DimensionCreate) => api.post<Dimension>('/dimensions/', data).then((r) => r.data),
  update: (id: string, data: DimensionUpdate) =>
    api.patch<Dimension>(`/dimensions/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/dimensions/${id}`),
}

export const breakableUnitsApi = {
  getAll: () => api.get<BreakableUnit[]>('/breakable-units/').then((r) => r.data),
  create: (data: BreakableUnitCreate) =>
    api.post<BreakableUnit>('/breakable-units/', data).then((r) => r.data),
  update: (id: string, data: BreakableUnitUpdate) =>
    api.patch<BreakableUnit>(`/breakable-units/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/breakable-units/${id}`),
}

export const billableUnitsApi = {
  getAll: () => api.get<BillableUnit[]>('/billable-units/').then((r) => r.data),
  create: (data: BillableUnitCreate) =>
    api.post<BillableUnit>('/billable-units/', data).then((r) => r.data),
  update: (id: string, data: BillableUnitUpdate) =>
    api.patch<BillableUnit>(`/billable-units/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/billable-units/${id}`),
}
