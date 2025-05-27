import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { OpenAI } from 'openai';


// Helper functions for task analysis and assignment
async function analyzeMessageForTask(message: string) {
  // LLM ile mesaj analizi
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a task analysis expert. Analyze the given message and extract task information.

Task Types:
- financial: P&L, balance sheet, financial reports, accounting, budget, revenue, expenses, audit
- legal: contracts, agreements, legal documents, compliance, regulations, terms
- technical: system issues, software, development, bugs, IT support, infrastructure
- administrative: meetings, scheduling, documentation, reports, general admin tasks
- general: anything that doesn't fit other categories

Priority Levels:
- high: urgent, asap, immediately, today, critical, emergency
- medium: soon, this week, important
- low: when possible, eventually, low priority

Return a JSON object with:
{
  "taskType": "one of: financial, legal, technical, administrative, general",
  "title": "clear, concise task title (max 100 chars)",
  "description": "full message content",
  "priority": "high, medium, or low",
  "dueDate": "ISO date string if date mentioned, null otherwise",
  "urgency": "same as priority",
  "extractedInfo": {
    "sender": "sender name if mentioned",
    "company": "company name if mentioned",
    "deadline": "any deadline mentioned in natural language"
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this message:\n\n${message}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    // Validate and set defaults
    return {
      taskType: analysis.taskType || 'general',
      title: analysis.title || 'New Task Request',
      description: message,
      priority: analysis.priority || 'medium',
      dueDate: analysis.dueDate ? parseLLMDate(analysis.dueDate) : null,
      urgency: analysis.priority || 'medium',
      extractedInfo: analysis.extractedInfo || {}
    };

  } catch (error) {
    console.error('LLM analysis error:', error);

    // Fallback to simple analysis if LLM fails
    return fallbackAnalysis(message);
  }
}

// Fallback function for when LLM fails
function fallbackAnalysis(message: string) {
  const taskTypes = {
    'financial': ['P&L', 'balance sheet', 'financial', 'accounting', 'budget', 'revenue'],
    'legal': ['contract', 'agreement', 'legal', 'compliance', 'regulation'],
    'technical': ['system', 'software', 'technical', 'development', 'bug'],
    'administrative': ['meeting', 'schedule', 'document', 'report', 'admin']
  };

  let detectedType = 'general';
  let priority = 'medium';

  // Task türünü belirle
  for (const [type, keywords] of Object.entries(taskTypes)) {
    if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      detectedType = type;
      break;
    }
  }

  // Aciliyet belirle
  const urgentKeywords = ['urgent', 'asap', 'immediately', 'today', 'now'];
  if (urgentKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    priority = 'high';
  }

  // Title ve description oluştur
  const lines = message.split('\n').filter(line => line.trim());
  const title = lines[0]?.substring(0, 100) || 'New Task Request';

  return {
    taskType: detectedType,
    title: title.replace(/^(Hey|Hi|Hello)[^,]*,?\s*/i, '').trim(),
    description: message,
    priority,
    dueDate: null,
    urgency: priority,
    extractedInfo: {}
  };
}

// LLM'den gelen tarih string'ini parse et
function parseLLMDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing LLM date:', error);
    return null;
  }
}

async function findAvailableUsers(taskType: string, dueDate?: string) {
  // Bu fonksiyon task türüne göre müsait kullanıcıları bulur
  // Gerçek implementasyonda adaptability API'sini kullanabilirsin

  try {
    // Önce tüm kullanıcıları al
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    // Task türüne göre filtreleme (örnek logic)
    const skillMap: Record<string, string[]> = {
      'financial': ['ADMIN'], // Sadece adminler finansal işleri yapabilir
      'legal': ['ADMIN'],
      'technical': ['USER', 'ADMIN'],
      'administrative': ['USER', 'ADMIN'],
      'general': ['USER', 'ADMIN']
    };

    const allowedRoles = skillMap[taskType] || ['USER', 'ADMIN'];
    const availableUsers = allUsers.filter(user => allowedRoles.includes(user.role));

    return availableUsers;
  } catch (error) {
    console.error('Error finding available users:', error);
    return [];
  }
}

function selectBestUser(availableUsers: any[], taskType: string, taskAnalysis?: any) {
  // Bu fonksiyon en uygun kullanıcıyı seçer
  // LLM ile daha akıllı seçim yapabiliriz

  if (availableUsers.length === 0) {
    throw new Error('No available users found for this task type');
  }

  // Tek kullanıcı varsa direkt döndür
  if (availableUsers.length === 1) {
    return availableUsers[0];
  }

  try {
    // LLM ile kullanıcı seçimi (opsiyonel)
    return selectUserWithLLM(availableUsers, taskType, taskAnalysis);
  } catch (error) {
    console.error('LLM user selection failed, using fallback:', error);
    return fallbackUserSelection(availableUsers, taskType);
  }
}

