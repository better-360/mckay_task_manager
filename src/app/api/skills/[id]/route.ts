import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if another skill with the same name exists (excluding current skill)
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: name.trim(),
        id: {
          not: params.id
        }
      }
    })

    if (existingSkill) {
      return NextResponse.json(
        { error: 'A skill with this name already exists' },
        { status: 400 }
      )
    }

    const skill = await prisma.skill.update({
      where: {
        id: params.id
      },
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

    return NextResponse.json(skill)
  } catch (error) {
    console.error('Error updating skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if skill is being used by any users
    const userSkillsCount = await prisma.userSkill.count({
      where: {
        skillId: params.id
      }
    })

    if (userSkillsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete skill. It is currently used by ${userSkillsCount} user(s).` },
        { status: 400 }
      )
    }

    await prisma.skill.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 