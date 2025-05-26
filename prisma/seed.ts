import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo users
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('user123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      role: 'USER',
      emailVerified: new Date(),
    },
  })

  console.log('✅ Users created:', { admin: admin.email, user: user.email })

  // Create demo customers
  const customer1 = await prisma.customer.upsert({
    where: { id: 'customer-1' },
    update: {},
    create: {
      id: 'customer-1',
      name: 'Acme Corporation',
      description: 'Büyük teknoloji şirketi',
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { id: 'customer-2' },
    update: {},
    create: {
      id: 'customer-2',
      name: 'StartupXYZ',
      description: 'Yenilikçi startup şirketi',
    },
  })

  console.log('✅ Customers created:', { customer1: customer1.name, customer2: customer2.name })

  // Create demo tags
  const tag1 = await prisma.tag.upsert({
    where: { name: 'Urgent' },
    update: {},
    create: {
      name: 'Urgent',
      color: '#ef4444',
    },
  })

  const tag2 = await prisma.tag.upsert({
    where: { name: 'Bug' },
    update: {},
    create: {
      name: 'Bug',
      color: '#f59e0b',
    },
  })

  const tag3 = await prisma.tag.upsert({
    where: { name: 'Feature' },
    update: {},
    create: {
      name: 'Feature',
      color: '#10b981',
    },
  })

  console.log('✅ Tags created')

  // Create demo tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Website yeniden tasarımı',
      description: 'Ana sayfanın modern bir tasarımla yenilenmesi gerekiyor',
      status: 'PENDING',
      customerId: customer1.id,
      createdById: admin.id,
      assigneeId: user.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    },
  })

  const task2 = await prisma.task.create({
    data: {
      title: 'API dokümantasyonu',
      description: 'REST API için kapsamlı dokümantasyon hazırlanması',
      status: 'IN_PROGRESS',
      customerId: customer1.id,
      createdById: admin.id,
      assigneeId: user.id,
    },
  })

  const task3 = await prisma.task.create({
    data: {
      title: 'Mobil uygulama geliştirme',
      description: 'iOS ve Android için mobil uygulama geliştirilmesi',
      status: 'PENDING',
      customerId: customer2.id,
      createdById: user.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
    },
  })

  const task4 = await prisma.task.create({
    data: {
      title: 'Güvenlik testi',
      description: 'Sistemin güvenlik açıklarının test edilmesi',
      status: 'COMPLETED',
      customerId: customer2.id,
      createdById: admin.id,
      assigneeId: user.id,
    },
  })

  console.log('✅ Tasks created')

  // Add tags to tasks
  await prisma.taskTag.createMany({
    data: [
      { taskId: task1.id, tagId: tag1.id },
      { taskId: task1.id, tagId: tag3.id },
      { taskId: task2.id, tagId: tag3.id },
      { taskId: task4.id, tagId: tag2.id },
    ],
  })

  // Add some task notes
  await prisma.taskNote.createMany({
    data: [
      {
        taskId: task1.id,
        authorId: admin.id,
        content: 'Tasarım mockup\'ları hazırlandı, geliştirme başlayabilir.',
      },
      {
        taskId: task2.id,
        authorId: user.id,
        content: 'API endpoint\'lerinin %70\'i dokümante edildi.',
      },
      {
        taskId: task4.id,
        authorId: admin.id,
        content: 'Güvenlik testi tamamlandı, kritik açık bulunamadı.',
      },
    ],
  })

  console.log('✅ Task tags and notes created')

  console.log('🎉 Seeding completed successfully!')
  console.log('\nDemo accounts:')
  console.log('Admin: admin@example.com / admin123')
  console.log('User: user@example.com / user123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 