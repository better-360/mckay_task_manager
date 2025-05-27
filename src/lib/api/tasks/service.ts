import { PrismaClient, TaskStatus, ActivityType } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto, CreateTaskNoteDto, TaskDetails } from './types';

const prisma = new PrismaClient();

export class TaskService {
  async createTask(dto: CreateTaskDto, userId: string): Promise<TaskDetails> {
    const task = await prisma.$transaction(async (tx) => {
      // Create task
      const task = await tx.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          customerId: dto.customerId,
          assigneeId: dto.assigneeId,
          dueDate: dto.dueDate,
          createdById: userId,
          tags: dto.tags ? {
            create: dto.tags.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          } : undefined
        }
      });

      // Log activity
      await tx.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: userId,
          type: ActivityType.TASK_CREATED,
          metadata: { title: task.title }
        }
      });

      return task;
    });

    return this.getTaskDetails(task.id);
  }

  async updateTask(id: string, dto: UpdateTaskDto, userId: string): Promise<TaskDetails> {
    const currentTask = await prisma.task.findUnique({ where: { id } });
    if (!currentTask) throw new Error('Task not found');

    const task = await prisma.$transaction(async (tx) => {
      // Update task
      const task = await tx.task.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          assigneeId: dto.assigneeId,
          status: dto.status,
          dueDate: dto.dueDate,
          tags: dto.tags ? {
            deleteMany: {},
            create: dto.tags.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          } : undefined
        }
      });

      // Log activities
      const activities = [];
      
      if (dto.status && dto.status !== currentTask.status) {
        activities.push({
          taskId: id,
          actorId: userId,
          type: ActivityType.STATUS_CHANGED,
          metadata: { 
            from: currentTask.status,
            to: dto.status 
          }
        });
      }

      if (dto.assigneeId !== currentTask.assigneeId) {
        activities.push({
          taskId: id,
          actorId: userId,
          type: ActivityType.ASSIGNEE_CHANGED,
          metadata: { 
            from: currentTask.assigneeId,
            to: dto.assigneeId 
          }
        });
      }

      if (activities.length > 0) {
        await tx.taskActivity.createMany({ data: activities });
      }

      return task;
    });

    return this.getTaskDetails(task.id);
  }

  async addNote(taskId: string, dto: CreateTaskNoteDto, userId: string): Promise<TaskDetails> {
    await prisma.$transaction(async (tx) => {
      // Create note
      const note = await tx.taskNote.create({
        data: {
          taskId,
          authorId: userId,
          content: dto.content,
          attachments: dto.attachments ? {
            create: dto.attachments.map(att => ({
              ...att,
              noteId: undefined
            }))
          } : undefined
        }
      });

      // Log activity
      await tx.taskActivity.create({
        data: {
          taskId,
          actorId: userId,
          type: ActivityType.NOTE_ADDED,
          metadata: { noteId: note.id }
        }
      });
    });

    return this.getTaskDetails(taskId);
  }

  async getTaskDetails(id: string): Promise<TaskDetails> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, image: true }
        },
        customer: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, image: true }
        },
        tags: {
          include: {
            tag: true
          }
        },
        attachments: true,
        activities: {
          include: {
            actor: {
              select: { name: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        notes: {
          include: {
            author: {
              select: { id: true, name: true, image: true }
            },
            attachments: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) throw new Error('Task not found');

    return {
      ...task,
      tags: task.tags.map(t => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color
      })),
      activities: task.activities.map(a => ({
        id: a.id,
        type: a.type,
        actorName: a.actor.name,
        actorImage: a.actor.image,
        metadata: a.metadata,
        createdAt: a.createdAt
      }))
    };
  }
} 