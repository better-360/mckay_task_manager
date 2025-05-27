'use client'

import { useState, useEffect } from 'react'
import { Star, Plus, Edit, Trash2, X, Search } from 'lucide-react'

interface Skill {
  id: string
  name: string
  category: string
  description?: string
  _count: {
    userSkills: number
  }
}

export default function SkillManagement() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [skillForm, setSkillForm] = useState({
    name: '',
    category: '',
    description: ''
  })

  const categories = [
   'Business', 'Finance', 'Management', 'Other'
  ]

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/skills')
      if (response.ok) {
        const data = await response.json()
        setSkills(data)
        setFilteredSkills(data)
      } else {
        console.error('Failed to fetch skills')
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skillForm),
      })

      if (response.ok) {
        fetchSkills()
        setShowModal(false)
        setSkillForm({ name: '', category: '', description: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Skill oluşturulurken hata oluştu')
      }
    } catch (error) {
      console.error('Error creating skill:', error)
      alert('Skill oluşturulurken hata oluştu')
    }
  }

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSkill) return

    try {
      const response = await fetch(`/api/skills/${editingSkill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skillForm),
      })

      if (response.ok) {
        fetchSkills()
        setShowModal(false)
        setEditingSkill(null)
        setSkillForm({ name: '', category: '', description: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Skill güncellenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error updating skill:', error)
      alert('Skill güncellenirken hata oluştu')
    }
  }

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Bu skill\'i silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSkills()
      } else {
        const error = await response.json()
        alert(error.error || 'Skill silinirken hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Skill silinirken hata oluştu')
    }
  }

  const startEditSkill = (skill: Skill) => {
    setEditingSkill(skill)
    setSkillForm({
      name: skill.name,
      category: skill.category,
      description: skill.description || ''
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingSkill(null)
    setSkillForm({ name: '', category: '', description: '' })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSkill(null)
    setSkillForm({ name: '', category: '', description: '' })
  }

  // Filter skills based on search and category
  useEffect(() => {
    let filtered = skills

    if (searchTerm) {
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(skill => skill.category === selectedCategory)
    }

    setFilteredSkills(filtered)
  }, [skills, searchTerm, selectedCategory])

  useEffect(() => {
    fetchSkills()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Yetenek Yönetimi</h2>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Yetenek</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Yetenek</p>
              <p className="text-2xl font-bold text-gray-900">{skills.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Kullanılan Yetenekler</p>
              <p className="text-2xl font-bold text-gray-900">
                {skills.filter(skill => skill._count.userSkills > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Kategoriler</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(skills.map(skill => skill.category)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Yetenek ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Yetenekler ({filteredSkills.length})
          </h3>
        </div>

        {filteredSkills.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Yetenek bulunamadı</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategory ? 'Arama kriterlerinizi değiştirin' : 'Henüz yetenek eklenmemiş'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredSkills.map((skill) => (
              <div key={skill.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{skill.name}</h4>
                    <p className="text-sm text-blue-600">{skill.category}</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => startEditSkill(skill)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {skill.description && (
                  <p className="text-sm text-gray-600 mb-3">{skill.description}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {skill._count.userSkills} kullanıcı
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    skill._count.userSkills > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {skill._count.userSkills > 0 ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSkill ? 'Yetenek Düzenle' : 'Yeni Yetenek Oluştur'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingSkill ? handleUpdateSkill : handleCreateSkill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yetenek Adı *
                </label>
                <input
                  type="text"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: JavaScript"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori *
                </label>
                <select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, category: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Kategori seçin</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={skillForm.description}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bu yetenek hakkında kısa açıklama..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSkill ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 