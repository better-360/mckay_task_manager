'use client'

import { useState, useEffect } from 'react'
import { Users, Shield, CheckCircle, Clock, Calendar, Star, Plus, Edit, Trash2, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  emailVerified?: string
  createdAt: string
  _count: {
    createdTasks: number
    assignedTasks: number
    completedTasks: number
  }
}

interface Skill {
  id: string
  name: string
  category: string
  description?: string
  _count: {
    userSkills: number
  }
}

interface UserSkill {
  id: string
  level: number
  yearsOfExp?: number
  description?: string
  skill: Skill
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userSkills, setUserSkills] = useState<UserSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [showAddSkillModal, setShowAddSkillModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    verified: 0,
    active: 0
  })

  const [skillForm, setSkillForm] = useState({
    skillId: '',
    level: 1,
    yearsOfExp: '',
    description: ''
  })

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // Users API returns { users: [...], total: ... }
        const usersList = data.users || []
        setUsers(usersList)
        
        // Calculate stats
        const total = usersList.length
        const admins = usersList.filter((user: User) => user.role === 'ADMIN').length
        const verified = usersList.filter((user: User) => user.emailVerified).length
        const active = usersList.filter((user: User) => 
          user._count.createdTasks > 0 || user._count.assignedTasks > 0
        ).length
        
        setStats({ total, admins, verified, active })
      } else {
        console.error('Failed to fetch users:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills')
      if (response.ok) {
        const data = await response.json()
        setSkills(data)
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
    }
  }

  const fetchUserSkills = async (userId: string) => {
    try {
      setSkillsLoading(true)
      const response = await fetch(`/api/users/${userId}/skills`)
      if (response.ok) {
        const data = await response.json()
        setUserSkills(data)
      }
    } catch (error) {
      console.error('Error fetching user skills:', error)
    } finally {
      setSkillsLoading(false)
    }
  }

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
    setShowSkillModal(true)
    fetchUserSkills(user.id)
  }

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillId: skillForm.skillId,
          level: skillForm.level,
          yearsOfExp: skillForm.yearsOfExp ? parseFloat(skillForm.yearsOfExp) : null,
          description: skillForm.description || null,
        }),
      })

      if (response.ok) {
        fetchUserSkills(selectedUser.id)
        setShowAddSkillModal(false)
        setSkillForm({ skillId: '', level: 1, yearsOfExp: '', description: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Skill eklenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error adding skill:', error)
      alert('Skill eklenirken hata oluştu')
    }
  }

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !editingSkill) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/skills`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userSkillId: editingSkill.id,
          level: skillForm.level,
          yearsOfExp: skillForm.yearsOfExp ? parseFloat(skillForm.yearsOfExp) : null,
          description: skillForm.description || null,
        }),
      })

      if (response.ok) {
        fetchUserSkills(selectedUser.id)
        setEditingSkill(null)
        setSkillForm({ skillId: '', level: 1, yearsOfExp: '', description: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Skill güncellenirken hata oluştu')
      }
    } catch (error) {
      console.error('Error updating skill:', error)
      alert('Skill güncellenirken hata oluştu')
    }
  }

  const handleDeleteSkill = async (userSkillId: string) => {
    if (!selectedUser || !confirm('Bu skill\'i silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/skills?userSkillId=${userSkillId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchUserSkills(selectedUser.id)
      } else {
        const error = await response.json()
        alert(error.error || 'Skill silinirken hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting skill:', error)
      alert('Skill silinirken hata oluştu')
    }
  }

  const startEditSkill = (userSkill: UserSkill) => {
    setEditingSkill(userSkill)
    setSkillForm({
      skillId: userSkill.skill.id,
      level: userSkill.level,
      yearsOfExp: userSkill.yearsOfExp?.toString() || '',
      description: userSkill.description || ''
    })
  }

  const getLevelText = (level: number) => {
    const levels = ['', 'Başlangıç', 'Temel', 'Orta', 'İleri', 'Uzman']
    return levels[level] || 'Bilinmiyor'
  }

  const getLevelColor = (level: number) => {
    const colors = ['', 'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600', 'text-blue-600']
    return colors[level] || 'text-gray-600'
  }

  useEffect(() => {
    fetchUsers()
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
        <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admin</p>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doğrulanmış</p>
              <p className="text-2xl font-bold text-gray-900">{stats.verified}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Kullanıcı Listesi</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oluşturulan Görevler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atanan Görevler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tamamlanan Görevler
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yetenekler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(users) && users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'İsimsiz'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Kullanıcı'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.emailVerified ? 'Doğrulanmış' : 'Beklemede'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-blue-600">
                        {user._count.createdTasks}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">görev</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-orange-600">
                        {user._count.assignedTasks}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">görev</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-green-600">
                        {user._count.completedTasks}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">görev</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleUserClick(user)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <Star className="h-4 w-4" />
                      <span>Yetenekler</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı bulunamadı</h3>
            <p className="text-gray-500">Henüz sistemde kayıtlı kullanıcı yok.</p>
          </div>
        )}
      </div>

      {/* Skills Modal */}
      {showSkillModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedUser.name || selectedUser.email} - Yetenekler
              </h3>
              <button
                onClick={() => {
                  setShowSkillModal(false)
                  setSelectedUser(null)
                  setUserSkills([])
                  setEditingSkill(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Mevcut Yetenekler</h4>
                <button
                  onClick={() => setShowAddSkillModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Yetenek Ekle</span>
                </button>
              </div>

              {skillsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : userSkills.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz yetenek eklenmemiş</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userSkills.map((userSkill) => (
                    <div key={userSkill.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{userSkill.skill.name}</h5>
                          <p className="text-sm text-gray-500">{userSkill.skill.category}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEditSkill(userSkill)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(userSkill.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Seviye:</span>
                          <span className={`text-sm font-medium ${getLevelColor(userSkill.level)}`}>
                            {getLevelText(userSkill.level)} ({userSkill.level}/5)
                          </span>
                        </div>
                        
                        {userSkill.yearsOfExp && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Deneyim:</span>
                            <span className="text-sm">{userSkill.yearsOfExp} yıl</span>
                          </div>
                        )}
                        
                        {userSkill.description && (
                          <div>
                            <span className="text-sm text-gray-600">Açıklama:</span>
                            <p className="text-sm mt-1">{userSkill.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Skill Modal */}
      {(showAddSkillModal || editingSkill) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSkill ? 'Yetenek Düzenle' : 'Yetenek Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowAddSkillModal(false)
                  setEditingSkill(null)
                  setSkillForm({ skillId: '', level: 1, yearsOfExp: '', description: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingSkill ? handleUpdateSkill : handleAddSkill} className="p-6 space-y-4">
              {!editingSkill && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yetenek *
                  </label>
                  <select
                    value={skillForm.skillId}
                    onChange={(e) => setSkillForm(prev => ({ ...prev, skillId: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Yetenek seçin</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name} ({skill.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seviye (1-5) *
                </label>
                <select
                  value={skillForm.level}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 - Başlangıç</option>
                  <option value={2}>2 - Temel</option>
                  <option value={3}>3 - Orta</option>
                  <option value={4}>4 - İleri</option>
                  <option value={5}>5 - Uzman</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deneyim (Yıl)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={skillForm.yearsOfExp}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, yearsOfExp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: 2.5"
                />
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
                  placeholder="Bu yetenek hakkında notlar..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSkillModal(false)
                    setEditingSkill(null)
                    setSkillForm({ skillId: '', level: 1, yearsOfExp: '', description: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSkill ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 