import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      include: {
        _count: {
          select: {
            userSkills: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(skills)
  } catch (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, category, description } = await request.json()

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Check if skill with same name already exists
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: name.trim()
      }
    })

    if (existingSkill) {
      return NextResponse.json(
        { error: 'A skill with this name already exists' },
        { status: 400 }
      )
    }

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: {
            userSkills: true
          }
        }
      }
    })

    return NextResponse.json(skill, { status: 201 })
  } catch (error) {
    console.error('Error creating skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 