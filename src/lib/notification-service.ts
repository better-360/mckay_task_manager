import { prisma } from "@/lib/prisma"

export type NotificationType = 
  | "TASK_ASSIGNED" 
  | "TASK_UPDATED" 
  | "TASK_COMPLETED" 
  | "TASK_COMMENTED" 
  | "TASK_DELETED"

interface CreateNotificationParams {
  userId: string
  senderId?: string
  taskId?: string
  type: NotificationType
  title: string
  message: string
}

export class NotificationService {
  static async createNotification(params: CreateNotificationParams) {
    try {
      await prisma.notification.create({
        data: {
          userId: params.userId,
          senderId: params.senderId,
          taskId: params.taskId,
          type: params.type,
          title: params.title,
          message: params.message,
        }
      })
    } catch (error) {
      console.error("Notification creation error:", error)
    }
  }

  static async notifyTaskAssigned(taskId: string, assigneeId: string, assignedBy: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        customer: true,
        createdBy: true 
      }
    })

    if (!task) return

    await this.createNotification({
      userId: assigneeId,
      senderId: assignedBy,
      taskId: taskId,
      type: "TASK_ASSIGNED",
      title: "Yeni Task Atandı",
      message: `"${task.title}" task'ı size atandı (${task.customer.name})`
    })
  }

  static async notifyTaskUpdated(taskId: string, updatedBy: string, changes: string[]) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        customer: true,
        assignee: true,
        createdBy: true 
      }
    })

    if (!task) return

    const recipients = new Set<string>()
    
    // Task'ı oluşturana bildir
    if (task.createdById !== updatedBy) {
      recipients.add(task.createdById)
    }
    
    // Atanan kişiye bildir
    if (task.assigneeId && task.assigneeId !== updatedBy) {
      recipients.add(task.assigneeId)
    }

    const changeText = changes.join(", ")
    
    for (const userId of recipients) {
      await this.createNotification({
        userId,
        senderId: updatedBy,
        taskId: taskId,
        type: "TASK_UPDATED",
        title: "Task Güncellendi",
        message: `"${task.title}" task'ında değişiklik yapıldı: ${changeText}`
      })
    }
  }

  static async notifyTaskCompleted(taskId: string, completedBy: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        customer: true,
        assignee: true,
        createdBy: true 
      }
    })

    if (!task) return

    const recipients = new Set<string>()
    
    // Task'ı oluşturana bildir
    if (task.createdById !== completedBy) {
      recipients.add(task.createdById)
    }
    
    // Atanan kişiye bildir (eğer başkası tamamladıysa)
    if (task.assigneeId && task.assigneeId !== completedBy) {
      recipients.add(task.assigneeId)
    }

    for (const userId of recipients) {
      await this.createNotification({
        userId,
        senderId: completedBy,
        taskId: taskId,
        type: "TASK_COMPLETED",
        title: "Task Tamamlandı",
        message: `"${task.title}" task'ı tamamlandı`
      })
    }
  }

  static async notifyTaskCommented(taskId: string, commentedBy: string, comment: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        customer: true,
        assignee: true,
        createdBy: true 
      }
    })

    if (!task) return

    const recipients = new Set<string>()
    
    // Task'ı oluşturana bildir
    if (task.createdById !== commentedBy) {
      recipients.add(task.createdById)
    }
    
    // Atanan kişiye bildir
    if (task.assigneeId && task.assigneeId !== commentedBy) {
      recipients.add(task.assigneeId)
    }

    const shortComment = comment.length > 50 ? comment.substring(0, 50) + "..." : comment

    for (const userId of recipients) {
      await this.createNotification({
        userId,
        senderId: commentedBy,
        taskId: taskId,
        type: "TASK_COMMENTED",
        title: "Yeni Yorum",
        message: `"${task.title}" task'ına yorum eklendi: ${shortComment}`
      })
    }
  }

  static async notifyTaskDeleted(taskTitle: string, customerId: string, deletedBy: string, assigneeId?: string, createdById?: string) {
    const recipients = new Set<string>()
    
    // Task'ı oluşturana bildir
    if (createdById && createdById !== deletedBy) {
      recipients.add(createdById)
    }
    
    // Atanan kişiye bildir
    if (assigneeId && assigneeId !== deletedBy) {
      recipients.add(assigneeId)
    }

    for (const userId of recipients) {
      await this.createNotification({
        userId,
        senderId: deletedBy,
        type: "TASK_DELETED",
        title: "Task Silindi",
        message: `"${taskTitle}" task'ı silindi`
      })
    }
  }

  static async getUserNotifications(userId: string, limit = 20) {
    return await prisma.notification.findMany({
      where: { userId },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        },
        task: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })
  }

  static async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { 
        id: notificationId,
        userId: userId 
      },
      data: { read: true }
    })
  }

  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { 
        userId: userId,
        read: false 
      },
      data: { read: true }
    })
  }

  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { 
        userId: userId,
        read: false 
      }
    })
  }
} 