import { prisma } from './prisma'
import { eventEmitter } from '@/app/api/events/route'

export async function createTaskActivity(
  taskId: string,
  actorId: string,
  type: string,
  metadata?: any
) {
  try {
    const activity = await prisma.taskActivity.create({
      data: {
        taskId,
        actorId,
        type: type as any,
        metadata: metadata || null,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    })

    // Emit real-time event
    eventEmitter.emit('task_activity', {
      taskId,
      activity,
    })

    return activity
  } catch (error) {
    console.error('Error creating task activity:', error)
    throw error
  }
}

export async function getTaskActivities(taskId: string) {
  try {
    const activities = await prisma.taskActivity.findMany({
      where: { taskId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return activities
  } catch (error) {
    console.error('Error fetching task activities:', error)
    throw error
  }
}

export function getActivityMessage(type: string, metadata?: any): string {
  switch (type) {
    case 'TASK_CREATED':
      return 'görevi oluşturdu'
    case 'TASK_UPDATED':
      if (metadata?.field) {
        switch (metadata.field) {
          case 'title':
            return `başlığı "${metadata.oldValue}" → "${metadata.newValue}" olarak değiştirdi`
          case 'description':
            return 'açıklamayı güncelledi'
          default:
            return 'görevi güncelledi'
        }
      }
      return 'görevi güncelledi'
    case 'TASK_DELETED':
      return 'görevi sildi'
    case 'STATUS_CHANGED':
      const statusMap: Record<string, string> = {
        'PENDING': 'Bekliyor',
        'IN_PROGRESS': 'Devam Ediyor',
        'COMPLETED': 'Tamamlandı',
        'CANCELLED': 'İptal Edildi'
      }
      const oldStatus = statusMap[metadata?.oldStatus] || metadata?.oldStatus || 'bilinmeyen'
      const newStatus = statusMap[metadata?.newStatus] || metadata?.newStatus || 'bilinmeyen'
      return `durumu "${oldStatus}" → "${newStatus}" olarak değiştirdi`
    case 'ASSIGNEE_CHANGED':
      if (metadata?.oldAssignee && metadata?.newAssignee) {
        return `atanan kişiyi "${metadata.oldAssignee}" → "${metadata.newAssignee}" olarak değiştirdi`
      } else if (metadata?.newAssignee) {
        return `görevi "${metadata.newAssignee}" kişisine atadı`
      } else if (metadata?.oldAssignee) {
        return `"${metadata.oldAssignee}" kişisinden atamasını kaldırdı`
      }
      return 'atanan kişiyi değiştirdi'
    case 'TAG_ADDED':
      return `"${metadata?.tagName || 'bilinmeyen'}" etiketini ekledi`
    case 'TAG_REMOVED':
      return `"${metadata?.tagName || 'bilinmeyen'}" etiketini kaldırdı`
    case 'NOTE_ADDED':
      return 'yeni not ekledi'
    case 'NOTE_UPDATED':
      return 'notu güncelledi'
    case 'NOTE_DELETED':
      return 'notu sildi'
    case 'ATTACHMENT_ADDED':
      return `"${metadata?.filename || 'dosya'}" dosyasını ekledi`
    case 'ATTACHMENT_REMOVED':
      return `"${metadata?.filename || 'dosya'}" dosyasını kaldırdı`
    case 'DUE_DATE_CHANGED':
      if (metadata?.oldDueDate && metadata?.newDueDate) {
        return `bitiş tarihini "${metadata.oldDueDate}" → "${metadata.newDueDate}" olarak değiştirdi`
      } else if (metadata?.newDueDate) {
        return `bitiş tarihini "${metadata.newDueDate}" olarak belirledi`
      } else if (metadata?.oldDueDate) {
        return 'bitiş tarihini kaldırdı'
      }
      return 'bitiş tarihini değiştirdi'
    default:
      return 'bir değişiklik yaptı'
  }
} 