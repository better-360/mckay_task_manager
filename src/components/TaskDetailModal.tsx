'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, User, Building2, MessageSquare, Send, Paperclip } from 'lucide-react'
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils'

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

interface TaskNote {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    email: string
  }
}

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onTaskUpdated: () => void
}

export default function TaskDetailModal({ task, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [notesLoading, setNotesLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [task.id])

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/notes`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setNotesLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      })

      if (response.ok) {
        setNewNote('')
        fetchNotes()
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Task Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Status */}
            <div className="mb-4">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Müşteri</h3>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{task.customer.name}</span>
                </div>
              </div>

              {task.assignee && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Atanan Kişi</h3>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{task.assignee.name || task.assignee.email}</span>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Oluşturan</h3>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{task.createdBy.name || task.createdBy.email}</span>
                </div>
              </div>

              {task.dueDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Bitiş Tarihi</h3>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{formatDate(task.dueDate)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Etiketler</h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((taskTag) => (
                    <span
                      key={taskTag.tag.id}
                      className="px-3 py-1 text-sm rounded-full"
                      style={{
                        backgroundColor: taskTag.tag.color + '20',
                        color: taskTag.tag.color,
                      }}
                    >
                      {taskTag.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>Oluşturulma: {formatDate(task.createdAt)}</p>
              <p>Son Güncelleme: {formatDate(task.updatedAt)}</p>
            </div>
          </div>

          {/* Right Panel - Notes */}
          <div className="w-96 border-l bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Notlar ({notes.length})</span>
              </h3>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : notes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Henüz not yok</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {note.author.name || note.author.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Yeni not ekle..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !newNote.trim()}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Ekleniyor...' : 'Not Ekle'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 