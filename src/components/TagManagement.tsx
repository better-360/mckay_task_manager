'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag as TagIcon, Save, X } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFormData {
  name: string
  color: string
}

export default function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<TagFormData>({ name: '', color: '#3B82F6' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const predefinedColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F43F5E', // Rose
  ]

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch tags')
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    if (!formData.name.trim()) {
      setErrors({ name: 'Tag adı gerekli' })
      setSubmitting(false)
      return
    }

    try {
      const url = editingId ? `/api/tags/${editingId}` : '/api/tags'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchTags()
        setFormData({ name: '', color: '#3B82F6' })
        setEditingId(null)
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || 'Bir hata oluştu' })
      }
    } catch (error) {
      setErrors({ general: 'Bir hata oluştu' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (tag: Tag) => {
    setFormData({ name: tag.name, color: tag.color })
    setEditingId(tag.id)
    setErrors({})
  }

  const handleCancelEdit = () => {
    setFormData({ name: '', color: '#3B82F6' })
    setEditingId(null)
    setErrors({})
  }

  const handleDelete = async (id: string) => {
    try {
      // First check if tag is being used
      const usageResponse = await fetch(`/api/tags/${id}/usage`)
      let usageCount = 0
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        usageCount = usageData.count || 0
      }

      let confirmMessage = 'Bu etiketi silmek istediğinizden emin misiniz?'
      if (usageCount > 0) {
        confirmMessage = `Bu etiket ${usageCount} görevde kullanılıyor. Yine de silmek istediğinizden emin misiniz?\n\nSilme işlemi görevlerden etiket bağlantılarını da kaldıracaktır.`
      }

      if (!confirm(confirmMessage)) {
        return
      }

      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchTags()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Silme işlemi başarısız')
      }
    } catch (error) {
      alert('Bir hata oluştu')
    }
  }

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TagIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Etiket Yönetimi</h2>
        </div>
        <div className="text-sm text-gray-500">
          Toplam {tags.length} etiket
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingId ? 'Etiketi Düzenle' : 'Yeni Etiket Ekle'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Etiket Adı *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Etiket adını girin..."
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Renk *
              </label>
              <div className="flex items-center space-x-2">
                <div
                  className="w-10 h-10 rounded-md border-2 border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => document.getElementById('colorInput')?.click()}
                />
                <input
                  id="colorInput"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="hidden"
                />
                <span className="text-sm text-gray-600">{formData.color}</span>
              </div>
            </div>
          </div>

          {/* Predefined Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hazır Renkler
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    formData.color === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Önizleme
            </label>
            <div className="flex items-center space-x-2">
              <span
                className="px-3 py-1 text-sm rounded-full"
                style={{
                  backgroundColor: formData.color + '20',
                  color: formData.color,
                  border: `1px solid ${formData.color}40`,
                }}
              >
                {formData.name || 'Etiket Adı'}
              </span>
              <span className="text-xs text-gray-500">
                Bu etiketin görünümü
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <X className="h-4 w-4 inline mr-1" />
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{submitting ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Ekle')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tags List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Mevcut Etiketler</h3>
        </div>

        <div className="p-6">
          {tags.length === 0 ? (
            <div className="text-center py-8">
              <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz etiket tanımlanmamış</p>
              <p className="text-gray-400 text-sm">Yukarıdaki formu kullanarak yeni etiket ekleyebilirsiniz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <span
                        className="px-3 py-1 text-sm rounded-full"
                        style={{
                          backgroundColor: tag.color + '20',
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{tag.color}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 