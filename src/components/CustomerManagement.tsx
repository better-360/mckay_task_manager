'use client'

import { useState, useEffect } from 'react'
import { Plus, Building2 } from 'lucide-react'
import CreateCustomerModal from './CreateCustomerModal'
import CustomerDetailModal from './CustomerDetailModal'
import EditCustomerModal from './EditCustomerModal'

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

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      } else {
        console.error('Failed to fetch customers:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleCustomerCreated = () => {
    fetchCustomers()
    setShowCreateModal(false)
  }

  const handleCustomerUpdated = () => {
    fetchCustomers()
    setShowEditModal(false)
    setSelectedCustomer(null)
  }

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailModal(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowEditModal(true)
  }

  const handleCloseModals = () => {
    setShowDetailModal(false)
    setShowEditModal(false)
    setSelectedCustomer(null)
  }

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
        <h2 className="text-2xl font-bold text-gray-900">Müşteri Yönetimi</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Müşteri</span>
        </button>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {customer.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {customer.description}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{customer._count.tasks}</div>
                <div className="text-xs text-gray-500">Görev</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{customer._count.files}</div>
                <div className="text-xs text-gray-500">Dosya</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button 
                onClick={() => handleViewDetails(customer)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                Detayları Görüntüle
              </button>
              <button 
                onClick={() => handleEditCustomer(customer)}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              >
                Düzenle
              </button>
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz müşteri yok</h3>
            <p className="text-gray-500 mb-4">İlk müşterinizi ekleyerek başlayın</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Müşteri Ekle</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}

      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={handleCloseModals}
        />
      )}

      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={handleCloseModals}
          onCustomerUpdated={handleCustomerUpdated}
        />
      )}
    </div>
  )
} 