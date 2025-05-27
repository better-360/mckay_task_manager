import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId: params.id
      },
      include: {
        skill: true
      },
      orderBy: {
        skill: {
          name: 'asc'
        }
      }
    })

    return NextResponse.json(userSkills)
  } catch (error) {
    console.error('Error fetching user skills:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow users to edit their own skills or admins to edit any
    if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { skillId, level, yearsOfExp, description } = await request.json()

    if (!skillId || !level) {
      return NextResponse.json(
        { error: 'Skill ID and level are required' },
        { status: 400 }
      )
    }

    // Check if user skill already exists
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId: params.id,
          skillId: skillId
        }
      }
    })

    if (existingUserSkill) {
      return NextResponse.json(
        { error: 'User already has this skill' },
        { status: 400 }
      )
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        userId: params.id,
        skillId,
        level: parseInt(level),
        yearsOfExp: yearsOfExp ? parseFloat(yearsOfExp) : null,
        description: description?.trim() || null,
      },
      include: {
        skill: true
      }
    })

    return NextResponse.json(userSkill, { status: 201 })
  } catch (error) {
    console.error('Error creating user skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow users to edit their own skills or admins to edit any
    if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userSkillId, level, yearsOfExp, description } = await request.json()

    if (!userSkillId) {
      return NextResponse.json(
        { error: 'User skill ID is required' },
        { status: 400 }
      )
    }

    const userSkill = await prisma.userSkill.update({
      where: {
        id: userSkillId,
        userId: params.id // Ensure user can only update their own skills
      },
      data: {
        level: level ? parseInt(level) : undefined,
        yearsOfExp: yearsOfExp !== undefined ? (yearsOfExp ? parseFloat(yearsOfExp) : null) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
      },
      include: {
        skill: true
      }
    })

    return NextResponse.json(userSkill)
  } catch (error) {
    console.error('Error updating user skill:', error)
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow users to edit their own skills or admins to edit any
    if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userSkillId = searchParams.get('userSkillId')

    if (!userSkillId) {
      return NextResponse.json(
        { error: 'User skill ID is required' },
        { status: 400 }
      )
    }

    await prisma.userSkill.delete({
      where: {
        id: userSkillId,
        userId: params.id // Ensure user can only delete their own skills
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 