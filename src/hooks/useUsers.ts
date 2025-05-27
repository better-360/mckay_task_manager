import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, GetUsersParams, CreateUserDto, UpdateUserDto } from '@/lib/api/users'
import { toast } from 'react-hot-toast'

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Get users with pagination and filters
export const useUsers = (params: GetUsersParams = {}) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get single user
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
  })
}

// Create user mutation
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Kullanıcı başarıyla oluşturuldu')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı oluşturulurken hata oluştu')
    },
  })
}

// Update user mutation
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => 
      usersApi.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      toast.success('Kullanıcı başarıyla güncellendi')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı güncellenirken hata oluştu')
    },
  })
}

// Delete user mutation
export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success('Kullanıcı başarıyla silindi')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Kullanıcı silinirken hata oluştu')
    },
  })
} 