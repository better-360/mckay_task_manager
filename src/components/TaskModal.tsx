'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  X, Calendar, User, Building2, MessageSquare, Send, Paperclip, 
  Edit, Save, Trash2, Plus, MoreHorizontal, Clock 
} from 'lucide-react'
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils'
import UserAvatar from './UserAvatar'
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor'
import { useRealtime } from '@/hooks/useRealtime'
import { getActivityMessage } from '@/lib/activity'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assignee?: {
    id: string
    name: string
    email: string
    profilePicture?: string
  }
  customer: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
    profilePicture?: string
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
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    profilePicture?: string
  }
}

interface TaskActivity {
  id: string
  type: string
  metadata?: any
  createdAt: string
  actor: {
    id: string
    name: string
    email: string
    profilePicture?: string
  }
}

interface Customer {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  profilePicture?: string
}

interface TaskModalProps {
  task: Task
  onClose: () => void
  onTaskUpdated: () => void
  currentUserId?: string
}

export default function TaskModal({ task, onClose, onTaskUpdated, currentUserId }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'activity'>('details')
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [notesLoading, setNotesLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const newNoteEditorRef = useRef<RichTextEditorRef>(null)
  const editNoteEditorRef = useRef<RichTextEditorRef>(null)

  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    customerId: task.customer.id,
    assigneeId: task.assignee?.id || '',
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    status: task.status,
  })

  // Real-time updates for this specific task
  useRealtime({
    onNoteAdded: (data) => {
      if (data.taskId === task.id) {
        setNotes(prev => [data.note, ...prev])
      }
    },
    onNoteUpdated: (data) => {
      if (data.taskId === task.id) {
        setNotes(prev => prev.map(note => 
          note.id === data.note.id ? data.note : note
        ))
      }
    },
    onNoteDeleted: (data) => {
      if (data.taskId === task.id) {
        setNotes(prev => prev.filter(note => note.id !== data.noteId))
      }
    },
    onTaskActivity: (data) => {
      if (data.taskId === task.id) {
        setActivities(prev => [data.activity, ...prev])
      }
    },
  })

  useEffect(() => {
    fetchNotes()
    fetchActivities()
    fetchCustomers()
    fetchUsers()
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

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setActivitiesLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // Users API returns { users: [...], total: ... }
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    }
  }

  const handleSaveTask = async () => {
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          assigneeId: formData.assigneeId || null,
          dueDate: formData.dueDate || null,
          status: formData.status,
        }),
      })

      if (response.ok) {
        onTaskUpdated()
        setIsEditing(false)
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || 'Bir hata oluştu' })
      }
    } catch (error) {
      setErrors({ general: 'Bir hata oluştu' })
    } finally {
      setLoading(false)
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
        newNoteEditorRef.current?.clearContent()
        // Real-time will handle the update, but also trigger parent update
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editingNoteContent }),
      })

      if (response.ok) {
        setEditingNoteId(null)
        setEditingNoteContent('')
        editNoteEditorRef.current?.clearContent()
        // Real-time will handle the update, but also trigger parent update
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error updating note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Real-time will handle the update, but also trigger parent update
        onTaskUpdated()
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const statusOptions = [
    { key: 'PENDING', label: 'Bekliyor' },
    { key: 'IN_PROGRESS', label: 'Devam Ediyor' },
    { key: 'COMPLETED', label: 'Tamamlandı' },
    { key: 'CANCELLED', label: 'İptal Edildi' },
  ]

  const startEditingNote = (note: TaskNote) => {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
  }

  const cancelEditingNote = () => {
    setEditingNoteId(null)
    setEditingNoteContent('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Görevi Düzenle' : task.title}
            </h2>
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(task.status)}`}>
              {getStatusText(task.status)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
              >
                <Edit className="h-4 w-4" />
                <span>Düzenle</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Detaylar
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notlar ({notes.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('activity')
                if (activities.length === 0 && !activitiesLoading) {
                  fetchActivities()
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Geçmiş ({activities.length})
            </button>
          </nav>
        </div>

        <div className="h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="p-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
                  {errors.general}
                </div>
              )}

              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Başlık *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Açıklama
                    </label>
                    <RichTextEditor
                      content={formData.description}
                      onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                      placeholder="Görev açıklaması..."
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Durum
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {statusOptions.map((status) => (
                          <option key={status.key} value={status.key}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                        Atanan Kişi
                      </label>
                      <select
                        id="assigneeId"
                        name="assigneeId"
                        value={formData.assigneeId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Kişi seçin (opsiyonel)</option>
                        {Array.isArray(users) && users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="datetime-local"
                        id="dueDate"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSaveTask}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Description */}
                  {task.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h3>
                      <div 
                        className="text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: task.description }}
                      />
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          <UserAvatar user={task.assignee} size="md" />
                          <span className="text-gray-700">{task.assignee.name || task.assignee.email}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Oluşturan</h3>
                      <div className="flex items-center space-x-2">
                        <UserAvatar user={task.createdBy} size="md" />
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
                    <div>
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
                  <div className="text-sm text-gray-500 space-y-1 pt-4 border-t">
                    <p>Oluşturulma: {formatDate(task.createdAt)}</p>
                    <p>Son Güncelleme: {formatDate(task.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              {/* Add Note Form */}
              <div className="mb-6">
                <form onSubmit={handleAddNote} className="space-y-3">
                  <RichTextEditor
                    content={newNote}
                    onChange={(content) => setNewNote(content)}
                    placeholder="Yeni not ekle..."
                    className="w-full"
                    editable={!loading}
                    ref={newNoteEditorRef}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !newNote.trim()}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      <span>{loading ? 'Ekleniyor...' : 'Not Ekle'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {notesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Henüz not yok</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UserAvatar user={note.author} size="sm" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {note.author.name || note.author.email}
                            </span>
                            <div className="text-xs text-gray-500">
                              {formatDate(note.createdAt)}
                              {note.updatedAt !== note.createdAt && ' (düzenlendi)'}
                            </div>
                          </div>
                        </div>
                        {currentUserId === note.author.id && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => startEditingNote(note)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              disabled={loading}
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              disabled={loading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <RichTextEditor
                            content={editingNoteContent}
                            onChange={(content) => setEditingNoteContent(content)}
                            className="w-full"
                            editable={!loading}
                            ref={editNoteEditorRef}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={cancelEditingNote}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              İptal
                            </button>
                            <button
                              onClick={() => handleEditNote(note.id)}
                              disabled={loading || !editingNoteContent.trim()}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Kaydet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-gray-700 text-sm prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              <div className="space-y-4">
                {activitiesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Henüz aktivite yok</p>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                      <UserAvatar user={activity.actor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {activity.actor.name || activity.actor.email}
                          </span>
                          <span className="text-sm text-gray-600">
                            {getActivityMessage(activity.type, activity.metadata)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 