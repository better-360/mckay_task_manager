import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTaskActivity } from '@/lib/activity'
import { eventEmitter } from '../../events/route'
import { formatDate } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            notes: true,
            attachments: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { title, description, assigneeId, dueDate, status } = await request.json()

    // Verify task exists and get current data
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updateData: any = {}
    const activities: Array<{ type: string; metadata: any }> = []
    
    // Track changes for activity log
    if (title !== undefined && title !== existingTask.title) {
      updateData.title = title
      activities.push({
        type: 'TASK_UPDATED',
        metadata: { field: 'title', oldValue: existingTask.title, newValue: title }
      })
    }

    if (description !== undefined && description !== existingTask.description) {
      updateData.description = description
      activities.push({
        type: 'TASK_UPDATED',
        metadata: { field: 'description', oldValue: existingTask.description, newValue: description }
      })
    }

    if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
      updateData.assigneeId = assigneeId
      
      // Get new assignee info if provided
      let newAssignee = null
      if (assigneeId) {
        newAssignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { name: true, email: true }
        })
      }

      activities.push({
        type: 'ASSIGNEE_CHANGED',
        metadata: {
          oldAssignee: existingTask.assignee?.name || existingTask.assignee?.email,
          newAssignee: newAssignee?.name || newAssignee?.email,
        }
      })
    }

    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null
      const oldDueDate = existingTask.dueDate
      
      if (newDueDate?.getTime() !== oldDueDate?.getTime()) {
        updateData.dueDate = newDueDate
        activities.push({
          type: 'DUE_DATE_CHANGED',
          metadata: {
            oldDueDate: oldDueDate ? formatDate(oldDueDate.toISOString()) : null,
            newDueDate: newDueDate ? formatDate(newDueDate.toISOString()) : null,
          }
        })
      }
    }

    if (status !== undefined && status !== existingTask.status) {
      updateData.status = status
      activities.push({
        type: 'STATUS_CHANGED',
        metadata: { oldStatus: existingTask.status, newStatus: status }
      })
    }

    // Update task if there are changes
    let updatedTask = existingTask
    if (Object.keys(updateData).length > 0) {
      updatedTask = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              notes: true,
              attachments: true,
            },
          },
        },
      })

      // Create activity logs for each change
      for (const activity of activities) {
        await createTaskActivity(
          id,
          session.user.id,
          activity.type,
          activity.metadata
        )
      }

      // Emit real-time event for task update
      eventEmitter.emit('task_updated', updatedTask)
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create activity log before deletion
    await createTaskActivity(
      id,
      session.user.id,
      'TASK_DELETED',
      { title: existingTask.title }
    )

    // Delete related records first (cascade delete)
    await prisma.$transaction([
      // Delete task notes
      prisma.taskNote.deleteMany({
        where: { taskId: id },
      }),
      // Delete task tags
      prisma.taskTag.deleteMany({
        where: { taskId: id },
      }),
      // Delete attachments
      prisma.attachment.deleteMany({
        where: { taskId: id },
      }),
      // Delete activities
      prisma.taskActivity.deleteMany({
        where: { taskId: id },
      }),
      // Finally delete the task
      prisma.task.delete({
        where: { id },
      }),
    ])

    // Emit real-time event for task deletion
    eventEmitter.emit('task_deleted', { id, title: existingTask.title })

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 