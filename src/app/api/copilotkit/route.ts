import {
    CopilotRuntime,
    OpenAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
  } from '@copilotkit/runtime';
  import { prisma } from '@/lib/prisma';
  import { NextRequest } from 'next/server';
   
  
  const serviceAdapter = new OpenAIAdapter(
    {
        model: 'gpt-4o-mini',
    }
  );

  const runtime = new CopilotRuntime({
    actions: () => [
      // 1. Kullanıcıya task ata
      {
        name: "assign_task_to_user",
        description: "Assign a new task to a user. The requester is the creator.",
        parameters: [
          { name: "requesterId", type: "string", required: true, description: "ID of the user making the request (createdBy)" },
          { name: "assigneeId", type: "string", required: true, description: "ID of the user to assign the task to" },
          { name: "title", type: "string", required: true, description: "Task title" },
          { name: "description", type: "string", required: false, description: "Task description" },
          { name: "customerId", type: "string", required: true, description: "ID of the customer for the task" },
        ],
        handler: async ({ requesterId, assigneeId, title, description, customerId }: { requesterId: string, assigneeId: string, title: string, description?: string, customerId: string }) => {
          const task = await prisma.task.create({
            data: {
              title,
              description,
              status: 'PENDING',
              assigneeId,
              customerId,
              createdById: requesterId,
            },
          });
          return { task };
        },
      },
      // 2. Kullanıcıya atanmış taskları getir
      {
        name: "get_tasks_for_user",
        description: "Get all tasks assigned to a user.",
        parameters: [
          { name: "userId", type: "string", required: true, description: "ID of the user whose tasks to fetch" },
        ],
        handler: async ({ userId }: { userId: string }) => {
          const tasks = await prisma.task.findMany({
            where: { assigneeId: userId },
            include: {
              customer: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });
          return { tasks };
        },
      },
      // 3. Müşteriye ait taskları getir
      {
        name: "get_tasks_for_customer",
        description: "Get all tasks for a customer.",
        parameters: [
          { name: "customerId", type: "string", required: true, description: "ID of the customer" },
        ],
        handler: async ({ customerId }: { customerId: string }) => {
          const tasks = await prisma.task.findMany({
            where: { customerId },
            include: {
              assignee: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          });
          return { tasks };
        },
      },
      // 4. Task detayını getir
      {
        name: "get_task_detail",
        description: "Get details of a specific task.",
        parameters: [
          { name: "taskId", type: "string", required: true, description: "ID of the task" },
        ],
        handler: async ({ taskId }: { taskId: string }) => {
          const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
              assignee: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true } },
            },
          });
          return { task };
        },
      },
      // 5. Task durumunu güncelle (sadece createdBy veya admin)
      {
        name: "update_task_status",
        description: "Update the status of a task. Only creator or admin can update.",
        parameters: [
          { name: "requesterId", type: "string", required: true, description: "ID of the user making the request" },
          { name: "taskId", type: "string", required: true, description: "ID of the task" },
          { name: "status", type: "string", required: true, description: "New status (PENDING, IN_PROGRESS, DONE, etc.)" },
        ],
        handler: async ({ requesterId, taskId, status }: { requesterId: string, taskId: string, status: string }) => {
          const task = await prisma.task.findUnique({ where: { id: taskId }, include: { createdBy: true } });
          if (!task) return { error: 'Task not found' };
          if (task.createdById !== requesterId) return { error: 'Only creator can update status' };
          const updated = await prisma.task.update({ where: { id: taskId }, data: { status } });
          return { task: updated };
        },
      },
      // 6. Task sil (sadece createdBy veya admin)
      {
        name: "delete_task",
        description: "Delete a task. Only creator or admin can delete.",
        parameters: [
          { name: "requesterId", type: "string", required: true, description: "ID of the user making the request" },
          { name: "taskId", type: "string", required: true, description: "ID of the task" },
        ],
        handler: async ({ requesterId, taskId }: { requesterId: string, taskId: string }) => {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (!task) return { error: 'Task not found' };
          if (task.createdById !== requesterId) return { error: 'Only creator can delete' };
          await prisma.task.delete({ where: { id: taskId } });
          return { success: true };
        },
      },
      // 7. Task güncelle (sadece createdBy veya admin)
      {
        name: "update_task",
        description: "Update task fields. Only creator or admin can update.",
        parameters: [
          { name: "requesterId", type: "string", required: true },
          { name: "taskId", type: "string", required: true },
          { name: "title", type: "string", required: false },
          { name: "description", type: "string", required: false },
          { name: "assigneeId", type: "string", required: false },
          { name: "customerId", type: "string", required: false },
          { name: "status", type: "string", required: false },
          { name: "dueDate", type: "string", required: false },
        ],
        handler: async ({ requesterId, taskId, ...fields }: { requesterId: string, taskId: string, title?: string, description?: string, assigneeId?: string, customerId?: string, status?: string, dueDate?: string }) => {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (!task) return { error: 'Task not found' };
          if (task.createdById !== requesterId) return { error: 'Only creator can update' };
          const updated = await prisma.task.update({ where: { id: taskId }, data: { ...fields } });
          return { task: updated };
        },
      },
      // 8. Müşteriye yeni task ekle
      {
        name: "create_task_for_customer",
        description: "Create a new task for a customer. The requester is the creator.",
        parameters: [
          { name: "requesterId", type: "string", required: true },
          { name: "customerId", type: "string", required: true },
          { name: "title", type: "string", required: true },
          { name: "description", type: "string", required: false },
          { name: "assigneeId", type: "string", required: false },
        ],
        handler: async ({ requesterId, customerId, title, description, assigneeId }: { requesterId: string, customerId: string, title: string, description?: string, assigneeId?: string }) => {
          const task = await prisma.task.create({
            data: {
              title,
              description,
              status: 'PENDING',
              assigneeId,
              customerId,
              createdById: requesterId,
            },
          });
          return { task };
        },
      },
      // 9. Kullanıcıya ait tüm taskları ve istatistikleri getir
      {
        name: "get_user_task_stats",
        description: "Get all tasks and stats for a user.",
        parameters: [
          { name: "userId", type: "string", required: true },
        ],
        handler: async ({ userId }: { userId: string }) => {
          const tasks = await prisma.task.findMany({ where: { assigneeId: userId } });
          const total = tasks.length;
          const done = tasks.filter(t => t.status === 'DONE').length;
          const pending = tasks.filter(t => t.status === 'PENDING').length;
          return { total, done, pending, tasks };
        },
        
      },
      // 10. Sistemdeki toplam user ve admin sayısını getir
      {
        name: "get_user_and_admin_count",
        description: "Get the total number of users and admins in the system.",
        parameters: [],
        handler: async () => {
          const userCount = await prisma.user.count({ where: { role: 'USER' } });
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
          return {
            userCount,
            adminCount,
            message: `Sistemde ${userCount} user ve ${adminCount} admin var.`
          };
        },
      },

      {
        name: "get_all_tasks",
        description: "Get all tasks.",
        parameters: [
          
        ],
        handler: async () => {
          const total = await prisma.task.count();
          return { total };
        },
      },
    ] as any,
  });

   
  export const POST = async (req: NextRequest) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/api/copilotkit',
    });
   
    return handleRequest(req);
  };