async function selectUserWithLLM(availableUsers: any[], taskType: string, taskAnalysis?: any) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a task assignment expert. Select the best user for a task based on:
1. Task type and complexity
2. User roles and capabilities
3. Current workload (if available)
4. Task urgency

Available users:
${availableUsers.map((user, index) =>
      `${index}: ${user.name || user.email} (Role: ${user.role})`
    ).join('\n')}

Task Type: ${taskType}
Task Analysis: ${JSON.stringify(taskAnalysis || {})}

Return a JSON object with:
{
  "selectedUserIndex": number,
  "reasoning": "brief explanation for the selection"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Select the best user for this task.' }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const selection = JSON.parse(response.choices[0].message.content || '{}');
    const selectedIndex = selection.selectedUserIndex;

    if (selectedIndex >= 0 && selectedIndex < availableUsers.length) {
      console.log('LLM user selection reasoning:', selection.reasoning);
      return availableUsers[selectedIndex];
    } else {
      throw new Error('Invalid user index from LLM');
    }
  } catch (error) {
    console.error('LLM user selection error:', error);
    throw error;
  }
}

function fallbackUserSelection(availableUsers: any[], taskType: string) {
  // Basit seçim: finansal işler için admin önceliği
  if (taskType === 'financial' || taskType === 'legal') {
    const admins = availableUsers.filter(user => user.role === 'ADMIN');
    if (admins.length > 0) {
      return admins[0]; // İlk admin'i seç
    }
  }

  // Diğer durumlarda ilk müsait kullanıcıyı seç
  return availableUsers[0];
}

async function findOrCreateCustomer(companyName: string, messageAnalysis?: any) {
  // Bu fonksiyon müşteriyi bulur veya oluşturur
  // LLM ile daha iyi company name extraction yapabiliriz

  try {
    let finalCompanyName = companyName;

    // LLM ile company name'i iyileştir
    if (messageAnalysis?.extractedInfo?.company) {
      finalCompanyName = messageAnalysis.extractedInfo.company;
    } else if (process.env.OPENAI_API_KEY) {
      try {
        finalCompanyName = await extractCompanyNameWithLLM(companyName, messageAnalysis);
      } catch (error) {
        console.error('LLM company extraction failed:', error);
        // Fallback to original name
      }
    }

    // Önce var olan müşteriyi ara
    let customer = await prisma.customer.findFirst({
      where: {
        name: {
          contains: finalCompanyName,
          mode: 'insensitive'
        }
      }
    });

    // Bulamazsa yeni oluştur
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: finalCompanyName,
          description: `Auto-created from message analysis: ${messageAnalysis?.extractedInfo?.sender || 'Unknown sender'}`
        }
      });
    }

    return customer;
  } catch (error) {
    console.error('Error finding/creating customer:', error);
    throw new Error('Failed to find or create customer');
  }
}

async function extractCompanyNameWithLLM(rawName: string, messageAnalysis?: any): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a company name extraction expert. Extract and clean company names from various formats.

Examples:
- "Chen's Restaurant Group" -> "Chen's Restaurant Group"
- "Mike (Acme Corp)" -> "Acme Corp"
- "john@techstartup.com" -> "TechStartup"
- "Sarah from Global Solutions Inc" -> "Global Solutions Inc"

Return a JSON object with:
{
  "companyName": "cleaned and properly formatted company name",
  "confidence": "high, medium, or low"
}`;

    const context = messageAnalysis ? JSON.stringify(messageAnalysis) : '';
    const userPrompt = `Extract company name from: "${rawName}"
      
Additional context: ${context}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const extraction = JSON.parse(response.choices[0].message.content || '{}');

    return extraction.companyName || rawName;
  } catch (error) {
    console.error('LLM company name extraction error:', error);
    return rawName;
  }
}

