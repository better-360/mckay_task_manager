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

interface Tag {
  id: string
  name: string
  color: string
  isNew?: boolean
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
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    task.tags.map(t => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color }))
  )
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [notesLoading, setNotesLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const tagInputRef = useRef<HTMLInputElement>(null)

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

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Filter tags based on input
  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.some(selected => selected.id === tag.id)
      )
      setFilteredTags(filtered)
      setShowTagSuggestions(filtered.length > 0)
    } else {
      setFilteredTags([])
      setShowTagSuggestions(false)
    }
  }, [tagInput, tags, selectedTags])

  const selectExistingTag = (tag: Tag) => {
    setSelectedTags(prev => [...prev, tag])
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const createNewTag = (tagName: string) => {
    const newTag = {
      id: `temp-${Date.now()}`,
      name: tagName,
      color: getRandomColor(),
      isNew: true
    }
    setSelectedTags(prev => [...prev, newTag])
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedInput = tagInput.trim()
      
      if (!trimmedInput) return

      // Check if there's an exact match in filtered tags
      const exactMatch = filteredTags.find(tag => 
        tag.name.toLowerCase() === trimmedInput.toLowerCase()
      )

      if (exactMatch) {
        selectExistingTag(exactMatch)
      } else if (filteredTags.length > 0) {
        // Select first suggestion if available
        selectExistingTag(filteredTags[0])
      } else {
        // Create new tag
        if (!selectedTags.some(tag => tag.name.toLowerCase() === trimmedInput.toLowerCase())) {
          createNewTag(trimmedInput)
        }
      }
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false)
      setTagInput('')
    }
  }

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
    fetchTags()
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

  const fetchTags = async () => {
    try {
      console.log('🏷️ TaskModal: Fetching tags...')
      const response = await fetch('/api/tags')
      console.log('🏷️ TaskModal: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🏷️ TaskModal: Raw response data:', data)
        console.log('🏷️ TaskModal: Is array?', Array.isArray(data))
        console.log('🏷️ TaskModal: Data length:', data?.length)
        
        if (Array.isArray(data)) {
          setTags(data)
          console.log('🏷️ TaskModal: Tags set successfully:', data)
        } else {
          console.error('🏷️ TaskModal: Data is not an array:', data)
          setTags([])
        }
      } else {
        const errorText = await response.text()
        console.error('🏷️ TaskModal: Failed to fetch tags, status:', response.status, 'Error:', errorText)
        setTags([])
      }
    } catch (error) {
      console.error('🏷️ TaskModal: Error fetching tags:', error)
      setTags([])
    }
  }

  const handleSaveTask = async () => {
    setLoading(true)
    setErrors({})

    console.log('🚀 TaskModal: Saving task with tags:', selectedTags)

    try {
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        assigneeId: formData.assigneeId || null,
        dueDate: formData.dueDate || null,
        status: formData.status,
        tagIds: selectedTags.map(tag => tag.id),
        newTags: selectedTags.filter(tag => tag.isNew),
      }

      console.log('📤 TaskModal: Update data being sent:', updateData)

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ TaskModal: Task updated successfully:', result)
        onTaskUpdated()
        setIsEditing(false)
      } else {
        const errorData = await response.json()
        console.error('❌ TaskModal: Task update failed:', errorData)
        setErrors({ general: errorData.error || 'Bir hata oluştu' })
      }
    } catch (error) {
      console.error('❌ TaskModal: Task update error:', error)
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

  const toggleTag = (tag: Tag) => {
    console.log('🏷️ TaskModal: Toggling tag:', tag.id)
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id)
      const newTags = isSelected 
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
      console.log('🏷️ TaskModal: New selected tags:', newTags)
      return newTags
    })
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) {
        setShowTagSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

                  {/* Tags Section - Linear Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiketler
                    </label>
                    <div className="space-y-3">
                      {/* Tag Input with Auto-complete */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Etiket eklemek için yazın ve Enter'a basın..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyDown={handleTagInputKeyDown}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onFocus={() => {
                            console.log('🏷️ TaskModal: Input focused. tags:', tags, 'tagInput:', tagInput)
                            if (tags.length > 0) {
                              if (tagInput.trim()) {
                                if (filteredTags.length > 0) {
                                  setShowTagSuggestions(true)
                                }
                              } else {
                                // Show all available tags when input is empty
                                const availableTags = tags.filter(tag => 
                                  !selectedTags.some(selected => selected.id === tag.id)
                                )
                                setFilteredTags(availableTags)
                                setShowTagSuggestions(availableTags.length > 0)
                              }
                            }
                          }}
                          ref={tagInputRef}
                        />
                        <div className="absolute right-2 top-2 text-xs text-gray-400">
                          Enter ile ekle
                        </div>

                        {/* Auto-complete Dropdown */}
                        {showTagSuggestions && filteredTags.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredTags.map((tag, index) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => selectExistingTag(tag)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between ${
                                  index === 0 ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="text-sm">{tag.name}</span>
                                </div>
                                {index === 0 && (
                                  <span className="text-xs text-blue-600">Enter ile seç</span>
                                )}
                              </button>
                            ))}
                            {tagInput.trim() && !filteredTags.some(tag => 
                              tag.name.toLowerCase() === tagInput.trim().toLowerCase()
                            ) && (
                              <div className="border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => createNewTag(tagInput.trim())}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 text-green-600"
                                >
                                  <span className="text-sm">+ "{tagInput.trim()}" olarak yeni etiket oluştur</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Existing Tags (when not searching) */}
                      {!tagInput.trim() && tags.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Mevcut etiketler:</p>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  const isSelected = selectedTags.some(t => t.id === tag.id)
                                  if (isSelected) {
                                    setSelectedTags(prev => prev.filter(t => t.id !== tag.id))
                                  } else {
                                    setSelectedTags(prev => [...prev, tag])
                                  }
                                }}
                                className={`px-3 py-1 text-sm rounded-full border transition-all duration-200 ${
                                  selectedTags.some(t => t.id === tag.id)
                                    ? 'border-transparent text-white shadow-sm'
                                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                                style={{
                                  backgroundColor: selectedTags.some(t => t.id === tag.id) 
                                    ? tag.color 
                                    : 'transparent',
                                }}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Tags */}
                      {selectedTags.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800 font-medium mb-2">
                            ✅ Seçilen etiketler ({selectedTags.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTags.map((tag) => (
                              <div
                                key={tag.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full"
                                style={{
                                  backgroundColor: tag.color + '20',
                                  color: tag.color,
                                  border: `1px solid ${tag.color}40`,
                                }}
                              >
                                <span>{tag.name}</span>
                                {tag.isNew && (
                                  <span className="text-xs bg-green-500 text-white px-1 rounded">YENİ</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTags(prev => prev.filter(t => t.id !== tag.id))}
                                  className="ml-1 text-current hover:bg-black hover:bg-opacity-10 rounded-full w-4 h-4 flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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