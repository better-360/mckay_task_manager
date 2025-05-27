import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const skills = [
  // Programming Skills
  { name: 'JavaScript', category: 'Programming', description: 'Modern JavaScript development' },
  { name: 'TypeScript', category: 'Programming', description: 'Typed JavaScript development' },
  { name: 'React', category: 'Programming', description: 'React.js frontend development' },
  { name: 'Node.js', category: 'Programming', description: 'Server-side JavaScript development' },
  { name: 'Python', category: 'Programming', description: 'Python programming language' },
  { name: 'Java', category: 'Programming', description: 'Java programming language' },
  { name: 'C#', category: 'Programming', description: '.NET development with C#' },
  { name: 'PHP', category: 'Programming', description: 'PHP web development' },

  // Database Skills
  { name: 'PostgreSQL', category: 'Database', description: 'PostgreSQL database management' },
  { name: 'MySQL', category: 'Database', description: 'MySQL database management' },
  { name: 'MongoDB', category: 'Database', description: 'NoSQL database with MongoDB' },
  { name: 'Redis', category: 'Database', description: 'In-memory data structure store' },

  // DevOps Skills
  { name: 'Docker', category: 'DevOps', description: 'Containerization with Docker' },
  { name: 'Kubernetes', category: 'DevOps', description: 'Container orchestration' },
  { name: 'AWS', category: 'DevOps', description: 'Amazon Web Services cloud platform' },
  { name: 'Azure', category: 'DevOps', description: 'Microsoft Azure cloud platform' },
  { name: 'CI/CD', category: 'DevOps', description: 'Continuous Integration/Deployment' },

  // Design Skills
  { name: 'UI/UX Design', category: 'Design', description: 'User interface and experience design' },
  { name: 'Figma', category: 'Design', description: 'Design tool for UI/UX' },
  { name: 'Adobe Photoshop', category: 'Design', description: 'Image editing and design' },
  { name: 'Adobe Illustrator', category: 'Design', description: 'Vector graphics design' },

  // Business Skills
  { name: 'Project Management', category: 'Business', description: 'Managing projects and teams' },
  { name: 'Agile/Scrum', category: 'Business', description: 'Agile project management methodology' },
  { name: 'Data Analysis', category: 'Business', description: 'Analyzing and interpreting data' },
  { name: 'Financial Analysis', category: 'Business', description: 'Financial data analysis and reporting' },

  // Language Skills
  { name: 'English', category: 'Language', description: 'English language proficiency' },
  { name: 'Turkish', category: 'Language', description: 'Turkish language proficiency' },
  { name: 'German', category: 'Language', description: 'German language proficiency' },
  { name: 'French', category: 'Language', description: 'French language proficiency' },

  // Marketing Skills
  { name: 'Digital Marketing', category: 'Marketing', description: 'Online marketing strategies' },
  { name: 'SEO', category: 'Marketing', description: 'Search Engine Optimization' },
  { name: 'Social Media Marketing', category: 'Marketing', description: 'Social media marketing strategies' },
  { name: 'Content Marketing', category: 'Marketing', description: 'Content creation and marketing' },

  // Finance Skills
  { name: 'Accounting', category: 'Finance', description: 'Financial accounting and bookkeeping' },
  { name: 'Tax Preparation', category: 'Finance', description: 'Tax return preparation and planning' },
  { name: 'Financial Planning', category: 'Finance', description: 'Financial planning and advisory' },
  { name: 'Audit', category: 'Finance', description: 'Financial auditing and compliance' },
]

async function main() {
  console.log('Seeding skills...')
  
  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    })
  }
  
  console.log('Skills seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 