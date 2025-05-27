import axios from 'axios'
import { Role } from '@prisma/client'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface User {
  id: string
  name: string | null
  email: string
  role: Role
  profilePicture: string | null
  phoneNumber: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    createdTasks: number
    assignedTasks: number
    completedTasks: number
  }
}

export interface CreateUserDto {
  name: string
  email: string
  password: string
  role?: Role
  profilePicture?: string
  phoneNumber?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
  password?: string
  role?: Role
  profilePicture?: string
  phoneNumber?: string
}

export interface UsersResponse {
  users: User[]
  total: number
}

export interface GetUsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: Role | ''
}

export const usersApi = {
  // Get all users with pagination and filters
  getUsers: async (params: GetUsersParams = {}): Promise<UsersResponse> => {
    const { page = 1, pageSize = 10, search, role } = params
    const skip = (page - 1) * pageSize
    
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      take: pageSize.toString(),
    })
    
    if (search) queryParams.append('search', search)
    if (role) queryParams.append('role', role)
    
    const response = await api.get(`/users?${queryParams}`)
    return response.data
  },

  // Get single user by ID
  getUser: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  // Create new user
  createUser: async (data: CreateUserDto): Promise<User> => {
    const response = await api.post('/users', data)
    return response.data
  },

  // Update user
  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
} 