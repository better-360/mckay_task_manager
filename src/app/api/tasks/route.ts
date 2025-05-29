import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTaskActivity } from '@/lib/activity'
import { eventEmitter } from '../events/route'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    let whereClause: any = {}

    // Regular users can only see their own tasks or tasks they created
    if (session.user.role !== 'ADMIN') {
      whereClause.OR = [
        { assigneeId: session.user.id },
        { createdById: session.user.id }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    if (assigneeId) {
      whereClause.assigneeId = assigneeId
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            notes: true,
            attachments: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Tasks GET error:', error)
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

    const requestData = await req.json()
    console.log('Request data:', requestData)

    const { title, description, customerId, assigneeId, dueDate, status = 'PENDING', tagIds, newTags } = requestData

    if (!title || !customerId) {
      return NextResponse.json(
        { error: 'Title and customer ID are required' }, 
        { status: 400 }
      )
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' }, 
        { status: 404 }
      )
    }

    // Check if assignee exists (if provided)
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' }, 
          { status: 404 }
        )
      }
    }

    // Process tags - create new ones and validate existing ones
    let finalTagIds: string[] = []
    
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // Separate existing and new tags
      const existingTagIds = tagIds.filter((id: string) => !id.startsWith('temp-'))
      const tempTagIds = tagIds.filter((id: string) => id.startsWith('temp-'))
      
      // Validate existing tags
      if (existingTagIds.length > 0) {
        const validTags = await prisma.tag.findMany({
          where: { id: { in: existingTagIds } }
        })

        if (validTags.length !== existingTagIds.length) {
          return NextResponse.json(
            { error: 'One or more existing tags not found' }, 
            { status: 404 }
          )
        }
        finalTagIds.push(...existingTagIds)
      }

      // Create new tags from temp IDs
      if (tempTagIds.length > 0 && newTags && Array.isArray(newTags)) {
        for (const newTag of newTags) {
          if (tempTagIds.includes(newTag.id)) {
            // Check if tag with same name already exists
            const existingTag = await prisma.tag.findFirst({
              where: { name: { equals: newTag.name, mode: 'insensitive' } }
            })

            if (existingTag) {
              finalTagIds.push(existingTag.id)
            } else {
              // Create new tag
              const createdTag = await prisma.tag.create({
                data: {
                  name: newTag.name,
                  color: newTag.color
                }
              })
              finalTagIds.push(createdTag.id)
            }
          }
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        customerId,
        createdById: session.user.id,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        // Create tag connections
        tags: finalTagIds.length > 0 ? {
          create: finalTagIds.map((tagId: string) => ({
            tagId
          }))
        } : undefined,
      },
      include: {
        customer: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // Create activity log
    await createTaskActivity(
      task.id,
      session.user.id,
      'TASK_CREATED',
      {
        title: task.title,
        customer: customer.name,
        assignee: task.assignee?.name || task.assignee?.email,
        tagsCount: task.tags?.length || 0,
      }
    )

    // Emit real-time event for task creation
    eventEmitter.emit('task_created', task)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 