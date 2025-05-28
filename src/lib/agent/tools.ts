import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Helper function to normalize enum values
function normalizeUrgency(urgency: string): "LOW" | "MEDIUM" | "HIGH" {
  const normalized = urgency.toUpperCase();
  if (["LOW", "MEDIUM", "HIGH"].includes(normalized)) {
    return normalized as "LOW" | "MEDIUM" | "HIGH";
  }
  return "MEDIUM"; // default
}

// Helper function to normalize status values
function normalizeStatus(status: string): "PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED" {
  const normalized = status.toUpperCase().replace(/[-\s]/g, "_");
  if (["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELLED"].includes(normalized)) {
    return normalized as any;
  }
  return "PENDING"; // default
}

// Helper function to calculate task type from content
function analyzeTaskType(taskDescription: string): string[] {
  const content = taskDescription.toLowerCase();
  const skillsNeeded: string[] = [];
  
  // Financial keywords
  if (content.includes('p&l') || content.includes('balance sheet') || content.includes('financial') || 
      content.includes('accounting') || content.includes('budget') || content.includes('revenue')) {
    skillsNeeded.push('Accounting', 'Financial Analysis', 'Excel');
  }
  
  // Legal keywords  
  if (content.includes('contract') || content.includes('legal') || content.includes('compliance') ||
      content.includes('agreement') || content.includes('regulation')) {
    skillsNeeded.push('Legal Research', 'Contract Review');
  }
  
  // Technical keywords
  if (content.includes('system') || content.includes('software') || content.includes('development') ||
      content.includes('bug') || content.includes('technical') || content.includes('code')) {
    skillsNeeded.push('Programming', 'System Administration', 'Technical Support');
  }
  
  // Administrative keywords
  if (content.includes('meeting') || content.includes('schedule') || content.includes('documentation') ||
      content.includes('report') || content.includes('admin')) {
    skillsNeeded.push('Project Management', 'Documentation', 'Communication');
  }
  
  return skillsNeeded;
}

// Team member workload tool with skills
export const getTeamWorkloadsTool = tool(
  async () => {
    // Get all users with their skills and current workload
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

    const workloads = users.map(user => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
      openTasks: user.assignedTasks.length,
      skills: user.userSkills.map(us => ({
        name: us.skill.name,
        category: us.skill.category,
        level: us.level,
        yearsOfExp: us.yearsOfExp
      })),
      // Calculate workload score (lower is better)
      workloadScore: user.assignedTasks.length
    }));

    return { teamWorkloads: workloads };
  },
  {
    name: "get_team_workloads",
    description: "Get current open task count and skills for each team member to assist with optimal task assignment",
    schema: z.object({})
  }
);

// Smart user selection based on skills and workload
export const selectOptimalUserTool = tool(
  async ({ taskDescription, requiredSkills }: { taskDescription: string; requiredSkills?: string[] }) => {
    // Analyze task to determine required skills if not provided
    const skillsNeeded = requiredSkills || analyzeTaskType(taskDescription);
    
    // Get all users with their skills and workload
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

    // Calculate match scores for each user
    const userScores = users.map(user => {
      let skillMatchScore = 0;
      let totalSkillLevel = 0;
      
      // Calculate skill match
      skillsNeeded.forEach(neededSkill => {
        const userSkill = user.userSkills.find(us => 
          us.skill.name.toLowerCase().includes(neededSkill.toLowerCase()) ||
          neededSkill.toLowerCase().includes(us.skill.name.toLowerCase())
        );
        
        if (userSkill) {
          skillMatchScore += userSkill.level; // 1-5 scale
          totalSkillLevel += userSkill.level;
        }
      });
      
      const workloadPenalty = user.assignedTasks.length * 2; // Penalize high workload
      const roleBonusScore = user.role === 'ADMIN' ? 1 : 0; // Slight bonus for admins
      
      // Final score: higher skill match, lower workload = better score
      const finalScore = skillMatchScore + roleBonusScore - workloadPenalty;
      
      return {
        user,
        skillMatchScore,
        workloadScore: user.assignedTasks.length,
        finalScore,
        matchingSkills: user.userSkills
          .filter(us => skillsNeeded.some(needed => 
            us.skill.name.toLowerCase().includes(needed.toLowerCase()) ||
            needed.toLowerCase().includes(us.skill.name.toLowerCase())
          ))
          .map(us => ({ name: us.skill.name, level: us.level }))
      };
    });

    // Sort by final score (highest first)
    userScores.sort((a, b) => b.finalScore - a.finalScore);
    
    const bestMatch = userScores[0];
    
    return {
      selectedUser: {
        id: bestMatch.user.id,
        name: bestMatch.user.name || bestMatch.user.email,
        email: bestMatch.user.email,
        role: bestMatch.user.role
      },
      reasoning: {
        skillMatchScore: bestMatch.skillMatchScore,
        currentWorkload: bestMatch.workloadScore,
        finalScore: bestMatch.finalScore,
        matchingSkills: bestMatch.matchingSkills,
        requiredSkills: skillsNeeded
      },
      alternatives: userScores.slice(1, 3).map(score => ({
        user: {
          id: score.user.id,
          name: score.user.name || score.user.email,
          email: score.user.email
        },
        score: score.finalScore,
        workload: score.workloadScore
      }))
    };
  },
  {
    name: "select_optimal_user",
    description: "Select the optimal user for a task based on skills and current workload",
    schema: z.object({
      taskDescription: z.string().describe("The task description to analyze for required skills"),
      requiredSkills: z.array(z.string()).optional().describe("Specific skills required (if known)")
    })
  }
);

