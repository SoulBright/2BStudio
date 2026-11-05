import type { TaskStatus } from '../types/database'
import { statusLabel } from '../utils/labels'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabel[status]}</span>
}
