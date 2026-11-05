import type { TaskStatus, UserRole } from '../types/database'

export const roleLabel: Record<UserRole, string> = {
  manager: 'Постановщик',
  executor: 'Исполнитель',
}

export const statusLabel: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  revision: 'На доработке',
}
