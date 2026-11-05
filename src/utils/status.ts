import type { TaskStatus } from '../types/database'
import { statusLabel } from './labels'

export type StatusAction = {
  to: TaskStatus
  label: string
  requiresComment: boolean
}

type TransitionContext = {
  isManager: boolean
  userId: string
  assigneeId: string
}

const transitions: Array<{
  from: TaskStatus
  to: TaskStatus
  label: string
  requiresComment?: boolean
  by: 'manager' | 'assignee'
}> = [
  {
    from: 'new',
    to: 'in_progress',
    label: 'Взять в работу',
    by: 'assignee',
  },
  {
    from: 'in_progress',
    to: 'in_review',
    label: 'Отправить на проверку',
    by: 'assignee',
  },
  {
    from: 'in_review',
    to: 'accepted',
    label: 'Принять',
    by: 'manager',
  },
  {
    from: 'in_review',
    to: 'revision',
    label: 'Вернуть на доработку',
    requiresComment: true,
    by: 'manager',
  },
  {
    from: 'revision',
    to: 'in_progress',
    label: 'Снова в работу',
    by: 'assignee',
  },
]

export function getAvailableActions(
  status: TaskStatus,
  ctx: TransitionContext,
): StatusAction[] {
  return transitions
    .filter((item) => item.from === status)
    .filter((item) => {
      if (item.by === 'manager') {
        return ctx.isManager
      }
      return ctx.userId === ctx.assigneeId
    })
    .map((item) => ({
      to: item.to,
      label: item.label,
      requiresComment: Boolean(item.requiresComment),
    }))
}

export function formatStatusChange(
  from: TaskStatus | null,
  to: TaskStatus,
): string {
  if (!from) {
    return `→ ${statusLabel[to]}`
  }
  return `${statusLabel[from]} → ${statusLabel[to]}`
}
