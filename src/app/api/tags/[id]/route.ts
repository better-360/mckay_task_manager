import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Update a tag (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check if name is already taken by another tag
    const duplicateTag = await prisma.tag.findFirst({
      where: { 
        name,
        id: { not: id } // Exclude current tag
      }
    });

    if (duplicateTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      );
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        color
      }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a tag (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Use transaction to delete tag and all its relationships
    await prisma.$transaction(async (tx) => {
      // First delete all task-tag relationships
      await tx.taskTag.deleteMany({
        where: { tagId: id }
      });

      // Then delete the tag itself
      await tx.tag.delete({
        where: { id }
      });
    });

    return NextResponse.json({ 
      message: 'Tag and all its relationships deleted successfully',
      deletedTag: existingTag.name
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 