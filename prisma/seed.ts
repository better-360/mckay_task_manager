import { PrismaClient, Role, TaskStatus, ActivityType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (in order due to foreign key constraints)
  await prisma.taskActivity.deleteMany()
  await prisma.taskTag.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.taskNote.deleteMany()
  await prisma.task.deleteMany()
  await prisma.userSkill.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.customerFile.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleaned existing data')

  // 1. Create Skills
  console.log('📚 Creating skills...')
  const skills = await Promise.all([
    // Accounting Skills
    prisma.skill.create({
      data: {
        name: 'Financial Analysis',
        category: 'Accounting',
        description: 'Analyzing financial statements and reports'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Tax Preparation',
        category: 'Accounting',
        description: 'Preparing individual and business tax returns'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Audit',
        category: 'Accounting',
        description: 'Financial audit and compliance review'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'QuickBooks',
        category: 'Accounting Software',
        description: 'QuickBooks accounting software proficiency'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Excel',
        category: 'Software',
        description: 'Advanced Microsoft Excel skills'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Financial Reporting',
        category: 'Accounting',
        description: 'Creating financial reports and statements'
      }
    }),
    
    // Legal & Compliance Skills
    prisma.skill.create({
      data: {
        name: 'Legal Research',
        category: 'Legal',
        description: 'Legal research and case analysis'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Contract Review',
        category: 'Legal',
        description: 'Contract analysis and compliance'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Compliance',
        category: 'Legal',
        description: 'Regulatory compliance and risk management'
      }
    }),

    // Technical Skills
    prisma.skill.create({
      data: {
        name: 'Programming',
        category: 'Technical',
        description: 'Software development and programming'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'System Administration',
        category: 'Technical',
        description: 'IT system administration and maintenance'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Technical Support',
        category: 'Technical',
        description: 'Technical troubleshooting and user support'
      }
    }),

    // Management Skills
    prisma.skill.create({
      data: {
        name: 'Project Management',
        category: 'Management',
        description: 'Project planning and execution'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Documentation',
        category: 'Administrative',
        description: 'Technical and business documentation'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Communication',
        category: 'Soft Skills',
        description: 'Client communication and presentation'
      }
    }),
    prisma.skill.create({
      data: {
        name: 'Financial Planning',
        category: 'Accounting',
        description: 'Strategic financial planning and budgeting'
      }
    })
  ])

  // 2. Create Users with hashed passwords
  console.log('👥 Creating users...')
  const hashedPassword = await hash('password123', 12)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@mckaycpa.com',
        password: hashedPassword,
        role: Role.ADMIN,
        phoneNumber: '+1-555-0101',
        profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Emily Rodriguez',
        email: 'emily@mckaycpa.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1-555-0102',
        profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b5ac?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.create({
      data: {
        name: 'James Patterson',
        email: 'james@mckaycpa.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1-555-0103',
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Sarah Chen',
        email: 'sarah@mckaycpa.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1-555-0104',
        profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Michael Thompson',
        email: 'michael@mckaycpa.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1-555-0105',
        profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Jessica Williams',
        email: 'jessica@mckaycpa.com',
        password: hashedPassword,
        role: Role.USER,
        phoneNumber: '+1-555-0106',
        profilePicture: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
      }
    })
  ])

  // 3. Assign Skills to Users
  console.log('🎯 Assigning skills to users...')
  
  // Emily Rodriguez - Senior Tax Specialist
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[1].id, // Emily
        skillId: skills.find(s => s.name === 'Tax Preparation')!.id,
        level: 5,
        yearsOfExp: 8.5,
        description: 'Expert in individual and business tax preparation'
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[1].id,
        skillId: skills.find(s => s.name === 'Financial Analysis')!.id,
        level: 4,
        yearsOfExp: 6.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[1].id,
        skillId: skills.find(s => s.name === 'QuickBooks')!.id,
        level: 5,
        yearsOfExp: 7.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[1].id,
        skillId: skills.find(s => s.name === 'Excel')!.id,
        level: 4,
        yearsOfExp: 8.0
      }
    })
  ])

  // James Patterson - Legal & Compliance Expert
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[2].id, // James
        skillId: skills.find(s => s.name === 'Legal Research')!.id,
        level: 5,
        yearsOfExp: 12.0,
        description: 'Specialized in business law and regulatory compliance'
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[2].id,
        skillId: skills.find(s => s.name === 'Contract Review')!.id,
        level: 5,
        yearsOfExp: 10.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[2].id,
        skillId: skills.find(s => s.name === 'Compliance')!.id,
        level: 5,
        yearsOfExp: 12.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[2].id,
        skillId: skills.find(s => s.name === 'Documentation')!.id,
        level: 4,
        yearsOfExp: 8.0
      }
    })
  ])

  // Sarah Chen - Financial Analyst
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[3].id, // Sarah
        skillId: skills.find(s => s.name === 'Financial Analysis')!.id,
        level: 5,
        yearsOfExp: 7.0,
        description: 'Expert in financial modeling and analysis'
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[3].id,
        skillId: skills.find(s => s.name === 'Financial Reporting')!.id,
        level: 5,
        yearsOfExp: 6.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[3].id,
        skillId: skills.find(s => s.name === 'Excel')!.id,
        level: 5,
        yearsOfExp: 7.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[3].id,
        skillId: skills.find(s => s.name === 'Financial Planning')!.id,
        level: 4,
        yearsOfExp: 5.0
      }
    })
  ])

  // Michael Thompson - Technical Lead
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[4].id, // Michael
        skillId: skills.find(s => s.name === 'Programming')!.id,
        level: 5,
        yearsOfExp: 10.0,
        description: 'Full-stack developer and system architect'
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[4].id,
        skillId: skills.find(s => s.name === 'System Administration')!.id,
        level: 4,
        yearsOfExp: 8.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[4].id,
        skillId: skills.find(s => s.name === 'Technical Support')!.id,
        level: 5,
        yearsOfExp: 9.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[4].id,
        skillId: skills.find(s => s.name === 'Project Management')!.id,
        level: 3,
        yearsOfExp: 4.0
      }
    })
  ])

  // Jessica Williams - Audit Specialist
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[5].id, // Jessica
        skillId: skills.find(s => s.name === 'Audit')!.id,
        level: 5,
        yearsOfExp: 9.0,
        description: 'CPA with extensive audit experience'
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[5].id,
        skillId: skills.find(s => s.name === 'Financial Analysis')!.id,
        level: 4,
        yearsOfExp: 7.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[5].id,
        skillId: skills.find(s => s.name === 'Compliance')!.id,
        level: 4,
        yearsOfExp: 6.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[5].id,
        skillId: skills.find(s => s.name === 'Communication')!.id,
        level: 5,
        yearsOfExp: 9.0
      }
    })
  ])

  // Admin with general skills
  await Promise.all([
    prisma.userSkill.create({
      data: {
        userId: users[0].id, // Admin
        skillId: skills.find(s => s.name === 'Project Management')!.id,
        level: 5,
        yearsOfExp: 15.0
      }
    }),
    prisma.userSkill.create({
      data: {
        userId: users[0].id,
        skillId: skills.find(s => s.name === 'Communication')!.id,
        level: 5,
        yearsOfExp: 15.0
      }
    })
  ])

  // 4. Create Customers
  console.log('🏢 Creating customers...')
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Manufacturing United',
        description: 'Large manufacturing company with complex accounting needs'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'EcomFlow Solutions',
        description: 'E-commerce platform requiring sales tax compliance'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Chen\'s Restaurant Group',
        description: 'Restaurant chain with multiple locations'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'TechStart Inc',
        description: 'Technology startup needing financial planning'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Green Energy LLC',
        description: 'Renewable energy company with tax credit needs'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Local Medical Practice',
        description: 'Healthcare practice requiring specialized accounting'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Riverside Construction',
        description: 'Construction company with project-based accounting'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Digital Marketing Agency',
        description: 'Marketing agency with multiple client billing'
      }
    })
  ])

  // 5. Create Tags
  console.log('🏷️ Creating tags...')
  const tags = await Promise.all([
    prisma.tag.create({
      data: { name: 'Urgent', color: '#ef4444' }
    }),
    prisma.tag.create({
      data: { name: 'Tax', color: '#3b82f6' }
    }),
    prisma.tag.create({
      data: { name: 'Audit', color: '#8b5cf6' }
    }),
    prisma.tag.create({
      data: { name: 'Compliance', color: '#f59e0b' }
    }),
    prisma.tag.create({
      data: { name: 'Financial Reporting', color: '#10b981' }
    }),
    prisma.tag.create({
      data: { name: 'Year-End', color: '#6366f1' }
    }),
    prisma.tag.create({
      data: { name: 'Technical', color: '#64748b' }
    }),
    prisma.tag.create({
      data: { name: 'Legal', color: '#dc2626' }
    })
  ])

  // 6. Create Tasks
  console.log('📋 Creating tasks...')
  const tasks = []

  // Task 1: Q4 Financial Reports (Manufacturing United)
  const task1 = await prisma.task.create({
    data: {
      title: 'Q4 Financial Reports Preparation',
      description: 'Prepare comprehensive Q4 financial reports including P&L, balance sheet, and cash flow statement for loan renewal meeting with First National Bank scheduled for January 15th.',
      status: TaskStatus.IN_PROGRESS,
      assigneeId: users[3].id, // Sarah Chen - Financial Analyst
      customerId: customers[0].id, // Manufacturing United
      createdById: users[0].id, // Admin
      dueDate: new Date('2025-01-13T17:00:00Z')
    }
  })
  tasks.push(task1)

  // Task 2: Sales Tax Registration (EcomFlow Solutions)
  const task2 = await prisma.task.create({
    data: {
      title: 'Texas Sales Tax Registration & Filing',
      description: 'Handle Texas sales tax registration and file back returns for EcomFlow Solutions. Client received notice from Texas Comptroller. Approximately $47,000 in Texas sales since November.',
      status: TaskStatus.PENDING,
      assigneeId: users[1].id, // Emily Rodriguez - Tax Specialist
      customerId: customers[1].id, // EcomFlow Solutions
      createdById: users[0].id,
      dueDate: new Date('2025-01-10T17:00:00Z')
    }
  })
  tasks.push(task2)

  // Task 3: Payroll Setup (Chen's Restaurant Group)
  const task3 = await prisma.task.create({
    data: {
      title: 'New Location Payroll Setup',
      description: 'Set up payroll system for Chen\'s Restaurant Group new location in Downtown Portland. 15 employees starting January 6th.',
      status: TaskStatus.PENDING,
      assigneeId: users[1].id, // Emily Rodriguez
      customerId: customers[2].id, // Chen's Restaurant Group
      createdById: users[0].id,
      dueDate: new Date('2025-01-06T12:00:00Z')
    }
  })
  tasks.push(task3)

  // Task 4: R&D Tax Credit Analysis (TechStart Inc)
  const task4 = await prisma.task.create({
    data: {
      title: 'R&D Tax Credit Analysis',
      description: 'Analyze TechStart Inc\'s software development expenses for potential R&D tax credits. Review 2024 development costs and documentation.',
      status: TaskStatus.PENDING,
      assigneeId: users[1].id, // Emily Rodriguez
      customerId: customers[3].id, // TechStart Inc
      createdById: users[0].id,
      dueDate: new Date('2025-02-15T17:00:00Z')
    }
  })
  tasks.push(task4)

  // Task 5: Annual Audit Preparation (Green Energy LLC)
  const task5 = await prisma.task.create({
    data: {
      title: 'Annual Audit Preparation',
      description: 'Prepare Green Energy LLC for their annual audit. Organize financial records, reconcile accounts, and prepare supporting documentation.',
      status: TaskStatus.PENDING,
      assigneeId: users[5].id, // Jessica Williams - Audit Specialist
      customerId: customers[4].id, // Green Energy LLC
      createdById: users[0].id,
      dueDate: new Date('2025-03-01T17:00:00Z')
    }
  })
  tasks.push(task5)

  // Task 6: QuickBooks Setup (Local Medical Practice)
  const task6 = await prisma.task.create({
    data: {
      title: 'QuickBooks Integration & Training',
      description: 'Set up QuickBooks Online for Local Medical Practice, configure chart of accounts for healthcare industry, and provide staff training.',
      status: TaskStatus.IN_PROGRESS,
      assigneeId: users[4].id, // Michael Thompson - Technical Lead
      customerId: customers[5].id, // Local Medical Practice
      createdById: users[0].id,
      dueDate: new Date('2025-01-20T17:00:00Z')
    }
  })
  tasks.push(task6)

  // Task 7: Contract Review (Riverside Construction)
  const task7 = await prisma.task.create({
    data: {
      title: 'Construction Contract Review',
      description: 'Review new construction contracts for Riverside Construction. Analyze payment terms, liability clauses, and compliance requirements.',
      status: TaskStatus.PENDING,
      assigneeId: users[2].id, // James Patterson - Legal Expert
      customerId: customers[6].id, // Riverside Construction
      createdById: users[0].id,
      dueDate: new Date('2025-01-25T17:00:00Z')
    }
  })
  tasks.push(task7)

  // Task 8: Monthly Financial Reports (Digital Marketing Agency)
  const task8 = await prisma.task.create({
    data: {
      title: 'December Financial Reports',
      description: 'Prepare December monthly financial reports for Digital Marketing Agency including client billing analysis and expense categorization.',
      status: TaskStatus.COMPLETED,
      assigneeId: users[3].id, // Sarah Chen
      customerId: customers[7].id, // Digital Marketing Agency
      createdById: users[0].id,
      dueDate: new Date('2025-01-05T17:00:00Z')
    }
  })
  tasks.push(task8)

  // 7. Add Task Tags
  console.log('🔖 Adding task tags...')
  await Promise.all([
    // Task 1 tags
    prisma.taskTag.create({
      data: {
        taskId: task1.id,
        tagId: tags.find(t => t.name === 'Financial Reporting')!.id
      }
    }),
    prisma.taskTag.create({
      data: {
        taskId: task1.id,
        tagId: tags.find(t => t.name === 'Year-End')!.id
      }
    }),
    
    // Task 2 tags
    prisma.taskTag.create({
      data: {
        taskId: task2.id,
        tagId: tags.find(t => t.name === 'Tax')!.id
      }
    }),
    prisma.taskTag.create({
      data: {
        taskId: task2.id,
        tagId: tags.find(t => t.name === 'Urgent')!.id
      }
    }),
    prisma.taskTag.create({
      data: {
        taskId: task2.id,
        tagId: tags.find(t => t.name === 'Compliance')!.id
      }
    }),

    // Task 3 tags
    prisma.taskTag.create({
      data: {
        taskId: task3.id,
        tagId: tags.find(t => t.name === 'Urgent')!.id
      }
    }),

    // Task 4 tags
    prisma.taskTag.create({
      data: {
        taskId: task4.id,
        tagId: tags.find(t => t.name === 'Tax')!.id
      }
    }),

    // Task 5 tags
    prisma.taskTag.create({
      data: {
        taskId: task5.id,
        tagId: tags.find(t => t.name === 'Audit')!.id
      }
    }),

    // Task 6 tags
    prisma.taskTag.create({
      data: {
        taskId: task6.id,
        tagId: tags.find(t => t.name === 'Technical')!.id
      }
    }),

    // Task 7 tags
    prisma.taskTag.create({
      data: {
        taskId: task7.id,
        tagId: tags.find(t => t.name === 'Legal')!.id
      }
    }),

    // Task 8 tags
    prisma.taskTag.create({
      data: {
        taskId: task8.id,
        tagId: tags.find(t => t.name === 'Financial Reporting')!.id
      }
    })
  ])

  // 8. Create Task Notes
  console.log('📝 Creating task notes...')
  await Promise.all([
    prisma.taskNote.create({
      data: {
        taskId: task1.id,
        authorId: users[3].id, // Sarah Chen
        content: 'Started working on the Q4 financials. Will need to coordinate with the client to get the latest bank statements and accounts receivable details.'
      }
    }),
    prisma.taskNote.create({
      data: {
        taskId: task2.id,
        authorId: users[1].id, // Emily Rodriguez
        content: 'Reviewed the Texas Comptroller notice. We need to register immediately and file returns for November and December. Client should gather all Texas sales records.'
      }
    }),
    prisma.taskNote.create({
      data: {
        taskId: task6.id,
        authorId: users[4].id, // Michael Thompson
        content: 'QuickBooks setup is 70% complete. Configured the chart of accounts for healthcare practice. Training session scheduled for next week.'
      }
    }),
    prisma.taskNote.create({
      data: {
        taskId: task8.id,
        authorId: users[3].id, // Sarah Chen
        content: 'December financial reports completed and submitted to client. Revenue was up 15% compared to November.'
      }
    })
  ])

  // 9. Create Task Activities
  console.log('📊 Creating task activities...')
  await Promise.all([
    // Task 1 activities
    prisma.taskActivity.create({
      data: {
        taskId: task1.id,
        actorId: users[0].id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: 'Q4 Financial Reports Preparation', assignedTo: 'Sarah Chen' }
      }
    }),
    prisma.taskActivity.create({
      data: {
        taskId: task1.id,
        actorId: users[3].id,
        type: ActivityType.STATUS_CHANGED,
        metadata: { oldStatus: 'PENDING', newStatus: 'IN_PROGRESS' },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    }),

    // Task 2 activities
    prisma.taskActivity.create({
      data: {
        taskId: task2.id,
        actorId: users[0].id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: 'Texas Sales Tax Registration & Filing', assignedTo: 'Emily Rodriguez' }
      }
    }),
    prisma.taskActivity.create({
      data: {
        taskId: task2.id,
        actorId: users[0].id,
        type: ActivityType.TAG_ADDED,
        metadata: { tagName: 'Urgent' },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    }),

    // Task 6 activities
    prisma.taskActivity.create({
      data: {
        taskId: task6.id,
        actorId: users[0].id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: 'QuickBooks Integration & Training', assignedTo: 'Michael Thompson' }
      }
    }),
    prisma.taskActivity.create({
      data: {
        taskId: task6.id,
        actorId: users[4].id,
        type: ActivityType.STATUS_CHANGED,
        metadata: { oldStatus: 'PENDING', newStatus: 'IN_PROGRESS' },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    }),

    // Task 8 activities (completed task)
    prisma.taskActivity.create({
      data: {
        taskId: task8.id,
        actorId: users[0].id,
        type: ActivityType.TASK_CREATED,
        metadata: { title: 'December Financial Reports', assignedTo: 'Sarah Chen' }
      }
    }),
    prisma.taskActivity.create({
      data: {
        taskId: task8.id,
        actorId: users[3].id,
        type: ActivityType.STATUS_CHANGED,
        metadata: { oldStatus: 'PENDING', newStatus: 'IN_PROGRESS' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    }),
    prisma.taskActivity.create({
      data: {
        taskId: task8.id,
        actorId: users[3].id,
        type: ActivityType.STATUS_CHANGED,
        metadata: { oldStatus: 'IN_PROGRESS', newStatus: 'COMPLETED' },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    })
  ])

  // 10. Create some Customer Files
  console.log('📁 Creating customer files...')
  await Promise.all([
    prisma.customerFile.create({
      data: {
        customerId: customers[0].id, // Manufacturing United
        filename: 'Q3_Financial_Statements.pdf',
        url: '/uploads/manufacturing_united/Q3_Financial_Statements.pdf'
      }
    }),
    prisma.customerFile.create({
      data: {
        customerId: customers[1].id, // EcomFlow Solutions
        filename: 'Texas_Sales_Records_Nov_Dec.xlsx',
        url: '/uploads/ecomflow/Texas_Sales_Records_Nov_Dec.xlsx'
      }
    }),
    prisma.customerFile.create({
      data: {
        customerId: customers[2].id, // Chen's Restaurant Group
        filename: 'Employee_Information_Portland.pdf',
        url: '/uploads/chens_restaurant/Employee_Information_Portland.pdf'
      }
    })
  ])

  console.log('✅ Database seeded successfully!')
  console.log('\n📊 Seed Summary:')
  console.log(`👥 Users: ${users.length}`)
  console.log(`📚 Skills: ${skills.length}`)
  console.log(`🏢 Customers: ${customers.length}`)
  console.log(`📋 Tasks: ${tasks.length}`)
  console.log(`🏷️ Tags: ${tags.length}`)
  console.log('\n🔐 Login credentials:')
  console.log('Email: admin@mckaycpa.com')
  console.log('Password: password123')
  console.log('\nAll users have the same password: password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 