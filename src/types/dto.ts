// Base DTOs
export interface BaseDto {
  id?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface PaginationDto {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface FilterDto {
  startDate?: Date
  endDate?: Date
  status?: string[]
  assigneeId?: string[]
  customerId?: string[]
  priority?: string[]
  tags?: string[]
}

// User DTOs
export interface CreateUserDto {
  name: string
  email: string
  password: string
  role?: 'ADMIN' | 'USER'
  workspaceId?: string
  avatar?: string
  phone?: string
  department?: string
  position?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
  role?: 'ADMIN' | 'USER'
  avatar?: string
  phone?: string
  department?: string
  position?: string
  isActive?: boolean
}

export interface UserResponseDto extends BaseDto {
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  avatar?: string
  phone?: string
  department?: string
  position?: string
  isActive: boolean
  emailVerified?: Date
  lastLoginAt?: Date
  workspaceId?: string
  _count?: {
    createdTasks: number
    assignedTasks: number
    completedTasks: number
    comments: number
  }
}

// Workspace DTOs
export interface CreateWorkspaceDto {
  name: string
  description?: string
  domain?: string
  settings?: Record<string, any>
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE'
}

export interface UpdateWorkspaceDto {
  name?: string
  description?: string
  domain?: string
  settings?: Record<string, any>
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE'
  isActive?: boolean
}

export interface WorkspaceResponseDto extends BaseDto {
  name: string
  description?: string
  domain?: string
  settings: Record<string, any>
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  isActive: boolean
  _count?: {
    users: number
    customers: number
    tasks: number
    projects: number
  }
}

// Customer DTOs
export interface CreateCustomerDto {
  name: string
  description?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  industry?: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  workspaceId?: string
  contactPersons?: CreateContactPersonDto[]
}

export interface UpdateCustomerDto {
  name?: string
  description?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  industry?: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  isActive?: boolean
}

export interface CustomerResponseDto extends BaseDto {
  name: string
  description?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  industry?: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  isActive: boolean
  workspaceId?: string
  _count?: {
    tasks: number
    files: number
    projects: number
    contacts: number
  }
  contactPersons?: ContactPersonResponseDto[]
}

// Contact Person DTOs
export interface CreateContactPersonDto {
  name: string
  email?: string
  phone?: string
  position?: string
  isPrimary?: boolean
}

export interface UpdateContactPersonDto {
  name?: string
  email?: string
  phone?: string
  position?: string
  isPrimary?: boolean
}

export interface ContactPersonResponseDto extends BaseDto {
  name: string
  email?: string
  phone?: string
  position?: string
  isPrimary: boolean
  customerId: string
}

// Project DTOs
export interface CreateProjectDto {
  name: string
  description?: string
  customerId?: string
  managerId: string
  startDate?: Date
  endDate?: Date
  budget?: number
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  workspaceId?: string
  teamMembers?: string[]
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  customerId?: string
  managerId?: string
  startDate?: Date
  endDate?: Date
  budget?: number
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  teamMembers?: string[]
}

export interface ProjectResponseDto extends BaseDto {
  name: string
  description?: string
  customerId?: string
  managerId: string
  startDate?: Date
  endDate?: Date
  budget?: number
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  workspaceId?: string
  customer?: CustomerResponseDto
  manager: UserResponseDto
  teamMembers?: UserResponseDto[]
  _count?: {
    tasks: number
    completedTasks: number
    files: number
  }
}

// Task DTOs
export interface CreateTaskDto {
  title: string
  description?: string
  customerId?: string
  projectId?: string
  assigneeId?: string
  parentTaskId?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  estimatedHours?: number
  workspaceId?: string
  tags?: string[]
  watchers?: string[]
  customFields?: Record<string, any>
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  customerId?: string
  projectId?: string
  assigneeId?: string
  parentTaskId?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  tags?: string[]
  watchers?: string[]
  customFields?: Record<string, any>
}

export interface TaskResponseDto extends BaseDto {
  title: string
  description?: string
  customerId?: string
  projectId?: string
  assigneeId?: string
  parentTaskId?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  workspaceId?: string
  customFields?: Record<string, any>
  customer?: CustomerResponseDto
  project?: ProjectResponseDto
  assignee?: UserResponseDto
  createdBy: UserResponseDto
  parentTask?: TaskResponseDto
  subTasks?: TaskResponseDto[]
  tags?: TagResponseDto[]
  watchers?: UserResponseDto[]
  _count?: {
    comments: number
    attachments: number
    timeEntries: number
    subTasks: number
  }
}

// Comment DTOs
export interface CreateCommentDto {
  content: string
  taskId: string
  parentCommentId?: string
  mentions?: string[]
  attachments?: string[]
}

export interface UpdateCommentDto {
  content?: string
  isEdited?: boolean
}

export interface CommentResponseDto extends BaseDto {
  content: string
  taskId: string
  parentCommentId?: string
  authorId: string
  isEdited: boolean
  author: UserResponseDto
  parentComment?: CommentResponseDto
  replies?: CommentResponseDto[]
  mentions?: UserResponseDto[]
  attachments?: AttachmentResponseDto[]
  _count?: {
    replies: number
    reactions: number
  }
}

// Tag DTOs
export interface CreateTagDto {
  name: string
  color: string
  description?: string
  workspaceId?: string
}

export interface UpdateTagDto {
  name?: string
  color?: string
  description?: string
}

export interface TagResponseDto extends BaseDto {
  name: string
  color: string
  description?: string
  workspaceId?: string
  _count?: {
    tasks: number
  }
}

// Attachment DTOs
export interface CreateAttachmentDto {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  taskId?: string
  commentId?: string
  customerId?: string
  projectId?: string
}

export interface AttachmentResponseDto extends BaseDto {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  taskId?: string
  commentId?: string
  customerId?: string
  projectId?: string
  uploadedBy: UserResponseDto
}

// Time Entry DTOs
export interface CreateTimeEntryDto {
  taskId: string
  description?: string
  hours: number
  date: Date
  billable?: boolean
  hourlyRate?: number
}

export interface UpdateTimeEntryDto {
  description?: string
  hours?: number
  date?: Date
  billable?: boolean
  hourlyRate?: number
}

export interface TimeEntryResponseDto extends BaseDto {
  taskId: string
  userId: string
  description?: string
  hours: number
  date: Date
  billable: boolean
  hourlyRate?: number
  task: TaskResponseDto
  user: UserResponseDto
}

// Notification DTOs
export interface CreateNotificationDto {
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'MENTION' | 'DUE_DATE' | 'PROJECT_UPDATE'
  title: string
  message: string
  userId: string
  entityType?: 'TASK' | 'PROJECT' | 'COMMENT'
  entityId?: string
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface NotificationResponseDto extends BaseDto {
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'MENTION' | 'DUE_DATE' | 'PROJECT_UPDATE'
  title: string
  message: string
  userId: string
  entityType?: 'TASK' | 'PROJECT' | 'COMMENT'
  entityId?: string
  actionUrl?: string
  metadata?: Record<string, any>
  isRead: boolean
  readAt?: Date
}

// Automation DTOs
export interface CreateAutomationDto {
  name: string
  description?: string
  trigger: {
    type: 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'DUE_DATE_APPROACHING' | 'COMMENT_ADDED'
    conditions: Record<string, any>
  }
  actions: Array<{
    type: 'SEND_NOTIFICATION' | 'ASSIGN_TASK' | 'UPDATE_STATUS' | 'SEND_EMAIL' | 'WEBHOOK'
    parameters: Record<string, any>
  }>
  isActive?: boolean
  workspaceId?: string
}

export interface UpdateAutomationDto {
  name?: string
  description?: string
  trigger?: {
    type: 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'DUE_DATE_APPROACHING' | 'COMMENT_ADDED'
    conditions: Record<string, any>
  }
  actions?: Array<{
    type: 'SEND_NOTIFICATION' | 'ASSIGN_TASK' | 'UPDATE_STATUS' | 'SEND_EMAIL' | 'WEBHOOK'
    parameters: Record<string, any>
  }>
  isActive?: boolean
}

export interface AutomationResponseDto extends BaseDto {
  name: string
  description?: string
  trigger: {
    type: 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'DUE_DATE_APPROACHING' | 'COMMENT_ADDED'
    conditions: Record<string, any>
  }
  actions: Array<{
    type: 'SEND_NOTIFICATION' | 'ASSIGN_TASK' | 'UPDATE_STATUS' | 'SEND_EMAIL' | 'WEBHOOK'
    parameters: Record<string, any>
  }>
  isActive: boolean
  workspaceId?: string
  _count?: {
    executions: number
  }
}

// Webhook DTOs
export interface CreateWebhookDto {
  name: string
  url: string
  events: string[]
  secret?: string
  isActive?: boolean
  workspaceId?: string
}

export interface UpdateWebhookDto {
  name?: string
  url?: string
  events?: string[]
  secret?: string
  isActive?: boolean
}

export interface WebhookResponseDto extends BaseDto {
  name: string
  url: string
  events: string[]
  secret?: string
  isActive: boolean
  workspaceId?: string
  _count?: {
    deliveries: number
  }
}

// Dashboard & Analytics DTOs
export interface DashboardStatsDto {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  totalProjects: number
  activeProjects: number
  totalCustomers: number
  totalUsers: number
  thisWeekTasks: number
  thisMonthTasks: number
  productivity: {
    completionRate: number
    averageCompletionTime: number
    tasksPerUser: number
  }
  recentActivities: Array<{
    type: string
    message: string
    timestamp: Date
    user: UserResponseDto
  }>
}

export interface TaskAnalyticsDto {
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  tasksByAssignee: Array<{
    user: UserResponseDto
    count: number
  }>
  tasksByCustomer: Array<{
    customer: CustomerResponseDto
    count: number
  }>
  completionTrend: Array<{
    date: string
    completed: number
    created: number
  }>
  averageCompletionTime: number
  overdueRate: number
}

// Search DTOs
export interface SearchDto {
  query: string
  type?: 'ALL' | 'TASKS' | 'PROJECTS' | 'CUSTOMERS' | 'USERS'
  filters?: FilterDto
  pagination?: PaginationDto
}

export interface SearchResultDto {
  tasks: TaskResponseDto[]
  projects: ProjectResponseDto[]
  customers: CustomerResponseDto[]
  users: UserResponseDto[]
  total: number
  hasMore: boolean
}

// Bulk Operations DTOs
export interface BulkUpdateTasksDto {
  taskIds: string[]
  updates: UpdateTaskDto
}

export interface BulkDeleteDto {
  ids: string[]
  entityType: 'TASK' | 'PROJECT' | 'CUSTOMER' | 'USER'
}

export interface BulkOperationResultDto {
  success: number
  failed: number
  errors: Array<{
    id: string
    error: string
  }>
} 