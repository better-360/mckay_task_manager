import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Global event emitter for real-time updates
class EventEmitter {
  private clients: Map<string, ReadableStreamDefaultController> = new Map()

  addClient(userId: string, controller: ReadableStreamDefaultController) {
    this.clients.set(userId, controller)
  }

  removeClient(userId: string) {
    this.clients.delete(userId)
  }

  emit(event: string, data: any, targetUserId?: string) {
    const message = `data: ${JSON.stringify({ event, data })}\n\n`
    
    if (targetUserId) {
      const client = this.clients.get(targetUserId)
      if (client) {
        try {
          client.enqueue(new TextEncoder().encode(message))
        } catch (error) {
          console.error('Error sending to specific client:', error)
          this.clients.delete(targetUserId)
        }
      }
    } else {
      // Broadcast to all clients
      for (const [userId, client] of this.clients.entries()) {
        try {
          client.enqueue(new TextEncoder().encode(message))
        } catch (error) {
          console.error('Error broadcasting to client:', error)
          this.clients.delete(userId)
        }
      }
    }
  }
}

export const eventEmitter = new EventEmitter()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const stream = new ReadableStream({
      start(controller) {
        // Add client to event emitter
        eventEmitter.addClient(session.user.id, controller)

        // Send initial connection message
        const message = `data: ${JSON.stringify({ 
          event: 'connected', 
          data: { message: 'Connected to real-time updates' } 
        })}\n\n`
        controller.enqueue(new TextEncoder().encode(message))

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            const heartbeatMessage = `data: ${JSON.stringify({ 
              event: 'heartbeat', 
              data: { timestamp: Date.now() } 
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(heartbeatMessage))
          } catch (error) {
            clearInterval(heartbeat)
            eventEmitter.removeClient(session.user.id)
          }
        }, 30000) // 30 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          eventEmitter.removeClient(session.user.id)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })
  } catch (error) {
    console.error('SSE Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 