// runtime.ts
import { CopilotRuntime } from "@copilotkit/runtime";
import { handleCopilotRequest } from "./agent";
import { prisma } from "@/lib/prisma";

export const runtime = new CopilotRuntime({
    actions: () => [
      // 🤖 AI Agent for email/message processing with intelligent due date calculation
      {
        name: "ai_process_client_message",
        description: "AI-powered analysis of client emails/messages. REQUIRES customer to be specified via mention system. Cannot create tasks without proper customer selection.",
        parameters: [
          { name: "message", type: "string", required: true, description: "Client email or message content to analyze" },
          { name: "userId", type: "string", required: true, description: "ID of the user processing the message" },
          { name: "customerId", type: "string", required: true, description: "REQUIRED: Customer ID selected via mention system - tasks cannot be created without this" },
          { name: "autoApprove", type: "boolean", required: false, description: "Auto-approve task creation (default: false for manual approval)" },
        ],
        handler: async ({ message, userId, customerId, autoApprove = false }: { message: string, userId: string, customerId: string, autoApprove?: boolean }) => {
          console.log(`🎯 CopilotKit AI Agent called: ${message.substring(0, 50)}...`);
          
          try {
            // UUID validation
            if (!userId || userId.trim() === '') {
              return {
                success: false,
                error: "Invalid user ID provided"
              };
            }

            // Customer ID is now required
            if (!customerId || customerId.trim() === '') {
              return {
                success: false,
                error: "❌ Customer selection required",
                message: "🏢 **Customer Seçimi Gerekli**\n\nLütfen önce bir customer seçin:\n\n1. `/customers` yazarak customer listesini görün\n2. `@CustomerName` şeklinde mention edin\n3. Sonra mesajınızı tekrar gönderin\n\n💡 **Örnek:** `@Manufacturing United için Q4 finansal rapor hazırlanması gerekiyor`",
                requiresCustomerSelection: true
              };
            }

            // Verify customer exists
            const customer = await prisma.customer.findUnique({
              where: { id: customerId }
            });

            if (!customer) {
              return {
                success: false,
                error: "Selected customer not found",
                message: "❌ Seçilen customer bulunamadı. Lütfen geçerli bir customer seçin."
              };
            }

            const result = await handleCopilotRequest(message, userId);
            
            if (result.pendingApproval && result.taskSuggestion && autoApprove) {
              // Auto-approve mode için direkt task oluştur
              const { createTaskTool } = await import("./tools");
              
              const taskResult = await createTaskTool.invoke({
                taskName: result.taskSuggestion.taskName,
                taskDescription: result.taskSuggestion.taskDescription,
                assigneeIdentifier: result.taskSuggestion.assigneeId, // Use ID instead of name
                assigneeType: "id", // Use ID type
                customerIdentifier: customerId,
                customerType: "id",
                createdById: userId,
                dueDate: result.taskSuggestion.extractedDueDate,
                useOptimalAssignment: !result.taskSuggestion.assigneeId // Only use optimal if no specific ID provided
              });
              
              if (taskResult && taskResult.success) {
                return {
                  success: true,
                  action: "task_created",
                  task: taskResult.task,
                  message: `✅ Task otomatik oluşturuldu: "${taskResult.task.title}"\n👤 Atanan: ${taskResult.task.assignee?.name || taskResult.task.assignee?.email}\n🏢 Customer: ${customer.name}`,
                  suggestion: result.taskSuggestion
                };
              } else {
                return {
                  success: false,
                  error: taskResult?.error || "Task creation failed",
                  suggestion: result.taskSuggestion
                };
              }
            }
            
            if (result.pendingApproval && result.taskSuggestion) {
              // Add customer info to suggestion
              result.taskSuggestion.customerId = customerId;
              result.taskSuggestion.customerName = customer.name;
              
              return {
                success: true,
                action: "approval_needed",
                suggestion: result.taskSuggestion,
                message: `🤖 **AI Task Önerisi hazırlandı:**\n\n📝 **${result.taskSuggestion.taskName}**\n👤 Atanacak: ${result.taskSuggestion.assigneeName || 'AI optimal seçim yapacak'}\n🏢 Customer: ${customer.name}\n⏰ Due Date: ${result.taskSuggestion.extractedDueDate || 'Belirlenmedi'}\n\n✅ Onaylamak için **approve_ai_task** action'ını kullanın`,
                approvalPrompt: "Bu task'ı onaylayıp oluşturmak ister misiniz?"
              };
            }
            
            // If no task suggestion but successful analysis
            if (result.success && result.response) {
              return {
                success: true,
                response: `📋 **Mesaj Analizi Tamamlandı**\n\n${result.response}\n\n🏢 **Customer:** ${customer.name}\n\n💡 Bu mesajdan bir task oluşturmak isterseniz, lütfen daha spesifik bilgiler verin veya 'task oluştur' diye belirtin.`,
                analysis: "Message analyzed but no task created"
              };
            }
            
            return {
              success: true,
              response: `📋 **Mesajınız alındı ve analiz edildi.**\n\n🏢 **Customer:** ${customer.name}\n\nMesajınızı inceledim ancak belirli bir task önerisi oluşturamadım. \n\n🎯 **Task oluşturmak için şunları deneyin:**\n• "Task oluştur: [açıklama]" formatında yazın\n• Deadline belirtin (örn: "15 Ocak'a kadar")\n• Önem derecesi belirtin (acil, normal, düşük)\n\n💭 **Örnek:** "${customer.name} için P&L raporu hazırlanması gerekiyor, 15 Ocak deadline'ı var, acil"`,
              analysis: "Message received but insufficient information for task creation"
            };

          } catch (error) {
            console.error("❌ AI Agent error:", error);
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error occurred"
            };
          }
        },
      },
      
      // 📋 Manual task approval action
      {
        name: "approve_ai_task",
        description: "Approve or reject an AI-suggested task",
        parameters: [
          { name: "originalMessage", type: "string", required: true, description: "Original message that generated the suggestion" },
          { name: "userId", type: "string", required: true, description: "ID of the user making the approval" },
          { name: "customerId", type: "string", required: true, description: "Customer ID for the task" },
          { name: "approved", type: "boolean", required: true, description: "Whether to approve (true) or reject (false) the task" },
          { name: "taskSuggestion", type: "object", required: false, description: "Task suggestion object with customer info" },
        ],
        handler: async ({ originalMessage, userId, customerId, approved, taskSuggestion }: { originalMessage: string, userId: string, customerId: string, approved: boolean, taskSuggestion?: any }) => {
          if (!approved) {
            return {
              success: true,
              action: "task_rejected",
              message: "❌ Task önerisi reddedildi"
            };
          }

          try {
            // UUID validation
            if (!userId || userId.trim() === '') {
              return {
                success: false,
                error: "Invalid user ID provided"
              };
            }

            if (!customerId || customerId.trim() === '') {
              return {
                success: false,
                error: "Customer ID required for task approval"
              };
            }

            // Verify customer exists
            const customer = await prisma.customer.findUnique({
              where: { id: customerId }
            });

            if (!customer) {
              return {
                success: false,
                error: "Customer not found"
              };
            }

            // If we have taskSuggestion from frontend, use it
            let finalTaskSuggestion = taskSuggestion;
            
            // If not, re-analyze the message
            if (!finalTaskSuggestion) {
              const analysisResult = await handleCopilotRequest(originalMessage, userId);
              if (analysisResult.taskSuggestion) {
                finalTaskSuggestion = analysisResult.taskSuggestion;
              } else {
                return {
                  success: false,
                  error: "Could not analyze message for task creation"
                };
              }
            }

            // Create the task using createTaskTool
            const { createTaskTool } = await import("./tools");
            
            const taskResult = await createTaskTool.invoke({
              taskName: finalTaskSuggestion.taskName,
              taskDescription: finalTaskSuggestion.taskDescription,
              assigneeIdentifier: finalTaskSuggestion.assigneeId, // Use ID instead of name
              assigneeType: "id", // Use ID type
              customerIdentifier: customerId,
              customerType: "id",
              createdById: userId,
              dueDate: finalTaskSuggestion.extractedDueDate,
              useOptimalAssignment: !finalTaskSuggestion.assigneeId // Only use optimal if no specific ID provided
            });
            
            if (taskResult && taskResult.success) {
              return {
                success: true,
                action: "task_created",
                task: taskResult.task,
                message: `✅ Task onaylandı ve oluşturuldu: "${taskResult.task.title}"\n👤 Atanan: ${taskResult.task.assignee?.name || taskResult.task.assignee?.email}\n🏢 Customer: ${customer.name}`
              };
            } else {
              return {
                success: false,
                message: "❌ Task onaylandı ama oluşturulamadı",
                error: taskResult?.error || "Unknown error during task creation"
              };
            }

          } catch (error) {
            console.error("❌ Task approval error:", error);
            return {
              success: false,
              message: "❌ Task onaylama sırasında hata oluştu",
              error: error instanceof Error ? error.message : "Unknown error"
            };
          }
        },
      },

      // 📊 Get team workloads for UI display with skills
      {
        name: "get_team_workload_summary",
        description: "Get current team workload summary with skills for display",
        parameters: [],
        handler: async () => {
          const users = await prisma.user.findMany({
            include: {
              userSkills: {
                include: {
                  skill: true
                }
              },
              assignedTasks: {
                where: {
                  status: { in: ["PENDING", "IN_PROGRESS", "IN_REVIEW"] }
                }
              }
            }
          });
          
          const workloads = users.map(user => {
            const openTasks = user.assignedTasks.length;
            const indicator = openTasks === 0 ? "🟢" : openTasks < 3 ? "🟡" : "🔴";
            const topSkills = user.userSkills
              .sort((a, b) => b.level - a.level)
              .slice(0, 3)
              .map(us => `${us.skill.name}(${us.level})`)
              .join(', ');
            
            return { 
              id: user.id,
              name: user.name || user.email,
              email: user.email,
              role: user.role,
              openTasks,
              indicator,
              status: openTasks === 0 ? "Available" : openTasks < 3 ? "Moderate" : "Heavy",
              topSkills: topSkills || "No skills defined",
              skillCount: user.userSkills.length
            };
          });
          
          return { 
            workloads,
            summary: `Team Workload: ${workloads.map(w => `${w.indicator} ${w.name}: ${w.openTasks} tasks`).join(", ")}`
          };
        },
      },

      // 🎯 Skill-based user recommendation
      {
        name: "recommend_users_for_task",
        description: "Get user recommendations based on task requirements and skills",
        parameters: [
          { name: "taskDescription", type: "string", required: true, description: "Description of the task to analyze" },
          { name: "requiredSkills", type: "array", required: false, description: "Specific skills required (optional)" }
        ],
        handler: async ({ taskDescription, requiredSkills }: { taskDescription: string, requiredSkills?: string[] }) => {
          const { selectOptimalUserTool } = await import("./tools");
          
          try {
            const recommendation = await selectOptimalUserTool.invoke({
              taskDescription,
              requiredSkills
            });
            
            return {
              success: true,
              recommendation: recommendation.selectedUser,
              reasoning: recommendation.reasoning,
              alternatives: recommendation.alternatives,
              message: `Önerilen kullanıcı: ${recommendation.selectedUser.name} (Skor: ${recommendation.reasoning.finalScore})`
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Recommendation failed"
            };
          }
        },
      },
      
      // 📋 Get customers list for mention system
      {
        name: "get_customers_list",
        description: "Get list of all customers for mention system and selection. Essential for customer selection before task creation.",
        parameters: [
          { name: "searchTerm", type: "string", required: false, description: "Optional search term to filter customers" }
        ],
        handler: async ({ searchTerm }: { searchTerm?: string } = {}) => {
          try {
            const whereClause = searchTerm 
              ? { 
                  OR: [
                    { name: { contains: searchTerm, mode: "insensitive" as const } },
                    { description: { contains: searchTerm, mode: "insensitive" as const } }
                  ]
                }
              : {};

            const customers = await prisma.customer.findMany({
              where: whereClause,
              select: {
                id: true,
                name: true,
                description: true,
                _count: {
                  select: {
                    tasks: true
                  }
                }
              },
              orderBy: [
                { name: 'asc' }
              ],
              take: 50 // Limit to prevent too many results
            });

            const customerList = customers.map(customer => ({
              id: customer.id,
              name: customer.name,
              description: customer.description,
              taskCount: customer._count.tasks,
              mentionFormat: `@${customer.name}`
            }));

            return {
              success: true,
              customers: customerList,
              total: customers.length,
              message: searchTerm 
                ? `"${searchTerm}" için ${customers.length} customer bulundu`
                : `${customers.length} customer listelendi`,
              instructions: "Mention format: @CustomerName şeklinde kullanın. Task oluşturmadan önce mutlaka bir customer seçin."
            };
          } catch (error) {
            console.error("Error fetching customers:", error);
            return {
              success: false,
              error: error instanceof Error ? error.message : "Failed to fetch customers",
              customers: [],
              message: "Customer listesi alınamadı. Lütfen tekrar deneyin."
            };
          }
        },
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
          // UUID validation
          if (!requesterId || requesterId.trim() === '') {
            return { error: 'Invalid requesterId: cannot be empty' };
          }
          
          if (!assigneeId || assigneeId.trim() === '') {
            return { error: 'Invalid assigneeId: cannot be empty' };
          }
          
          if (!customerId || customerId.trim() === '') {
            return { error: 'Invalid customerId: cannot be empty' };
          }

          const task = await prisma.task.create({
            data: {
              title,
              description,
              status: 'PENDING',
              assigneeId,
              customerId,
              createdById: requesterId,
            },
            include: {
              assignee: { 
                select: { 
                  id: true, 
                  name: true, 
                  email: true,
                  userSkills: {
                    include: { skill: true }
                  }
                } 
              },
              customer: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true, email: true } }
            }
          });

          // Log activity
          await prisma.taskActivity.create({
            data: {
              taskId: task.id,
              actorId: requesterId,
              type: 'TASK_CREATED',
              metadata: { title, assignedTo: task.assignee?.name || task.assignee?.email }
            }
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
              activities: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                  actor: { select: { name: true, email: true } }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
          });
          return { tasks };
        },
      },
      {
        name: "get_tasks_with_username",
        description: "Get all tasks assigned to a user by name",
        parameters: [
          { name: "userName", type: "string", required: true, description: "Name of the user whose tasks to fetch" },
        ],
        handler: async ({ userName }: { userName: string }) => {
          const tasks = await prisma.task.findMany({
            where: { assignee: { name: { contains: userName, mode: "insensitive" } } },
            include: {
              customer: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true } },
              assignee: { 
                select: { 
                  id: true, 
                  name: true, 
                  email: true,
                  userSkills: {
                    include: { skill: true }
                  }
                } 
              }
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
              assignee: { 
                select: { 
                  id: true, 
                  name: true,
                  userSkills: {
                    include: { skill: true }
                  }
                } 
              },
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
              assignee: { 
                select: { 
                  id: true, 
                  name: true, 
                  email: true,
                  userSkills: {
                    include: { skill: true }
                  }
                } 
              },
              createdBy: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true } },
              activities: {
                orderBy: { createdAt: 'desc' },
                include: {
                  actor: { select: { name: true, email: true } }
                }
              },
              notes: {
                include: {
                  author: { select: { name: true, email: true } }
                }
              },
              tags: {
                include: { tag: true }
              }
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
        handler: async ({ requesterId, taskId, status }: { requesterId: string, taskId: string, status: any }) => {
          const task = await prisma.task.findUnique({ 
            where: { id: taskId }, 
            include: { createdBy: true } 
          });
          
          if (!task) return { error: 'Task not found' };
          if (task.createdById !== requesterId) return { error: 'Only creator can update status' };
          
          const updated = await prisma.task.update({ 
            where: { id: taskId }, 
            data: { status },
            include: {
              assignee: { select: { name: true, email: true } }
            }
          });

          // Log activity
          await prisma.taskActivity.create({
            data: {
              taskId,
              actorId: requesterId,
              type: 'STATUS_CHANGED',
              metadata: { oldStatus: task.status, newStatus: status }
            }
          });

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
          
          // Log before deletion
          await prisma.taskActivity.create({
            data: {
              taskId,
              actorId: requesterId,
              type: 'TASK_DELETED',
              metadata: { title: task.title }
            }
          });

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
          
          const updated = await prisma.task.update({ 
            where: { id: taskId }, 
            data: updateData,
            include: {
              assignee: { 
                select: { 
                  name: true, 
                  email: true,
                  userSkills: { include: { skill: true } }
                } 
              }
            }
          });

          // Log activity
          await prisma.taskActivity.create({
            data: {
              taskId,
              actorId: requesterId,
              type: 'TASK_UPDATED',
              metadata: updateData
            }
          });

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
          // UUID validation
          if (!requesterId || requesterId.trim() === '') {
            return { error: 'Invalid requesterId: cannot be empty' };
          }
          
          if (!customerId || customerId.trim() === '') {
            return { error: 'Invalid customerId: cannot be empty' };
          }

          // Prepare task data
          const taskData: any = {
            title,
            description,
            status: 'PENDING',
            customerId,
            createdById: requesterId,
          };

          // Only add assigneeId if it's a valid UUID
          if (assigneeId && assigneeId.trim() !== '') {
            taskData.assigneeId = assigneeId;
          }

          const task = await prisma.task.create({
            data: taskData,
            include: {
              assignee: { 
                select: { 
                  name: true, 
                  email: true,
                  userSkills: { include: { skill: true } }
                } 
              }
            }
          });

          // Log activity
          await prisma.taskActivity.create({
            data: {
              taskId: task.id,
              actorId: requesterId,
              type: 'TASK_CREATED',
              metadata: { title, customer: customerId }
            }
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
          const tasks = await prisma.task.findMany({ 
            where: { assigneeId: userId },
            include: {
              customer: { select: { name: true } }
            }
          });
          
          const total = tasks.length;
          const done = tasks.filter((t: any) => t.status === 'COMPLETED').length;
          const pending = tasks.filter((t: any) => t.status === 'PENDING').length;
          const inProgress = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
          const inReview = tasks.filter((t: any) => t.status === 'IN_REVIEW').length;
          
          return { 
            total, 
            done, 
            pending, 
            inProgress,
            inReview,
            tasks,
            productivity: total > 0 ? Math.round((done / total) * 100) : 0
          };
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
          const totalSkills = await prisma.skill.count();
          const totalUserSkills = await prisma.userSkill.count();
          
          return {
            userCount,
            adminCount,
            totalSkills,
            totalUserSkills,
            averageSkillsPerUser: userCount > 0 ? Math.round((totalUserSkills / userCount) * 10) / 10 : 0,
            message: `Sistemde ${userCount} user, ${adminCount} admin var. Toplam ${totalSkills} skill tanımlı.`
          };
        },
      },
      // 11. Tüm taskları getir
      {
        name: "get_all_tasks",
        description: "Get all tasks with summary.",
        parameters: [],
        handler: async () => {
          const total = await prisma.task.count();
          const statusCounts = await prisma.task.groupBy({
            by: ['status'],
            _count: true
          });
          
          const statusSummary = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count;
            return acc;
          }, {} as Record<string, number>);
          
          return { 
            total,
            statusSummary,
            message: `Toplam ${total} task. Dağılım: ${Object.entries(statusSummary).map(([status, count]) => `${status}: ${count}`).join(', ')}`
          };
        },
      },

      // 🔍 Advanced search and analytics
      {
        name: "get_team_workloads",
        description: "Ekibin her üyesinin açık görev sayısını ve skill analizi döner",
        parameters: [],
        handler: async () => {
          const users = await prisma.user.findMany({
            include: {
              userSkills: {
                include: { skill: true }
              },
              assignedTasks: {
                where: {
                  status: { in: ["PENDING", "IN_PROGRESS", "IN_REVIEW"] }
                }
              }
            }
          });
          
          const counts = users.map(user => ({
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            role: user.role,
            openTasks: user.assignedTasks.length,
            skills: user.userSkills.map(us => ({
              name: us.skill.name,
              category: us.skill.category,
              level: us.level
            })),
            avgSkillLevel: user.userSkills.length > 0 
              ? Math.round((user.userSkills.reduce((sum, us) => sum + us.level, 0) / user.userSkills.length) * 10) / 10
              : 0
          }));
          
          return { counts };
        },
      },
      {
        name: "get_company",
        description: "İlgili client iletişimi içinde geçen şirket adını alıp veritabanından getirir",
        parameters: [{ name: "companyName", type: "string", required: true }],
        handler: async ({ companyName }: { companyName: string }) => {
          const company = await prisma.customer.findFirst({
            where: { name: { contains: companyName, mode: "insensitive" } },
            include: {
              tasks: {
                include: {
                  assignee: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
              }
            }
          });
          
          return { 
            company,
            taskCount: company?.tasks.length || 0,
            message: company 
              ? `${company.name} müşterisi bulundu. ${company.tasks.length} task mevcut.`
              : `${companyName} müşterisi bulunamadı.`
          };
        },
      },
    ] as any,
  });
  