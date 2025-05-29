import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get tag usage count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Count how many tasks use this tag
    const usageCount = await prisma.taskTag.count({
      where: { tagId: id }
    });

    // Get sample tasks using this tag
    const sampleTasks = await prisma.taskTag.findMany({
      where: { tagId: id },
      take: 5,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            customer: {
              select: { name: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      count: usageCount,
      tagName: tag.name,
      sampleTasks: sampleTasks.map(tt => ({
        id: tt.task.id,
        title: tt.task.title,
        customer: tt.task.customer.name
      }))
    });
  } catch (error) {
    console.error('Error checking tag usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 