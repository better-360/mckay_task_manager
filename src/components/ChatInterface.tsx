'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, AtSign } from 'lucide-react'
import { CopilotKit } from '@copilotkit/react-core'
import { useCopilotChat, useCopilotAction, useCopilotReadable } from '@copilotkit/react-core'
import { TextMessage, Role } from "@copilotkit/runtime-client-gql"

interface MentionSuggestion {
  id: string
  name: string
  type: 'user' | 'customer'
}

function ChatInterfaceInner() {
  // CopilotKit hook'ları
  const {
    visibleMessages,
    appendMessage,
    isLoading,
  } = useCopilotChat()

  // Local state'ler
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch users/customers/tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, customersRes, tasksRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/customers'),
          fetch('/api/tasks')
        ])
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || usersData)
        }
        
        if (customersRes.ok) {
          const customersData = await customersRes.json()
          setCustomers(customersData.users || customersData)
        }

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json()
          setTasks(tasksData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages])

  // Cursor pozisyonu alma
  const getCursorPos = () => textareaRef.current?.selectionStart || 0

  // Mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = getCursorPos()
    setInput(val)

    const before = val.slice(0, pos)
    const m = before.match(/@(\w*)$/)
    if (m) {
      const q = m[1].toLowerCase()
      setShowMentions(true)
      const all: MentionSuggestion[] = [
        ...users.map(u => ({ id: u.id, name: u.name || u.email, type: 'user' as const })),
        ...customers.map(c => ({ id: c.id, name: c.name, type: 'customer' as const })),
      ]
      setMentionSuggestions(
        all.filter(x => x.name.toLowerCase().includes(q))
      )
    } else {
      setShowMentions(false)
      setMentionSuggestions([])
    }
  }

  const selectMention = (suggestion: MentionSuggestion) => {
    const pos = getCursorPos()
    const before = input.slice(0, pos).replace(/@(\w*)$/, `@${suggestion.name} `)
    const after = input.slice(pos)
    const newVal = before + after
    setInput(newVal)
    setShowMentions(false)
    // Caret'ı yeni pozisyona getir
    setTimeout(() => {
      const newPos = before.length
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Handle key navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === 'Escape') {
        setShowMentions(false)
        return
      }
      if (e.key === 'Enter' && mentionSuggestions.length > 0) {
        e.preventDefault()
        selectMention(mentionSuggestions[0])
        return
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    // Kullanıcı mesajını gönder
    appendMessage(new TextMessage({ content: input.trim(), role: Role.User }))
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Asistan</h3>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            CopilotKit
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleMessages.map((message: any) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.createdAt || Date.now()).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input with Mentions */}
      <div className="p-4 border-t border-gray-200 relative">
        {/* Mention Suggestions */}
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
            {mentionSuggestions.map((suggestion) => (
              <div
                key={`${suggestion.type}-${suggestion.id}`}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => selectMention(suggestion)}
              >
                <AtSign className="h-4 w-4 text-gray-400 mr-2" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{suggestion.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {suggestion.type === 'user' ? 'Kullanıcı' : 'Müşteri'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Mesajınızı yazın... (@kullanıcı veya @müşteri mention edebilirsiniz)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          💡 @ yazarak kullanıcıları ve müşterileri mention edebilirsiniz. Örnek: "@John Doe için yeni görev oluştur"
        </div>
      </div>
    </div>
  )
}

export default function ChatInterface() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ChatInterfaceInner />
    </CopilotKit>
  )
}