function parseDateString(dateStr: string): string | null {
  // Bu fonksiyon tarih string'ini parse eder
  // Gerçek implementasyonda daha sofistike date parsing kullanabilirsin

  try {
    const today = new Date();
    const lowerDate = dateStr.toLowerCase();

    if (lowerDate.includes('today')) {
      return today.toISOString();
    }

    if (lowerDate.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString();
    }

    if (lowerDate.includes('thursday')) {
      const thursday = new Date(today);
      const daysUntilThursday = (4 - today.getDay() + 7) % 7;
      thursday.setDate(today.getDate() + daysUntilThursday);
      return thursday.toISOString();
    }

    // Diğer tarih formatları için daha gelişmiş parsing eklenebilir
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

const serviceAdapter = new OpenAIAdapter(
  {
    model: 'gpt-4o-mini',
  }
);

const runtime = new CopilotRuntime({
  actions: () => [
    {
      name: "classify_task",
      description: "Gelen serbest metni analiz edip taskType, title, description ve mümkünse dueDate çıkarsın.",
      parameters: [
        { name: "message", type: "string", required: true }
      ],
      handler: async ({ message }: { message: string }) => {
        // İstersen basitçe LLM'e tekrar sorup JSON döndürebilirsin,
        // ama genellikle LLM planlama aşamasında doğrudan parametre çıkartıyor.
        return { taskType: "", title: "", description: "", dueDate: "" }
      }
    },
    {
      name: "get_available_users",
      description: "Belirli bir taskType ve tarih için müsait userId'leri döndürsün.",
      parameters: [
        { name: "taskType", type: "string", required: true },
        { name: "dueDate", type: "string", required: false }
      ],
      handler: async ({ taskType, dueDate }: { taskType: string, dueDate: string }) => {
        const resp = await fetch(
          `http://localhost:3000/api/adaptability?taskType=${taskType}&date=${dueDate}`
        );
        const { userIds } = await resp.json();
        return { userIds };
      }
    },
    // Yeni: Mesaj analizi ve otomatik task oluşturma
    {
      name: "analyze_and_create_task",
      description: "Analyze incoming message, determine task type, find available users, and create task automatically",
      parameters: [
        { name: "message", type: "string", required: true, description: "The incoming message to analyze" },
        { name: "senderId", type: "string", required: true, description: "ID of the message sender" },
        { name: "senderName", type: "string", required: false, description: "Name of the message sender" },
        { name: "senderCompany", type: "string", required: false, description: "Company of the message sender" }
      ],
      handler: async ({ message, senderId, senderName, senderCompany }: {
        message: string,
        senderId: string,
        senderName?: string,
        senderCompany?: string
      }) => {
        try {
          // 1. Mesajı analiz et ve task türünü belirle
          const taskAnalysis = await analyzeMessageForTask(message);

          // 2. Müsait kullanıcıları bul
          const availableUsers = await findAvailableUsers(taskAnalysis.taskType, taskAnalysis.dueDate || undefined);

          // 3. En uygun kullanıcıyı seç
          const selectedUser = selectBestUser(availableUsers, taskAnalysis.taskType, taskAnalysis);

          // 4. Customer'ı bul veya oluştur
          const customer = await findOrCreateCustomer(senderCompany || senderName || 'Unknown', taskAnalysis);

          // 5. Task'ı oluştur
          const task = await prisma.task.create({
            data: {
              title: taskAnalysis.title,
              description: taskAnalysis.description,
              status: 'PENDING',
              assigneeId: selectedUser.id,
              customerId: customer.id,
              createdById: senderId,
              dueDate: taskAnalysis.dueDate ? new Date(taskAnalysis.dueDate) : null,
            },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              customer: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true, email: true } }
            }
          });

          return {
            success: true,
            task,
            analysis: taskAnalysis,
            selectedUser,
            message: `Task "${taskAnalysis.title}" has been created and assigned to ${selectedUser.name}`
          };
        } catch (error) {
          console.error('Error in analyze_and_create_task:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      }
    },
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
    {
      name: "get_tasks_with_username",
      description: "Get all tasks assigned to a user. with user name",
      parameters: [
        { name: "userName", type: "string", required: true, description: "Name of the user whose tasks to fetch" },
      ],
      handler: async ({ userName }: { userName: string }) => {
        const tasks = await prisma.task.findMany({
          where: { assignee: { name: userName } },
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
        { name: "status", type: "enum", schema: { enum: ['PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'] }, required: true, description: "New status (PENDING, IN_PROGRESS, COMPLETED, etc.)" },
      ],
      handler: async ({ requesterId, taskId, status }: { requesterId: string, taskId: string, status: TaskStatus }) => {
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

        // Filter out undefined values and convert types
        const updateData: any = {};
        if (fields.title !== undefined) updateData.title = fields.title;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.assigneeId !== undefined) updateData.assigneeId = fields.assigneeId;
        if (fields.customerId !== undefined) updateData.customerId = fields.customerId;
        if (fields.status !== undefined) updateData.status = fields.status as any;
        if (fields.dueDate !== undefined) updateData.dueDate = new Date(fields.dueDate);
        const updated = await prisma.task.update({ where: { id: taskId }, data: updateData });
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
        const done = tasks.filter(t => t.status === 'COMPLETED').length;
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
    // 11. Tüm taskları getir
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

