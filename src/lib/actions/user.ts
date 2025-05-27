'use server';

import { UserService } from '@/lib/services/user';
import { CreateUserDto, UpdateUserDto } from '@/lib/services/user';

const userService = new UserService();

export async function createUser(data: CreateUserDto) {
  return userService.create(data);
}

export async function updateUser(id: string, data: UpdateUserDto) {
  return userService.update(id, data);
}

export async function deleteUser(id: string) {
  return userService.delete(id);
}

export async function getUsers(params: {
  skip?: number;
  take?: number;
  search?: string;
  role?: string;
}) {
  return userService.findAll(params);
} 