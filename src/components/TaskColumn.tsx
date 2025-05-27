'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assignee?: {
    id: string
    name: string
    email: string
  }
  customer: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  createdAt: string
  updatedAt: string
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string
    }
  }>
  _count: {
    notes: number
    attachments: number
  }
}

interface TaskColumnProps {
  status: {
    key: string
    label: string
    color: string
  }
  tasks: Task[]
  onTaskUpdated: () => void
  currentUserId?: string
}

export default function TaskColumn({ status, tasks, onTaskUpdated, currentUserId }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.key,
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 ${status.color} p-4 min-h-[500px] transition-colors ${
        isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{status.label}</h3>
        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskUpdated={onTaskUpdated}
              currentUserId={currentUserId}
            />
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Bu durumda görev yok</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
} 