// Get user by email or ID tool (updated to match schema)
export const getUserTool = tool(
  async ({ identifier, identifierType }: { identifier: string, identifierType: "email" | "id" | "name" }) => {
    let user = null;
    
    switch (identifierType) {
      case "email":
        user = await prisma.user.findUnique({
          where: { email: identifier },
          include: {
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        });
        break;
      case "id":
        user = await prisma.user.findUnique({
          where: { id: identifier },
          include: {
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        });
        break;
      case "name":
        user = await prisma.user.findFirst({
          where: { name: { contains: identifier, mode: "insensitive" } },
          include: {
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        });
        break;
    }
    
    return { user };
  },
  {
    name: "get_user",
    description: "Find a user by their email, ID, or name with their skills",
    schema: z.object({
      identifier: z.string().describe("The email, ID, or name to search for"),
      identifierType: z.enum(["email", "id", "name"]).describe("Type of identifier being used")
    })
  }
);

// Get customer by name or ID tool  
export const getCustomerTool = tool(
  async ({ identifier, identifierType }: { identifier: string, identifierType: "name" | "id" }) => {
    let customer = null;
    
    if (identifierType === "id") {
      customer = await prisma.customer.findUnique({
        where: { id: identifier }
      });
    } else {
      customer = await prisma.customer.findFirst({
        where: { name: { contains: identifier, mode: "insensitive" } }
      });
    }
    
    return { customer };
  },
  {
    name: "get_customer",
    description: "Find a customer by their name or ID", 
    schema: z.object({
      identifier: z.string().describe("The customer name or ID to search for"),
      identifierType: z.enum(["name", "id"]).describe("Type of identifier being used")
    })
  }
);

// Create task tool with skill-based assignment
export const createTaskTool = tool(
  async ({ 
    taskName, 
    taskDescription, 
    assigneeIdentifier,
    assigneeType = "name",
    customerIdentifier,
    customerType = "name",
    createdById,
    dueDate,
    useOptimalAssignment = true
  }: { 
    taskName: string;
    taskDescription: string; 
    assigneeIdentifier?: string;
    assigneeType?: "email" | "id" | "name";
    customerIdentifier?: string;
    customerType?: "name" | "id";
    createdById: string;
    dueDate?: string | Date;
    useOptimalAssignment?: boolean;
  }) => {
    try {
      console.log("createTaskTool", {
        taskName,
        taskDescription,
        assigneeIdentifier,
        assigneeType,
        customerIdentifier,
        customerType,
        createdById,
        dueDate,
        useOptimalAssignment
      });

      // UUID validation for createdById
      if (!createdById || createdById.trim() === '') {
        return { error: 'Invalid createdById: cannot be empty' };
      }

      let assignee = null;
      
      // If optimal assignment is requested and no specific assignee provided
      if (useOptimalAssignment && !assigneeIdentifier) {
        const optimalResult = await selectOptimalUserTool.invoke({
          taskDescription: taskDescription
        });
        
        assignee = await prisma.user.findUnique({
          where: { id: optimalResult.selectedUser.id }
        });
        
        console.log(`🎯 Optimal assignment: ${optimalResult.selectedUser.name} (Score: ${optimalResult.reasoning.finalScore})`);
        console.log(`   Skills match: [${optimalResult.reasoning.matchingSkills.map(s => s.name).join(', ')}]`);
        console.log(`   Current workload: ${optimalResult.reasoning.currentWorkload} tasks`);
        
      } else if (assigneeIdentifier) {
        // Find specific assignee
        switch (assigneeType) {
          case "email":
            assignee = await prisma.user.findUnique({
              where: { email: assigneeIdentifier }
            });
            break;
          case "id":
            assignee = await prisma.user.findUnique({
              where: { id: assigneeIdentifier }
            });
            break;
          case "name":
          default:
            assignee = await prisma.user.findFirst({
              where: { name: { contains: assigneeIdentifier, mode: "insensitive" } }
            });
            break;
        }
      }
      
      if (!assignee) {
        return { error: `Assignee '${assigneeIdentifier}' not found or no optimal assignee available` };
      }

      // Find or create customer if provided
      let customerId = null;
      if (customerIdentifier) {
        let customer = null;
        
        if (customerType === "id") {
          customer = await prisma.customer.findUnique({
            where: { id: customerIdentifier }
          });
        } else {
          customer = await prisma.customer.findFirst({
            where: { name: { contains: customerIdentifier, mode: "insensitive" } }
          });
          
          // If customer not found, create new one
          if (!customer) {
            customer = await prisma.customer.create({
              data: { 
                name: customerIdentifier,
                description: `Auto-created customer from task: ${taskName}`
              }
            });
          }
        }
        
        customerId = customer?.id;
      }

      // If no customer provided, find or create default
      if (!customerId) {
        let defaultCustomer = await prisma.customer.findFirst({
          where: { name: "Default Customer" }
        });
        
        if (!defaultCustomer) {
          defaultCustomer = await prisma.customer.create({
            data: { 
              name: "Default Customer",
              description: "Default customer for unspecified tasks"
            }
          });
        }
        
        customerId = defaultCustomer.id;
      }

      // Final validation for required IDs
      if (!customerId || customerId.trim() === '') {
        return { error: 'Invalid customerId: cannot create task without valid customer' };
      }
      
      if (!assignee?.id || assignee.id.trim() === '') {
        return { error: 'Invalid assignee: cannot create task without valid assignee' };
      }

      // Process due date
      let parsedDueDate: Date | null = null;
      if (dueDate) {
        if (typeof dueDate === "string") {
          try {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate.getTime())) {
              parsedDueDate = null;
            }
          } catch (e) {
            parsedDueDate = null;
          }
        } else {
          parsedDueDate = dueDate;
        }
      }


      // Create task with proper JSON description
      const task = await prisma.task.create({
        data: {
          title: taskName,
          description: taskDescription, // Schema expects JSON but Prisma handles string to JSON conversion
          status: "PENDING",
          assigneeId: assignee.id,
          customerId: customerId,
          createdById: createdById,
          dueDate: parsedDueDate
        },
        include: {
          assignee: { 
            select: { 
              id: true, 
              name: true, 
              email: true,
              userSkills: {
                include: {
                  skill: true
                }
              }
            } 
          },
          customer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } }
        }
      });

      // Log task activity
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: createdById,
          type: 'TASK_CREATED',
          metadata: {
            title: taskName,
            assignedTo: assignee.name || assignee.email,
            customer: customerIdentifier || 'Default Customer'
          }
        }
      });

      console.log(`✅ Task created: "${taskName}" assigned to ${assignee.name || assignee.email}`);
      if (parsedDueDate) {
        console.log(`📅 Due date: ${parsedDueDate.toLocaleDateString()}`);
      }

      return { 
        success: true, 
        task,
        message: `Task "${taskName}" assigned to ${assignee.name || assignee.email}${parsedDueDate ? ` (Due: ${parsedDueDate.toLocaleDateString()})` : ''}` 
      };
    } catch (error) {
      console.error(`❌ Create task error:`, error);
      return { 
        error: error instanceof Error ? error.message : "Unknown task creation error" 
      };
    }
  },
  {
    name: "create_task",
    description: "Create a new task with intelligent skill-based assignment and proper schema compliance",
    schema: z.object({
      taskName: z.string().describe("The task name/title"),
      taskDescription: z.string().describe("Detailed task description"),
      assigneeIdentifier: z.string().optional().describe("Email, ID, or name of team member (leave empty for optimal auto-assignment)"),
      assigneeType: z.enum(["email", "id", "name"]).optional().describe("Type of assignee identifier"),
      customerIdentifier: z.string().optional().describe("Customer name or ID (if applicable)"),
      customerType: z.enum(["name", "id"]).optional().describe("Type of customer identifier"),
      createdById: z.string().describe("ID of the user creating the task"),
      dueDate: z.union([z.string(), z.date()]).optional().describe("Due date for the task"),
      useOptimalAssignment: z.boolean().optional().describe("Use AI to select optimal assignee based on skills (default: true)")
    })
  }
);

// Export updated tools array
export const tools = [getTeamWorkloadsTool, selectOptimalUserTool, getUserTool, getCustomerTool, createTaskTool];
