'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import RichTextEditor from './RichTextEditor'

interface Customer {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface Tag {
  id: string
  name: string
  color: string
  isNew?: boolean
}

interface CreateTaskModalProps {
  onClose: () => void
  onTaskCreated: () => void
}

export default function CreateTaskModal({ onClose, onTaskCreated }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerId: '',
    assigneeId: '',
    dueDate: '',
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCustomers()
    fetchUsers()
    fetchTags()
  }, [])

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

  // Filter tags based on input
  useEffect(() => {
    console.log('🏷️ CreateTaskModal: Filter effect triggered. tagInput:', tagInput, 'tags:', tags, 'selectedTags:', selectedTags)
    
    if (tagInput.trim()) {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.some(selected => selected.id === tag.id)
      )
      console.log('🏷️ CreateTaskModal: Filtered tags:', filtered)
      setFilteredTags(filtered)
      setShowTagSuggestions(filtered.length > 0)
    } else {
      setFilteredTags([])
      setShowTagSuggestions(false)
    }
  }, [tagInput, tags, selectedTags])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    }
  }

  const fetchTags = async () => {
    try {
      console.log('🏷️ CreateTaskModal: Fetching tags...')
      const response = await fetch('/api/tags')
      console.log('🏷️ CreateTaskModal: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🏷️ CreateTaskModal: Raw response data:', data)
        console.log('🏷️ CreateTaskModal: Is array?', Array.isArray(data))
        console.log('🏷️ CreateTaskModal: Data length:', data?.length)
        
        if (Array.isArray(data)) {
          setTags(data)
          console.log('🏷️ CreateTaskModal: Tags set successfully:', data)
        } else {
          console.error('🏷️ CreateTaskModal: Data is not an array:', data)
          setTags([])
        }
      } else {
        const errorText = await response.text()
        console.error('🏷️ CreateTaskModal: Failed to fetch tags, status:', response.status, 'Error:', errorText)
        setTags([])
      }
    } catch (error) {
      console.error('🏷️ CreateTaskModal: Error fetching tags:', error)
      setTags([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    console.log('🚀 Submitting task with tags:', selectedTags)

    try {
      const taskData = {
        ...formData,
        assigneeId: formData.assigneeId || null,
        dueDate: formData.dueDate || null,
        tagIds: selectedTags.map(tag => tag.id),
        newTags: selectedTags.filter(tag => tag.isNew),
      }

      console.log('📤 Task data being sent:', taskData)

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Task created successfully:', result)
        onTaskCreated()
      } else {
        const errorData = await response.json()
        console.error('❌ Task creation failed:', errorData)
        setErrors({ general: errorData.error || 'Bir hata oluştu' })
      }
    } catch (error) {
      console.error('❌ Task creation error:', error)
      setErrors({ general: 'Bir hata oluştu' })
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

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899']
    return colors[Math.floor(Math.random() * colors.length)]
  }

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Yeni Görev Oluştur</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(90vh-140px)] overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {errors.general}
              </div>
            )}

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
                placeholder="Görev başlığını girin..."
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri *
                </label>
                <select
                  id="customerId"
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Müşteri seçin</option>
                  {Array.isArray(customers) && customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
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
                      console.log('🏷️ CreateTaskModal: Input focused. tags:', tags, 'tagInput:', tagInput)
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

                {/* Existing Tags */}
                {tags.length > 0 && (
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
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{loading ? 'Oluşturuluyor...' : 'Oluştur'}</span>
          </button>
        </div>
      </div>
    </div>
  )
} 