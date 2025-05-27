import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTaskActivity } from '@/lib/activity'
import { eventEmitter } from '../../../../events/route'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, noteId } = await params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Verify note exists and user is the author
    const existingNote = await prisma.taskNote.findUnique({
      where: { id: noteId },
      include: { task: true }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    if (existingNote.task.id !== id) {
      return NextResponse.json(
        { error: 'Note does not belong to this task' },
        { status: 400 }
      )
    }

    if (existingNote.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own notes' },
        { status: 403 }
      )
    }

    const updatedNote = await prisma.taskNote.update({
      where: { id: noteId },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    })

    // Create activity log
    await createTaskActivity(
      id,
      session.user.id,
      'NOTE_UPDATED',
      { 
        oldContent: existingNote.content.substring(0, 50) + (existingNote.content.length > 50 ? '...' : ''),
        newContent: content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')
      }
    )

    // Emit real-time event
    eventEmitter.emit('note_updated', { taskId: id, note: updatedNote })

    return NextResponse.json(updatedNote)
  } catch (error) {
    console.error('Error updating task note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, noteId } = await params

    // Verify note exists and user is the author
    const existingNote = await prisma.taskNote.findUnique({
      where: { id: noteId },
      include: { task: true }
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    if (existingNote.task.id !== id) {
      return NextResponse.json(
        { error: 'Note does not belong to this task' },
        { status: 400 }
      )
    }

    if (existingNote.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own notes' },
        { status: 403 }
      )
    }

    // Create activity log before deletion
    await createTaskActivity(
      id,
      session.user.id,
      'NOTE_DELETED',
      { noteContent: existingNote.content.substring(0, 100) + (existingNote.content.length > 100 ? '...' : '') }
    )

    await prisma.taskNote.delete({
      where: { id: noteId },
    })

    // Emit real-time event
    eventEmitter.emit('note_deleted', { taskId: id, noteId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 