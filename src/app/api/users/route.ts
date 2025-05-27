import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '10')
    const search = searchParams.get('search')
    const role = searchParams.get('role')

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
      ...(role && { role: role as any })
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profilePicture: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where })
    ])

    // Get task counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const [createdTasks, assignedTasks, completedTasks] = await Promise.all([
          prisma.task.count({
            where: { createdById: user.id }
          }),
          prisma.task.count({
            where: { 
              assigneeId: user.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] }
            }
          }),
          prisma.task.count({
            where: { 
              OR: [
                { assigneeId: user.id, status: 'COMPLETED' },
                { createdById: user.id, status: 'COMPLETED' }
              ]
            }
          })
        ])

        return {
          ...user,
          _count: {
            createdTasks,
            assignedTasks,
            completedTasks
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithCounts, total })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, email, password, role = 'USER' } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' }, 
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 