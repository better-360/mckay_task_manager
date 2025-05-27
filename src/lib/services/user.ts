import { PrismaClient, Role, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
  profilePicture?: string;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  profilePicture?: string;
  phoneNumber?: string;
}

export interface UserResponse {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  profilePicture: string | null;
  phoneNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  async create(data: CreateUserDto): Promise<UserResponse> {
    const hashedPassword = await hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponse> {
    let updateData = { ...data };
    
    if (data.password) {
      updateData.password = await hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }

  async findById(id: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    role?: Role;
  }): Promise<{
    users: UserResponse[];
    total: number;
  }> {
    const { skip = 0, take = 10, search, role } = params;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { 
            name: { 
              contains: search, 
              mode: Prisma.QueryMode.insensitive 
            } 
          },
          { 
            email: { 
              contains: search, 
              mode: Prisma.QueryMode.insensitive 
            } 
          }
        ]
      }),
      ...(role && { role })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profilePicture: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return { users, total };
  }
} 