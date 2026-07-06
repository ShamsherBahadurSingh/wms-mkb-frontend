import api from '@/lib/axios'
import type { TaskResult } from '@/types'

export const tasksApi = {
  getStatus: (taskId: string) =>
    api.get<TaskResult>(`/tasks/${taskId}`).then((r) => r.data),
}
