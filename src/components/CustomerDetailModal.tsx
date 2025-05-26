'use client'

import { useState, useEffect } from 'react'
import { X, Building2, Calendar, FileText, CheckSquare } from 'lucide-react'

interface Customer {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count: {
    tasks: number
    files: number
  }
}

interface Task {
  id: string
  title: string
  status: string
  createdAt: string
  assignee?: {
    name: string
    email: string
  }
}

interface CustomerDetailModalProps {
  customer: Customer
  onClose: () => void
}

export default function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomerTasks()
  }, [customer.id])

  const fetchCustomerTasks = async () => {
    try {
      const response = await fetch(`/api/customers/${customer.id}/tasks`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching customer tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Bekliyor'
      case 'IN_PROGRESS':
        return 'Devam Ediyor'
      case 'COMPLETED':
        return 'Tamamlandı'
      case 'CANCELLED':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500">Müşteri Detayları</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h3>
                <p className="text-gray-700">
                  {customer.description || 'Açıklama bulunmuyor'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Oluşturulma Tarihi</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{customer._count.tasks}</div>
                  <div className="text-sm text-gray-600">Toplam Görev</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{customer._count.files}</div>
                  <div className="text-sm text-gray-600">Dosya</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <CheckSquare className="h-5 w-5" />
              <span>Görevler ({tasks.length})</span>
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>Bu müşteri için henüz görev yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(task.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      {task.assignee && (
                        <div className="flex items-center space-x-1">
                          <span>Atanan:</span>
                          <span className="font-medium">{task.assignee.name || task.assignee.email}</span>
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
    </div>
  )
} 