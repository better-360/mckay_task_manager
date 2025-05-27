import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface RealtimeEvent {
  event: string
  data: any
}

interface UseRealtimeOptions {
  onTaskCreated?: (task: any) => void
  onTaskUpdated?: (task: any) => void
  onTaskDeleted?: (data: { id: string; title: string }) => void
  onNoteAdded?: (data: { taskId: string; note: any }) => void
  onNoteUpdated?: (data: { taskId: string; note: any }) => void
  onNoteDeleted?: (data: { taskId: string; noteId: string }) => void
  onTaskActivity?: (data: { taskId: string; activity: any }) => void
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const optionsRef = useRef(options)

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) {
      return
    }

    try {
      const eventSource = new EventSource('/api/events')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('Real-time connection established')
        reconnectAttempts.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const { event: eventType, data }: RealtimeEvent = JSON.parse(event.data)

          switch (eventType) {
            case 'connected':
              console.log('Connected to real-time updates:', data.message)
              break
            case 'heartbeat':
              // Keep connection alive
              break
            case 'task_created':
              optionsRef.current.onTaskCreated?.(data)
              break
            case 'task_updated':
              optionsRef.current.onTaskUpdated?.(data)
              break
            case 'task_deleted':
              optionsRef.current.onTaskDeleted?.(data)
              break
            case 'note_added':
              optionsRef.current.onNoteAdded?.(data)
              break
            case 'note_updated':
              optionsRef.current.onNoteUpdated?.(data)
              break
            case 'note_deleted':
              optionsRef.current.onNoteDeleted?.(data)
              break
            case 'task_activity':
              optionsRef.current.onTaskActivity?.(data)
              break
            default:
              console.log('Unknown event type:', eventType, data)
          }
        } catch (error) {
          console.error('Error parsing real-time event:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('Real-time connection error:', error)
        eventSource.close()
        eventSourceRef.current = null

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000 // 1s, 2s, 4s, 8s, 16s
          reconnectAttempts.current++
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error('Max reconnection attempts reached')
        }
      }
    } catch (error) {
      console.error('Error creating EventSource:', error)
    }
  }, [session?.user?.id])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttempts.current = 0
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [session?.user?.id, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected: !!eventSourceRef.current,
    reconnect: connect,
    disconnect,
  }
} 