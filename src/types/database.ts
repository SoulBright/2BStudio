export type UserRole = 'manager' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'in_review'
  | 'accepted'
  | 'revision'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type ConstructionObject = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
}

export type Task = {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  status: TaskStatus
  author_id: string
  created_at: string
}

export type TaskStatusHistory = {
  id: string
  task_id: string
  changed_by: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  comment: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Profile>
        Relationships: []
      }
      objects: {
        Row: ConstructionObject
        Insert: Omit<ConstructionObject, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<ConstructionObject>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'status' | 'author_id'> & {
          id?: string
          created_at?: string
          status?: TaskStatus
          author_id?: string
        }
        Update: Partial<Task>
        Relationships: []
      }
      task_status_history: {
        Row: TaskStatusHistory
        Insert: Omit<TaskStatusHistory, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<TaskStatusHistory>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      transition_task_status: {
        Args: {
          p_task_id: string
          p_new_status: TaskStatus
          p_comment?: string | null
        }
        Returns: Task
      }
    }
    Enums: {
      user_role: UserRole
      task_status: TaskStatus
    }
    CompositeTypes: Record<string, never>
  }
}
