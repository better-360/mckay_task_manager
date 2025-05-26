'use client'

import { useState } from 'react'
import { Calendar, MessageSquare, Paperclip, User, Building2, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils'
import TaskDetailModal from './TaskDetailModal'
import EditTaskModal from './EditTaskModal'

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

interface TaskCardProps {
  task: Task
  onTaskUpdated: () => void
  isDragging?: boolean
}

export default function TaskCard({ task, onTaskUpdated, isDragging = false }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setLoading(false)
      setShowMenu(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onTaskUpdated()
      } else {
        alert('Görev silinirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Görev silinirken bir hata oluştu')
    } finally {
      setLoading(false)
      setShowMenu(false)
    }
  }

  const statusOptions = [
    { key: 'PENDING', label: 'Bekliyor' },
    { key: 'IN_PROGRESS', label: 'Devam Ediyor' },
    { key: 'COMPLETED', label: 'Tamamlandı' },
    { key: 'CANCELLED', label: 'İptal Edildi' },
  ]

  if (isDragging || isSortableDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg opacity-50"
      >
        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
      </div>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h4 
            className="font-medium text-gray-900 text-sm leading-tight cursor-pointer hover:text-blue-600"
            onClick={() => setShowDetailModal(true)}
          >
            {task.title}
          </h4>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={loading}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDetailModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Detayları Görüntüle</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEditModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Düzenle</span>
                  </button>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                    Durumu Değiştir
                  </div>
                  {statusOptions.map((status) => (
                    <button
                      key={status.key}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(status.key)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        task.status === status.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                      disabled={loading}
                    >
                      {status.label}
                    </button>
                  ))}
                  <div className="border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTask()
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Sil</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Customer */}
        <div className="flex items-center space-x-1 mb-2">
          <Building2 className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600">{task.customer.name}</span>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center space-x-1 mb-2">
            <User className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600">{task.assignee.name || task.assignee.email}</span>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center space-x-1 mb-3">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {formatDate(task.dueDate)}
            </span>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((taskTag) => (
              <span
                key={taskTag.tag.id}
                className="px-2 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: taskTag.tag.color + '20',
                  color: taskTag.tag.color,
                }}
              >
                {taskTag.tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {task._count.notes > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">{task._count.notes}</span>
              </div>
            )}
            {task._count.attachments > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">{task._count.attachments}</span>
              </div>
            )}
          </div>
          
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
            {getStatusText(task.status)}
          </span>
        </div>
      </div>

      {/* Modals */}
      {showDetailModal && (
        <TaskDetailModal
          task={task}
          onClose={() => setShowDetailModal(false)}
          onTaskUpdated={onTaskUpdated}
        />
      )}

      {showEditModal && (
        <EditTaskModal
          task={task}
          onClose={() => setShowEditModal(false)}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  )
} 