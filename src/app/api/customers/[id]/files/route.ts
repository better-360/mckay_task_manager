import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const files = await prisma.customerFile.findMany({
      where: {
        customerId: id
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json(files)
  } catch (error) {
    console.error('Customer files GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { filename, url } = await req.json()

    if (!filename || !url) {
      return NextResponse.json(
        { error: 'Filename and URL are required' }, 
        { status: 400 }
      )
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' }, 
        { status: 404 }
      )
    }

    const file = await prisma.customerFile.create({
      data: {
        customerId: id,
        filename,
        url,
      }
    })

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    console.error('Customer files POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 