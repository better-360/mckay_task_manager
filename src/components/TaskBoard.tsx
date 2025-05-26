'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext } from '@dnd-kit/sortable'
import TaskColumn from './TaskColumn'
import CreateTaskModal from './CreateTaskModal'
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

const TASK_STATUSES = [
  { key: 'PENDING', label: 'Bekliyor', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'IN_PROGRESS', label: 'Devam Ediyor', color: 'bg-blue-50 border-blue-200' },
  { key: 'COMPLETED', label: 'Tamamlandı', color: 'bg-green-50 border-green-200' },
  { key: 'CANCELLED', label: 'İptal Edildi', color: 'bg-red-50 border-red-200' },
]

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        console.error('Failed to fetch tasks:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleTaskCreated = () => {
    fetchTasks() // Yeniden fetch et
    setShowCreateModal(false)
  }

  const handleTaskUpdated = () => {
    fetchTasks() // Yeniden fetch et
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string

    // Eğer aynı status'a sürükleniyorsa hiçbir şey yapma
    const task = tasks.find(t => t.id === taskId)
    if (task?.status === newStatus) return

    // Optimistic update
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    )

    // API call
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // Revert on error
        fetchTasks()
      }
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert on error
      fetchTasks()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Görev Panosu</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Görev</span>
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TASK_STATUSES.map((status) => (
            <TaskColumn
              key={status.key}
              status={status}
              tasks={tasks.filter(task => task.status === status.key)}
              onTaskUpdated={handleTaskUpdated}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90">
              <TaskCard
                task={activeTask}
                onTaskUpdated={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Create Task Modal */}
        {showCreateModal && (
          <CreateTaskModal
            onClose={() => setShowCreateModal(false)}
            onTaskCreated={handleTaskCreated}
          />
        )}
      </div>
    </DndContext>
  )
}